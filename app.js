// Frontend v0.3.15

const APP_CONFIG = {
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbwTq0s0mFo3Vd70JI0fOA66h_4jB-ehE7msfsK6i4JrHbxxgxmwL9NE0l3fGa29IhZY/exec',
  VERSION: 'v0.3.15'
};

let map, marker, geocoder, pins = [];
let lastAddr = null, lastLL = null;
let user = '', reason = '';

window.initMap = () => {
  geocoder = new google.maps.Geocoder();
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat:33.4484, lng:-112.0740 },
    zoom:19,
    mapTypeId:'hybrid',
    tilt:0, heading:0,
    rotateControl:false,
    streetViewControl:false,
    fullscreenControl:false,
    mapTypeControl:false
  });
  marker = new google.maps.Marker({ map, draggable:true });

  map.addListener('click', e => { setMarker(e.latLng); reverseGeocode(e.latLng); });
  marker.addListener('dragend', () => {
    const p = marker.getPosition();
    setMarker(p);
    reverseGeocode(p);
  });

  document.getElementById('locate').onclick         = useMyLoc;
  document.getElementById('drop').onclick           = () => {
    const c = map.getCenter();
    setMarker(c);
    reverseGeocode(c);
  };
  document.getElementById('user-select').onchange   = onUserChange;
  document.querySelectorAll('.chip').forEach(c => c.onclick = onReason);
  document.getElementById('log').onclick            = onLog;

  useMyLoc();
  loadPins();
};

function setMarker(ll) {
  lastLL = ll;
  marker.setPosition(ll);
}

function reverseGeocode(ll) {
  geocoder.geocode({ location: ll }, (res,st) => {
    if (st==='OK' && res[0]) {
      lastAddr = res[0].formatted_address;
      document.getElementById('addr').textContent = `Address: ${lastAddr}`;
      updateControls();
    }
  });
}

function useMyLoc() {
  navigator.geolocation?.getCurrentPosition(p => {
    const ll = new google.maps.LatLng(p.coords.latitude, p.coords.longitude);
    map.setCenter(ll);
    setMarker(ll);
    reverseGeocode(ll);
  }, ()=>{}, { enableHighAccuracy:true });
}

function onUserChange(e) {
  user = e.target.value;      // '' | 'brent' | 'paris'
  const sel = e.target;
  sel.className = '';
  if (user==='brent') sel.classList.add('brent');
  else if (user==='paris') sel.classList.add('paris');
  reason = '';
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  updateControls();
}

function onReason(evt) {
  reason = evt.currentTarget.dataset.value;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  evt.currentTarget.classList.add('active');
}

function updateControls() {
  const hasUser    = !!user;
  const hasAddress = !!lastAddr;
  const logBtn     = document.getElementById('log');

  // bottom button text + state
  if (!hasUser) {
    logBtn.textContent = 'Select user';
    logBtn.classList.remove('enabled');
    logBtn.disabled = true;
  } else if (!hasAddress) {
    logBtn.textContent = 'Waiting GPS';
    logBtn.classList.remove('enabled');
    logBtn.disabled = true;
  } else {
    logBtn.textContent = '💾 One-Tap Log';
    logBtn.classList.add('enabled');
    logBtn.disabled = false;
  }

  // chips only need user
  document.querySelectorAll('.chip').forEach(c=>{
    c.style.pointerEvents = hasUser ? 'auto':'none';
    c.style.opacity       = hasUser ? '1':'0.6';
  });
}

async function onLog() {
  const btn = document.getElementById('log');
  if (btn.disabled) return;
  const payload = {
    timestamp: new Date().toISOString(),
    user_email: user==='paris'
      ? 'paris.wilcox@rocky.edu'
      : 'brent@tscstudios.com',
    lat: lastLL.lat(), lng: lastLL.lng(),
    address: lastAddr,
    notes: document.getElementById('notes').value.trim(),
    reason,            // optional
    source_device:'web-mvp',
    version:APP_CONFIG.VERSION
  };
  btn.textContent = 'Saving…';
  try {
    const res = await fetch(APP_CONFIG.ENDPOINT, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const { ok, error } = await res.json();
    btn.textContent = ok ? '✅ Saved' : `⚠️ ${error}`;
    if (ok) {
      document.getElementById('notes').value = '';
      loadPins();
    }
  } catch {
    btn.textContent = '⚠️ Save failed';
  }
}

async function loadPins() {
  try {
    const res = await fetch(APP_CONFIG.ENDPOINT);
    const data = await res.json();
    pins.forEach(m=>m.setMap(null));
    pins = data.map(r=>{
      const la = parseFloat(r.lat), ln = parseFloat(r.lng);
      if (!la||!ln) return null;
      const m = new google.maps.Marker({
        position:{lat:la,lng:ln},
        map,
        icon:{url:'http://maps.google.com/mapfiles/ms/icons/red-dot.png'}
      });
      m.addListener('click',()=>{
        new google.maps.InfoWindow({
          content:`<strong>${r.address}</strong><br>
                   <em>${r.status}</em><br>
                   Notes: ${r.notes||'<none>'}`
        }).open(map,m);
      });
      return m;
    }).filter(Boolean);
  } catch{}
}
