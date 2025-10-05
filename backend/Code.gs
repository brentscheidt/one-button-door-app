/** 
 * BSRG DoorKnock System — Apps Script backend
 * Version: v0.4.0-core (2025-10-04)
 * Endpoints:
 *   GET  ?mode=getPins        → JSON list of current pins (latest state)
 *   POST ?mode=log            → append Logs row + upsert Pins row
 *   POST ?mode=breadcrumb     → append Breadcrumb row (optional)
 *   GET  ?mode=version        → return current backend version from Config tab
 *
 * Notes:
 * - Runs as "me", deployed as Web App, "Anyone" (for prototype reliability).
 * - Uses address-anchored pins, but stores pin_id (UUID) to stitch history.
 * - BLACK = Dead / DND is_dnd=true. RED is used client-side for “hottest”.
 * - All timestamps stored in ISO (UTC).
 */

const SHEET = {
  PINS: "Pins",
  LOGS: "Logs",
  BREADCRUMBS: "Breadcrumbs",
  CONFIG: "Config",
};

function doGet(e) {
  try {
    const mode = (e.parameter.mode || "").toLowerCase();
    if (mode === "getpins") return json_(getPins_());
    if (mode === "version") return json_({ version: getConfig_("version") || "0.0.0" });
    // default: simple ping
    return json_({ ok: true, now: new Date().toISOString() });
  } catch (err) {
    return error_(err);
  }
}

function doPost(e) {
  try {
    const mode = ((e.parameter && e.parameter.mode) || "").toLowerCase();
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    if (mode === "log") return json_(handleLog_(body));
    if (mode === "breadcrumb") return json_(handleBreadcrumb_(body));
    return json_({ ok: false, error: "Unknown POST mode" });
  } catch (err) {
    return error_(err);
  }
}

/* ------------------ Core: GET PINS ------------------ */
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
    ts: r[idx.latest_ts] || "",
    user: r[idx.latest_user] || "",
    is_dnd: toBool_(r[idx.is_dnd]),
  })).filter(p => p.address);

  return out;
}

/* ------------------ Core: POST LOG ------------------ */
function handleLog_(payload) {
  // Expected payload keys:
  // pin_id, address, lat, lng, status, substatus, note, user, device, source
  const now = new Date();
  const ts = now.toISOString();

  // sanitize
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

  // upsert pin
  const pin = upsertPin_(clean);

  // append log row
  appendLogRow_(pin.pin_id, pin.address_norm, clean);

  return { ok: true, pin_id: pin.pin_id, ts };
}

/* ------------------ Core: POST BREADCRUMB ------------------ */
function handleBreadcrumb_(payload) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.BREADCRUMBS);
  if (!sh) return { ok: false, error: "Breadcrumbs tab missing" };

  const row = [
    uuid_(),                           // crumb_id
    String(payload.user || ""),        // user
    String(payload.session_id || ""),  // session_id
    toNumOrNull_(payload.lat),         // lat
    toNumOrNull_(payload.lng),         // lng
    toNumOrNull_(payload.speed_kmh),   // speed_kmh
    toNumOrNull_(payload.accuracy_m),  // accuracy_m
    new Date().toISOString(),          // ts
  ];
  sh.appendRow(row);
  return { ok: true };
}

/* ------------------ Helpers: Pin Upsert + Log Append ------------------ */
function upsertPin_(clean) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.PINS);
  if (!sh) throw new Error("Pins sheet not found");

  const values = getRows_(sh);
  const headers = ensurePinsHeaders_(sh, values[0]);
  const rows = values.length > 1 ? values.slice(1) : [];

  const H = colIndex_(headers, [
    "pin_id","address_norm","lat","lng",
    "latest_status","latest_substatus","latest_note",
    "latest_ts","latest_user","value_rank","is_dnd",
    "created_ts","created_by","last_updated_ts"
  ]);

  let pinId = clean.pin_id;
  let addressNorm = clean.address;

  // Try to find by provided pin_id first, else by normalized address
  let matchRow = -1;
  if (pinId) {
    matchRow = rows.findIndex(r => r[H.pin_id] === pinId);
  }
  if (matchRow < 0 && addressNorm) {
    matchRow = rows.findIndex(r => (r[H.address_norm] || "").toLowerCase() === addressNorm.toLowerCase());
  }

  const isDnd = (clean.status || "").toLowerCase() === "dead" ||
                (clean.substatus || "").toLowerCase().includes("do not knock");

  const valueRank = rankForStatus_(clean.status);

  if (matchRow >= 0) {
    // update existing
    const r = rows[matchRow];
    if (!pinId) pinId = r[H.pin_id]; // keep existing id if not provided
    const rowIndex = matchRow + 2;    // +1 header, +1 1-based
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
    // insert new
    pinId = pinId || uuid_();
    sh.appendRow([
      pinId,
      addressNorm,
      clean.lat, clean.lng,
      clean.status, clean.substatus, clean.note,
      clean.ts, clean.user,
      valueRank, isDnd,
      clean.ts, clean.user,
      clean.ts
    ]);
  }

  return { pin_id: pinId, address_norm: addressNorm };
}

