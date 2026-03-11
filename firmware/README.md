# Firmware

This directory contains the PlatformIO project for the ESP32-CAM board.

## What It Does

- Initializes the AI Thinker ESP32-CAM pin layout
- Connects to the configured Wi-Fi network
- Captures JPEG frames on a fixed interval
- Uploads each frame to the backend with an authentication token

## Files

- [`platformio.ini`](platformio.ini): PlatformIO environment definition
- [`src/config.h`](src/config.h): deployment-specific credentials and camera constants
- [`src/main.cpp`](src/main.cpp): firmware logic

## Build

```bash
cd firmware
pio run
```

## Flash

```bash
cd firmware
pio run --target upload
pio device monitor
```

## Configuration Checklist

Update [`src/config.h`](src/config.h) before flashing:

- Wi-Fi SSID and password
- Backend host name
- Shared auth token
- Capture interval if needed

## Security

The sample firmware accepts any TLS certificate because it uses `client.setInsecure()`. Keep that only for local development or replace it with CA validation for production.
