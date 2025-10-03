/** Door Knock Logger — Backend v0.2
 * Sheet: DoorKnockLog / Knocks
 * Deploy as Web App: Execute as Me; Access: Anyone with the link
 * Security: shared secret stored in Script Properties as API_SECRET
 */

const CONFIG = {
  SHEET_NAME: 'Knocks',
  PROP_SECRET_KEY: 'API_SECRET',
  VERSION: 'v0.2',
};

function _sheet() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['ts_iso','reason','notes','lat','lng','address','city','state','zip','source_device','version']);
  }
  return sh;
}

function _secret() {
  const s = PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_SECRET_KEY);
  if (!s) throw new Error('API secret not set. Add Script property "API_SECRET".');
  return s;
}

function doGet() {
  return ContentService.createTextOutput('Door Knock Logger API ok').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const body = e?.postData?.contents ? JSON.parse(e.postData.contents) : {};
    if (!body.secret || body.secret !== _secret()) {
      return _json({ ok: false, error: 'unauthorized' });
    }
    const sh = _sheet();
    const row = [
      body.ts_iso || new Date().toISOString(),
      body.reason || '',
      body.notes || '',
      _num(body.lat), _num(body.lng),
      body.address || '',
      body.city || '',
      body.state || '',
      body.zip || '',
      body.source_device || 'web',
      CONFIG.VERSION,
    ];
    sh.appendRow(row);
    return _json({ ok: true, saved_at: new Date().toISOString() });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function _num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : '';
}
