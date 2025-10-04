// Frontend v0.3.14

const APP_CONFIG = {
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbwTq0s0mFo3Vd70JI0fOA66h_4jB-ehE7msfsK6i4JrHbxxgxmwL9NE0l3fGa29IhZY/exec',
  VERSION: 'v0.3.14'
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

  // UI
  document.getElementById('locate').onclick   = useMyLoc;
  document.getElementById('drop').onclick     = () => {
    const c = map.getCenter();
    setMarker(c);
    reverseGeocode(c);
  };
  document.getElementById('user-select').onchange = onUserChange;
  document.querySelectorAll('.chip').forEach(c => c.onclick = onReason);
  document.getElementById('log').onclick      = onLog;

  useMyLoc();
  loadPins();
};

function setStatus(t) {
  document.getElementById('log').textContent = t;
  document.getElementById('status')?.textContent = t;
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
    setStatus('Loc error');
  },{ enableHighAccuracy:true });
}

function onUserChange(e) {
  user = e.target.value;      // ''|'brent'|'paris'
  const sel = e.target;
  sel.className = '';
  if (user==='brent') sel.classList.add('brent');
  else if (user==='paris') sel.classList.add('paris');
  reason = '';
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  setStatus(user? '💾 One-Tap Log':'Select user');
  updateControls();
}

function onReason(evt) {
  if (!user) return;
  reason = evt.currentTarget.dataset.value;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  evt.currentTarget.classList.add('active');
  setStatus('💾 One-Tap Log');
  updateControls();
}

function updateControls() {
  const ready = !!user && !!lastAddr && !!reason;
  document.querySelectorAll('.chip')
    .forEach(c=>{
      c.style.pointerEvents = user? 'auto':'none';
      c.style.opacity       = user? '1':'0.6';
    });
  const logBtn = document.getElementById('log');
  logBtn.classList.toggle('enabled', ready);
  logBtn.disabled = !ready;
}

async function onLog() {
  if (!user)    return setStatus('Select user');
  if (!lastLL)  return setStatus('Waiting GPS');
  if (!reason)  return setStatus('Select reason');

  setStatus('Saving…');
  try {
    const res = await fetch(APP_CONFIG.ENDPOINT, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        user_email: user==='paris'
          ? 'paris.wilcox@rocky.edu'
          : 'brent@tscstudios.com',
        lat: lastLL.lat(), lng: lastLL.lng(),
        address: lastAddr,
        notes: document.getElementById('notes').value.trim(),
        reason,
        source_device:'web-mvp',
        version:APP_CONFIG.VERSION
      })
    });
    const { ok, error } = await res.json();
    if (ok) {
      setStatus('✅ Saved');
      document.getElementById('notes').value = '';
      loadPins();
    } else setStatus('⚠️ '+error);
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
      m.addListener('click',()=> {
        new google.maps.InfoWindow({
          content:`<strong>${r.address}</strong><br>
                  <em>${r.status}</em><br>
                  Notes: ${r.notes||'<none>'}`
        }).open(map,m);
      });
      return m;
    }).filter(Boolean);
  } catch(err) {
    console.error(err);
  }
}
