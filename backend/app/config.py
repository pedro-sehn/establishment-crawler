"""Application settings.

Plain in-code configuration — no environment variables or .env file. Edit the
values below to change behaviour. Instagram credentials are supplied per request
by the frontend (see ``IgCredentials``), not configured here.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

# Target output sizes per aspect ratio. Reels are vertical (9:16); converting to
# these wide ratios is why "pad" (blurred background) is the default fit mode.
RATIO_DIMENSIONS: dict[str, tuple[int, int]] = {
    "16:9": (1920, 1080),
    "4:3": (1440, 1080),
}

FIT_MODES = ("pad", "crop")

# Hostnames we are willing to proxy / download media from.
ALLOWED_MEDIA_HOSTS = ("cdninstagram.com", "fbcdn.net", "instagram.com")


@dataclass(frozen=True)
class Settings:
    # Where downloaded + processed media is stored.
    storage_dir: Path = Path(__file__).resolve().parent.parent / "storage"

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
