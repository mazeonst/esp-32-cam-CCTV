# ESP32-CAM CCTV

ESP32-CAM CCTV is a compact surveillance starter project built around three components:

- `firmware/`: ESP32-CAM firmware that captures JPEG frames and uploads them to a backend.
- `server/`: FastAPI backend that stores images, exposes a simple API, and serves the frontend.
- `web/`: Static dashboard for viewing the latest frame, browsing snapshots, and managing local settings.

## Repository Layout

```text
.
├── firmware/
│   ├── README.md
│   ├── platformio.ini
│   └── src/
│       ├── config.h
│       └── main.cpp
├── server/
│   ├── README.md
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── camera.py
│       └── main.py
├── web/
│   ├── README.md
│   ├── index.html
│   └── assets/
│       ├── css/
│       │   └── styles.css
│       └── js/
│           ├── app.js
│           └── camera.js
└── .env.example
```

## Features

- Periodic image capture on ESP32-CAM
- Token-protected upload endpoint
- Snapshot history with retention policy
- Web dashboard for live refresh, browsing, download, and deletion
- Basic persisted settings API for dashboard configuration
- Static frontend served directly by FastAPI

## Architecture

1. The ESP32-CAM connects to Wi-Fi and captures a JPEG frame on a fixed interval.
2. The firmware uploads the frame to the FastAPI backend using `multipart/form-data`.
3. The backend stores the latest images under `storage/camera/`, trims older files, and exposes read/write endpoints.
4. The frontend polls the backend for the latest frame and lists stored snapshots.

## Quick Start

### 1. Configure the firmware

Edit [`firmware/src/config.h`](firmware/src/config.h) and set:

- `ssid`
- `password`
- `server`
- `auth_token`

Then build and flash:

```bash
cd firmware
pio run
pio run --target upload
```

### 2. Configure the backend

Create an environment file from the example:

```bash
cp .env.example .env
```

Install dependencies and start the server:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt
uvicorn server.app.main:app --host 0.0.0.0 --port 8000
```

### 3. Open the dashboard

Visit [http://localhost:8000](http://localhost:8000).

## Environment Variables

The backend reads the following variables:

- `CAMERA_AUTH_TOKEN`: shared token used by the firmware and protected dashboard actions
- `CAMERA_MAX_IMAGES`: number of retained snapshots
- `CAMERA_STORAGE_DIR`: path for stored images and settings
- `CAMERA_CONNECTED_WINDOW_SECONDS`: how recently a frame must arrive for the camera to be considered online

See [`.env.example`](.env.example) for defaults.

## API Overview

- `POST /api/camera/upload`
- `GET /api/camera/latest`
- `GET /api/camera/list`
- `GET /api/camera/download/{filename}`
- `DELETE /api/camera/delete/{filename}`
- `DELETE /api/camera/delete`
- `POST /api/camera/snapshot`
- `GET /api/camera/status`
- `GET /api/camera/settings`
- `POST /api/camera/settings`

## Notes

- `POST /api/camera/snapshot` creates a copy of the most recent uploaded frame. It does not trigger the ESP32-CAM shutter remotely.
- The default firmware uses `WiFiClientSecure::setInsecure()`. For production, replace that with proper certificate validation.
- The repository is prepared for public hosting, but you should still review credentials, storage policy, and TLS settings before deployment.

## License

Add the license that matches your publication plans before making the repository public.
