/**
 * Platinum DoorKnock - Apps Script backend + frontend host
 * Version: v0.8.0 (02_15_26)
 * Deployment: HtmlService - single URL, Google auth built-in
 * Sheet: "Platinum DoorKnock - Production"
 * Tabs: Pins / Logs / Breadcrumbs / Config
 */

const SHEET = {
  PINS: "Pins",
  LOGS: "Logs",
  BREADCRUMBS: "Breadcrumbs",
  CONFIG: "Config",
};

/* ===================== Web Handlers ===================== */

function doGet(e) {
  try {
    const mode = ((e && e.parameter && e.parameter.mode) || "").toLowerCase();
    // API endpoints (backward compat + smoke tests)
    if (mode === "getpins") return json_(getPins_());
    if (mode === "getlogs") return json_(getLogs_(e.parameter.pin_id || "", e.parameter.address || ""));
    if (mode === "getbreadcrumbs") return json_(getBreadcrumbs_(e.parameter));
    if (mode === "getroutesessions") return json_(getRouteSessions_());
    if (mode === "version") return json_({ version: getConfig_("version") || "0.8.0" });
    // Default: serve the web app
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Platinum DoorKnock')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return error_(err);
  }
}

function doPost(e) {
  try {
    const mode = ((e && e.parameter && e.parameter.mode) || "").toLowerCase();
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    if (mode === "log") return json_(handleLog_(body));
    if (mode === "breadcrumb") return json_(handleBreadcrumb_(body));
    return json_({ ok: false, error: "Unknown POST mode" });
  } catch (err) {
    return error_(err);
  }
}

/* ========= Client-callable (google.script.run) ========= */

function getActiveUserEmail() {
  return Session.getActiveUser().getEmail();
}

function getPinsClient() {
  return getPins_();
}

function submitLogClient(payload) {
  return handleLog_(payload);
}

function getLogsClient(pinId, address) {
  return getLogs_(pinId, address);
}

function submitBreadcrumbClient(payload) {
  return handleBreadcrumb_(payload);
}

/* ============ Get Pins ============ */
function getPins_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.PINS);
  if (!sh) return [];
  const values = getRows_(sh);
  if (values.length === 0) return [];
  const headers = values[0];
  const rows = values.slice(1);
  const idx = colIndex_(headers, [
    "pin_id","address_norm","lat","lng",
    "latest_status","latest_substatus","latest_note",
    "latest_ts","latest_user","is_dnd"
  ]);
  const out = rows.map(r => ({
    pin_id: r[idx.pin_id] || "",
    address: r[idx.address_norm] || "",
    lat: num_(r[idx.lat]),
    lng: num_(r[idx.lng]),
    status: r[idx.latest_status] || "",
    substatus: r[idx.latest_substatus] || "",
    note: r[idx.latest_note] || "",
    ts: r[idx.latest_ts] ? String(r[idx.latest_ts]) : "",
    user: r[idx.latest_user] || "",
    is_dnd: toBool_(r[idx.is_dnd]),
  })).filter(p => {
    // Basic validity checks
    if (!p.address || !p.pin_id) return false;
    if (!p.lat || !p.lng) return false;
    // Filter out potential garbage/header rows
    const pid = p.pin_id.toLowerCase();
    if (pid === "pin_id" || pid === "address_norm" || pid === "lat" || pid === "lng") return false;
    return true;
  });
  return out;
}

/* ============ Get Logs for a Pin ============ */
function getLogs_(pinId, address) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.LOGS);
  if (!sh) return [];
  const values = getRows_(sh);
  if (values.length <= 1) return [];
  const headers = values[0];
  const rows = values.slice(1);
  const idx = colIndex_(headers, [
    "log_id","pin_id","address","lat","lng","status","substatus","note","user","ts","device","source"
  ]);
  const needle_id = (pinId || "").trim().toLowerCase();
  const needle_addr = (address || "").trim().toLowerCase();
  const out = rows.filter(r => {
    if (needle_id && (r[idx.pin_id] || "").toLowerCase() === needle_id) return true;
    if (needle_addr && (r[idx.address] || "").toLowerCase() === needle_addr) return true;
    return false;
  }).map(r => ({
    log_id: r[idx.log_id] || "",
    pin_id: r[idx.pin_id] || "",
    address: r[idx.address] || "",
    status: r[idx.status] || "",
    substatus: r[idx.substatus] || "",
    note: r[idx.note] || "",
    user: r[idx.user] || "",
    ts: r[idx.ts] ? String(r[idx.ts]) : "",
  }));
  out.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
  return out;
}

