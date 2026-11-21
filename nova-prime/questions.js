/*
 * STEP 0 設問データ
 * -------------------------------------------------------------
 * ・1セクション = 1画面。配列の順番がそのまま表示順になります。
 * ・各設問の "id" は回答の保存キーです。公開後に変更すると、
 *   保存済みの回答が引き継がれなくなるので注意してください。
 * ・"column" はスプレッドシートの列（A〜U）との対応です。
 * ・type: "text"（1行） / "textarea"（複数行） / "radio"（単一選択） / "checkbox"（複数選択）
 * ・radio / checkbox は "options": ["選択肢1", "選択肢2"] で選択肢を指定します。
 *   説明文付きにする場合は { "label": "選択肢", "description": "説明" } と書きます。
 *   "allowOther": true で「その他（自由記入）」を追加できます。
 * ・"note" は選択肢の下に表示される補足ボックスです。
 * ・"hint" は設問の下に小さく表示される補足、"lineCount" は
 *   「現在◯個」の目安カウンター（1行1個で数える。入力は強制しません）。
 */
window.STEP0_SHEET_COLUMNS = {
  submittedAt: "A", // 送信日時
  // B: 「/」（用途未確定のため空欄で出力）
  name: "C"         // 名前
  // D: 「/」（用途未確定のため空欄で出力）
};

window.STEP0_SECTIONS = [
  {
    "id": "self",
    "title": "あなたのこと",
    "description": "まずは、今のあなたについて教えてください。",
    "questions": [
      { "id": "q1", "column": "E", "no": "Q1", "type": "textarea", "required": true, "rows": 5,
        "label": "これまでの職歴・経験を簡単に振り返って教えてください" },
      { "id": "q2", "column": "F", "no": "Q2", "type": "textarea", "required": true, "rows": 8,
        "label": "1週間のスケジュールを、できるだけ詳しく教えてください" },
      { "id": "q3", "column": "G", "no": "Q3", "type": "textarea", "required": true, "rows": 4,
        "label": "申し込みを決めた瞬間、頭の中にあった「決め手」は何でしたか？" }
    ]
  },
  {
    "id": "ideal",
    "title": "あなたの理想",
    "description": "この挑戦の先にある、理想の姿を描いてみましょう。",
    "questions": [
      { "id": "q4", "column": "H", "no": "Q4", "type": "textarea", "required": true, "rows": 4,
        "label": "この挑戦を通じて、最終的に手に入れたいものは何ですか？" },
      { "id": "q5", "column": "I", "no": "Q5", "type": "textarea", "required": true, "rows": 10,
        "label": "時間とお金の制約がなかったら、やりたいことを10個以上書き出してください",
        "hint": "1行に1つずつ書いてください。", "lineCount": 10 },
      { "id": "q6", "column": "J", "no": "Q6", "type": "textarea", "required": true, "rows": 6,
        "label": "1年後の理想の休日を、朝から夜まで描写してください" },
      { "id": "q7", "column": "K", "no": "Q7", "type": "textarea", "required": true, "rows": 4,
        "label": "最初の売上通知が届いた瞬間をイメージしてみてください。\nどういう感情や思いが出てくると思いますか？" },
      { "id": "q8", "column": "L", "no": "Q8", "type": "textarea", "required": true, "rows": 4,
        "label": "3ヶ月後、どんな自分になっていたら「やってよかった」と言えますか？" }
    ]
  },
  {
    "id": "plan",
    "title": "あなたの作戦",
    "description": "理想に向かうための、具体的な作戦を立てましょう。",
    "questions": [
      { "id": "q9", "column": "M", "no": "Q9", "type": "textarea", "required": true, "rows": 4,
        "label": "最初の1ヶ月で「これだけはやり切る」と宣言できる行動目標は？" },
      { "id": "q10_1", "column": "N", "no": "Q10-1", "type": "radio", "required": true,
        "label": "どちらのタイプに近いですか？",
        "options": [
          { "label": "スキマ時間型",
            "description": "通勤中・昼休み・寝る前など、1回10〜30分の短い時間を毎日コツコツ積み重ねるスタイル。\n「毎日触るから感覚が鈍らない」のが強み。" },
          { "label": "まとめて作業型",
            "description": "平日は最小限にして、週1〜2回、90分以上のまとまった時間を確保して一気に集中するスタイル。\n「深く集中して一気に進む」のが強み。" }
        ],
        "note": "どちらのタイプでも成果を出している先輩がいます（組み合わせ型もOK）。" },
      { "id": "q10_2", "column": "O", "no": "Q10-2", "type": "textarea", "required": true, "rows": 3,
        "label": "その理由も教えてください",
        "placeholder": "そう思う理由もひとこと添えてください" },
      { "id": "q11", "column": "P", "no": "Q11", "type": "textarea", "required": true, "rows": 4,
        "label": "作業する曜日と時間帯を決めるとしたら、いつにしますか？" },
      { "id": "q12", "column": "Q", "no": "Q12", "type": "textarea", "required": true, "rows": 5,
        "label": "作業が中断しそうな障害と、その対処法をセットで考えてください" }
    ]
  },
  {
    "id": "support",
    "title": "不安とサポート",
    "description": "正直な気持ちを教えてください。サポートの参考にします。",
    "questions": [
      { "id": "q13", "column": "R", "no": "Q13", "type": "textarea", "required": true, "rows": 4,
        "label": "今、正直に一番不安なことは何ですか？ どんな小さなことでもOKです" },
      { "id": "q14", "column": "S", "no": "Q14", "type": "textarea", "required": true, "rows": 4,
        "label": "「これを聞いたら恥ずかしいかな」と思って聞けていないことはありますか？" },
      { "id": "q15", "column": "T", "no": "Q15", "type": "textarea", "required": true, "rows": 4,
        "label": "過去に何かで挫折した経験があれば、その原因は何でしたか？" },
      { "id": "q16", "column": "U", "no": "Q16", "type": "textarea", "required": true, "rows": 4,
        "label": "サポートを受ける上で、伝えておきたい事はありますか？" }
    ]
  }
];
