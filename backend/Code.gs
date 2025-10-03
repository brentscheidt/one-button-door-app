/** Door Knock Logger — Backend v0.3.3 */
const CONFIG = { SHEET_NAME: 'Knocks', VERSION: 'v0.3.3' };

function _sheet() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['server_ts','client_ts','user_email','lat','lng','address','city','state','zip','homeowner_name','status','condition','interest_level','notes','follow_up_iso','photo_url','source_device','version']);
  }
  return sh;
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sh = _sheet();
    sh.appendRow([ new Date(), data.timestamp, data.user_email || '', data.lat, data.lng, data.address, data.city, data.state, data.zip, '', '', '', '', '', '', '', 'web', CONFIG.VERSION ]);
    return ContentService.createTextOutput("Success");
  } catch (err) { return ContentService.createTextOutput("Error: " + err); }
}

function doGet(e) {
  try {
    var sh = _sheet();
    var data = sh.getDataRange().getValues();
    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) row[headers[j]] = data[i][j];
      rows.push(row);
    }
    return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) { return ContentService.createTextOutput("Error: " + err); }
}