/* ============ Get Breadcrumbs ============ */
function getBreadcrumbs_(params) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.BREADCRUMBS);
  if (!sh) return [];
  const values = getRows_(sh);
  if (values.length <= 1) return [];
  const headers = values[0];
  const rows = values.slice(1);
  const idx = colIndex_(headers, [
    "crumb_id","user","session_id","lat","lng","speed_kmh","accuracy_m","ts"
  ]);
  
  // Optional filter by session_id or user
  const filterSession = (params && params.session_id) ? params.session_id.trim().toLowerCase() : "";
  const filterUser = (params && params.user) ? params.user.trim().toLowerCase() : "";
  
  const out = rows.filter(r => {
    if (filterSession && (r[idx.session_id] || "").toLowerCase() !== filterSession) return false;
    if (filterUser && (r[idx.user] || "").toLowerCase() !== filterUser) return false;
    return true;
  }).map(r => ({
    crumb_id: r[idx.crumb_id] || "",
    user: r[idx.user] || "",
    session_id: r[idx.session_id] || "",
    lat: num_(r[idx.lat]),
    lng: num_(r[idx.lng]),
    speed_kmh: num_(r[idx.speed_kmh]),
    accuracy_m: num_(r[idx.accuracy_m]),
    ts: r[idx.ts] ? String(r[idx.ts]) : "",
  }));
  out.sort((a, b) => (a.ts || "").localeCompare(b.ts || "")); // chronological
  return out;
}

/* ============ Get Route Sessions (summary) ============ */
function getRouteSessions_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.BREADCRUMBS);
  if (!sh) return [];
  const values = getRows_(sh);
  if (values.length <= 1) return [];
  const headers = values[0];
  const rows = values.slice(1);
  const idx = colIndex_(headers, [
    "crumb_id","user","session_id","lat","lng","speed_kmh","accuracy_m","ts"
  ]);
  
  // Group by session_id
  const sessions = {};
  rows.forEach(r => {
    const sid = r[idx.session_id] || "";
    if (!sid) return;
    if (!sessions[sid]) {
      sessions[sid] = {
        session_id: sid,
        user: r[idx.user] || "",
        points: 0,
        first_ts: r[idx.ts] ? String(r[idx.ts]) : "",
        last_ts: r[idx.ts] ? String(r[idx.ts]) : "",
        first_lat: num_(r[idx.lat]),
        first_lng: num_(r[idx.lng]),
        last_lat: num_(r[idx.lat]),
        last_lng: num_(r[idx.lng]),
      };
    }
    const s = sessions[sid];
    s.points++;
    const ts = r[idx.ts] ? String(r[idx.ts]) : "";
    if (ts && (!s.first_ts || ts < s.first_ts)) {
      s.first_ts = ts;
      s.first_lat = num_(r[idx.lat]);
      s.first_lng = num_(r[idx.lng]);
    }
    if (ts && ts > s.last_ts) {
      s.last_ts = ts;
      s.last_lat = num_(r[idx.lat]);
      s.last_lng = num_(r[idx.lng]);
    }
  });
  
  const out = Object.values(sessions);
  out.sort((a, b) => (b.last_ts || "").localeCompare(a.last_ts || "")); // newest first
  return out;
}

/* ============ Handle Log ============ */
function handleLog_(payload) {
  const now = new Date();
  const ts = now.toISOString();
  const clean = {
    pin_id: String(payload.pin_id || "").trim(),
    address: String(payload.address || "").trim(),
    lat: toNumOrNull_(payload.lat),
    lng: toNumOrNull_(payload.lng),
    status: cleanStatus_(payload.status),
    substatus: cleanSub_(payload.substatus),
    note: String(payload.note || "").slice(0, 120),
    user: String(payload.user || "Unknown"),
    device: String(payload.device || ""),
    source: String(payload.source || "app"),
    ts,
  };
  const pin = upsertPin_(clean);
  appendLogRow_(pin.pin_id, pin.address_norm, clean);
  return { ok: true, pin_id: pin.pin_id, ts };
}

/* ============ Handle Breadcrumb ============ */
function handleBreadcrumb_(payload) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.BREADCRUMBS);
  if (!sh) return { ok: false, error: "Breadcrumbs tab missing" };
  sh.appendRow([
    uuid_(),
    String(payload.user || ""),
    String(payload.session_id || ""),
    toNumOrNull_(payload.lat),
    toNumOrNull_(payload.lng),
    toNumOrNull_(payload.speed_kmh),
    toNumOrNull_(payload.accuracy_m),
    new Date().toISOString()
  ]);
  return { ok: true };
}

