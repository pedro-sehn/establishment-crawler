"""Pydantic request/response models for the API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class IgCookieFields(BaseModel):
    """Instagram session cookies pasted by the user in the frontend."""

    ig_sessionid: str | None = Field(None, description="Your instagram.com `sessionid` cookie.")
    ig_csrftoken: str | None = Field(None, description="Your instagram.com `csrftoken` cookie.")
    ig_ds_user_id: str | None = Field(None, description="Your instagram.com `ds_user_id` cookie.")


class ProfileRequest(IgCookieFields):
    url: str = Field(..., description="Instagram profile, reel, or post URL.")


class ReelOut(BaseModel):
    shortcode: str
    thumbnail_url: str  # points at our /api/proxy-image
    view_count: int
    caption: str = ""
    video_url: str = ""  # points at our /api/proxy-video (for inline preview)


class ProfileOut(BaseModel):
    username: str
    full_name: str
    profile_pic_url: str  # points at our /api/proxy-image
    biography: str
    external_url: str = ""  # the account's bio link


class ProfileResponse(BaseModel):
    profile: ProfileOut
    top_reels: list[ReelOut]


class ProcessRequest(IgCookieFields):
    shortcode: str | None = Field(None, description="Shortcode of a chosen featured reel.")
    url: str | None = Field(
        None,
        description="Optional: a specific reel/post URL to use instead of a featured reel. "
        "Takes precedence over shortcode when provided.",
    )
    ratio: str = Field("16:9", description="Target aspect ratio: '16:9' or '4:3'.")
    fit: str = Field("pad", description="Fit mode: 'pad' (blurred bg) or 'crop'.")


class ProcessResponse(BaseModel):
    job_id: str
    width: int
    height: int
