/**
 * STEP 0 回答受付（Google Apps Script）
 * -------------------------------------------------------------
 * 「この内容で提出する」で送られた回答を、このスプレッドシートに1行ずつ追記します。
 * 書き込み先：A 送信日時 / B ID / C 名前 / D 担当講師（空欄） / E〜U Q1〜Q16（Q10は2列）
 * 公開ページ側の設定：nova-prime/config.js の submitEndpoint にウェブアプリURLを入れる
 */

var TARGET_GID = 1809939538; // 書き込むシートタブ（スプレッドシートURLの gid=）
var ANSWER_COUNT = 17;        // E〜U列の数
var MAX_LEN = 5000;           // 1回答あたりの最大文字数
var TIMEZONE = 'Asia/Tokyo';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var name = String(data.name || '').trim();
    var id = String(data.id || '');
    var answers = data.answers;

    if (!name || name.length > 50) return json_({ ok: false, error: 'name' });
    if (id && !/^[A-Za-z0-9]{1,32}$/.test(id)) return json_({ ok: false, error: 'id' });
    if (!Array.isArray(answers) || answers.length !== ANSWER_COUNT) return json_({ ok: false, error: 'answers' });

    var row = [Utilities.formatDate(new Date(), TIMEZONE, 'yyyy/MM/dd HH:mm:ss'), id, safe_(name), ''];
    for (var i = 0; i < answers.length; i++) {
      row.push(safe_(String(answers[i] == null ? '' : answers[i]).slice(0, MAX_LEN)));
    }
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      getSheet_().appendRow(row);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

// ブラウザでURLを開いたときの動作確認用
function doGet() {
  return json_({ ok: true, service: 'STEP 0 receiver' });
}

function getSheet_() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === TARGET_GID) return sheets[i];
  }
  throw new Error('target sheet not found');
}

// = + - @ で始まる回答が数式として解釈されないようにする
function safe_(v) {
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
