"""API routes: profile lookup, media proxy, video processing, download."""

from __future__ import annotations

import logging
import uuid
from urllib.parse import quote, urlparse

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse

from .config import ALLOWED_MEDIA_HOSTS, FIT_MODES, RATIO_DIMENSIONS, get_settings
from .instagram import InstagramError, get_client
from .schemas import (
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
    """Rewrite an IG media URL to go through our same-origin proxy."""
    return f"/api/proxy-image?src={quote(url, safe='')}"


def _host_allowed(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return any(host == h or host.endswith("." + h) for h in ALLOWED_MEDIA_HOSTS)


@router.post("/profile", response_model=ProfileResponse)
def get_profile(req: ProfileRequest) -> ProfileResponse:
    try:
        profile, reels = get_client().get_profile_bundle(req.url)
    except InstagramError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return ProfileResponse(
        profile=ProfileOut(
            username=profile.username,
            full_name=profile.full_name,
            profile_pic_url=_proxied(profile.profile_pic_url),
            biography=profile.biography,
        ),
        top_reels=[
            ReelOut(
                shortcode=r.shortcode,
                thumbnail_url=_proxied(r.thumbnail_url),
                view_count=r.view_count,
                caption=r.caption,
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


@router.post("/process", response_model=ProcessResponse)
def process(req: ProcessRequest) -> ProcessResponse:
    if req.ratio not in RATIO_DIMENSIONS:
        raise HTTPException(status_code=400, detail=f"ratio must be one of {list(RATIO_DIMENSIONS)}")
    if req.fit not in FIT_MODES:
        raise HTTPException(status_code=400, detail=f"fit must be one of {list(FIT_MODES)}")

    settings = get_settings()
    client = get_client()

    # A custom URL (if given) wins over a featured shortcode.
    try:
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

    job_id = uuid.uuid4().hex
    job_dir = settings.jobs_dir / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    input_path = job_dir / "input.mp4"
    output_path = job_dir / "output.mp4"

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

    try:
        width, height = reshape(input_path, output_path, req.ratio, req.fit)
    except VideoError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        input_path.unlink(missing_ok=True)

    return ProcessResponse(job_id=job_id, width=width, height=height)


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
