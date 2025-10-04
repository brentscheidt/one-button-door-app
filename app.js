// Door Knock Logger — Frontend v0.3.13

const APP_CONFIG = {
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbwTq0s0mFo3Vd70JI0fOA66h_4jB-ehE7msfsK6i4JrHbxxgxmwL9NE0l3fGa29IhZY/exec',
  VERSION: 'v0.3.13'
};

let map, marker, geocoder, pins = [];
let lastAddr = null, lastLL = null;
let user = '';   // '' | 'brent' | 'paris'
let reason = '';

window.initMap = () => {
  geocoder = new google.maps.Geocoder();
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat:33.4484, lng:-112.0740 },
    zoom: 19,
    mapTypeId: 'hybrid',
    tilt: 0,
    heading: 0,
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

  document.getElementById('locate').onclick    = useMyLoc;
  document.getElementById('drop').onclick      = () => {
    const c = map.getCenter();
    setMarker(c);
    reverseGeocode(c);
  };
  document.getElementById('user-btn').onclick  = cycleUser;
  document.querySelectorAll('.chip').forEach(c => c.onclick = onReasonChoosen);
  document.getElementById('log').onclick       = onLog;

  useMyLoc();
  loadPins();
};

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

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
    } else {
      setStatus('Geocode failed');
    }
  });
}

function useMyLoc() {
  if (!navigator.geolocation) return setStatus('No geo');
  navigator.geolocation.getCurrentPosition(p=>{
    const ll = new google.maps.LatLng(p.coords.latitude, p.coords.longitude);
    map.setCenter(ll);
    setMarker(ll);
    reverseGeocode(ll);
  },e=>{
    console.warn(e);
    setStatus('Location error');
  },{ enableHighAccuracy:true });
}

function cycleUser() {
  if (user === '')        user = 'brent';
  else if (user === 'brent')  user = 'paris';
  else                       user = '';
  const btn = document.getElementById('user-btn');
  btn.className = '';
  reason = '';
  document.querySelectorAll('.chip').forEach(c=>{
    c.classList.remove('active');
  });
  if (user==='brent') btn.classList.add('brent'), btn.textContent='B';
  else if (user==='paris') btn.classList.add('paris'), btn.textContent='P';
  else btn.textContent='?';
  setStatus(user? 'Ready':'Select user');
  updateControls();
}

function onReasonChoosen(evt) {
  if (!user) return;
  reason = evt.currentTarget.dataset.value;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  evt.currentTarget.classList.add('active');
}

function updateControls() {
  const hasLocation = !!lastAddr;
  const hasUser     = !!user;
  document.querySelectorAll('.chip').forEach(c => {
    c.style.pointerEvents = hasUser && hasLocation ? 'auto' : 'none';
    c.style.opacity       = hasUser && hasLocation ? '1' : '0.6';
  });

  const logBtn = document.getElementById('log');
  const canLog = hasUser && hasLocation && !!reason;
  logBtn.classList.toggle('enabled', canLog);
  logBtn.textContent = canLog
    ? '💾 One-Tap Log'
    : ( user ? 'Select reason' : 'Select user' );

  ['locate','drop'].forEach(id=>{
    document.getElementById(id).classList.add('enabled');
  });
}

async function onLog() {
  if (!user)             return setStatus('Select user');
  if (!lastLL || !lastAddr) return setStatus('Waiting for GPS');
  if (!reason)           return setStatus('Select reason');

  setStatus('Saving…');
  const payload = {
    timestamp: new Date().toISOString(),
    user_email: user==='paris'
      ? 'paris.wilcox@rocky.edu'
      : 'brent@tscstudios.com',
    lat: lastLL.lat(),
    lng: lastLL.lng(),
    address: lastAddr,
    notes: document.getElementById('notes').value.trim(),
    reason,
    source_device:'web-mvp',
    version: APP_CONFIG.VERSION
  };

  try {
    const res = await fetch(APP_CONFIG.ENDPOINT, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const { ok, error } = await res.json();
    if (ok) {
      setStatus('✅ Saved');
      document.getElementById('notes').value = '';
      loadPins();
    } else {
      setStatus('⚠️ '+error);
    }
  } catch(err) {
    console.error(err);
    setStatus('⚠️ Save failed');
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
  } catch(err) {
    console.error('Could not load pins', err);
  }
}
