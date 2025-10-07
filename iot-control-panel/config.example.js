// Copy this file to config.js and fill in values as needed.
// The app will work in "Simulated Mode" without endpoints.
window.APP_CONFIG = {
  // Get a key from Google Cloud Console and enable Maps JavaScript API
  GOOGLE_MAPS_API_KEY: "YOUR_GOOGLE_MAPS_API_KEY_HERE",

  // Optional: device REST endpoints. Leave empty to simulate data.
  TELEMETRY_ENDPOINT: "", // e.g., http://device.local/api/telemetry
  CONTROL_ENDPOINT: "",   // e.g., http://device.local/api/control

  // Optional: MJPEG or snapshot URL for camera
  CAMERA_STREAM_URL: "", // e.g., http://device.local/stream.mjpeg or /snapshot.jpg

  // Polling/refresh intervals
  TELEMETRY_POLL_MS: 2000,
  CAMERA_REFRESH_MS: 0, // set >0 for snapshot endpoints

  // Map behavior
  CENTER_ON_UPDATE: true,
};
