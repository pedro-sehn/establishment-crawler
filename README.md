# establishment-crawler

Paste an Instagram **profile URL** → get the account's **username, profile picture, and
bio**, plus its **three most-viewed reels**. Pick the reel you like, reshape it to a wide
aspect ratio (**16:9** or **4:3**), and **download** the result.

```
URL ─▶ FastAPI backend (Instagram web API + your cookies) ─▶ top 3 reels
                                                                │ user picks one
                                                                ▼
                                        download reel ─▶ ffmpeg reshape ─▶ download button
```

## Stack

- **Backend:** Python + FastAPI. Talks to **Instagram's own web API** (the endpoints the
  website calls — `users/web_profile_info`, `feed/user/{id}`, `media/{id}/info`) using your
  browser **session cookies**. `ffmpeg`/`ffprobe` for video reshaping.
- **Frontend:** React + TypeScript (Vite).

## Prerequisites

- **[uv](https://docs.astral.sh/uv/)** (Python package manager) — `brew install uv`
- **Python 3.14** (uv installs it automatically; also pinned in `.tool-versions`)
- **Node.js 20+** and npm
- **ffmpeg** and **ffprobe** on your `PATH` (`ffmpeg -version` should work)

## Setup & run

### Quick start (one command)

From the repo root:

```bash
npm install        # installs root dev runner (concurrently)
npm run setup      # backend: uv sync   +   frontend: npm install
npm run dev        # runs backend (:8000) and frontend (:5173) together
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to the backend, so the
browser talks same-origin (this is what makes the image proxy work in `<img>` tags).

Root scripts (`package.json`):

| Script | Does |
| --- | --- |
| `npm run dev` | runs backend + frontend together via `concurrently` (`-k`: kill both if one dies) |
| `npm run dev:backend` | only the FastAPI backend (`uv run uvicorn …`) |
| `npm run dev:frontend` | only the Vite dev server |
| `npm run setup` | `uv sync` + `npm install` for both projects |

### Run each project separately

```bash
# Backend
cd backend
uv sync                                       # creates .venv + uv.lock from pyproject.toml
uv run uvicorn app.main:app --reload --port 8000   # /health for a quick check

# Frontend
cd frontend
npm install
npm run dev
```

## Configuration (optional env vars)

All optional; prefix `CRAWLER_`:

Put these in `backend/.env` (gitignored). Prefix `CRAWLER_`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CRAWLER_IG_SESSIONID` | — | **Required for real crawls.** Your `sessionid` cookie from a logged-in instagram.com. |
| `CRAWLER_IG_CSRFTOKEN` | — | Your `csrftoken` cookie (recommended). |
| `CRAWLER_IG_DS_USER_ID` | — | Your `ds_user_id` cookie (recommended). |
| `CRAWLER_SCAN_CAP` | `30` | How many recent posts to scan when ranking reels by views. |
| `CRAWLER_TOP_REELS` | `3` | Number of top reels to return. |
| `CRAWLER_FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin. |

### Authentication (required)

Instagram blocks almost all anonymous traffic, so the app authenticates with **your browser
session cookies**. Get them while logged in to instagram.com:

1. Open instagram.com (logged in) → DevTools → **Application ▸ Cookies ▸ instagram.com**.
2. Copy the values of `sessionid`, `csrftoken`, and `ds_user_id`.
3. Put them in `backend/.env`:

```dotenv
CRAWLER_IG_SESSIONID=<your sessionid>
CRAWLER_IG_CSRFTOKEN=<your csrftoken>
CRAWLER_IG_DS_USER_ID=<your ds_user_id>
```

On startup the backend logs `Logged in via cookies as @<you>`. The session lasts months;
if requests start returning **401**, refresh `sessionid` (logging out of Instagram in the
browser invalidates it). **Keep `.env` secret — never commit it.**

## API

| Method | Path | Body / Params | Returns |
| --- | --- | --- | --- |
| `POST` | `/api/profile` | `{ "url": "…" }` | profile + top reels (image URLs proxied) |
| `GET` | `/api/proxy-image` | `?src=<IG CDN url>` | streams the image (CORS/hotlink workaround) |
| `POST` | `/api/process` | `{ "shortcode"\|"url", "ratio", "fit" }` | `{ job_id, width, height }` |
| `GET` | `/api/download/{job_id}` | — | the reshaped `.mp4` as an attachment |

- `ratio`: `"16:9"` (1920×1080) or `"4:3"` (1440×1080)
- `fit`: `"pad"` (blurred background, no content lost — default) or `"crop"` (center-crop)
- `/api/process` takes **either** a featured reel `shortcode` **or** a `url` (any reel/post
  URL you paste). When both are sent, `url` wins.

## How it works

- **Profile + reels** (`backend/app/instagram.py`): resolves the URL to a username via
  `users/web_profile_info`, then scans up to `SCAN_CAP` recent posts from `feed/user/{id}`,
  keeps videos/reels, sorts by play count, and returns the top reels. A fresh playable video
  URL is resolved per reel through `media/{id}/info` (the shortcode is decoded to a media id
  locally). No third-party scraping library — just the site's own API.
- **Media proxy** (`/api/proxy-image`): IG CDN URLs are signed/time-limited and block
  hotlinking, so images are fetched server-side. Only `*.cdninstagram.com`, `*.fbcdn.net`,
  and `*.instagram.com` hosts are allowed.
- **Reshape** (`backend/app/video.py`): re-resolves a fresh signed video URL by shortcode,
  downloads it, and runs ffmpeg. `pad` builds a blurred zoomed background and overlays the
  scaled video centered; `crop` center-crops to fill. Output dimensions are verified with
  `ffprobe`.

## Caveats / legal

- Scraping violates Instagram's Terms of Service, and re-hosting/editing others' videos has
  copyright implications. This is intended as a **personal tool** — review the terms before
  any public deployment.
- Uses **your** session cookies, so requests count as your account — don't hammer it; heavy
  use can get an account flagged or rate-limited (`429`). Reel ranking covers recent posts
  only (no deep pagination), which keeps request volume low.
- Processed files live in `backend/storage/jobs/<job_id>/` (gitignored); clean it up
  periodically.
