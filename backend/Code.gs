/**
 * BSRG DoorKnock System — Apps Script backend
 * Version: v0.4.0-core-hotfix (2025-10-05)
 * Notes:
 * - Hybrid map fix on frontend; backend unchanged.
 * - Maintains unified schema (Pins / Logs / Breadcrumbs / Config).
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

/* ------------ Get Pins ------------- */
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

/* ------------ Handle Log ------------- */
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

/* ------------ Handle Breadcrumb ------------- */
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

/* ------------ Pin + Log Utilities ------------- */
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

/* ------------ Misc Utilities ------------- */
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
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function error_(e){return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(e.stack||e)})).setMimeType(ContentService.MimeType.JSON);}
function uuid_(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==="x"?r:(r&0x3|0x8);return v.toString(16);});}
function titleCase_(s){return s.replace(/\b\w/g,c=>c.toUpperCase());}
function num_(v){const n=Number(v);return isNaN(n)?null:n;}
function toNumOrNull_(v){if(v===null||v===undefined||v==="")return null;const n=Number(v);return isNaN(n)?null:n;}
function toBool_(v){if(typeof v==="boolean")return v;const s=String(v).toLowerCase();return s==="true"||s==="1"||s==="yes";}
function numOrFallback_(n,f){const v=toNumOrNull_(n);return v===null?f:v;}
