/* STEP 0 共通ユーティリティ（admin.html / index.html で共用） */
(function () {
  "use strict";

  // ---- UTF-8 対応 Base64（URL安全形式：+→-, /→_, 末尾=省略） ----
  function encodeParam(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // 通常の Base64 / URL安全形式のどちらも受け付ける。失敗時は例外を投げる。
  function decodeParam(str) {
    var s = String(str).replace(/ /g, "+") // クエリ中の + が空白に化けた場合の救済
      .replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
    while (s.length % 4) s += "=";
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  }

  // ---- ランダムID（英数字） ----
  function randomId(len) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var out = "";
    var buf = new Uint8Array(1);
    while (out.length < len) {
      crypto.getRandomValues(buf);
      if (buf[0] < 248) out += chars[buf[0] % 62]; // 偏りを避けるため 248 以上は捨てる
    }
    return out;
  }

  // ---- localStorage（使えない環境でも止まらない） ----
  var storage = {
    available: (function () {
      try {
        var k = "__step0_test__";
        window.localStorage.setItem(k, "1");
        window.localStorage.removeItem(k);
        return true;
      } catch (e) { return false; }
    })(),
    get: function (key) {
      try {
        var v = window.localStorage.getItem(key);
        return v ? JSON.parse(v) : null;
      } catch (e) { return null; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { window.localStorage.removeItem(key); } catch (e) { /* noop */ }
    }
  };

  // ---- クリップボード（file:// や古い端末向けのフォールバック付き） ----
  function copyText(text) {
    function fallback() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "0";
        ta.style.left = "0";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return fallback(); }
      );
    }
    return Promise.resolve(fallback());
  }

  // ---- テキストファイルのダウンロード ----
  function downloadText(filename, text) {
    try {
      var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) { return false; }
  }

  // ---- ボタンに一時的な完了表示を出す ----
  function flashButton(btn, label, ms) {
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.textContent = label;
    btn.classList.add("is-done");
    clearTimeout(btn._flashTimer);
    btn._flashTimer = setTimeout(function () {
      btn.textContent = btn.dataset.label;
      btn.classList.remove("is-done");
    }, ms || 2000);
  }

  window.Step0 = {
    encodeParam: encodeParam,
    decodeParam: decodeParam,
    randomId: randomId,
    storage: storage,
    copyText: copyText,
    downloadText: downloadText,
    flashButton: flashButton
  };
})();