/* ============ Pin + Log Utilities ============ */
function upsertPin_(clean) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.PINS);
  const values = getRows_(sh);
  const headers = ensurePinsHeaders_(sh, values[0]);
  const rows = values.length > 1 ? values.slice(1) : [];
  const H = colIndex_(headers, [
    "pin_id","address_norm","lat","lng","latest_status","latest_substatus","latest_note",
    "latest_ts","latest_user","value_rank","is_dnd","created_ts","created_by","last_updated_ts"
  ]);
  let pinId = clean.pin_id;
  let addressNorm = clean.address;
  let matchRow = -1;
  if (pinId) matchRow = rows.findIndex(r => r[H.pin_id] === pinId);
  if (matchRow < 0 && addressNorm)
    matchRow = rows.findIndex(r => (r[H.address_norm] || "").toLowerCase() === addressNorm.toLowerCase());
  const isDnd = (clean.status || "").toLowerCase() === "dead" ||
    (clean.substatus || "").toLowerCase().includes("do not knock");
  const valueRank = rankForStatus_(clean.status);
  if (matchRow >= 0) {
    const r = rows[matchRow];
    if (!pinId) pinId = r[H.pin_id];
    const rowIndex = matchRow + 2;
    sh.getRange(rowIndex, H.address_norm+1, 1, 13).setValues([[
      addressNorm || r[H.address_norm],
      numOrFallback_(clean.lat, r[H.lat]),
      numOrFallback_(clean.lng, r[H.lng]),
      clean.status || r[H.latest_status],
      clean.substatus || r[H.latest_substatus],
      clean.note || r[H.latest_note],
      clean.ts,
      clean.user || r[H.latest_user],
      valueRank,
      isDnd,
      r[H.created_ts] || clean.ts,
      r[H.created_by] || clean.user,
      new Date().toISOString(),
    ]]);
  } else {
    pinId = pinId || uuid_();
    sh.appendRow([
      pinId, addressNorm, clean.lat, clean.lng, clean.status, clean.substatus, clean.note,
      clean.ts, clean.user, valueRank, isDnd, clean.ts, clean.user, clean.ts
    ]);
  }
  return { pin_id: pinId, address_norm: addressNorm };
}

function appendLogRow_(pin_id, addr, clean) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.LOGS);
  sh.appendRow([
    uuid_(), pin_id, addr, clean.lat, clean.lng,
    clean.status, clean.substatus, clean.note, clean.user, clean.ts, clean.device, clean.source
  ]);
}

/* ============ Misc Utilities ============ */
function getConfig_(key) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.CONFIG);
  if (!sh) return "";
  const values = getRows_(sh);
  const idxK = values[0].indexOf("key");
  const idxV = values[0].indexOf("value");
  for (let i=1;i<values.length;i++)
    if ((values[i][idxK]||"").toLowerCase()===key.toLowerCase()) return values[i][idxV];
  return "";
}
function cleanStatus_(s){const allowed=(getConfig_("status_list")||"Damage|Quick Knock|Conversation|Inspection|Customer|Dead").split("|").map(x=>x.trim().toLowerCase());const val=(s||"").toLowerCase();return titleCase_(allowed.includes(val)?val:"Damage");}
function cleanSub_(s){return titleCase_((s||"").toString().trim().slice(0,60));}
function rankForStatus_(s){s=(s||"").toLowerCase();if(s==="customer")return 5;if(s==="inspection")return 4;if(s==="conversation")return 3;if(s==="damage"||s==="quick knock")return 2;if(s==="dead")return 1;return 0;}
function ensurePinsHeaders_(sh,f){const h=["pin_id","address_norm","lat","lng","latest_status","latest_substatus","latest_note","latest_ts","latest_user","value_rank","is_dnd","created_ts","created_by","last_updated_ts"];if(!f||h.some((x,i)=>f[i]!==h[i]))sh.getRange(1,1,1,h.length).setValues([h]);return h;}
function getRows_(sh){const lr=sh.getLastRow(),lc=sh.getLastColumn();if(lr===0)return [[]];return sh.getRange(1,1,lr,lc).getValues();}
function colIndex_(headers,names){const m={};names.forEach(n=>{const i=headers.indexOf(n);m[n]=i>=0?i:headers.indexOf(n.replace(/_/g," "));});return m;}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function error_(e){return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(e.stack||e)})).setMimeType(ContentService.MimeType.JSON);}
function uuid_(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==="x"?r:(r&0x3|0x8);return v.toString(16);});}
function titleCase_(s){return s.replace(/\b\w/g,c=>c.toUpperCase());}
function num_(v){const n=Number(v);return isNaN(n)?null:n;}
function toNumOrNull_(v){if(v===null||v===undefined||v==="")return null;const n=Number(v);return isNaN(n)?null:n;}
function toBool_(v){if(typeof v==="boolean")return v;const s=String(v).toLowerCase();return s==="true"||s==="1"||s==="yes";}
function numOrFallback_(n,f){const v=toNumOrNull_(n);return v===null?f:v;}
