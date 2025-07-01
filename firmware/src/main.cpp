#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include "config.h"

void setupCamera() {
  camera_config_t config;
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
  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x", err);
    ESP.restart();
  }
}

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void sendImageToServer(camera_fb_t *fb) {
  if (!fb) return;

  WiFiClientSecure client;
  client.setInsecure(); // Skip TLS validation (or load your CA)
  HTTPClient http;

  const String url = String("https://") + server + "/api/upload_cam";
  const String boundary = "----CAM" + String(millis());

  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
    http.addHeader("X-Auth-Token", auth_token);

    String bodyHeader =
      "--" + boundary + "\r\n"
      "Content-Disposition: form-data; name=\"file\"; filename=\"image.jpg\"\r\n"
      "Content-Type: image/jpeg\r\n\r\n";

    String bodyFooter = "\r\n--" + boundary + "--\r\n";

    size_t totalLen = bodyHeader.length() + fb->len + bodyFooter.length();
    uint8_t *payload = (uint8_t*)malloc(totalLen);
    if (!payload) { Serial.println("OOM"); return; }

    memcpy(payload, bodyHeader.c_str(), bodyHeader.length());
    memcpy(payload + bodyHeader.length(), fb->buf, fb->len);
    memcpy(payload + bodyHeader.length() + fb->len, bodyFooter.c_str(), bodyFooter.length());

    int httpCode = http.sendRequest("POST", payload, totalLen);
    free(payload);

    if (httpCode == HTTP_CODE_OK) {
      Serial.println("Image uploaded successfully");
    } else {
      Serial.printf("Upload failed, HTTP %d: %s\n", httpCode, http.errorToString(httpCode).c_str());
    }
    http.end();
  } else {
    Serial.println("HTTP connection failed");
  }
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  
  setupCamera();
  connectWiFi();
}

void loop() {
  static unsigned long lastCapture = 0;
  
  if (millis() - lastCapture >= CAPTURE_INTERVAL) {
    lastCapture = millis();
    
    if (WiFi.status() == WL_CONNECTED) {
      camera_fb_t *fb = esp_camera_fb_get();
      if (fb) {
        Serial.printf("Captured image (%d bytes)\n", fb->len);
        sendImageToServer(fb);
        esp_camera_fb_return(fb);
      } else {
        Serial.println("Camera capture failed");
      }
    } else {
      Serial.println("WiFi disconnected, reconnecting...");
      WiFi.reconnect();
    }
  }
  
  delay(100);
}