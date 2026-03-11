#include "esp_camera.h"

// AI Thinker ESP32-CAM pin definitions.
#define FLASH_GPIO_NUM 4
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

camera_config_t config;

enum DitheringAlgorithm {
  FLOYD_STEINBERG,
  JARVIS_JUDICE_NINKE,
  STUCKI
};

DitheringAlgorithm ditherAlgorithm = FLOYD_STEINBERG;

bool disableDithering = false;
bool invert = false;
bool isFlashOn = false;
bool stopStream = false;

void handleSerialInput();
void initializeCamera();
void processImage(camera_fb_t *frameBuffer);
void ditherImage(camera_fb_t *frameBuffer);
bool isDarkBit(uint8_t value);
bool isInsideBounds(int x, int y, int width, int height);
void diffuseError(camera_fb_t *frameBuffer, int x, int y, int deltaX, int deltaY, int error, int weight, int divisor);

void setup() {
  Serial.begin(230400);
  initializeCamera();
}

void loop() {
  if (!stopStream) {
    camera_fb_t *frameBuffer = esp_camera_fb_get();
    if (frameBuffer) {
      processImage(frameBuffer);
      esp_camera_fb_return(frameBuffer);
    }
    delay(50);
  }

  handleSerialInput();
}

void handleSerialInput() {
  if (Serial.available() <= 0) {
    return;
  }

  char input = Serial.read();
  sensor_t *cameraSensor = esp_camera_sensor_get();

  switch (input) {
    case '>':
      disableDithering = !disableDithering;
      break;
    case '<':
      invert = !invert;
      break;
    case 'B':
      cameraSensor->set_brightness(cameraSensor, cameraSensor->status.brightness + 1);
      break;
    case 'b':
      cameraSensor->set_brightness(cameraSensor, cameraSensor->status.brightness - 1);
      break;
    case 'C':
      cameraSensor->set_contrast(cameraSensor, cameraSensor->status.contrast + 1);
      break;
    case 'c':
      cameraSensor->set_contrast(cameraSensor, cameraSensor->status.contrast - 1);
      break;
    case 'P':
      if (!isFlashOn) {
        isFlashOn = true;
        pinMode(FLASH_GPIO_NUM, OUTPUT);
        digitalWrite(FLASH_GPIO_NUM, HIGH);
        delay(2000);
        digitalWrite(FLASH_GPIO_NUM, LOW);
        delay(50);
        isFlashOn = false;
      }
      break;
    case 'M':
      cameraSensor->set_hmirror(cameraSensor, !cameraSensor->status.hmirror);
      break;
    case 'S':
      stopStream = false;
      break;
    case 's':
      stopStream = true;
      break;
    case '0':
      ditherAlgorithm = FLOYD_STEINBERG;
      break;
    case '1':
      ditherAlgorithm = JARVIS_JUDICE_NINKE;
      break;
    case '2':
      ditherAlgorithm = STUCKI;
      break;
    default:
      break;
  }
}

void initializeCamera() {
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_GRAYSCALE;
  config.frame_size = FRAMESIZE_QQVGA;
  config.fb_count = 1;

  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);
  isFlashOn = false;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  sensor_t *sensor = esp_camera_sensor_get();
  sensor->set_contrast(sensor, 2);
  sensor->set_vflip(sensor, true);
  sensor->set_hmirror(sensor, true);
}

void processImage(camera_fb_t *frameBuffer) {
  if (!disableDithering) {
    ditherImage(frameBuffer);
  }

  uint8_t outputRow = 0;
  for (uint8_t y = 28; y < 92; ++y) {
    Serial.print("Y:");
    Serial.print((char)outputRow);

    size_t rowOffset = y * frameBuffer->width;
    for (uint8_t x = 16; x < 144; x += 8) {
      char packedByte = 0;
      for (uint8_t bitIndex = 0; bitIndex < 8; ++bitIndex) {
        if (isDarkBit(frameBuffer->buf[rowOffset + x + (7 - bitIndex)])) {
          packedByte |= (uint8_t)1 << bitIndex;
        }
      }
      Serial.print(packedByte);
    }

    ++outputRow;
    Serial.flush();
  }
}

