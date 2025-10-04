// Door Knock Logger — Frontend v0.3.9

const APP_CONFIG = {
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbwTq0s0mFo3Vd70JI0fOA66h_4jB-ehE7msfsK6i4JrHbxxgxmwL9NE0l3fGa29IhZY/exec',
  VERSION: 'v0.3.9'
};

let map, marker, geocoder;
let lastAddr = null, lastLL = null;
let userState = 0;  // 0='?',1='brent',2='paris'

// Google Maps callback
window.initMap = () => {
  geocoder = new google.maps.Geocoder();
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat:33.4484, lng:-112.0740 },
    zoom: 19,
    mapTypeId: 'satellite',
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

  // UI binds
  document.getElementById('locate').onclick = useMyLoc;
  document.getElementById('drop').onclick   = () => {
    const c = map.getCenter();
    setMarker(c);
    reverseGeocode(c);
  };
  document.getElementById('log').onclick    = onLog;
  document.getElementById('user-btn').onclick = cycleUser;
  document.querySelectorAll('.chip').forEach(c => {
    c.onclick = () => {
      document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
    };
  });

  useMyLoc();
  loadPins().catch(()=>{});
};

function setStatus(t) {
  document.getElementById('status').textContent = t;
}

function setMarker(ll) {
  lastLL = ll;
  marker.setPosition(ll);
  document.getElementById('gps').textContent =
    `GPS: ${ll.lat().toFixed(5)}, ${ll.lng().toFixed(5)}`;
}

function reverseGeocode(ll) {
  geocoder.geocode({ location: ll }, (res,st) => {
    if(st==='OK'&&res[0]) {
      lastAddr = res[0].formatted_address;
      document.getElementById('addr').textContent = `Address: ${lastAddr}`;
      setStatus('Ready');
    } else setStatus('Geocode failed');
  });
}

function useMyLoc() {
  if(!navigator.geolocation) return setStatus('No geo');
  navigator.geolocation.getCurrentPosition(p=>{
    const ll = new google.maps.LatLng(p.coords.latitude,p.coords.longitude);
    map.setCenter(ll);
    setMarker(ll);
    reverseGeocode(ll);
  },e=>{console.warn(e); setStatus('Location error');},{enableHighAccuracy:true});
}

// Cycle user: ?, B, P
function cycleUser() {
  userState = (userState+1)%3;
  const btn = document.getElementById('user-btn');
  btn.className = '';
  if(userState===1) {
    btn.textContent='B';
    btn.classList.add('brent');
    document.documentElement.style.setProperty('--theme-color','#0ea5e9');
  } else if(userState===2) {
    btn.textContent='P';
    btn.classList.add('paris');
    document.documentElement.style.setProperty('--theme-color','#22c55e');
  } else {
    btn.textContent='?';
    document.documentElement.style.setProperty('--theme-color','#0ea5e9');
  }
}

// One-Tap Log
function onLog() {
  if(userState===0)            return setStatus('Select user');
  if(!lastLL || !lastAddr)     return setStatus('Waiting for GPS');
  const reason = document.querySelector('.chip.active').dataset.value;
  const payload = {
    timestamp: new Date().toISOString(),
    user_email: userState===2
      ? 'paris.wilcox@rocky.edu'
      : 'brent@tscstudios.com',
    lat: lastLL.lat(),
    lng: lastLL.lng(),
    address: lastAddr,
    city:'', state:'', zip:'',
    notes: document.getElementById('notes').value.trim(),
    reason,
    version: APP_CONFIG.VERSION
  };
  setStatus('Saving…');
  fetch(APP_CONFIG.ENDPOINT, {
    method:'POST',
    mode:'no-cors',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  })
  .then(()=>{
    setStatus('✅ Saved');
    document.getElementById('notes').value='';
    loadPins().catch(()=>{});
  })
  .catch(e=>{
    console.error(e);
    setStatus('⚠️ Save failed');
  });
}

// GET & render pins
async function loadPins() {
  const res = await fetch(APP_CONFIG.ENDPOINT);
  const rows = await res.json();
  if(!map) return;
  if(map._pins) map._pins.forEach(m=>m.setMap(null));
  map._pins = [];
  rows.forEach(r=>{
    const la=+r.lat, ln=+r.lng;
    if(!la||!ln) return;
    map._pins.push(new google.maps.Marker({
      position:{lat:la,lng:ln},
      map,
      icon:{url:'http://maps.google.com/mapfiles/ms/icons/red-dot.png'}
    }));
  });
}
