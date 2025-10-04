// Door Knock Logger — Frontend v0.3.6 (complete)

const APP_CONFIG = {
  ENDPOINT : 'https://script.google.com/macros/s/AKfycbwTq0s0mFo3Vd70JI0fOA66h_4jB-ehE7msfsK6i4JrHbxxgxmwL9NE0l3fGa29IhZY/exec',
  VERSION  : 'v0.3.6'
};

let map, marker, geocoder;
let lastAddress = null, lastLatLng = null;
let selectedUser = null;

window.initMap = function() {
  geocoder = new google.maps.Geocoder();
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat:33.4484, lng:-112.0740 },
    zoom:16,
    mapTypeControl:false,
    streetViewControl:false,
    fullscreenControl:false
  });
  marker = new google.maps.Marker({ map, draggable:true });

  map.addListener('click', e => { setMarker(e.latLng); reverseGeocode(e.latLng); });
  marker.addListener('dragend', () => {
    const pos = marker.getPosition();
    setMarker(pos);
    reverseGeocode(pos);
  });

  document.getElementById('locate').onclick = useMyLocation;
  document.getElementById('drop').onclick   = () => {
    const c = map.getCenter();
    setMarker(c);
    reverseGeocode(c);
  };
  document.getElementById('log').onclick    = onLog;
  document.getElementById('user-brent').onclick = ()=>setUser('brent');
  document.getElementById('user-paris').onclick = ()=>setUser('paris');
  document.querySelectorAll('.chip').forEach(c=>{
    c.onclick = ()=> {
      document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
    };
  });

  useMyLocation();
  loadExistingPins().catch(()=>{});
};

function setStatus(txt) {
  document.getElementById('status').textContent = txt;
}

function setMarker(latLng) {
  lastLatLng = latLng;
  marker.setPosition(latLng);
  document.getElementById('gps').textContent =
    `GPS: ${latLng.lat().toFixed(5)}, ${latLng.lng().toFixed(5)}`;
}

function reverseGeocode(latLng) {
  geocoder.geocode({ location: latLng }, (results, status) => {
    if(status==='OK' && results[0]) {
      const comps = results[0].address_components;
      const find = t => (comps.find(c=>c.types.includes(t))||{}).long_name||'';
      lastAddress = {
        formatted: results[0].formatted_address||'',
        city: find('locality')||find('postal_town')||'',
        state: find('administrative_area_level_1')||'',
        zip: find('postal_code')||''
      };
      document.getElementById('addr').textContent =
        `Address: ${lastAddress.formatted}`;
      setStatus('Ready');
    } else setStatus('Geocode failed');
  });
}

function useMyLocation() {
  if(!navigator.geolocation) return setStatus('No geo');
  navigator.geolocation.getCurrentPosition(pos=>{
    const ll = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    map.setCenter(ll);
    setMarker(ll);
    reverseGeocode(ll);
  }, err=>{
    console.warn(err);
    setStatus('Location error');
  }, { enableHighAccuracy:true, maximumAge:0 });
}

function setUser(user) {
  selectedUser = user;
  document.querySelectorAll('.user-btn').forEach(b=>{
    b.classList.remove('active','brent','paris');
  });
  const btn = document.getElementById(`user-${user}`);
  btn.classList.add('active', user);
  document.documentElement.style.setProperty(
    '--theme-color',
    user==='paris' ? '#22c55e' : '#0ea5e9'
  );
}

function onLog() {
  if(!selectedUser) {
    return setStatus('Select user');
  }
  if(!lastLatLng || !lastAddress) {
    return setStatus('Waiting for GPS');
  }

  const payload = {
    timestamp: new Date().toISOString(),
    user_email: selectedUser==='paris'
      ? 'paris.wilcox@rocky.edu'
      : 'brent@tscstudios.com',
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

  setStatus('Saving…');
  fetch(APP_CONFIG.ENDPOINT, {
    method: 'POST',
    mode:   'no-cors',
    headers:{ 'Content-Type':'application/json' },
    body:   JSON.stringify(payload)
  })
  .then(()=>{
    setStatus('✅ Saved');
    document.getElementById('notes').value = '';
    loadExistingPins().catch(()=>{});
  })
  .catch(e=>{
    console.error(e);
    setStatus('⚠️ Save failed');
  });
}

async function loadExistingPins() {
  const res  = await fetch(APP_CONFIG.ENDPOINT);
  const rows = await res.json();
  if(!map) return;
  if(map.existingMarkers) map.existingMarkers.forEach(m=>m.setMap(null));
  map.existingMarkers = [];
  rows.forEach(r=>{
    const la = parseFloat(r.lat), ln = parseFloat(r.lng);
    if(!la||!ln) return;
    const pin = new google.maps.Marker({
      position: { lat: la, lng: ln },
      map,
      icon: { url:'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }
    });
    map.existingMarkers.push(pin);
  });
}
