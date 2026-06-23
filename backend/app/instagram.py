"""Instagram client built on Instagram's own web API (the endpoints the website
itself calls), authenticated with your browser session cookies.

We deliberately avoid instaloader's GraphQL ``doc_id`` metadata path: Instagram
rotates those ids and the library drifts out of sync (400 "invalid request").
The web API used here (``users/web_profile_info`` and ``media/{id}/info``) is the
same one instagram.com uses in the browser, so it tracks the live site.

All network access is best-effort: failures map onto a typed ``InstagramError``
with an HTTP-friendly status code.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

import httpx

from .config import Settings, get_settings

logger = logging.getLogger("crawler.instagram")

# Public web-app id instagram.com sends on its internal API calls.
IG_APP_ID = "936619743392459"

# Base62-ish alphabet used to encode media ids into shortcodes.
_SC_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

_USERNAME_RE = re.compile(
    r"(?:https?://)?(?:www\.)?instagram\.com/"
    r"(?:(?:reel|reels|p|tv)/(?P<shortcode>[A-Za-z0-9_-]+)"
    r"|(?P<username>[A-Za-z0-9_.]+))/?",
    re.IGNORECASE,
)
_SHORTCODE_ONLY_RE = re.compile(r"^[A-Za-z0-9_.]+$")
_RESERVED = {"reel", "reels", "p", "tv", "explore", "stories", "accounts"}


class InstagramError(Exception):
    """Raised for any scraping failure; carries an HTTP status code."""

    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass
class ReelData:
    shortcode: str
    thumbnail_url: str
    view_count: int
    caption: str
    video_url: str = ""


@dataclass
class ProfileData:
    username: str
    full_name: str
    profile_pic_url: str
    biography: str
    external_url: str = ""


@dataclass
class IgCredentials:
    """Instagram session cookies supplied per request (from the frontend)."""

    sessionid: str = ""
    csrftoken: str = ""
    ds_user_id: str = ""


def _shortcode_to_mediaid(code: str) -> int:
    mediaid = 0
    for ch in code:
        mediaid = mediaid * 64 + _SC_ALPHABET.index(ch)
    return mediaid


class InstagramClient:
    def __init__(self, settings: Settings, credentials: IgCredentials) -> None:
        self._settings = settings
        self._logged_in = bool(credentials.sessionid)

        cookies = {
            "sessionid": credentials.sessionid,
            "csrftoken": credentials.csrftoken,
            "ds_user_id": credentials.ds_user_id,
        }
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/123.0 Safari/537.36"
            ),
            "X-IG-App-ID": IG_APP_ID,
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRFToken": credentials.csrftoken,
            "Referer": "https://www.instagram.com/",
            "Accept": "*/*",
        }
        self._http = httpx.Client(
            headers=headers,
            cookies={k: v for k, v in cookies.items() if v},
            timeout=30.0,
            follow_redirects=True,
        )
        if not self._logged_in:
            logger.warning(
                "No sessionid supplied; Instagram blocks most anonymous requests. "
                "Paste your session cookies in the frontend (see README)."
            )

    def _is_logged_in(self) -> bool:
        return self._logged_in

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "InstagramClient":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    # -- URL parsing ------------------------------------------------------

    def parse_username(self, url: str) -> str:
        raw = url.strip()
        if not raw:
            raise InstagramError("Empty URL.", status_code=400)

        handle = raw.lstrip("@")
        if "instagram.com" not in raw.lower() and _SHORTCODE_ONLY_RE.match(handle):
            return handle

        match = _USERNAME_RE.search(raw)
        if not match:
            raise InstagramError("Could not parse an Instagram URL.", status_code=400)

        if match.group("username"):
            username = match.group("username")
            if username.lower() in _RESERVED:
                raise InstagramError("URL points to content, not a profile.", status_code=400)
            return username

        # A reel/post URL: resolve the owner via the media info endpoint.
        item = self._media_info(match.group("shortcode"))
        owner = (item.get("user") or {}).get("username")
        if not owner:
            raise InstagramError("Could not resolve the reel owner.", status_code=502)
        return owner

    def parse_shortcode(self, url_or_code: str) -> str:
        """Resolve a reel/post URL (or bare shortcode) to its shortcode."""
        raw = url_or_code.strip()
        if not raw:
            raise InstagramError("Empty reel URL.", status_code=400)

        # Bare shortcode (no dots — those are usernames).
        if "instagram.com" not in raw.lower() and re.fullmatch(r"[A-Za-z0-9_-]+", raw):
            return raw

        match = _USERNAME_RE.search(raw)
        if match and match.group("shortcode"):
            return match.group("shortcode")
        raise InstagramError(
            "That doesn't look like a reel/post URL (expected instagram.com/reel/…).",
            status_code=400,
        )

    # -- Profile + reels --------------------------------------------------

    def get_profile_bundle(self, url: str) -> tuple[ProfileData, list[ReelData]]:
        username = self.parse_username(url)
        user = self._web_profile_info(username)

        profile = ProfileData(
            username=user.get("username", username),
            full_name=user.get("full_name") or "",
            profile_pic_url=user.get("profile_pic_url_hd") or user.get("profile_pic_url") or "",
            biography=user.get("biography") or "",
            external_url=_external_url(user),
        )

        if user.get("is_private") and not user.get("followed_by_viewer"):
            raise InstagramError(
                f"@{profile.username} is private; cannot read reels.", status_code=403
            )

        reels = self._user_reels(str(user.get("id") or user.get("pk") or ""))
        return profile, reels

    def _user_reels(self, user_id: str) -> list[ReelData]:
        """Scan the user's recent feed and return the most-viewed videos.

        web_profile_info no longer includes timeline media, so we read the feed
        endpoint directly (same one the website uses), up to ``scan_cap`` items.
        """
        if not user_id:
            return []
        resp = self._get(
            f"https://www.instagram.com/api/v1/feed/user/{user_id}/",
            params={"count": self._settings.scan_cap},
            who="this account's posts",
        )
        items = self._json(resp, who="this account's posts").get("items") or []

        reels: list[ReelData] = []
        for it in items:
            # media_type 2 == video; reels also carry product_type "clips".
            if it.get("media_type") != 2 and it.get("product_type") != "clips":
                continue
            views = it.get("play_count") or it.get("view_count") or it.get("ig_play_count") or 0
            reels.append(
                ReelData(
                    shortcode=it.get("code", ""),
                    thumbnail_url=_thumb(it),
                    view_count=int(views),
                    caption=((it.get("caption") or {}).get("text") or "")[:200],
                    video_url=_video_url(it),
                )
            )
        reels.sort(key=lambda r: r.view_count, reverse=True)
        return reels[: self._settings.top_reels]

    # -- Fresh video URL --------------------------------------------------

    def get_video_url(self, shortcode: str) -> str:
        item = self._media_info(shortcode)
        versions = item.get("video_versions") or []
        if not versions:
            raise InstagramError("That post has no downloadable video.", status_code=400)
        return versions[0]["url"]

    # -- Raw web API calls ------------------------------------------------

    def _web_profile_info(self, username: str) -> dict:
        resp = self._get(
            "https://www.instagram.com/api/v1/users/web_profile_info/",
            params={"username": username},
            who=f"@{username}",
        )
        data = self._json(resp, who=f"@{username}")
        user = (data.get("data") or {}).get("user")
        if not user:
            raise InstagramError(f"@{username} does not exist.", status_code=404)
        return user

    def _media_info(self, shortcode: str) -> dict:
        try:
            mediaid = _shortcode_to_mediaid(shortcode)
        except ValueError as exc:
            raise InstagramError("Invalid reel shortcode.", status_code=400) from exc
        resp = self._get(
            f"https://www.instagram.com/api/v1/media/{mediaid}/info/",
            who="that reel",
        )
        data = self._json(resp, who="that reel")
        items = data.get("items") or []
        if not items:
            raise InstagramError("Reel not found.", status_code=404)
        return items[0]

    def _get(self, url: str, who: str, params: dict | None = None) -> httpx.Response:
        try:
            resp = self._http.get(url, params=params)
        except httpx.HTTPError as exc:
            raise InstagramError(f"Instagram connection failed: {exc}", status_code=502) from exc

        if resp.status_code == 404:
            raise InstagramError(f"{who} does not exist.", status_code=404)
        if resp.status_code in (401, 403):
            raise InstagramError(self._auth_hint(), status_code=401)
        if resp.status_code == 429:
            raise InstagramError(
                "Instagram is rate-limiting requests. Wait a bit and retry.",
                status_code=429,
            )
        if resp.status_code >= 400:
            raise InstagramError(
                f"Instagram returned {resp.status_code} for {who}.", status_code=502
            )
        return resp

    def _json(self, resp: httpx.Response, who: str) -> dict:
        ctype = resp.headers.get("content-type", "")
        if "application/json" not in ctype:
            # An HTML page here almost always means a login wall / redirect.
            raise InstagramError(self._auth_hint(), status_code=401)
        try:
            return resp.json()
        except ValueError as exc:
            raise InstagramError(f"Unexpected response for {who}.", status_code=502) from exc

    def _auth_hint(self) -> str:
        if self._logged_in:
            return (
                "Instagram rejected the request — your session cookie may be expired. "
                "Paste fresh cookies from a logged-in instagram.com session."
            )
        return (
            "Instagram requires login. Paste your sessionid (and csrftoken) cookies "
            "in the form above — see README."
        )


def _thumb(item: dict) -> str:
    candidates = (item.get("image_versions2") or {}).get("candidates") or []
    if candidates:
        return candidates[0].get("url", "")
    # Carousels nest media under carousel_media.
    carousel = item.get("carousel_media") or []
    if carousel:
        return _thumb(carousel[0])
    return ""


def _video_url(item: dict) -> str:
    """Best available playable URL from a feed item (for inline preview)."""
    versions = item.get("video_versions") or []
    if versions:
        return versions[0].get("url", "")
    carousel = item.get("carousel_media") or []
    if carousel:
        return _video_url(carousel[0])
    return ""


def _external_url(user: dict) -> str:
    """The account's bio link, if any (external_url or first bio_links entry)."""
    if user.get("external_url"):
        return user["external_url"]
    links = user.get("bio_links") or []
    if links and isinstance(links, list):
        return links[0].get("url", "")
    return ""


def build_client(credentials: IgCredentials | None = None) -> InstagramClient:
    """Build a client for a single request.

    Cookies come from the frontend (``credentials``); there is no server-side
    credential config.
    """
    settings = get_settings()
    creds = credentials or IgCredentials()
    return InstagramClient(settings, creds)
