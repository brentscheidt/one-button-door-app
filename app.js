// Door Knock Logger — Frontend v0.3.11

const APP_CONFIG = {
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbwTq0s0mFo3Vd70JI0fOA66h_4jB-ehE7msfsK6i4JrHbxxgxmwL9NE0l3fGa29IhZY/exec',
  VERSION: 'v0.3.11'
};

let map, marker, geocoder;
let lastAddr = null, lastLL = null;
let userState = 0;  // 0='?',1='brent',2='paris'

window.initMap = () => {
  geocoder = new google.maps.Geocoder();
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat:33.4484, lng:-112.0740 },
    zoom:19,
    mapTypeId:'satellite',
    tilt:0,
    heading:0,
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

  document.getElementById('locate').onclick   = useMyLoc;
  document.getElementById('drop').onclick     = () => {
    const c = map.getCenter(); setMarker(c); reverseGeocode(c);
  };
  document.getElementById('log').onclick      = onLog;
  document.getElementById('user-btn').onclick = cycleUser;

  document.querySelectorAll('.chip').forEach(c => {
    c.onclick = () => {
      if (userState === 0) return;      // no reason if no user
      document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
    };
  });

  useMyLoc();
  loadPins();
};

function setStatus(t) {
  document.getElementById('status').textContent = t;
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
      setStatus('Ready');
    } else {
      setStatus('Geocode failed');
    }
  });
}

function useMyLoc() {
  if (!navigator.geolocation) return setStatus('No geo');
  navigator.geolocation.getCurrentPosition(pos=>{
    const ll = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    map.setCenter(ll);
    setMarker(ll);
    reverseGeocode(ll);
  }, err=>{
    console.warn(err);
    setStatus('Location error');
  },{ enableHighAccuracy:true });
}

function cycleUser() {
  userState = (userState + 1) % 3;
  const btn = document.getElementById('user-btn');
  btn.className = '';
  document.querySelectorAll('.chip').forEach(x=> x.classList.remove('active'));
  if (userState === 1) {
    btn.textContent = 'B';
    btn.classList.add('brent');
    document.documentElement.style.setProperty('--theme-color','#0ea5e9');
  } else if (userState === 2) {
    btn.textContent = 'P';
    btn.classList.add('paris');
    document.documentElement.style.setProperty('--theme-color','#22c55e');
  } else {
    btn.textContent = '?';
    document.documentElement.style.setProperty('--theme-color','#0ea5e9');
  }
  setStatus(userState===0 ? 'Select user' : 'Ready');
}

async function onLog() {
  if (userState === 0)       return setStatus('Select user');
  if (!lastLL || !lastAddr)  return setStatus('Waiting for GPS');

  const reasonEl = document.querySelector('.chip.active');
  const reason = reasonEl ? reasonEl.dataset.value : '';
  const payload = {
    timestamp: new Date().toISOString(),
    user_email: userState===2
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

  setStatus('Saving…');
  try {
    const res = await fetch(APP_CONFIG.ENDPOINT, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.ok) {
      setStatus('✅ Saved');
      document.getElementById('notes').value = '';
      loadPins();
    } else {
      setStatus('⚠️ '+ (result.error||'save failed'));
    }
  } catch(err) {
    console.error(err);
    setStatus('⚠️ Save failed');
  }
}

async function loadPins() {
  try {
    const res = await fetch(APP_CONFIG.ENDPOINT);
    const rows = await res.json();
    if (!map) return;
    // clear old
    if (map._pins) map._pins.forEach(m=>m.setMap(null));
    map._pins = [];

    rows.forEach(r=>{
      const la = parseFloat(r.lat), ln = parseFloat(r.lng);
      if (!la||!ln) return;
      const m = new google.maps.Marker({
        position:{lat:la,lng:ln},
        map,
        icon:{url:'http://maps.google.com/mapfiles/ms/icons/red-dot.png'}
      });
      m.addListener('click', ()=> {
        const content = `
          <strong>${r.address}</strong><br>
          <em>${r.status}</em><br>
          Notes: ${r.notes||'<none>'}
        `;
        new google.maps.InfoWindow({ content }).open(map, m);
      });
      map._pins.push(m);
    });
  } catch(err) {
    console.error('Load pins failed', err);
  }
}
