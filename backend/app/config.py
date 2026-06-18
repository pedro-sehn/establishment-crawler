"""Application settings.

All values can be overridden with environment variables (see README). Sensible
defaults let the app run locally with zero configuration.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Target output sizes per aspect ratio. Reels are vertical (9:16); converting to
# these wide ratios is why "pad" (blurred background) is the default fit mode.
RATIO_DIMENSIONS: dict[str, tuple[int, int]] = {
    "16:9": (1920, 1080),
    "4:3": (1440, 1080),
}

FIT_MODES = ("pad", "crop")

# Hostnames we are willing to proxy / download media from.
ALLOWED_MEDIA_HOSTS = ("cdninstagram.com", "fbcdn.net", "instagram.com")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CRAWLER_", env_file=".env", extra="ignore")

    # Where downloaded + processed media is stored.
    storage_dir: Path = Path(__file__).resolve().parent.parent / "storage"

    # Instagram auth via browser session cookies (see README). ig_sessionid is
    # required for real crawls; the other two improve reliability.
    ig_sessionid: str | None = None
    ig_csrftoken: str | None = None
    ig_ds_user_id: str | None = None

    # How many recent posts to scan when looking for the most-viewed reels.
    # Higher = more thorough but more requests (and higher ban risk).
    scan_cap: int = 30

    # Number of top reels to return.
    top_reels: int = 3

    # Allowed CORS origin for the Vite dev server.
    frontend_origin: str = "http://localhost:5173"

    @property
    def jobs_dir(self) -> Path:
        return self.storage_dir / "jobs"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.jobs_dir.mkdir(parents=True, exist_ok=True)
    return settings
