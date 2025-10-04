// Door Knock Logger — Frontend v0.3.3

const APP_CONFIG = {
  ENDPOINT : 'https://script.google.com/macros/s/AKfycbwTq0s0mFo3Vd70JI0fOA66h_4jB-ehE7msfsK6i4JrHbxxgxmwL9NE0l3fGa29IhZY/exec',
  MAPS_KEY : 'AIzaSyB0F-GLFjHHe9XKPAEHJdr5byv20WG_k3Q',
  VERSION  : 'v0.3.4'
};


const DEBUG = false;
function debug(msg, obj) {
  if (!DEBUG) return;
  console.log('[DEBUG]', msg, obj || '');
  let box = document.getElementById('debugbox');
  if (!box) {
    box = document.createElement('pre');
    box.id = 'debugbox';
    Object.assign(box.style, {
      position:'fixed', bottom:'8px', left:'8px', right:'8px',
      maxHeight:'30vh', overflow:'auto', background:'#111', color:'#0f0',
      padding:'8px', fontSize:'12px', zIndex:999999, opacity:.9
    });
    document.body.appendChild(box);
  }
  box.textContent = (new Date().toLocaleTimeString()) + ' — ' + msg +
    (obj ? '\n' + JSON.stringify(obj, null, 2) : '') + '\n\n' + box.textContent;
}

let map, marker, geocoder;
let lastAddress = null, lastLatLng = null;

// expose for Google Maps callback
window.initMap = function initMap() {
  geocoder = new google.maps.Geocoder();
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 33.4484, lng: -112.0740 },
    zoom: 16,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });
  marker = new google.maps.Marker({ map, draggable: true });

  map.addListener('click', (e) => {
    setMarker(e.latLng);
    reverseGeocode(e.latLng);
  });
  marker.addListener('dragend', () => {
    const p = marker.getPosition();
    setMarker(p);
    reverseGeocode(p);
  });

  document.getElementById('locate').addEventListener('click', useMyLocation);
  document.getElementById('drop').addEventListener('click', () => {
    setMarker(map.getCenter());
    reverseGeocode(map.getCenter());
  });
  document.getElementById('log').addEventListener('click', onLog);
  document.getElementById('reasons').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });

  useMyLocation();
  loadExistingPins();
};

function detectUser() {
  return new Promise((resolve) => {
    const choice = (prompt("Enter your name (Brent or Paris):") || '').trim().toLowerCase();
    if (choice.includes("paris")) resolve("paris.wilcox@rocky.edu");
    else resolve("brent@tscstudios.com");
  });
}

function setStatus(text) { document.getElementById('status').textContent = text; }

function setMarker(latLng) {
  lastLatLng = latLng;
  marker.setPosition(latLng);
  document.getElementById('gps').textContent =
    `GPS: ${latLng.lat().toFixed(5)}, ${latLng.lng().toFixed(5)}`;
}

function reverseGeocode(latLng) {
  geocoder.geocode({ location: latLng }, (results, status) => {
    if (status === 'OK' && results && results[0]) {
      const geo = results[0];
      const comps = geo.address_components || [];
      const find = (t) => (comps.find(c => (c.types||[]).includes(t))||{}).long_name || '';
      const short = (t) => (comps.find(c => (c.types||[]).includes(t))||{}).short_name || '';

      lastAddress = {
        formatted: geo.formatted_address || '',
        street: `${find('street_number')} ${find('route')}`.trim(),
        city: find('locality') || find('sublocality') || find('postal_town') || '',
        state: short('administrative_area_level_1') || '',
        zip: find('postal_code') || ''
      };
      document.getElementById('addr').textContent = `Address: ${lastAddress.formatted}`;
      debug('reverseGeocode', lastAddress);
    } else {
      setStatus('Geocode failed');
    }
  });
}

async function useMyLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((pos) => {
    const ll = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    map.setCenter(ll);
    setMarker(ll);
    reverseGeocode(ll);
  }, (err) => { console.warn('Geolocation error', err); setStatus('Location error'); }, {
    enableHighAccuracy: true, maximumAge: 0
  });
}

function selectedReason() {
  const active = document.querySelector('.chip.active');
  return active ? active.dataset.value : 'Knocked';
}

async function onLog() {
  if (!lastLatLng || !lastAddress) { setStatus('Waiting for GPS/address…'); return; }
  const user_email = await detectUser();

  const payload = {
    timestamp: new Date().toISOString(),
    user_email,
    lat: lastLatLng.lat(),
    lng: lastLatLng.lng(),
    address: lastAddress.formatted,
    city: lastAddress.city,
    state: lastAddress.state,
    zip: lastAddress.zip,
    notes: document.getElementById('notes').value.trim(),
    source_device: 'web-mvp',
    version: APP_CONFIG.VERSION
  };

  try {
    setStatus('Saving…');
    const res = await fetch(APP_CONFIG.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Save failed');
    setStatus('✅ Saved');
    document.getElementById('notes').value = '';
    loadExistingPins(); // refresh after save
  } catch (err) {
    console.error(err);
    setStatus('⚠️ Save failed');
    alert(`Save failed: ${err.message}`);
  }
}

async function loadExistingPins() {
  try {
    const res = await fetch(APP_CONFIG.ENDPOINT);
    const rows = await res.json();
    debug('rows loaded', rows.length);

    if (!map) return;
    if (map.existingMarkers) map.existingMarkers.forEach(m => m.setMap(null));
    map.existingMarkers = [];

    rows.forEach(r => {
      const lat = parseFloat(r.lat), lng = parseFloat(r.lng);
      if (!lat || !lng) return; // skip rows without GPS
      const title = `${r.address || 'Unknown'} (${r.user_email || 'unknown'})`;
      const pin = new google.maps.Marker({
        position: { lat, lng }, map, title,
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }
      });
      map.existingMarkers.push(pin);
    });
  } catch (e) {
    console.warn('Load pins failed', e);
  }
}
