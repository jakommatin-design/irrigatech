// Copy to secrets.h. Keep secrets.h out of Git.
// Device code is compiled locally and flashed to the ESP32.
#define IRRIGA_WIFI_SSID "YOUR_2_4_GHZ_WIFI_NAME"
#define IRRIGA_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define IRRIGA_API_BASE_URL "https://YOUR-RAILWAY-DOMAIN.up.railway.app"
#define IRRIGA_DEVICE_TOKEN "PASTE_THE_SAME_DEVICE_API_TOKEN_CONFIGURED_ON_SERVER"
#define IRRIGA_DEVICE_ID "GH001-ESP32-01"

// Paste the PEM root CA certificate that validates the API host's HTTPS chain.
// Keep the BEGIN/END CERTIFICATE lines and real line breaks. Do not disable TLS verification.
#define IRRIGA_ROOT_CA_PEM R"CERT(-----BEGIN CERTIFICATE-----
PASTE_REAL_ROOT_CA_CERTIFICATE_HERE
-----END CERTIFICATE-----
)CERT"
