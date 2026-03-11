# Firmware

This directory contains the ESP32-CAM firmware assets for this repository.

## Firmware Modes

### 1. CCTV uploader

The main firmware lives in [`src/main.cpp`](src/main.cpp). It is the default project firmware and it:

- Initializes the AI Thinker ESP32-CAM pin layout
- Connects to the configured Wi-Fi network
- Captures JPEG frames on a fixed interval
- Uploads each frame to the backend with an authentication token

### 2. Serial dithering demo

The original local-only sketch is preserved in [`examples/serial_dither_demo.cpp`](examples/serial_dither_demo.cpp). It:

- Captures grayscale frames
- Applies dithering locally
- Streams packed image rows over `Serial`
- Does not use the backend or web interface

## Files

- [`platformio.ini`](platformio.ini): PlatformIO environment definition
- [`src/config.h`](src/config.h): deployment-specific credentials and camera constants
- [`src/main.cpp`](src/main.cpp): CCTV uploader firmware
- [`examples/serial_dither_demo.cpp`](examples/serial_dither_demo.cpp): standalone serial demo based on the working sketch

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

## Which One Should You Flash

- Use [`src/main.cpp`](src/main.cpp) if you want the full CCTV project with backend and web dashboard.
- Use [`examples/serial_dither_demo.cpp`](examples/serial_dither_demo.cpp) only if you want the standalone serial streaming behavior from your older setup.

The two firmwares solve different tasks and are not interchangeable.

## Security

The sample firmware accepts any TLS certificate because it uses `client.setInsecure()`. Keep that only for local development or replace it with CA validation for production.
