/* Platinum DoorKnock — v0.8.0
 * Frontend map + fast logging
 * Date: 02_15_26
 * Decisions: 30s polling; BLACK=DEAD; address-anchored pins; 1 pending offline log
 * Changes: Save button; bigger FAB; status tracking
 */

(() => {
  const CONFIG = {
    SCRIPT_BASE: "https://script.google.com/macros/s/AKfycbz3GOYhhmOL7zG1YailUatYyBHAK3jmTGMaafOGmmeDSgWgmIrW52pXZek2Ffeq0IPrfA/exec",
    GOOGLE_CLIENT_ID: "251697766355-o504ecjmj2laaa3gs599ejp4asjbe2es.apps.googleusercontent.com",
    REFRESH_SEC: 30,
    BREADCRUMB_SEC: 15,
    BREADCRUMB_MIN_DELTA_M: 15,
    LIVE_TRACK_STALE_MS: 15000,
    MAX_SESSION_BREADCRUMBS: 300,
    ROUTE_MAX_GAP_M: 300,
    MAX_NOTE_LEN: 50,
  };

  // State
  let map, geocoder, meMarker;
  let markers = new Map();
  let pinsIndex = new Map();
  let selectedPin = null;
  let selectedStatus = "";
  let selectedSub = "";
  let lastFetchHash = "";
  let sessionId = randId_();
  let sessionLabel = "";
  let crumbTimer = null;
  let sessionActive = false;
  let sessionPaused = false;
  let sessionStartMs = 0;
  let sessionElapsedMs = 0;
  let sessionKnockCount = 0;
  let sessionDisplayTimer = null;
  let currentFilter = localStorage.getItem("plat_filter") || "all";
  let routePolylines = [];
  let showingRoutes = false;
  let liveWatchId = null;
  let livePos = null;
  let breadcrumbMarkers = [];
  let breadcrumbPath = [];
  let breadcrumbPolyline = null;
  let breadcrumbInfoWindow = null;
  const SESSION_LABELS_KEY = "plat_session_labels";
  const SESSION_ARCHIVE_KEY = "plat_session_archive";

  // Auth state
  let authUser = JSON.parse(localStorage.getItem("plat_auth") || "null");
  // { name, email, picture, given_name }

  // DOM
  const d = (id) => document.getElementById(id);
  const toast = (msg) => {
    const el = d("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  };

  /* ---------- Init ---------- */
  window.initMap = init;
  window.handleGoogleSignIn = handleGoogleSignIn_;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else init();

  async function init() {
    geocoder = new google.maps.Geocoder();
    map = new google.maps.Map(d("map"), {
      center: { lat: 33.4484, lng: -112.0740 },
      zoom: 16,
      mapTypeId: "hybrid",
      clickableIcons: false,
      disableDefaultUI: true,
      gestureHandling: "greedy",
      styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }], // reduce clutter
    });
    breadcrumbInfoWindow = new google.maps.InfoWindow();

    d("locateBtn").addEventListener("click", locateMe_);
    d("locateBtn").addEventListener("long-press", forceLocate_); // hypothetical event, implementing via standard click for now or long press logic
    // Actually, let's just make a long press on locate button trigger force refresh
    let locTimer;
    d("locateBtn").addEventListener("mousedown", () => locTimer = setTimeout(forceLocate_, 1000));
    d("locateBtn").addEventListener("touchstart", () => locTimer = setTimeout(forceLocate_, 1000));
    d("locateBtn").addEventListener("mouseup", () => clearTimeout(locTimer));
    d("locateBtn").addEventListener("touchend", () => clearTimeout(locTimer));

    d("refreshBtn").addEventListener("click", fetchPins_);
    d("dropBtn").addEventListener("click", dropPinAtGps_);
    d("sessionToggle").addEventListener("click", toggleSession_);
    d("sessionPause").addEventListener("click", togglePause_);
    d("closePanel").addEventListener("click", closePanel_);
    d("saveBtn").addEventListener("click", saveCurrentPin_);
    d("dragonBtn").addEventListener("click", toggleDragonMenu_);
    d("dmRoutes").addEventListener("click", toggleRoutes_);
    d("dmStats").addEventListener("click", () => { closeDragonMenu_(); showSessionStats_(); });
    d("dmSettings").addEventListener("click", handleSettings_);
    d("dmAbout").addEventListener("click", () => { closeDragonMenu_(); toast("Platinum DoorKnock v0.8.0 — by BSRG 🐉"); });
    d("viewSelect").addEventListener("change", () => {
      currentFilter = d("viewSelect").value;
      localStorage.setItem("plat_filter", currentFilter);
      applyViewFilter_();
    });

    // Auth UI
    d("signInBtn").addEventListener("click", promptGoogleSignIn_);
    d("signOutBtn").addEventListener("click", signOut_);
    d("authArea").addEventListener("click", (e) => {
      if (authUser && !e.target.closest("#authMenu")) {
        d("authMenu").classList.toggle("show");
      }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#authArea")) d("authMenu").classList.remove("show");
    });

    // Map interactions: tap to close panel, long-press to drop pin
    let longPressTimer = null;
    let longPressStart = null;
    map.addListener("click", closePanel_);
    d("map").addEventListener("contextmenu", (e) => e.preventDefault());
    map.addListener("mousedown", (e) => {
      const dom = e.domEvent || {};
      if (typeof dom.button === "number" && dom.button !== 0) return;
      longPressStart = { x: dom.clientX || 0, y: dom.clientY || 0 };
      longPressTimer = setTimeout(() => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        dropPinAtLocation_(lat, lng);
        longPressTimer = null;
      }, 600);
    });
    map.addListener("mouseup", () => { clearTimeout(longPressTimer); longPressTimer = null; });
    map.addListener("dragstart", () => { clearTimeout(longPressTimer); longPressTimer = null; });
    map.addListener("mousemove", (e) => {
      if (longPressTimer && longPressStart) {
        const dom = e.domEvent || {};
        const dx = (dom.clientX || 0) - longPressStart.x;
        const dy = (dom.clientY || 0) - longPressStart.y;
        if (Math.sqrt(dx * dx + dy * dy) > 10) { clearTimeout(longPressTimer); longPressTimer = null; }
      }
    });
    map.addListener("contextmenu", (e) => {
      clearTimeout(longPressTimer); longPressTimer = null;
      if (e.domEvent && typeof e.domEvent.preventDefault === "function") e.domEvent.preventDefault();
      if (!e.latLng) return;
      dropPinAtLocation_(e.latLng.lat(), e.latLng.lng());
    });

    // Fast log buttons → show suboptions
    Array.from(d("topBtns").querySelectorAll("[data-top]")).forEach(btn => {
      btn.addEventListener("click", () => showSubOptions_(btn.getAttribute("data-top")));
    });

    // Panel interactions
    d("note").addEventListener("input", (e) => {
      if (e.target.value.length > CONFIG.MAX_NOTE_LEN) {
        e.target.value = e.target.value.slice(0, CONFIG.MAX_NOTE_LEN);
        toast(`Note limited to ${CONFIG.MAX_NOTE_LEN} chars`);
      }
    });

    // Restore filter + auth
    d("viewSelect").value = currentFilter;
    renderAuthUI_();
    initGoogleSignIn_();

    await locateMe_();
    await fetchPins_();
    setInterval(fetchPins_, CONFIG.REFRESH_SEC * 1000);
  }

  /* ---------- Google Sign-In ---------- */
  function initGoogleSignIn_() {
    if (typeof google === "undefined" || !google.accounts) {
      setTimeout(initGoogleSignIn_, 500);
      return;
    }
    google.accounts.id.initialize({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      callback: handleGoogleSignIn_,
      auto_select: true,
      itp_support: true,
    });
    // If not signed in, show One Tap
    if (!authUser) {
      google.accounts.id.prompt();
    }
  }

  function promptGoogleSignIn_() {
    if (typeof google !== "undefined" && google.accounts) {
      google.accounts.id.prompt((n) => {
        if (n.isNotDisplayed() || n.isSkippedMoment()) {
          // Fallback: render a button
          const cont = document.createElement("div");
          cont.id = "gsi-fallback";
          cont.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:#1a1a1e;padding:1.5rem;border-radius:12px;border:1px solid rgba(255,255,255,.1);";
          document.body.appendChild(cont);
          google.accounts.id.renderButton(cont, { theme: "filled_black", size: "large", shape: "pill" });
          setTimeout(() => { if (cont.parentNode) cont.remove(); }, 15000);
        }
      });
    }
  }

  function handleGoogleSignIn_(response) {
    const payload = decodeJwt_(response.credential);
    if (!payload) { toast("Sign-in failed"); return; }
    authUser = {
      name: payload.name || payload.email,
      given_name: payload.given_name || payload.name || "",
      email: payload.email,
      picture: payload.picture || "",
    };
    localStorage.setItem("plat_auth", JSON.stringify(authUser));
    renderAuthUI_();
    toast(`Welcome, ${authUser.given_name}!`);
    // Remove fallback popup if present
    const fb = document.getElementById("gsi-fallback");
    if (fb) fb.remove();
  }

  function signOut_() {
    authUser = null;
    localStorage.removeItem("plat_auth");
    d("authMenu").classList.remove("show");
    if (typeof google !== "undefined" && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
    renderAuthUI_();
    toast("Signed out");
  }

  function renderAuthUI_() {
    if (authUser) {
      d("signInBtn").style.display = "none";
      d("avatarImg").style.display = "block";
      d("avatarImg").src = authUser.picture;
      d("userName").style.display = "block";
      d("userName").textContent = authUser.given_name || authUser.name;
      d("menuEmail").textContent = authUser.email;
    } else {
      d("signInBtn").style.display = "";
      d("avatarImg").style.display = "none";
      d("userName").style.display = "none";
    }
  }

  function getUser_() {
    return authUser ? (authUser.given_name || authUser.name || authUser.email) : "";
  }

  function decodeJwt_(token) {
    try {
      const parts = token.split(".");
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(payload));
    } catch (e) { console.warn("JWT decode failed", e); return null; }
  }

  /* ---------- Map helpers ---------- */
  async function locateMe_() {
    startLiveTracking_();
    try {
      const point = await getBestPosition_();
      const latlng = { lat: point.lat, lng: point.lng };
      map.setCenter(latlng);
      map.panTo(latlng);
    } catch (e) {
      console.warn(e);
      toast("Location unavailable — check permissions");
      // Fallback: don't move map, just warn.
    }
  }

  // Force button for GPS stuck issues
  function forceLocate_() {
    stopLiveTracking_();
    toast("Resetting GPS...");
    setTimeout(locateMe_, 500);
  }

  function startLiveTracking_() {
    if (liveWatchId !== null || !navigator.geolocation) return;
    liveWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const point = normalizePosition_(pos);
        updateLiveMarker_(point);
      },
      (err) => {
        console.warn("Live location tracking failed", err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function stopLiveTracking_() {
    if (liveWatchId === null || !navigator.geolocation) return;
    navigator.geolocation.clearWatch(liveWatchId);
    liveWatchId = null;
  }

  function normalizePosition_(pos) {
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy_m: pos.coords.accuracy || null,
      speed_mps: typeof pos.coords.speed === "number" ? pos.coords.speed : null,
      ts: Date.now(),
    };
  }

  function updateLiveMarker_(point) {
    livePos = point;
    const latlng = { lat: point.lat, lng: point.lng };
    if (!meMarker) {
      meMarker = new google.maps.Marker({
        map,
        position: latlng,
        zIndex: 9999,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: "#1f6feb",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        title: "You (live)",
      });
      return;
    }
    meMarker.setPosition(latlng);
  }

  async function getBestPosition_() {
    const now = Date.now();
    if (livePos && (now - livePos.ts) <= CONFIG.LIVE_TRACK_STALE_MS) return livePos;
    const pos = await getPosition_();
    const point = normalizePosition_(pos);
    updateLiveMarker_(point);
    return point;
  }

  function clearBreadcrumbTrail_() {
    breadcrumbMarkers.forEach((m) => m.setMap(null));
    breadcrumbMarkers = [];
    breadcrumbPath = [];
    if (breadcrumbPolyline) {
      breadcrumbPolyline.setMap(null);
      breadcrumbPolyline = null;
    }
    if (breadcrumbInfoWindow) breadcrumbInfoWindow.close();
  }

  function addBreadcrumbMarker_(lat, lng, tsIso) {
    const visited = new Date(tsIso || Date.now());
    const latlng = { lat, lng };
    breadcrumbPath.push(latlng);
    if (!breadcrumbPolyline) {
      breadcrumbPolyline = new google.maps.Polyline({
        path: breadcrumbPath,
        geodesic: true,
        strokeColor: "#39a6ff",
        strokeOpacity: 0.85,
        strokeWeight: 3,
        map,
      });
    } else {
      breadcrumbPolyline.setPath(breadcrumbPath);
    }

    const marker = new google.maps.Marker({
      map,
      position: latlng,
      zIndex: 20,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 3.5,
        fillColor: "#39a6ff",
        fillOpacity: 0.95,
        strokeColor: "#ffffff",
        strokeWeight: 1,
      },
      title: `Visited ${visited.toLocaleString()}`,
    });

    const openInfo = () => {
      if (!breadcrumbInfoWindow) return;
      breadcrumbInfoWindow.setContent(`<div style="font-size:12px;font-weight:600;">Visited: ${esc_(visited.toLocaleString())}</div>`);
      breadcrumbInfoWindow.open({ map, anchor: marker });
    };

    marker.addListener("mouseover", openInfo);
    marker.addListener("click", openInfo);
    marker.addListener("mouseout", () => {
      if (breadcrumbInfoWindow) breadcrumbInfoWindow.close();
    });

    breadcrumbMarkers.push(marker);
    if (breadcrumbMarkers.length > CONFIG.MAX_SESSION_BREADCRUMBS) {
      const old = breadcrumbMarkers.shift();
      if (old) old.setMap(null);
      breadcrumbPath.shift();
      if (breadcrumbPolyline) breadcrumbPolyline.setPath(breadcrumbPath);
    }
  }

  function addOrUpdateMarker_(pin) {
    const color = markerColorFor_(pin);
    const isOwn = isOwnPin_(pin);
    const icon = markerIcon_(color, isOwn);
    const isTemp = !!pin.is_temp;
    if (markers.has(pin.pin_id)) {
      const m = markers.get(pin.pin_id);
      m.setPosition({ lat: pin.lat, lng: pin.lng });
      m.setIcon(icon);
      m.setTitle(pin.address);
      m.setDraggable(isTemp);
    } else {
      const m = new google.maps.Marker({
        map,
        position: { lat: pin.lat, lng: pin.lng },
        icon,
        title: pin.address,
        draggable: isTemp,
      });
      m.addListener("click", () => openPanel_(pin.pin_id));
      m.addListener("dragend", async (e) => {
        if (!e.latLng) return;
        await handleMarkerDragEnd_(pin.pin_id, e.latLng.lat(), e.latLng.lng());
      });
      markers.set(pin.pin_id, m);
    }
  }

  async function handleMarkerDragEnd_(pin_id, lat, lng) {
    const pin = pinsIndex.get(pin_id);
    if (!pin) return;

    pin.lat = lat;
    pin.lng = lng;
    pin.ts = new Date().toISOString();
    try {
      pin.address = await reverseGeocode_({ lat, lng });
    } catch (e) {
      console.warn("Reverse geocode after drag failed", e);
    }
    pinsIndex.set(pin_id, pin);

    const marker = markers.get(pin_id);
    if (marker) marker.setTitle(pin.address || "Pinned location");
    if (selectedPin && selectedPin.pin_id === pin_id) {
      selectedPin = pin;
      d("p_addr").textContent = pin.address || "";
      d("p_meta").textContent = pinMetaText_(pin);
    }
    toast("Pin moved — save to keep");
  }

  function markerIcon_(hex, isOwn) {
    return {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
      fillColor: hex,
      fillOpacity: 1,
      strokeColor: isOwn ? "#4da3ff" : "#e060a0",  // blue = mine, pink = theirs
      strokeWeight: isOwn ? 2.5 : 1.5,
      scale: isOwn ? 1.35 : 1.1,
      anchor: new google.maps.Point(12, 24),
    };
  }

  function isOwnPin_(pin) {
    const me = getUser_().toLowerCase();
    if (!me) return false;
    return (pin.user || "").toLowerCase().includes(me);
  }

  function markerColorFor_(pin) {
    if (pin.is_dnd || (pin.status || "").toLowerCase() === "dead") return "#000000"; // black
    const u = (pin.user || "").toLowerCase();
    if (u.includes("brent")) return "#2d8cf0";   // blue
    if (u.includes("paris")) return "#d946a8";   // magenta/pink
    return "#888888";                              // unknown user — gray
  }

  function pinMetaText_(pin) {
    return `${pin.status || "—"} • ${pin.substatus || ""} • ${pin.user || ""} • ${fmtDate_(pin.ts) || ""}`;
  }

  /* ---------- Panel & logging ---------- */
  function openPanel_(pin_id) {
    const pin = pinsIndex.get(pin_id);
    if (!pin) return;
    selectedPin = pin;

    d("p_addr").textContent = pin.address;
    d("p_badge").style.display = pin.is_dnd ? "inline-block" : "none";
    d("p_meta").textContent = pinMetaText_(pin);

    d("note").value = "";
    d("subBtns").innerHTML = "";
    d("panel").classList.add("open");

    // Reset status selections
    selectedStatus = "";
    selectedSub = "";
    updateSaveBtn_();
    Array.from(d("topBtns").querySelectorAll("[data-top]")).forEach(btn => btn.style.outline = "none");

    // Fetch history async
    fetchHistory_(pin);
  }

  async function fetchHistory_(pin) {
    const section = d("historySection");
    const list = d("historyList");
    section.style.display = "none";
    list.innerHTML = "";

    try {
      const params = new URLSearchParams({ mode: "getLogs" });
      if (pin.pin_id) params.set("pin_id", pin.pin_id);
      if (pin.address) params.set("address", pin.address);
      const res = await fetch(`${CONFIG.SCRIPT_BASE}?${params}`);
      const logs = await res.json();

      if (!logs || logs.length === 0) {
        list.innerHTML = '<div class="history-empty">No history yet</div>';
      } else {
        logs.forEach(log => {
          const el = document.createElement("div");
          el.className = "history-item";
          el.innerHTML = `<span class="hi-status">${log.status || "—"}</span> • ${log.substatus || ""} <span class="hi-time">— ${log.user || ""}, ${fmtDate_(log.ts)}</span>${log.note ? '<br><small>' + esc_(log.note) + '</small>' : ''}`;
          list.appendChild(el);
        });
      }
      section.style.display = "block";
    } catch (e) {
      console.warn("History fetch failed", e);
    }
  }

  function closePanel_() {
    d("panel").classList.remove("open");
    selectedPin = null;
  }

  function showSubOptions_(top) {
    if (!selectedPin) {
      toast("Select or drop a pin first");
      return;
    }
    selectedStatus = top;
    selectedSub = "";
    updateSaveBtn_();

    // Highlight active top button
    Array.from(d("topBtns").querySelectorAll("[data-top]")).forEach(btn => {
      btn.style.outline = btn.getAttribute("data-top") === top ? "2px solid #fff" : "none";
    });

    const list = suboptionsFor_(top);
    const wrap = d("subBtns");
    wrap.innerHTML = "";
    list.forEach(label => {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = label;
      b.addEventListener("click", () => {
        selectedSub = label;
        updateSaveBtn_();
        // Highlight active sub button
        Array.from(wrap.children).forEach(c => c.style.outline = "none");
        b.style.outline = "2px solid #fff";
      });
      wrap.appendChild(b);
    });
  }

  function suboptionsFor_(top) {
    const map = {
      "Damage": ["Scouted Only", "Marked for Knock", "Visible Damage"],
      "Quick Knock": ["Card Left", "No Answer", "Gated", "Renter", "Busy", "Do Not Knock"],
      "Conversation": ["Qualified", "Follow-Up", "Decision Maker Not Home", "Renter—Call Landlord", "Busy—Come Back", "Disqualified"],
      "Inspection": ["Scheduled", "Done — Claim Recommended", "Done — No/Insufficient Damage", "Photos Taken"],
      "Customer": ["Contract Signed", "Claim Filed", "Both", "Built"],
      "Dead": ["Do Not Knock", "Hostile", "Not Interested", "Competitor", "Out of Territory"]
    };
    return map[top] || [];
  }

  async function submitLog_(status, substatus) {
    const user = getUser_();
    if (!user) { toast("Sign in first"); return; }
    if (!selectedPin) { toast("Select or drop a pin first"); return; }

    // Prevent double taps for 3s
    if (submitLog_.lock && Date.now() - submitLog_.lock < 3000) return;
    submitLog_.lock = Date.now();

    const note = (d("note").value || "").slice(0, CONFIG.MAX_NOTE_LEN);

    // Always send address (anchor), include last known lat/lng
    const payload = {
      pin_id: selectedPin.pin_id,           // may be "" for new
      address: selectedPin.address,         // anchor
      lat: selectedPin.lat || null,
      lng: selectedPin.lng || null,
      status,
      substatus,
      note,
      user,
      device: navigator.userAgent || "",
      source: "app",
    };

    try {
      // Apps Script redirects cross-origin → use no-cors (fire-and-forget)
      await fetch(`${CONFIG.SCRIPT_BASE}?mode=log`, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      // no-cors = opaque response, can't read body; trust it worked
      toast("Logged");
      d("subBtns").innerHTML = "";
      d("note").value = "";
      // Brief delay then refresh to show latest state
      setTimeout(() => fetchPins_(true), 1500);
    } catch (e) {
      console.warn(e);
      // One pending offline log
      localStorage.setItem("plat_pending_log", JSON.stringify(payload));
      toast("Offline. Will retry…");
    }
  }

  /* ---------- Save button ---------- */
  function saveCurrentPin_() {
    if (!selectedPin) { toast("No pin selected"); return; }
    const status = selectedStatus || "Damage";
    const sub = selectedSub || "Scouted Only";
    submitLog_(status, sub);
    // Increment knock count if session active
    if (sessionActive) {
      sessionKnockCount++;
      updateSessionUI_();
    }
    // Visual feedback
    const btn = d("saveBtn");
    btn.textContent = "✅ SAVED";
    btn.classList.add("saved");
    setTimeout(() => {
      btn.textContent = "💾 SAVE";
      btn.classList.remove("saved");
    }, 2000);
  }

  function updateSaveBtn_() {
    const btn = d("saveBtn");
    btn.disabled = !selectedPin;
    if (selectedStatus && selectedSub) {
      btn.textContent = `💾 SAVE — ${selectedStatus} / ${selectedSub}`;
    } else if (selectedStatus) {
      btn.textContent = `💾 SAVE — ${selectedStatus}`;
    } else {
      btn.textContent = "💾 SAVE";
    }
  }

  /* ---------- Drop pin ---------- */
  async function dropPinAtGps_() {
    const user = getUser_();
    if (!user) { toast("Sign in first"); return; }

    try {
      const pos = await getPosition_();
      const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.setCenter(latlng);
      map.panTo(latlng);
      const addr = await reverseGeocode_(latlng);
      const pin_id = findExistingByAddress_(addr) || `temp_${randId_()}`;

      // Create a local draft pin that can be dragged before save.
      const temp = {
        pin_id,
        address: addr,
        lat: latlng.lat,
        lng: latlng.lng,
        status: "Damage",
        substatus: "Marked for Knock",
        user,
        is_dnd: false,
        ts: new Date().toISOString(),
        is_temp: true,
      };
      pinsIndex.set(temp.pin_id, temp);
      selectedPin = temp;
      addOrUpdateMarker_(temp);
      openPanel_(temp.pin_id);
      toast("Pin placed — drag to adjust");
    } catch (e) {
      console.warn(e);
      toast("Could not drop pin");
    }
  }

  function findExistingByAddress_(addr) {
    // naive: search current pinsIndex by address
    for (const [id, p] of pinsIndex.entries()) {
      if ((p.address || "").toLowerCase() === addr.toLowerCase()) return id;
    }
    return "";
    // Backend will also upsert by address if pin_id empty.
  }

  /* ---------- Drop pin at arbitrary location (long-press) ---------- */
  async function dropPinAtLocation_(lat, lng) {
    const user = getUser_();
    if (!user) { toast("Sign in first"); return; }

    try {
      const latlng = { lat, lng };
      map.panTo(latlng);
      const addr = await reverseGeocode_(latlng);
      const pin_id = findExistingByAddress_(addr) || `temp_${randId_()}`;

      const temp = {
        pin_id,
        address: addr,
        lat,
        lng,
        status: "Damage",
        substatus: "Marked for Knock",
        user,
        is_dnd: false,
        ts: new Date().toISOString(),
        is_temp: true,
      };
      pinsIndex.set(temp.pin_id, temp);
      selectedPin = temp;
      addOrUpdateMarker_(temp);
      openPanel_(temp.pin_id);
      toast("📌 Pin placed — drag to adjust");
    } catch (e) {
      console.warn(e);
      toast("Could not drop pin");
    }
  }

  /* ---------- Fetch pins (polling) ---------- */
  async function fetchPins_(force = false) {
    try {
      const res = await fetch(`${CONFIG.SCRIPT_BASE}?mode=getPins`);
      const arr = await res.json();
      const hash = JSON.stringify(arr).length + ":" + (arr[0]?.ts || "");
      if (!force && hash === lastFetchHash) return; // skip redraw
      lastFetchHash = hash;

      // Track which pin_ids came from backend
      const freshIds = new Set();
      const backendAddresses = new Set();
      const localTempPins = Array.from(pinsIndex.values()).filter((p) => p && p.is_temp);

      // rebuild index
      pinsIndex.clear();
      arr.forEach(p => {
        pinsIndex.set(p.pin_id, p);
        addOrUpdateMarker_(p);
        freshIds.add(p.pin_id);
        if (p.address) backendAddresses.add(String(p.address).toLowerCase());
      });

      // Keep unsaved local draft pins unless backend now has that address.
      localTempPins.forEach((p) => {
        const addr = String(p.address || "").toLowerCase();
        if (addr && backendAddresses.has(addr)) {
          const m = markers.get(p.pin_id);
          if (m) {
            m.setMap(null);
            markers.delete(p.pin_id);
          }
          return;
        }
        if (!pinsIndex.has(p.pin_id)) {
          pinsIndex.set(p.pin_id, p);
          addOrUpdateMarker_(p);
        }
      });

      // Remove stale markers (pins deleted or no longer returned)
      for (const [id, m] of markers.entries()) {
        if (!freshIds.has(id) && !pinsIndex.has(id)) {
          m.setMap(null);
          markers.delete(id);
        }
      }

      applyViewFilter_(); // respect active filter
      updatePinCount_();

      // Retry pending log if exists
      const pending = localStorage.getItem("plat_pending_log");
      if (pending) {
        localStorage.removeItem("plat_pending_log");
        try {
          await fetch(`${CONFIG.SCRIPT_BASE}?mode=log`, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: pending,
          });
          toast("Pending log sent");
        } catch (e) { console.warn(e); }
      }
    } catch (e) {
      console.warn(e);
      toast("Fetch failed");
    }
  }

  /* ---------- View filter ---------- */
  function applyViewFilter_() {
    const user = getUser_();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 6 * 86400000; // 7-day window

    for (const [id, pin] of pinsIndex.entries()) {
      const m = markers.get(id);
      if (!m) continue;

      let visible = true;
      if (currentFilter === "mine") {
        visible = user && (pin.user || "").toLowerCase() === user.toLowerCase();
      } else if (currentFilter === "today") {
        visible = pin.ts && new Date(pin.ts).getTime() >= todayStart;
      } else if (currentFilter === "week") {
        visible = pin.ts && new Date(pin.ts).getTime() >= weekStart;
      }
      // "all" → always visible

      m.setVisible(visible);
    }
    updatePinCount_();
  }

  /* ---------- Pin count ---------- */
  function updatePinCount_() {
    let visible = 0, total = 0;
    for (const [id] of pinsIndex.entries()) {
      total++;
      const m = markers.get(id);
      if (m && m.getVisible()) visible++;
    }
    const el = d("pinCount");
    if (el) {
      el.textContent = currentFilter === "all"
        ? `${total} pin${total !== 1 ? 's' : ''}`
        : `${visible}/${total}`;
    }
  }

  /* ---------- Dragon Menu ---------- */
  function toggleDragonMenu_(e) {
    e.stopPropagation();
    d("dragonMenu").classList.toggle("show");
  }

  function closeDragonMenu_() {
    d("dragonMenu").classList.remove("show");
  }

  function showSessionStats_() {
    const elapsed = sessionActive ? formatTimer_(Date.now() - sessionStartMs) : "0:00";
    const knocks = sessionKnockCount;
    // Calculate estimated pins dropped in this session (naive count)
    const pinsDropped = Array.from(pinsIndex.values()).filter(p => {
      // Very rough: pins created roughly since session start
      // Reality: backend doesn't link pin->session explicitly yet, but we can guess by timestamp
      if (!sessionActive || !p.ts) return false;
      const t = new Date(p.ts).getTime();
      return t >= sessionStartMs;
    }).length;

    // Create a simple modal overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);";

    const box = document.createElement("div");
    box.style.cssText = "background:#1a1a1e;width:85%;max-width:320px;padding:1.5rem;border-radius:16px;border:1px solid rgba(255,255,255,0.1);text-align:center;color:#e8e8e8;";

    box.innerHTML = `
      <h3 style="margin:0 0 1rem;font-size:1.1rem;color:#c8b48c;text-transform:uppercase;letter-spacing:0.05em;">Session Stats</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
        <div style="background:rgba(255,255,255,0.05);padding:0.8rem;border-radius:10px;">
          <div style="font-size:1.4rem;font-weight:700;color:#fff;">${knocks}</div>
          <div style="font-size:0.75rem;color:#888;text-transform:uppercase;">Knocks</div>
        </div>
        <div style="background:rgba(255,255,255,0.05);padding:0.8rem;border-radius:10px;">
          <div style="font-size:1.4rem;font-weight:700;color:#fff;">${pinsDropped}</div>
          <div style="font-size:0.75rem;color:#888;text-transform:uppercase;">Pins</div>
        </div>
        <div style="grid-column:span 2;background:rgba(255,255,255,0.05);padding:0.8rem;border-radius:10px;">
          <div style="font-size:1.4rem;font-weight:700;color:${sessionActive ? '#ff6b6b' : '#888'};font-variant-numeric:tabular-nums;">${elapsed}</div>
          <div style="font-size:0.75rem;color:#888;text-transform:uppercase;">Duration</div>
        </div>
      </div>
      <button id="closeStats" style="width:100%;padding:0.8rem;background:#333;color:#fff;border:none;border-radius:10px;font-weight:600;font-size:0.9rem;">Close</button>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById("closeStats").onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  // Close dragon menu on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#dragonMenu")) {
      closeDragonMenu_();
    }
  });

  /* ---------- Breadcrumbs (optional, off by default) ---------- */
  function toggleSession_() {
    if (sessionActive) {
      // Stop session
      const endedAtMs = Date.now();
      if (!sessionPaused) sessionElapsedMs = Date.now() - sessionStartMs;
      sessionActive = false;
      sessionPaused = false;
      clearInterval(crumbTimer); crumbTimer = null;
      clearInterval(sessionDisplayTimer); sessionDisplayTimer = null;
      stopLiveTracking_();
      d("sessionToggle").classList.remove("on");
      d("sessionToggle").textContent = "Session";
      d("sessionBar").classList.remove("active");
      d("sessionTimer").classList.remove("active");
      d("sessionPause").style.display = "none";
      d("sessionKnocks").style.display = "none";
      const savedLabel = saveSessionSummary_(endedAtMs);
      toast(`Session saved: ${savedLabel} — ${sessionKnockCount} knocks, ${formatTimer_(sessionElapsedMs)}`);
    } else {
      // Start session
      sessionActive = true;
      sessionPaused = false;
      sessionId = randId_();
      sessionLabel = "";
      sessionStartMs = Date.now();
      sessionElapsedMs = 0;
      sessionKnockCount = 0;
      localStorage.removeItem("plat_last_crumb");
      clearBreadcrumbTrail_();
      startLiveTracking_();
      crumbTimer = setInterval(sendCrumb_, CONFIG.BREADCRUMB_SEC * 1000);
      sessionDisplayTimer = setInterval(updateSessionUI_, 1000);
      d("sessionToggle").classList.add("on");
      d("sessionToggle").textContent = "LIVE";
      d("sessionBar").classList.add("active");
      d("sessionTimer").classList.add("active");
      d("sessionPause").style.display = "block";
      d("sessionPause").textContent = "⏸";
      d("sessionKnocks").style.display = "block";
      updateSessionUI_();
      sendCrumb_(); // immediate first breadcrumb
      toast("🔴 Session started — recording route");
    }
  }

  function togglePause_() {
    if (!sessionActive) return;
    if (sessionPaused) {
      // Resume
      sessionPaused = false;
      sessionStartMs = Date.now() - sessionElapsedMs;
      startLiveTracking_();
      crumbTimer = setInterval(sendCrumb_, CONFIG.BREADCRUMB_SEC * 1000);
      sessionDisplayTimer = setInterval(updateSessionUI_, 1000);
      d("sessionPause").textContent = "⏸";
      d("sessionToggle").textContent = "LIVE";
      d("sessionToggle").classList.add("on");
      d("sessionTimer").classList.add("active");
      toast("▶️ Session resumed");
    } else {
      // Pause
      sessionPaused = true;
      sessionElapsedMs = Date.now() - sessionStartMs;
      clearInterval(crumbTimer); crumbTimer = null;
      clearInterval(sessionDisplayTimer); sessionDisplayTimer = null;
      d("sessionPause").textContent = "▶️";
      d("sessionToggle").textContent = "PAUSED";
      d("sessionToggle").classList.remove("on");
      d("sessionTimer").classList.remove("active");
      toast("⏸ Session paused");
    }
  }

  function updateSessionUI_() {
    if (!sessionActive) return;
    sessionElapsedMs = Date.now() - sessionStartMs;
    d("sessionTimer").textContent = formatTimer_(sessionElapsedMs);
    d("sessionKnocks").textContent = `${sessionKnockCount} knock${sessionKnockCount !== 1 ? "s" : ""}`;
  }

  function formatTimer_(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function defaultSessionLabel_(ms) {
    return `Session ${new Date(ms || Date.now()).toLocaleString()}`;
  }

  function readSessionLabels_() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SESSION_LABELS_KEY) || "{}");
      return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveSessionLabel_(sid, label) {
    const labels = readSessionLabels_();
    labels[sid] = label;
    localStorage.setItem(SESSION_LABELS_KEY, JSON.stringify(labels));
  }

  function saveSessionSummary_(endedAtMs) {
    const fallback = defaultSessionLabel_(sessionStartMs);
    const input = window.prompt("Save session as (optional)", fallback);
    const finalLabel = (input || "").trim() || fallback;
    sessionLabel = finalLabel;
    saveSessionLabel_(sessionId, finalLabel);

    let archive = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(SESSION_ARCHIVE_KEY) || "[]");
      archive = Array.isArray(parsed) ? parsed : [];
    } catch {
      archive = [];
    }

    const summary = {
      session_id: sessionId,
      session_label: finalLabel,
      user: getUser_(),
      started_at: new Date(sessionStartMs).toISOString(),
      ended_at: new Date(endedAtMs).toISOString(),
      elapsed_ms: sessionElapsedMs,
      knocks: sessionKnockCount,
      breadcrumb_points: breadcrumbPath.length,
    };
    archive = archive.filter((s) => s.session_id !== sessionId);
    archive.unshift(summary);
    localStorage.setItem(SESSION_ARCHIVE_KEY, JSON.stringify(archive.slice(0, 300)));
    return finalLabel;
  }

  async function sendCrumb_() {
    try {
      const user = getUser_();
      if (!user) return;
      const point = await getBestPosition_();
      const lat = point.lat, lng = point.lng;
      const crumbTs = new Date(point.ts || Date.now()).toISOString();
      const last = JSON.parse(localStorage.getItem("plat_last_crumb") || "null");
      if (last && haversineM_(last.lat, last.lng, lat, lng) < CONFIG.BREADCRUMB_MIN_DELTA_M) return;

      localStorage.setItem("plat_last_crumb", JSON.stringify({ lat, lng }));
      await fetch(`${CONFIG.SCRIPT_BASE}?mode=breadcrumb`, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          user, session_id: sessionId, lat, lng,
          speed_kmh: point.speed_mps == null ? null : +(point.speed_mps * 3.6).toFixed(1),
          accuracy_m: point.accuracy_m,
          ts: crumbTs,
        }),
      });
      addBreadcrumbMarker_(lat, lng, crumbTs);
    } catch (e) { console.warn(e); }
  }

  /* ---------- Route Display ---------- */
  function toggleRoutes_() {
    closeDragonMenu_();
    if (showingRoutes) {
      routePolylines.forEach(p => p.setMap(null));
      routePolylines = [];
      showingRoutes = false;
      d("dmRoutes").textContent = "View Routes";
      toast("Routes hidden");
    } else {
      showingRoutes = true;
      d("dmRoutes").textContent = "Hide Routes";
      fetchAndDrawRoutes_();
    }
  }

  async function fetchAndDrawRoutes_() {
    toast("Fetching today's routes...");
    try {
      const params = new URLSearchParams({ mode: "getBreadcrumbs" });
      const res = await fetch(`${CONFIG.SCRIPT_BASE}?${params}`);
      const data = await res.json();

      // Filter: Today only (local time)
      const now = new Date();
      // Reset to start of day 00:00:00
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      // Fallback: if no routes today, try finding ANY recent routes (last 7 days) for testing
      let relevant = data.filter(r => r.ts && new Date(r.ts).getTime() >= startOfDay);

      if (relevant.length === 0) {
        // Fallback for demo/testing purposes if today is empty
        const weekAgo = startOfDay - (7 * 86400000);
        relevant = data.filter(r => r.ts && new Date(r.ts).getTime() >= weekAgo);

        if (relevant.length > 0) {
          toast("No routes today — showing recent history");
        } else {
          toast("No recent routes found");
          showingRoutes = false;
          d("dmRoutes").textContent = "View Routes";
          return;
        }
      }

      // Group by session
      const sessions = {};
      relevant.forEach(r => {
        const sid = r.session_id || "unknown"; // robust ID key
        if (!sessions[sid]) sessions[sid] = [];
        sessions[sid].push(r);
      });

      // Draw
      Object.entries(sessions).forEach(([sid, points]) => {
        points.sort((a, b) => (a.ts || "").localeCompare(b.ts || ""));
        const path = points.map(p => ({ lat: p.lat, lng: p.lng }));

        // Color based on user
        const u = (points[0].user || "").toLowerCase();
        let color = "#999999";
        if (u.includes("brent")) color = "#8a2be2"; // BlueViolet
        else if (u.includes("paris")) color = "#ff00ff"; // Magenta
        else color = "#ff8c00"; // DarkOrange (unknown)

        const poly = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 0.7,
          strokeWeight: 4,
          map,
        });
        routePolylines.push(poly);
      });
      toast(`Showing ${Object.keys(sessions).length} session(s)`);
    } catch (e) {
      console.warn(e);
      toast("Failed to load routes");
      // Clean up toggle state since it failed
      showingRoutes = false;
      d("dmRoutes").textContent = "View Routes";
    }
  }



  /* ---------- Settings ---------- */
  function handleSettings_() {
    closeDragonMenu_();
    if (confirm("Reset app cache and reload? (Keeps you signed in)")) {
      const auth = localStorage.getItem("plat_auth");
      localStorage.clear();
      if (auth) localStorage.setItem("plat_auth", auth);
      window.location.reload();
    }
  }

  /* ---------- Utils ---------- */
  function getPosition_() {
    return new Promise((res, rej) => {
      navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
    });
  }
  async function reverseGeocode_(latlng) {
    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === "OK" && results && results[0]) resolve(results[0].formatted_address);
        else reject(new Error("No address"));
      });
    });
  }
  function randId_() { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }
  function esc_(s) { const el = document.createElement("span"); el.textContent = s; return el.innerHTML; }
  function fmtDate_(iso) { if (!iso) return ""; try { const d = new Date(iso); return d.toLocaleString(); } catch { return "" } }
  function haversineM_(lat1, lon1, lat2, lon2) {
    const R = 6371000, toRad = (v) => v * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
})();
