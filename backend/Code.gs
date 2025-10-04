/** Door Knock Logger — Backend v0.3.11 */

const CONFIG = {
  SHEET_ID   : '1wNAbDpUqe5C0kq_ty4MPi3dHVWjsKHtfkx5o9BIoHn4',
  SHEET_NAME : 'DoorKnockLog',
  VERSION    : 'v0.3.11',
  ALLOWED    : ['brent@tscstudios.com','paris.wilcox@rocky.edu'],
  PUBLIC_GET : true
};

function _sheet() {
  return SpreadsheetApp.openById(CONFIG.SHEET_ID)
           .getSheetByName(CONFIG.SHEET_NAME);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const email = (data.user_email||'').toLowerCase().trim();
    if (!CONFIG.ALLOWED.includes(email)) {
      throw 'unauthorized';
    }

    const sh = _sheet();
    sh.appendRow([
      new Date(),
      email,
      '',
      data.lat||'',
      data.lng||'',
      data.address||'',
      data.city||'',
      data.state||'',
      data.zip||'',
      '',
      data.reason||'',
      '',
      '',
      data.notes||'',
      '',
      '',
      data.source_device||'web',
      CONFIG.VERSION
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok:true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok:false, error:String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (!CONFIG.PUBLIC_GET) {
    return ContentService
      .createTextOutput('[]')
      .setMimeType(ContentService.MimeType.JSON);
  }
  const sh = _sheet();
  const data = sh.getDataRange().getValues();
  const [hdr, ...rows] = data;
  const col = Object.fromEntries(hdr.map((h,i)=>[h.toLowerCase(), i]));
  const result = rows.map(r=>({
    lat:       r[col.lat],
    lng:       r[col.lng],
    address:   r[col.address],
    city:      r[col.city],
    state:     r[col.state],
    zip:       r[col.zip],
    status:    r[col.status],
    notes:     r[col.notes],
    user_email:r[col.user_email]
  })).filter(r=>r.lat && r.lng);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
