/* STEP 0 カリキュラム設計シート本体 */
(function () {
  "use strict";

  var SECTIONS = window.STEP0_SECTIONS || [];
  var app = document.getElementById("app");

  // ---------------------------------------------------------------
  // 契約者情報（?c= を読み取る。失敗しても氏名なしで動作）
  // ---------------------------------------------------------------
  var person = { name: "", id: "" };
  try {
    var raw = new URLSearchParams(location.search).get("c");
    if (raw) {
      var obj = Step0.decodeParam(raw);
      if (obj && typeof obj.n === "string") person.name = obj.n.trim().slice(0, 50);
      if (obj && typeof obj.i === "string" && /^[A-Za-z0-9]{1,32}$/.test(obj.i)) person.id = obj.i;
    }
  } catch (e) { /* 壊れたリンクでも止めない */ }

  // ---------------------------------------------------------------
  // 保存（契約者IDごとにキーを分ける）
  // ---------------------------------------------------------------
  var STORAGE_KEY = "step0:v1:" + (person.id || "_noid");
  var state = Step0.storage.get(STORAGE_KEY);
  if (!state || typeof state !== "object" || typeof state.answers !== "object") {
    state = { step: "intro", answers: {}, submittedAt: null };
  }
  if (typeof state.step === "number" && (state.step < 0 || state.step >= SECTIONS.length)) state.step = 0;

  function save() {
    state.updatedAt = new Date().toISOString();
    Step0.storage.set(STORAGE_KEY, state);
  }

  // ---------------------------------------------------------------
  // DOM ヘルパー（テキストは必ず textContent で入れる）
  // ---------------------------------------------------------------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function honorific() { return person.name ? person.name + " さん" : ""; }

  // ---------------------------------------------------------------
  // 回答の判定・整形
  // ---------------------------------------------------------------
  var OTHER = "__other__";

  function hasOptions(q) { return Array.isArray(q.options) && q.options.length > 0; }
  function isActive(q) { return !((q.type === "radio" || q.type === "checkbox") && !hasOptions(q)); }

  function isAnswered(q) {
    var a = state.answers[q.id];
    if (q.type === "radio") {
      if (!a || !a.value) return false;
      return a.value !== OTHER || !!(a.other || "").trim();
    }
    if (q.type === "checkbox") {
      if (!a || !Array.isArray(a.values)) return false;
      var n = a.values.filter(function (v) { return v !== OTHER || (a.other || "").trim(); }).length;
      return n >= (q.min || 1);
    }
    return typeof a === "string" && a.trim() !== "";
  }

  function answerText(q) {
    var a = state.answers[q.id];
    if (!isActive(q)) return "（選択肢未設定）";
    if (q.type === "radio") {
      if (!a || !a.value) return "";
      return a.value === OTHER ? "その他：" + (a.other || "").trim() : a.value;
    }
    if (q.type === "checkbox") {
      if (!a || !Array.isArray(a.values)) return "";
      return a.values.map(function (v) { return v === OTHER ? "その他：" + (a.other || "").trim() : v; }).join("、");
    }
    return typeof a === "string" ? a.trim() : "";
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function formatDate(d) {
    return d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function stampDate(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }

  function outputDate() { return state.submittedAt ? new Date(state.submittedAt) : new Date(); }

  // LINE・メールに貼り付けやすいテキスト
  function buildText() {
    var d = outputDate();
    var lines = [
      "【STEP 0：あなた専用カリキュラム設計シート】",
      "氏名：" + (person.name || "（未設定）"),
      "ID：" + (person.id || "（未設定）"),
      (state.submittedAt ? "提出日時：" : "作成日時：") + formatDate(d),
      ""
    ];
    SECTIONS.forEach(function (sec) {
      lines.push("━━━━━━━━━━━━", "■ " + sec.title, "━━━━━━━━━━━━", "");
      sec.questions.forEach(function (q) {
        lines.push((q.no ? q.no + ". " : "") + q.label.replace(/\n/g, " "));
        lines.push(answerText(q) || "（未回答）");
        lines.push("");
      });
    });
    return lines.join("\n").replace(/\n+$/, "\n");
  }

  // スプレッドシート（A〜U列）と同じ並びの1行。将来の連携用。
  function buildSheetRow() {
    var row = [formatDate(outputDate()), "", person.name, ""];
    SECTIONS.forEach(function (sec) { sec.questions.forEach(function (q) { row.push(answerText(q)); }); });
    return row;
  }

  function fileName() {
    var safe = (person.name || "回答").replace(/[\\\/:*?"<>|\s]+/g, "_");
    return "STEP0_" + safe + "_" + stampDate(outputDate()) + ".txt";
  }

  // ---------------------------------------------------------------
  // 提出処理：送信先を変えるときはこの関数だけ差し替える
  //   config.js の submitEndpoint が設定されていれば、Google スプレッドシート
  //   （Apps Script ウェブアプリ）へ A〜U列の並びで送信する。
  //   未設定なら、回答をクリップボードにコピーして本人が LINE 等で送る方式。
  //   戻り値：{ ok, sent, copied, error }
  // ---------------------------------------------------------------
  function submitEndpoint() {
    var cfg = window.STEP0_CONFIG || {};
    return typeof cfg.submitEndpoint === "string" ? cfg.submitEndpoint.trim() : "";
  }

  function submitAnswers(payload) {
    var endpoint = submitEndpoint();
    if (!endpoint) {
      return Step0.copyText(payload.text).then(function (copied) {
        return { ok: true, sent: false, copied: copied };
      });
    }
    if (!payload.name) return Promise.resolve({ ok: false, error: "noname" });

    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
    return fetch(endpoint, {
      method: "POST",
      // text/plain にして CORS のプリフライトを避ける（Apps Script の制約）
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ id: payload.id, name: payload.name, answers: payload.row.slice(4) }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.json(); }).then(function (res) {
      return res && res.ok ? { ok: true, sent: true } : { ok: false, error: (res && res.error) || "server" };
    }).catch(function () {
      return { ok: false, error: "network" };
    }).then(function (result) {
      if (timer) clearTimeout(timer);
      return result;
    });
  }

  // ---------------------------------------------------------------
  // 画面描画
  // ---------------------------------------------------------------
  function go(step) {
    state.step = step;
    save();
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    app.textContent = "";
    if (state.step === "intro") renderIntro();
    else if (typeof state.step === "number") renderSection(state.step);
    else if (state.step === "finish" || state.step === "review" || state.step === "done") renderFinish();
    else go("intro");
  }

  // 全体のステップ数 = 設問セクション + 完了ページ
  var TOTAL_STEPS = SECTIONS.length + 1;

  function progress(current, topLabel, leftLabel) {
    var pct = Math.round((current / TOTAL_STEPS) * 100);
    return el("div", { class: "progress" }, [
      el("div", { class: "progress__top", text: topLabel }),
      el("div", { class: "progress__track", role: "progressbar", "aria-label": "進捗", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct) }, [
        el("div", { class: "progress__bar", style: "width:" + pct + "%" })
      ]),
      el("div", { class: "progress__meta" }, [el("span", { text: leftLabel }), el("span", { text: current + " / " + TOTAL_STEPS })])
    ]);
  }

  function storageNotice() {
    if (!Step0.storage.available) {
      return el("p", { class: "notice notice--warn small" }, [
        el("strong", { text: "自動保存が使えない環境です。" }),
        "ページを閉じたり再読み込みしたりすると入力内容が消えます。最後まで一度に入力してください。"
      ]);
    }
    return el("p", { class: "notice small" }, [
      "入力内容は",
      el("strong", { text: "この端末のブラウザ内にのみ" }),
      "自動保存されます（外部には送信されません）。同じ端末・同じブラウザで開けば続きから再開できます。"
    ]);
  }

  function renderIntro() {
    var resumed = Object.keys(state.answers).length > 0;
    app.appendChild(el("h1", { text: "あなただけのカリキュラム設計シートを一緒に作りましょう" }));
    if (person.name) app.appendChild(el("p", { class: "lead", text: honorific() + "、ようこそ。" }));
    app.appendChild(el("div", { class: "card" }, [
      el("p", { text: "面談の前に、あなた自身のこと・理想・作戦をこのシートに入力してください。" }),
      el("p", { text: "入力していただいた内容をもとに、あなた専用のカリキュラムを組み立てます。回答は初回ミーティングで使用します。" }),
      el("p", { class: "muted", style: "margin:0" }, ["所要時間の目安：", el("strong", { text: "30〜40分" })])
    ]));
    app.appendChild(el("p", { class: "notice notice--warn small" }, [
      el("strong", { text: "このリンクはあなた専用です。" }),
      "氏名などの情報が含まれているため、他の人に転送・共有しないでください。"
    ]));
    app.appendChild(storageNotice());
    app.appendChild(el("div", { class: "actions" }, [
      el("button", { type: "button", class: "btn btn--primary", text: resumed ? "続きから再開する →" : "はじめる →",
        onclick: function () { go(resumed ? firstIncomplete() : 0); } })
    ]));
  }

  function firstIncomplete() {
    for (var i = 0; i < SECTIONS.length; i++) {
      var ok = SECTIONS[i].questions.every(function (q) { return !q.required || !isActive(q) || isAnswered(q); });
      if (!ok) return i;
    }
    return "finish";
  }

  function renderField(q) {
    var wrap = el("div", { class: "field", "data-qid": q.id });
    var inputId = "f_" + q.id;
    var labelTag = q.type === "radio" || q.type === "checkbox" ? "p" : "label";
    wrap.appendChild(el(labelTag, { class: "label", for: labelTag === "label" ? inputId : null, id: "l_" + q.id }, [
      q.no ? el("span", { class: "no", text: q.no }) : null,
      q.label,
      q.required && isActive(q) ? el("span", { class: "req", text: "必須" }) : null
    ]));
    if (q.hint) wrap.appendChild(el("p", { class: "hint", text: q.hint }));

    if (q.type === "text" || q.type === "textarea") {
      var input = q.type === "text"
        ? el("input", { type: "text", id: inputId, placeholder: q.placeholder || "" })
        : el("textarea", { id: inputId, rows: String(q.rows || 4), placeholder: q.placeholder || "" });
      input.value = typeof state.answers[q.id] === "string" ? state.answers[q.id] : "";
      var counter = q.lineCount ? el("p", { class: "counter" }) : null;
      var updateCounter = function () {
        if (!counter) return;
        var n = input.value.split("\n").filter(function (l) { return l.trim(); }).length;
        counter.textContent = "現在 " + n + " 個（目安 " + q.lineCount + " 個以上）";
        counter.classList.toggle("is-met", n >= q.lineCount);
      };
      input.addEventListener("input", function () {
        state.answers[q.id] = input.value;
        save();
        updateCounter();
        if (input.value.trim()) wrap.classList.remove("is-invalid");
      });
      wrap.appendChild(input);
      if (counter) { updateCounter(); wrap.appendChild(counter); }
      return wrap;
    }

    // radio / checkbox
    if (!hasOptions(q)) {
      wrap.appendChild(el("p", { class: "notice small", text: "この設問の選択肢は準備中です。回答不要のまま次へ進めます。" }));
      return wrap;
    }
    var multi = q.type === "checkbox";
    var a = state.answers[q.id] || {};
    var selected = multi ? (a.values || []) : [a.value];
    var group = el("div", { class: "choices", role: multi ? "group" : "radiogroup", "aria-labelledby": "l_" + q.id });
    var opts = q.options.slice();
    if (q.allowOther) opts.push(OTHER);
    var otherInput = q.allowOther ? el("input", { type: "text", class: "other-input", placeholder: "その他の内容を入力", "aria-label": "その他の内容" }) : null;

    function sync() {
      var checked = Array.prototype.filter.call(group.querySelectorAll("input"), function (i) { return i.checked; })
        .map(function (i) { return i.value; });
      var other = otherInput ? otherInput.value : "";
      state.answers[q.id] = multi ? { values: checked, other: other } : { value: checked[0] || "", other: other };
      if (otherInput) otherInput.hidden = checked.indexOf(OTHER) === -1;
      save();
      if (isAnswered(q)) wrap.classList.remove("is-invalid");
    }

    opts.forEach(function (opt) {
      var value = typeof opt === "string" ? opt : opt.label;
      var desc = typeof opt === "string" ? "" : (opt.description || "");
      var box = el("input", { type: multi ? "checkbox" : "radio", name: "q_" + q.id, value: value });
      box.checked = selected.indexOf(value) !== -1;
      box.addEventListener("change", sync);
      group.appendChild(el("label", { class: "choice" + (desc ? " choice--desc" : "") }, [box, el("span", { class: "choice__body" }, [
        el("span", { class: "choice__label", text: value === OTHER ? "その他" : value }),
        desc ? el("span", { class: "choice__desc", text: desc }) : null
      ])]));
    });
    wrap.appendChild(group);
    if (q.note) wrap.appendChild(el("p", { class: "choice-note", text: q.note }));
    if (otherInput) {
      otherInput.value = a.other || "";
      otherInput.hidden = selected.indexOf(OTHER) === -1;
      otherInput.addEventListener("input", sync);
      wrap.appendChild(otherInput);
    }
    return wrap;
  }

  function renderSection(i) {
    var sec = SECTIONS[i];
    var isLast = i === SECTIONS.length - 1;
    app.appendChild(progress(i + 1, sec.title, "STEP 0"));
    app.appendChild(el("h2", { text: sec.title }));
    if (sec.description) app.appendChild(el("p", { class: "lead", text: sec.description }));

    var card = el("div", { class: "card" });
    sec.questions.forEach(function (q) { card.appendChild(renderField(q)); });
    app.appendChild(card);

    var error = el("p", { class: "notice notice--danger", role: "alert", hidden: true });
    app.appendChild(error);

    app.appendChild(el("div", { class: "actions actions--nav" }, [
      el("button", { type: "button", class: "btn btn--text", text: "← 前に戻る",
        onclick: function () { go(i === 0 ? "intro" : i - 1); } }),
      el("button", { type: "button", class: "btn btn--primary", text: "次へ →",
        onclick: function () {
          var invalid = sec.questions.filter(function (q) { return q.required && isActive(q) && !isAnswered(q); });
          app.querySelectorAll(".field").forEach(function (f) { f.classList.remove("is-invalid"); });
          if (invalid.length) {
            invalid.forEach(function (q) {
              var f = app.querySelector('[data-qid="' + q.id + '"]');
              if (f) f.classList.add("is-invalid");
            });
            error.textContent = "未入力の項目があります。すべて記入してから次へ進んでください。";
            error.hidden = false;
            var first = app.querySelector(".is-invalid");
            if (first) {
              first.scrollIntoView({ behavior: "smooth", block: "center" });
              var focusable = first.querySelector("textarea, input");
              if (focusable) focusable.focus({ preventScroll: true });
            }
            return;
          }
          go(isLast ? "finish" : i + 1);
        } })
    ]));
    app.appendChild(el("div", { style: "margin-top:20px" }, [storageNotice()]));
  }

  function outputButtons() {
    return [
      el("button", { type: "button", class: "btn btn--ghost", text: "回答をコピー", onclick: function () {
        var btn = this;
        Step0.copyText(buildText()).then(function (ok) {
          Step0.flashButton(btn, ok ? "コピーしました ✓" : "コピーできませんでした。「控えを保存」をお使いください", ok ? 2000 : 3500);
        });
      } }),
      el("button", { type: "button", class: "btn btn--ghost", text: "控えを保存", onclick: function () {
        var ok = Step0.downloadText(fileName(), buildText());
        Step0.flashButton(this, ok ? "保存しました ✓" : "保存できませんでした", 2500);
      } })
    ];
  }

  // 完了ページ（STEP 0 完了 / 提出・コピー・保存）
  function renderFinish() {
    app.appendChild(progress(TOTAL_STEPS, "完了", "STEP 0 完了"));

    var mark = el("div", { class: "done-mark", "aria-hidden": "true" });
    mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    app.appendChild(mark);
    app.appendChild(el("h1", { class: "done-title", text: "おつかれさまでした。" }));

    app.appendChild(el("div", { class: "card next-step" }, [
      el("p", { class: "next-step__title", text: "次は初回ミーティング" }),
      el("p", { text: "業務を始める直前の打ち合わせです。" })
    ]));

    var status = el("p", { class: "notice", role: "status", hidden: true });
    function showStatus(kind, msg) {
      status.className = "notice " + (kind === "ok" ? "notice--ok" : "notice--danger");
      status.textContent = msg;
      status.hidden = false;
    }
    function showResult(res) {
      if (res.sent) {
        showStatus("ok", "提出が完了しました。回答は担当者に届いています。");
      } else if (res.ok) {
        showStatus("ok", res.copied
          ? "提出内容をコピーしました。LINEまたはメールに貼り付けて、担当者へ送ってください。"
          : "「回答をコピー」で内容をコピーし、LINEまたはメールに貼り付けて担当者へ送ってください。");
      } else if (res.error === "noname") {
        showStatus("ng", "このページは個別リンクから開かれていないため、提出できません。担当者から届いたリンクを開き直すか、「回答をコピー」してLINE等で送ってください。");
      } else {
        showStatus("ng", "送信できませんでした。通信環境を確認して、もう一度「この内容で提出する」を押してください。うまくいかない場合は「回答をコピー」してLINE等で送ってください。");
      }
    }
    if (state.submittedAt) showResult({ ok: true, sent: !!state.lastSent, copied: !!state.lastCopied });

    var submitLabel = state.lastSent ? "もう一度提出する" : "この内容で提出する";
    var submitBtn = el("button", { type: "button", class: "btn btn--primary", text: submitLabel, onclick: function () {
      if (state.lastSent && !window.confirm("すでに提出済みです。現在の内容でもう一度提出しますか？")) return;
      submitBtn.disabled = true;
      submitBtn.textContent = "送信中…";
      var now = new Date().toISOString();
      var payload = { name: person.name, id: person.id, submittedAt: now,
        answers: state.answers, text: buildText(), row: buildSheetRow() };
      submitAnswers(payload).then(function (res) {
        if (res.ok) {
          state.submittedAt = now;
          state.lastSent = !!res.sent;
          state.lastCopied = !!res.copied;
          save();
        }
        showResult(res);
        submitBtn.disabled = false;
        submitBtn.textContent = state.lastSent ? "もう一度提出する" : "この内容で提出する";
      });
    } });

    app.appendChild(status);
    app.appendChild(el("div", { class: "actions actions--row" }, [submitBtn].concat(outputButtons())));
    app.appendChild(el("div", { class: "actions actions--center", style: "margin-top:10px" }, [
      el("button", { type: "button", class: "btn btn--ghost", text: "← 前に戻る", onclick: function () { go(SECTIONS.length - 1); } })
    ]));

    // 回答の見直し（折りたたみ）
    var details = el("details", { class: "review-details" }, [el("summary", { text: "入力内容を確認する" })]);
    SECTIONS.forEach(function (sec, si) {
      var card = el("div", { class: "card review-section" }, [el("h3", { text: sec.title })]);
      sec.questions.forEach(function (q) {
        card.appendChild(el("div", { class: "review-item" }, [
          el("p", { class: "review-q", text: (q.no ? q.no + ". " : "") + q.label }),
          el("p", { class: "review-a", text: answerText(q) || "（未回答）" })
        ]));
      });
      card.appendChild(el("button", { type: "button", class: "btn btn--text small", text: "このセクションを修正する",
        onclick: function () { go(si); } }));
      details.appendChild(card);
    });
    app.appendChild(details);
  }

  // ---- 起動 ----
  try { render(); }
  catch (e) {
    app.textContent = "";
    app.appendChild(el("p", { class: "notice notice--danger", text: "読み込み中に問題が発生しました。ページを再読み込みしてください。" }));
  }

  // 検証・将来の連携用に公開（画面からは使わない）
  window.Step0Sheet = { buildText: buildText, buildSheetRow: buildSheetRow, fileName: fileName, person: person, storageKey: STORAGE_KEY };
})();
