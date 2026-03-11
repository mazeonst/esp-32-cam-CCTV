# Server

This directory contains the FastAPI backend used by the ESP32-CAM firmware and the web dashboard.

## Responsibilities

- Accept authenticated uploads from the camera
- Store images on disk
- Keep only the latest configured number of images
- Expose image listing, download, deletion, and status endpoints
- Persist dashboard settings to a local JSON file
- Serve the static dashboard from the repository `web/` directory

## Run Locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt
uvicorn server.app.main:app --reload --host 0.0.0.0 --port 8000
```

## Configuration

The backend uses environment variables from the repository root `.env` file:

- `CAMERA_AUTH_TOKEN`
- `CAMERA_MAX_IMAGES`
- `CAMERA_STORAGE_DIR`
- `CAMERA_CONNECTED_WINDOW_SECONDS`

## API

See the main repository README for the endpoint summary, or open `/docs` after starting the FastAPI app.

