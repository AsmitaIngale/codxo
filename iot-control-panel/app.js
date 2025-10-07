(function () {
  const defaultConfig = {
    GOOGLE_MAPS_API_KEY: null, // set in config.js
    TELEMETRY_ENDPOINT: null,
    CONTROL_ENDPOINT: null,
    CAMERA_STREAM_URL: null, // e.g., http://device.local/stream.mjpeg
    TELEMETRY_POLL_MS: 2000,
    CAMERA_REFRESH_MS: 0, // >0 if using snapshot endpoint instead of MJPEG
    CENTER_ON_UPDATE: true,
  };

  const userConfig = (window.APP_CONFIG || {});
  const config = Object.assign({}, defaultConfig, userConfig);
  const isSimulated = !config.TELEMETRY_ENDPOINT;

  const els = {
    cameraImg: document.getElementById('cameraFeed'),
    cameraOverlay: document.getElementById('cameraOverlay'),
    temp: document.getElementById('temperatureValue'),
    battBar: document.getElementById('batteryLevel'),
    battPct: document.getElementById('batteryPercent'),
    fire: document.getElementById('fireStatus'),
    lat: document.getElementById('latValue'),
    lng: document.getElementById('lngValue'),
    last: document.getElementById('lastUpdated'),
    status: document.getElementById('appStatus'),
    conn: document.getElementById('connectionStatus'),
    btnMove: document.getElementById('btnMove'),
    btnStop: document.getElementById('btnStop'),
    btnSpray: document.getElementById('btnSpray'),
  };

  // Connection label
  els.conn.textContent = isSimulated ? 'Simulated Mode' : 'Live Mode';

  // ===== Camera =====
  function initCamera() {
    if (config.CAMERA_STREAM_URL) {
      els.cameraImg.src = cacheBust(config.CAMERA_STREAM_URL);
      els.cameraOverlay.classList.add('hidden');
      if (config.CAMERA_REFRESH_MS && config.CAMERA_REFRESH_MS > 0) {
        setInterval(() => {
          els.cameraImg.src = cacheBust(config.CAMERA_STREAM_URL);
        }, config.CAMERA_REFRESH_MS);
      }
    } else {
      els.cameraOverlay.classList.remove('hidden');
    }
  }

  function cacheBust(url) {
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + '_ts=' + Date.now();
  }

  // ===== Map =====
  let map = null;
  let marker = null;

  function loadGoogleMaps(apiKey) {
    return new Promise((resolve, reject) => {
      if (!apiKey) {
        resolve(null);
        return;
      }
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__onMapsLoaded`;
      script.async = true;
      script.defer = true;
      window.__onMapsLoaded = () => {
        resolve(window.google.maps);
        delete window.__onMapsLoaded;
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
  }

  function initMapIfPossible(pos) {
    if (!config.GOOGLE_MAPS_API_KEY) return; // user chose not to load maps
    loadGoogleMaps(config.GOOGLE_MAPS_API_KEY)
      .then((gmaps) => {
        if (!gmaps) return; // no key
        const mapEl = document.getElementById('map');
        const center = { lat: pos?.lat || 0, lng: pos?.lng || 0 };
        map = new gmaps.Map(mapEl, {
          center,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        marker = new gmaps.Marker({ position: center, map, title: 'Device' });
      })
      .catch((err) => setStatus('Map load error: ' + err.message, 'error'));
  }

  function updateMapPosition(lat, lng) {
    if (!map || !marker) return;
    const gmaps = window.google.maps;
    const pos = new gmaps.LatLng(lat, lng);
    marker.setPosition(pos);
    if (config.CENTER_ON_UPDATE) {
      map.setCenter(pos);
    }
  }

  // ===== Telemetry =====
  function normalizeTelemetry(data) {
    const temperatureC = data.temperatureC ?? data.temperature ?? data.temp_c ?? null;
    const batteryPercent = data.batteryPercent ?? data.battery ?? data.battery_pct ?? null;
    const fireDetected = data.fireDetected ?? data.fire ?? data.is_fire ?? false;

    let lat = null; let lng = null;
    if (data.gps && (data.gps.lat != null || data.gps.latitude != null)) {
      lat = data.gps.lat ?? data.gps.latitude;
      lng = data.gps.lng ?? data.gps.longitude;
    } else if (data.lat != null || data.latitude != null) {
      lat = data.lat ?? data.latitude;
      lng = data.lng ?? data.longitude;
    }
    return { temperatureC, batteryPercent, fireDetected, lat, lng };
  }

  function simulateTelemetry(prev) {
    const t = Date.now();
    const base = prev?.__simBase ?? {
      lat: 37.4219999,
      lng: -122.0840575,
      dir: Math.random() * Math.PI * 2,
      battery: 100,
    };
    // Walk a small step
    const step = 0.00015;
    const dir = base.dir + (Math.random() - 0.5) * 0.2;
    const lat = base.lat + Math.sin(dir) * step;
    const lng = base.lng + Math.cos(dir) * step;
    const battery = Math.max(0, base.battery - 0.05);
    const temperatureC = 20 + Math.sin(t / 15000) * 5 + (Math.random() - 0.5);
    const fireDetected = Math.random() < 0.02; // occasional blips
    const out = { temperatureC, batteryPercent: Math.round(battery), fireDetected, lat, lng };
    out.__simBase = { lat, lng, dir, battery };
    return out;
  }

  let lastSample = null;
  function startTelemetry() {
    const poll = async () => {
      try {
        let payload;
        if (config.TELEMETRY_ENDPOINT) {
          const res = await fetch(config.TELEMETRY_ENDPOINT, { cache: 'no-store' });
          if (!res.ok) throw new Error('Telemetry HTTP ' + res.status);
          const raw = await res.json();
          payload = normalizeTelemetry(raw);
        } else {
          payload = simulateTelemetry(lastSample);
        }
        lastSample = payload;
        applyTelemetry(payload);
      } catch (err) {
        setStatus('Telemetry error: ' + err.message, 'error');
        // Fallback to simulation on error
        const payload = simulateTelemetry(lastSample);
        lastSample = payload;
        applyTelemetry(payload);
      }
    };

    poll();
    setInterval(poll, Math.max(1000, config.TELEMETRY_POLL_MS));
  }

  function applyTelemetry(t) {
    if (t.temperatureC != null) {
      els.temp.textContent = t.temperatureC.toFixed(1) + ' °C';
    }
    if (t.batteryPercent != null) {
      const pct = Math.max(0, Math.min(100, Number(t.batteryPercent)));
      els.battPct.textContent = pct + '%';
      els.battBar.style.width = pct + '%';
      els.battBar.style.background = pct < 20 ? 'linear-gradient(90deg, #ef4444, #f59e0b)' : 'linear-gradient(90deg, #10b981, #3b82f6)';
    }
    const fire = !!t.fireDetected;
    els.fire.textContent = fire ? 'FIRE DETECTED' : 'Safe';
    els.fire.classList.toggle('alert', fire);
    els.fire.classList.toggle('ok', !fire);

    if (t.lat != null && t.lng != null) {
      els.lat.textContent = t.lat.toFixed(6);
      els.lng.textContent = t.lng.toFixed(6);
      updateMapPosition(t.lat, t.lng);
    }

    els.last.textContent = 'Last update: ' + new Date().toLocaleTimeString();
  }

  // ===== Controls =====
  async function sendControlAction(action) {
    const label = { move: 'Move', stop: 'Stop', spray: 'Spray' }[action] || action;
    try {
      if (config.CONTROL_ENDPOINT) {
        const res = await fetch(config.CONTROL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        setStatus(label + ' command sent', 'ok');
      } else {
        setStatus(label + ' (simulated)', 'ok');
      }
    } catch (err) {
      setStatus(label + ' failed: ' + err.message, 'error');
    }
  }

  function attachControlHandlers() {
    els.btnMove.addEventListener('click', () => sendControlAction('move'));
    els.btnStop.addEventListener('click', () => sendControlAction('stop'));
    els.btnSpray.addEventListener('click', () => sendControlAction('spray'));
  }

  // ===== Status line =====
  let statusTimeout = null;
  function setStatus(message, kind) {
    const color = kind === 'error' ? '#ef4444' : kind === 'ok' ? '#10b981' : '#9ca3af';
    els.status.textContent = message;
    els.status.style.color = color;
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      els.status.textContent = '';
    }, 4000);
  }

  // ===== Init =====
  function init() {
    initCamera();
    attachControlHandlers();
    startTelemetry();
    // Initialize the map as soon as we have a plausible position (or (0,0) if not)
    initMapIfPossible(lastSample || { lat: 0, lng: 0 });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
