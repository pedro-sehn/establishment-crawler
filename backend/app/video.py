"""ffmpeg-based video reshaping.

Reels are vertical (9:16). To fit a wide target (16:9 / 4:3) we offer two modes:

* ``pad``  - scale the reel to fit inside the canvas and fill the side bars with a
             blurred, zoomed copy of the video. No content is lost. (default)
* ``crop`` - center-crop + scale to fill the canvas. Fills the frame but trims the
             top/bottom of the subject.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from .config import RATIO_DIMENSIONS

FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE = shutil.which("ffprobe") or "ffprobe"


class VideoError(Exception):
    """Raised when ffmpeg/ffprobe fails."""


def _build_filter(width: int, height: int, fit: str) -> str:
    if fit == "crop":
        return (
            f"scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height}"
        )
    # pad (default): blurred background + centered foreground.
    return (
        "[0:v]split=2[bg][fg];"
        f"[bg]scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height},boxblur=20:5,setsar=1[bgb];"
        f"[fg]scale={width}:{height}:force_original_aspect_ratio=decrease,setsar=1[fgs];"
        "[bgb][fgs]overlay=(W-w)/2:(H-h)/2"
    )


def reshape(input_path: Path, output_path: Path, ratio: str, fit: str) -> tuple[int, int]:
    """Reshape ``input_path`` into ``output_path`` and return (width, height)."""
    if ratio not in RATIO_DIMENSIONS:
        raise VideoError(f"Unsupported ratio '{ratio}'.")
    if fit not in ("pad", "crop"):
        raise VideoError(f"Unsupported fit '{fit}'.")

    width, height = RATIO_DIMENSIONS[ratio]
    vf = _build_filter(width, height, fit)
    # "crop" is a simple filter chain (-vf); "pad" needs a graph (-filter_complex).
    filter_flag = "-filter_complex" if fit == "pad" else "-vf"

    cmd = [
        FFMPEG,
        "-y",
        "-i",
        str(input_path),
        filter_flag,
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not output_path.exists():
        tail = "\n".join(result.stderr.strip().splitlines()[-6:])
        raise VideoError(f"ffmpeg failed:\n{tail}")

    return _probe_dimensions(output_path)


def _probe_dimensions(path: Path) -> tuple[int, int]:
    result = subprocess.run(
        [
            FFPROBE,
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=p=0:s=x",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise VideoError(f"ffprobe failed: {result.stderr.strip()}")
    try:
        w_str, h_str = result.stdout.strip().split("x")
        return int(w_str), int(h_str)
    except ValueError as exc:
        raise VideoError(f"Unexpected ffprobe output: {result.stdout!r}") from exc
