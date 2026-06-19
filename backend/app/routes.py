"""API routes: profile lookup, media proxy, video processing, download."""

from __future__ import annotations

import logging
import uuid
from urllib.parse import quote, urlparse

import httpx
from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from .config import ALLOWED_MEDIA_HOSTS, FIT_MODES, RATIO_DIMENSIONS, get_settings
from .instagram import IgCredentials, InstagramError, build_client
from .schemas import (
    IgCookieFields,
    ProcessRequest,
    ProcessResponse,
    ProfileOut,
    ProfileRequest,
    ProfileResponse,
    ReelOut,
)
from .video import VideoError, reshape

logger = logging.getLogger("crawler.routes")
router = APIRouter(prefix="/api")

# A browser-like UA helps avoid 403s when pulling media from the IG CDN.
_MEDIA_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/123.0 Safari/537.36"
    ),
    "Referer": "https://www.instagram.com/",
}


def _proxied(url: str) -> str:
    """Rewrite an IG media URL to go through our same-origin image proxy."""
    return f"/api/proxy-image?src={quote(url, safe='')}"


def _proxied_video(url: str) -> str:
    """Rewrite an IG video URL to go through our same-origin video proxy."""
    if not url:
        return ""
    return f"/api/proxy-video?src={quote(url, safe='')}"


