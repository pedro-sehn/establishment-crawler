"""Pydantic request/response models for the API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ProfileRequest(BaseModel):
    url: str = Field(..., description="Instagram profile, reel, or post URL.")


class ReelOut(BaseModel):
    shortcode: str
    thumbnail_url: str  # points at our /api/proxy-image
    view_count: int
    caption: str = ""


class ProfileOut(BaseModel):
    username: str
    full_name: str
    profile_pic_url: str  # points at our /api/proxy-image
    biography: str


class ProfileResponse(BaseModel):
    profile: ProfileOut
    top_reels: list[ReelOut]


class ProcessRequest(BaseModel):
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