function appendLogRow_(pin_id, address_snapshot, clean) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.LOGS);
  if (!sh) throw new Error("Logs sheet not found");
  sh.appendRow([
    uuid_(),            // log_id
    pin_id,             // pin_id
    address_snapshot,   // address_snapshot
    clean.lat,          // lat
    clean.lng,          // lng
    clean.status,       // status
    clean.substatus,    // substatus
    clean.note,         // note_short
    clean.user,         // user
    clean.ts,           // ts
    clean.device || "", // device
    clean.source || ""  // source
  ]);
}

/* ------------------ Utilities ------------------ */

function getConfig_(key) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET.CONFIG);
  if (!sh) return "";
  const values = getRows_(sh);
  if (values.length < 2) return "";
  const headers = values[0];
  const idxK = headers.indexOf("key");
  const idxV = headers.indexOf("value");
  if (idxK < 0 || idxV < 0) return "";
  for (let i = 1; i < values.length; i++) {
    if ((values[i][idxK] || "").toString().toLowerCase() === key.toLowerCase()) {
      return values[i][idxV] || "";
    }
  }
  return "";
}

function cleanStatus_(s) {
  const allowed = (getConfig_("status_list") || "Damage|Quick Knock|Conversation|Inspection|Customer|Dead")
    .split("|").map(x => x.trim().toLowerCase());
  const val = (s || "").toString().trim().toLowerCase();
  return titleCase_(allowed.includes(val) ? val : "Damage");
}

function cleanSub_(s) {
  // For prototype: accept any short substatus; sanitize length.
  return titleCase_((s || "").toString().trim().slice(0, 60));
}

function rankForStatus_(status) {
  const s = (status || "").toLowerCase();
  // Higher is “hotter” for sorting
  if (s === "customer") return 5;
  if (s === "inspection") return 4;
  if (s === "conversation") return 3;
  if (s === "damage" || s === "quick knock") return 2;
  if (s === "dead") return 1;
  return 0;
}

function ensurePinsHeaders_(sh, firstRow) {
  const desired = [
    "pin_id","address_norm","lat","lng","latest_status","latest_substatus","latest_note",
    "latest_ts","latest_user","value_rank","is_dnd","created_ts","created_by","last_updated_ts"
  ];
  if (!firstRow || desired.some((h,i)=> firstRow[i] !== desired[i])) {
    sh.getRange(1,1,1,desired.length).setValues([desired]);
  }
  return desired;
}

function getRows_(sh) {
  const last = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (last === 0) return [[]];
  return sh.getRange(1,1,Math.max(1,last),lastCol).getValues();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function error_(err) {
  const msg = (err && err.stack) ? String(err.stack) : String(err);
  return ContentService.createTextOutput(JSON.stringify({ ok:false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function uuid_() {
  const chars = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".split("");
  for (let i=0; i<chars.length; i++) {
    if (chars[i] === "x") chars[i] = (Math.random()*16|0).toString(16);
    else if (chars[i] === "y") chars[i] = ((Math.random()*16|0)&0x3|0x8).toString(16);
  }
  return chars.join("");
}
function titleCase_(s){ return s.replace(/\b\w/g, c=>c.toUpperCase()); }
function num_(v){ const n = Number(v); return isNaN(n)? null : n; }
function toNumOrNull_(v){ if (v===null||v===undefined||v==="") return null; const n = Number(v); return isNaN(n)? null:n; }
function toBool_(v){ if (typeof v === "boolean") return v; const s = String(v).toLowerCase(); return s==="true"||s==="1"||s==="yes"; }
function numOrFallback_(n,f){ const v = toNumOrNull_(n); return v===null? f : v; }