def _host_allowed(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return any(host == h or host.endswith("." + h) for h in ALLOWED_MEDIA_HOSTS)


def _creds(req: IgCookieFields) -> IgCredentials:
    return IgCredentials(
        sessionid=req.ig_sessionid or "",
        csrftoken=req.ig_csrftoken or "",
        ds_user_id=req.ig_ds_user_id or "",
    )


@router.post("/profile", response_model=ProfileResponse)
def get_profile(req: ProfileRequest) -> ProfileResponse:
    try:
        with build_client(_creds(req)) as client:
            profile, reels = client.get_profile_bundle(req.url)
    except InstagramError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return ProfileResponse(
        profile=ProfileOut(
            username=profile.username,
            full_name=profile.full_name,
            profile_pic_url=_proxied(profile.profile_pic_url),
            biography=profile.biography,
            external_url=profile.external_url,
        ),
        top_reels=[
            ReelOut(
                shortcode=r.shortcode,
                thumbnail_url=_proxied(r.thumbnail_url),
                view_count=r.view_count,
                caption=r.caption,
                video_url=_proxied_video(r.video_url),
            )
            for r in reels
        ],
    )


@router.get("/proxy-image")
def proxy_image(src: str = Query(..., description="IG CDN media URL")) -> StreamingResponse:
    if not _host_allowed(src):
        raise HTTPException(status_code=400, detail="Disallowed media host.")
    try:
        upstream = httpx.get(src, headers=_MEDIA_HEADERS, timeout=20, follow_redirects=True)
        upstream.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Image fetch failed: {exc}") from exc

    content_type = upstream.headers.get("content-type", "image/jpeg")
    return StreamingResponse(
        iter([upstream.content]),
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/proxy-video")
def proxy_video(request: Request, src: str = Query(..., description="IG CDN video URL")):
    """Stream an IG video for inline preview, forwarding Range for seeking.

    IG video URLs are signed/time-limited and block hotlinking, so we fetch
    server-side like proxy-image — but stream (not buffer) and honour Range so
    the browser can play and seek a `<video>` element.
    """
    if not _host_allowed(src):
        raise HTTPException(status_code=400, detail="Disallowed media host.")

    fwd_headers = dict(_MEDIA_HEADERS)
    range_header = request.headers.get("range")
    if range_header:
        fwd_headers["Range"] = range_header

    upstream = httpx.stream(
        "GET", src, headers=fwd_headers, timeout=30, follow_redirects=True
    )
    try:
        resp = upstream.__enter__()
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        upstream.__exit__(type(exc), exc, exc.__traceback__)
        raise HTTPException(status_code=502, detail=f"Video fetch failed: {exc}") from exc

    passthrough = ("content-type", "content-length", "content-range", "accept-ranges")
    out_headers = {k: v for k, v in resp.headers.items() if k.lower() in passthrough}
    out_headers.setdefault("Accept-Ranges", "bytes")
    out_headers["Cache-Control"] = "public, max-age=3600"

    def body():
        try:
            for chunk in resp.iter_bytes(chunk_size=1 << 16):
                yield chunk
        finally:
            upstream.__exit__(None, None, None)

    return StreamingResponse(
        body(),
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type", "video/mp4"),
        headers=out_headers,
    )


def _validate_output_opts(ratio: str, fit: str) -> None:
    if ratio not in RATIO_DIMENSIONS:
        raise HTTPException(status_code=400, detail=f"ratio must be one of {list(RATIO_DIMENSIONS)}")
    if fit not in FIT_MODES:
        raise HTTPException(status_code=400, detail=f"fit must be one of {list(FIT_MODES)}")


def _new_job_paths():
    """Create a fresh job dir and return (job_id, input_path, output_path)."""
    job_id = uuid.uuid4().hex
    job_dir = get_settings().jobs_dir / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    return job_id, job_dir / "input.mp4", job_dir / "output.mp4"


def _reshape_to_response(job_id, input_path, output_path, ratio, fit) -> ProcessResponse:
    """Run the ffmpeg reshape and clean up the input, returning the job result."""
    try:
        width, height = reshape(input_path, output_path, ratio, fit)
    except VideoError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        input_path.unlink(missing_ok=True)
    return ProcessResponse(job_id=job_id, width=width, height=height)


@router.post("/process", response_model=ProcessResponse)
def process(req: ProcessRequest) -> ProcessResponse:
    _validate_output_opts(req.ratio, req.fit)

    # A custom URL (if given) wins over a featured shortcode.
    try:
        with build_client(_creds(req)) as client:
            if req.url and req.url.strip():
                shortcode = client.parse_shortcode(req.url)
            elif req.shortcode:
                shortcode = req.shortcode
            else:
                raise HTTPException(status_code=400, detail="Provide a reel shortcode or url.")
            video_url = client.get_video_url(shortcode)
    except InstagramError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    if not _host_allowed(video_url):
        raise HTTPException(status_code=502, detail="Resolved video URL is not an IG host.")

    job_id, input_path, output_path = _new_job_paths()

    # Download the reel server-side (signed CDN URL, may block hotlinking).
    try:
        with httpx.stream(
            "GET", video_url, headers=_MEDIA_HEADERS, timeout=120, follow_redirects=True
        ) as resp:
            resp.raise_for_status()
            with input_path.open("wb") as fh:
                for chunk in resp.iter_bytes(chunk_size=1 << 16):
                    fh.write(chunk)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Video download failed: {exc}") from exc

    return _reshape_to_response(job_id, input_path, output_path, req.ratio, req.fit)


@router.post("/process-upload", response_model=ProcessResponse)
async def process_upload(
    file: UploadFile = File(..., description="A video file to reshape."),
    ratio: str = Form("16:9"),
    fit: str = Form("pad"),
) -> ProcessResponse:
    """Reshape a user-uploaded video — no Instagram crawl involved."""
    _validate_output_opts(ratio, fit)

    content_type = (file.content_type or "").lower()
    if not content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a video.")

    job_id, input_path, output_path = _new_job_paths()

    # Stream the upload to disk so large files don't sit in memory.
    try:
        with input_path.open("wb") as fh:
            while chunk := await file.read(1 << 16):
                fh.write(chunk)
    finally:
        await file.close()

    if input_path.stat().st_size == 0:
        input_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    return _reshape_to_response(job_id, input_path, output_path, ratio, fit)


@router.get("/download/{job_id}")
def download(job_id: str) -> FileResponse:
    if not job_id.isalnum():
        raise HTTPException(status_code=400, detail="Invalid job id.")
    output_path = get_settings().jobs_dir / job_id / "output.mp4"
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Job not found or expired.")
    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename=f"reel-{job_id[:8]}.mp4",
    )
