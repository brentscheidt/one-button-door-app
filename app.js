// app.js — One Button Door App (v0.3.3)
const ENDPOINT = (window.APP_CONFIG && window.APP_CONFIG.ENDPOINT) || "YOUR_WEB_APP_URL";

let map, geocoder, marker, selectedMarker;
let currentUserEmail = "";
let allPins = [];

function initMap() {
  geocoder = new google.maps.Geocoder();
  detectUser().then((email) => { currentUserEmail = email; });
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
      const latlng = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (!map) {
        map = new google.maps.Map(document.getElementById("map"), { center: latlng, zoom: 18, gestureHandling: "greedy" });
      }
      if (!marker) {
        marker = new google.maps.Marker({ position: latlng, map, title: "Current Location", icon: { url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" } });
      } else { marker.setPosition(latlng); map.setCenter(latlng); }
      map.addListener("click", (event) => {
        if (selectedMarker) selectedMarker.setMap(null);
        selectedMarker = new google.maps.Marker({ position: event.latLng, map, draggable: true, title: "Selected Address" });
        reverseGeocode(event.latLng);
      });
      loadExistingPins();
    }, (error) => alert("Geolocation error: " + error.message), { enableHighAccuracy: true, maximumAge: 0 });
  } else { alert("Geolocation not supported."); }
}

function detectUser() {
  return new Promise((resolve) => {
    const choice = prompt("Enter your name (Brent or Paris):");
    if (choice && choice.toLowerCase().includes("paris")) resolve("paris@tscstudios.com");
    else resolve("brent@tscstudios.com");
  });
}

function reverseGeocode(latlng) {
  geocoder.geocode({ location: latlng }, (results, status) => {
    if (status === "OK" && results[0]) {
      const parsed = parseAddress(results[0]);
      selectedMarker.setTitle(parsed.address);
      selectedMarker.addressData = parsed;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("doorKnockBtn");
  if (btn) btn.addEventListener("click", () => {
    if (!selectedMarker) return alert("Tap a house on the map to select it first.");
    const latlng = selectedMarker.getPosition().toJSON();
    sendToSheet(latlng, selectedMarker.addressData);
  });
  const filter = document.getElementById("userFilter");
  if (filter) filter.addEventListener("change", () => renderPins(filter.value));
});

function parseAddress(result) {
  let city = "", state = "", zip = "";
  result.address_components.forEach((comp) => {
    if (comp.types.includes("locality")) city = comp.long_name;
    if (comp.types.includes("administrative_area_level_1")) state = comp.short_name;
    if (comp.types.includes("postal_code")) zip = comp.long_name;
  });
  return { address: result.formatted_address, city, state, zip };
}

function sendToSheet(latlng, parsed) {
  fetch(ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat: latlng.lat, lng: latlng.lng, address: parsed.address, city: parsed.city, state: parsed.state, zip: parsed.zip, timestamp: new Date().toISOString(), user_email: currentUserEmail, secret_ok: "" }),
  }).then(() => { alert("Knock logged: " + parsed.address + " for " + currentUserEmail); loadExistingPins(); })
    .catch((err) => console.error("Error sending to sheet:", err));
}

function loadExistingPins() {
  fetch(ENDPOINT).then((res) => res.json())
    .then((rows) => { allPins = rows; const filter = document.getElementById("userFilter"); renderPins(filter ? filter.value : "all"); })
    .catch((err) => console.error("Error loading pins:", err));
}

function renderPins(filter) {
  if (!map) return;
  if (map.existingMarkers) map.existingMarkers.forEach((m) => m.setMap(null));
  map.existingMarkers = [];
  allPins.forEach((row) => {
      allPins.forEach((row) => {
    if (!row.lat || !row.lng) return;
    if (filter !== "all" && String(row.user_email || "").toLowerCase().indexOf(filter) === -1) return;
    const pin = new google.maps.Marker({ position: { lat: parseFloat(row.lat), lng: parseFloat(row.lng) }, map, title: `${row.address} (${row.user_email || "unknown"})`, icon: { url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" } });
    map.existingMarkers.push(pin);
  });
}
