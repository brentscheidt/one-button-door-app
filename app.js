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

    d("locateBtn").addEventListener("click", locateMe_);
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
    map.addListener("mousedown", (e) => {
      longPressStart = { x: e.domEvent.clientX, y: e.domEvent.clientY };
      longPressTimer = setTimeout(() => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        dropPinAtLocation_(lat, lng);
        longPressTimer = null;
      }, 600);
    });
    map.addListener("mouseup", () => { clearTimeout(longPressTimer); longPressTimer = null; });
    map.addListener("mousemove", (e) => {
      if (longPressTimer && longPressStart) {
        const dx = e.domEvent.clientX - longPressStart.x;
        const dy = e.domEvent.clientY - longPressStart.y;
        if (Math.sqrt(dx * dx + dy * dy) > 10) { clearTimeout(longPressTimer); longPressTimer = null; }
      }
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

    locateMe_();
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
    try {
      const pos = await getPosition_();
      const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.setCenter(latlng);
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
          title: "You",
        });
      } else meMarker.setPosition(latlng);
    } catch (e) {
      console.warn(e);
      toast("Location unavailable");
    }
  }

  function addOrUpdateMarker_(pin) {
    const color = markerColorFor_(pin);
    const isOwn = isOwnPin_(pin);
    const icon = markerIcon_(color, isOwn);
    if (markers.has(pin.pin_id)) {
      const m = markers.get(pin.pin_id);
      m.setPosition({ lat: pin.lat, lng: pin.lng });
      m.setIcon(icon);
      m.setTitle(pin.address);
    } else {
      const m = new google.maps.Marker({
        map,
        position: { lat: pin.lat, lng: pin.lng },
        icon,
        title: pin.address,
      });
      m.addListener("click", () => openPanel_(pin.pin_id));
      markers.set(pin.pin_id, m);
    }
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

  /* ---------- Panel & logging ---------- */
  function openPanel_(pin_id) {
    const pin = pinsIndex.get(pin_id);
    if (!pin) return;
    selectedPin = pin;

    d("p_addr").textContent = pin.address;
    d("p_badge").style.display = pin.is_dnd ? "inline-block" : "none";
    d("p_meta").textContent = `${pin.status || "—"} • ${pin.substatus || ""} • ${pin.user || ""} • ${fmtDate_(pin.ts) || ""}`;

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

      // Create a temporary local pin (pin_id empty → backend will upsert & assign/keep)
      const temp = {
        pin_id: findExistingByAddress_(addr) || "", // reuse pin if exists
        address: addr,
        lat: latlng.lat,
        lng: latlng.lng,
        status: "Damage",
        substatus: "Marked for Knock",
        user,
        is_dnd: false,
        ts: new Date().toISOString(),
      };
      // show on map immediately
      pinsIndex.set(temp.pin_id || addr, temp);
      selectedPin = temp;
      addOrUpdateMarker_({ ...temp, pin_id: temp.pin_id || addr });
      openPanel_(temp.pin_id || addr);
      toast("Pin placed");
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

      const temp = {
        pin_id: findExistingByAddress_(addr) || "",
        address: addr,
        lat,
        lng,
        status: "Damage",
        substatus: "Marked for Knock",
        user,
        is_dnd: false,
        ts: new Date().toISOString(),
      };
      pinsIndex.set(temp.pin_id || addr, temp);
      selectedPin = temp;
      addOrUpdateMarker_({ ...temp, pin_id: temp.pin_id || addr });
      openPanel_(temp.pin_id || addr);
      toast("📌 Pin placed");
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

      // rebuild index
      pinsIndex.clear();
      arr.forEach(p => {
        pinsIndex.set(p.pin_id, p);
        addOrUpdateMarker_(p);
        freshIds.add(p.pin_id);
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
    const status = sessionActive ? (sessionPaused ? "Paused" : "Active") : "Inactive";
    toast(`Session: ${status} | Time: ${elapsed} | Knocks: ${knocks}`);
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
      sessionActive = false;
      sessionPaused = false;
      clearInterval(crumbTimer); crumbTimer = null;
      clearInterval(sessionDisplayTimer); sessionDisplayTimer = null;
      d("sessionToggle").classList.remove("on");
      d("sessionToggle").textContent = "Session";
      d("sessionBar").classList.remove("active");
      d("sessionTimer").classList.remove("active");
      d("sessionPause").style.display = "none";
      d("sessionKnocks").style.display = "none";
      toast(`Session ended — ${sessionKnockCount} knocks, ${formatTimer_(sessionElapsedMs)}`);
    } else {
      // Start session
      sessionActive = true;
      sessionPaused = false;
      sessionId = randId_();
      sessionStartMs = Date.now();
      sessionElapsedMs = 0;
      sessionKnockCount = 0;
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

  async function sendCrumb_() {
    try {
      const user = getUser_();
      if (!user) return;
      const pos = await getPosition_();
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      const last = JSON.parse(localStorage.getItem("plat_last_crumb") || "null");
      if (last && haversineM_(last.lat, last.lng, lat, lng) < CONFIG.BREADCRUMB_MIN_DELTA_M) return;

      localStorage.setItem("plat_last_crumb", JSON.stringify({ lat, lng }));
      await fetch(`${CONFIG.SCRIPT_BASE}?mode=breadcrumb`, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          user, session_id: sessionId, lat, lng,
          speed_kmh: null, accuracy_m: pos.coords.accuracy || null
        }),
      });
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
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const relevant = data.filter(r => r.ts && new Date(r.ts).getTime() >= startOfDay);

      if (relevant.length === 0) {
        toast("No routes found for today");
        // Keep showingRoutes=true so user knows they are 'on' but empty? 
        // Or toggle off? Let's leave it on to avoid confusion.
        return;
      }

      // Group by session
      const sessions = {};
      relevant.forEach(r => {
        if (!sessions[r.session_id]) sessions[r.session_id] = [];
        sessions[r.session_id].push(r);
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
