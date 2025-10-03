/* Door Knock Logger – app.js v0.2 */
let map, marker, geocoder;
let lastAddress = null, lastLatLng = null;

function initMap() {
  const cfg = window.APP_CONFIG;
  if (!cfg) { alert('Config not loaded'); return; }
  geocoder = new google.maps.Geocoder();
  map = new google.maps.Map(document.getElementById('map'), {
    center: cfg.DEFAULT_CENTER || { lat: 33.4484, lng: -112.0740 },
    zoom: 16,
    mapTypeControl: false, streetViewControl: false, fullscreenControl: false
  });
  marker = new google.maps.Marker({ map, draggable: true });

  map.addListener('click', (e) => { setMarker(e.latLng); reverseGeocode(e.latLng); });
  marker.addEventListener?.('dragend', () => { const p = marker.getPosition(); setMarker(p); reverseGeocode(p); });
  google.maps.event.addListener(marker, 'dragend', () => { const p = marker.getPosition(); setMarker(p); reverseGeocode(p); });

  document.getElementById('locate').addEventListener('click', useMyLocation);
  document.getElementById('drop').addEventListener('click', () => { setMarker(map.getCenter()); reverseGeocode(map.getCenter()); });
  document.getElementById('log').addEventListener('click', onLog);

  document.getElementById('reasons').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });

  useMyLocation();
}

function useMyLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((pos) => {
    const ll = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    map.setCenter(ll); setMarker(ll); reverseGeocode(ll);
  }, (err) => { console.warn('Geolocation error', err); setStatus('Location error'); });
}

function setMarker(latLng) {
  lastLatLng = latLng;
  marker.setPosition(latLng);
  document.getElementById('gps').textContent = `GPS: ${latLng.lat().toFixed(5)}, ${latLng.lng().toFixed(5)}`;
}

function reverseGeocode(latLng) {
  geocoder.geocode({ location: latLng }, (results, status) => {
    if (status === 'OK' && results && results[0]) {
      lastAddress = parseAddress(results[0]);
      document.getElementById('addr').textContent = `Address: ${lastAddress.formatted}`;
    } else {
      setStatus('Geocode failed');
    }
  });
}

function parseAddress(geo) {
  const comps = geo.address_components || [];
  const find = (t) => (comps.find(c => (c.types||[]).includes(t))||{}).long_name || '';
  const short = (t) => (comps.find(c => (c.types||[]).includes(t))||{}).short_name || '';
  return {
    formatted: geo.formatted_address || '',
    street: `${find('street_number')} ${find('route')}`.trim(),
    city: find('locality') || find('sublocality') || find('postal_town') || '',
    state: short('administrative_area_level_1') || '',
    zip: find('postal_code') || ''
  };
}

function selectedReason() {
  const active = document.querySelector('.chip.active');
  return active ? active.dataset.value : 'Knocked';
}

async function onLog() {
  const cfg = window.APP_CONFIG || {};
  if (!lastLatLng || !lastAddress) { setStatus('Waiting for GPS/address…'); return; }
  const payload = {
    secret: cfg.SHARED_SECRET,
    ts_iso: new Date().toISOString(),
    reason: selectedReason(),
    notes: document.getElementById('notes').value.trim(),
    lat: lastLatLng.lat(),
    lng: lastLatLng.lng(),
    address: lastAddress.formatted,
    city: lastAddress.city,
    state: lastAddress.state,
    zip: lastAddress.zip,
    source_device: cfg.SOURCE_DEVICE || 'web-mvp',
    version: cfg.VERSION || 'v0.2'
  };

  try {
    setStatus('Saving…');
    const res = await fetch(cfg.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoid CORS preflight
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Save failed');
    setStatus('✅ Saved');
    document.getElementById('notes').value = '';
  } catch (err) {
    console.error(err);
    setStatus('⚠️ Save failed');
    alert(`Save failed: ${err.message}\n\nCheck your APPS_SCRIPT_URL and secret.`);
  }
}

function setStatus(text) { document.getElementById('status').textContent = text; }