void ditherImage(camera_fb_t *frameBuffer) {
  const int width = frameBuffer->width;
  const int height = frameBuffer->height;

  for (int y = 0; y < height; ++y) {
    for (int x = 0; x < width; ++x) {
      size_t currentIndex = (y * width) + x;
      uint8_t oldPixel = frameBuffer->buf[currentIndex];
      uint8_t newPixel = oldPixel >= 128 ? 255 : 0;
      frameBuffer->buf[currentIndex] = newPixel;
      int error = (int)oldPixel - (int)newPixel;

      switch (ditherAlgorithm) {
        case JARVIS_JUDICE_NINKE:
          diffuseError(frameBuffer, x, y, 1, 0, error, 7, 48);
          diffuseError(frameBuffer, x, y, 2, 0, error, 5, 48);
          diffuseError(frameBuffer, x, y, -2, 1, error, 3, 48);
          diffuseError(frameBuffer, x, y, -1, 1, error, 5, 48);
          diffuseError(frameBuffer, x, y, 0, 1, error, 7, 48);
          diffuseError(frameBuffer, x, y, 1, 1, error, 5, 48);
          diffuseError(frameBuffer, x, y, 2, 1, error, 3, 48);
          diffuseError(frameBuffer, x, y, -2, 2, error, 1, 48);
          diffuseError(frameBuffer, x, y, -1, 2, error, 3, 48);
          diffuseError(frameBuffer, x, y, 0, 2, error, 5, 48);
          diffuseError(frameBuffer, x, y, 1, 2, error, 3, 48);
          diffuseError(frameBuffer, x, y, 2, 2, error, 1, 48);
          break;
        case STUCKI:
          diffuseError(frameBuffer, x, y, 1, 0, error, 8, 42);
          diffuseError(frameBuffer, x, y, 2, 0, error, 4, 42);
          diffuseError(frameBuffer, x, y, -2, 1, error, 2, 42);
          diffuseError(frameBuffer, x, y, -1, 1, error, 4, 42);
          diffuseError(frameBuffer, x, y, 0, 1, error, 8, 42);
          diffuseError(frameBuffer, x, y, 1, 1, error, 4, 42);
          diffuseError(frameBuffer, x, y, 2, 1, error, 2, 42);
          diffuseError(frameBuffer, x, y, -2, 2, error, 1, 42);
          diffuseError(frameBuffer, x, y, -1, 2, error, 2, 42);
          diffuseError(frameBuffer, x, y, 0, 2, error, 4, 42);
          diffuseError(frameBuffer, x, y, 1, 2, error, 2, 42);
          diffuseError(frameBuffer, x, y, 2, 2, error, 1, 42);
          break;
        case FLOYD_STEINBERG:
        default:
          diffuseError(frameBuffer, x, y, 1, 0, error, 7, 16);
          diffuseError(frameBuffer, x, y, -1, 1, error, 3, 16);
          diffuseError(frameBuffer, x, y, 0, 1, error, 5, 16);
          diffuseError(frameBuffer, x, y, 1, 1, error, 1, 16);
          break;
      }
    }
  }
}

bool isInsideBounds(int x, int y, int width, int height) {
  return x >= 0 && x < width && y >= 0 && y < height;
}

void diffuseError(camera_fb_t *frameBuffer, int x, int y, int deltaX, int deltaY, int error, int weight, int divisor) {
  const int targetX = x + deltaX;
  const int targetY = y + deltaY;
  const int width = frameBuffer->width;
  const int height = frameBuffer->height;

  if (!isInsideBounds(targetX, targetY, width, height)) {
    return;
  }

  size_t index = (targetY * width) + targetX;
  int adjusted = (int)frameBuffer->buf[index] + (error * weight / divisor);
  if (adjusted < 0) {
    adjusted = 0;
  } else if (adjusted > 255) {
    adjusted = 255;
  }

  frameBuffer->buf[index] = (uint8_t)adjusted;
}

bool isDarkBit(uint8_t value) {
  return invert ? value >= 128 : value < 128;
}
