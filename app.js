// ==== 共通ユーティリティ ====

function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("この端末・ブラウザは音声再生に対応していません。");
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ko-KR";
  utter.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const krVoice = voices.find((v) => v.lang === "ko-KR") || voices.find((v) => v.lang && v.lang.startsWith("ko"));
  if (krVoice) utter.voice = krVoice;
  window.speechSynthesis.speak(utter);
}
// iOSなどvoicesの読み込みが遅延する場合があるため事前に呼んでおく
if ("speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

const STORAGE_KEY = "kr_study_progress_v1";
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
function recordResult(categoryId, correctCount, totalCount) {
  const progress = loadProgress();
  progress[categoryId] = {
    lastScore: correctCount,
    lastTotal: totalCount,
    bestScore: Math.max(correctCount, (progress[categoryId] && progress[categoryId].bestScore) || 0),
    playedAt: Date.now(),
  };
  saveProgress(progress);
}

const DICTATION_STORAGE_KEY = "kr_dictation_progress_v1";
function loadDictationProgress() {
  try {
    return JSON.parse(localStorage.getItem(DICTATION_STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function recordDictationResult(categoryId, correctCount, totalCount) {
  const progress = loadDictationProgress();
  progress[categoryId] = {
    lastScore: correctCount,
    lastTotal: totalCount,
    bestScore: Math.max(correctCount, (progress[categoryId] && progress[categoryId].bestScore) || 0),
    playedAt: Date.now(),
  };
  localStorage.setItem(DICTATION_STORAGE_KEY, JSON.stringify(progress));
}

// ==== 苦手な単語(間違えた単語)の記録 ====
const MISTAKE_STORAGE_KEY = "kr_mistakes_v1";
function loadMistakes() {
  try {
    return JSON.parse(localStorage.getItem(MISTAKE_STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveMistakes(mistakes) {
  localStorage.setItem(MISTAKE_STORAGE_KEY, JSON.stringify(mistakes));
}
function recordMistake(categoryId, kr) {
  const mistakes = loadMistakes();
  if (!mistakes[categoryId]) mistakes[categoryId] = [];
  if (!mistakes[categoryId].includes(kr)) {
    mistakes[categoryId].push(kr);
    saveMistakes(mistakes);
  }
}
function clearMistake(categoryId, kr) {
  const mistakes = loadMistakes();
  if (mistakes[categoryId] && mistakes[categoryId].includes(kr)) {
    mistakes[categoryId] = mistakes[categoryId].filter((k) => k !== kr);
    saveMistakes(mistakes);
  }
}
function getAllMistakeWords() {
  const mistakes = loadMistakes();
  const result = [];
  WORD_CATEGORIES.forEach((cat) => {
    const krList = mistakes[cat.id] || [];
    cat.words.forEach((w) => {
      if (krList.includes(w.kr)) result.push({ ...w, catId: cat.id });
    });
  });
  return result;
}

const STEP_STORAGE_KEY = "kr_step_progress_v1";
function loadStepProgress() {
  try {
    return JSON.parse(localStorage.getItem(STEP_STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function setStepComplete(stepId, done) {
  const stepProgress = loadStepProgress();
  if (done) stepProgress[stepId] = true;
  else delete stepProgress[stepId];
  localStorage.setItem(STEP_STORAGE_KEY, JSON.stringify(stepProgress));
}
function isStepComplete(step) {
  if (step.type === "quiz") return !!loadProgress()[step.categoryId];
  return !!loadStepProgress()[step.id];
}

// ==== 継続記録(ストリーク) ====
const STREAK_STORAGE_KEY = "kr_streak_days_v1";
function formatDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function loadStreakData() {
  try {
    return JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY)) || { dates: [] };
  } catch (e) {
    return { dates: [] };
  }
}
function recordTodayActivity() {
  const data = loadStreakData();
  const todayStr = formatDateLocal(new Date());
  if (!data.dates.includes(todayStr)) {
    data.dates.push(todayStr);
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
  }
}
function getCurrentStreak() {
  const dateSet = new Set(loadStreakData().dates);
  let streak = 0;
  const cursor = new Date();
  while (dateSet.has(formatDateLocal(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// このアプリが使うlocalStorageキー一覧(バックアップの書き出し/読み込みで使う)
const ALL_STORAGE_KEYS = [STORAGE_KEY, DICTATION_STORAGE_KEY, STEP_STORAGE_KEY, STREAK_STORAGE_KEY, MISTAKE_STORAGE_KEY];

function downloadProgressBackup() {
  const data = {};
  ALL_STORAGE_KEYS.forEach((key) => {
    const val = localStorage.getItem(key);
    if (val !== null) data[key] = val;
  });
  const payload = { app: "kr-study-app", exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `韓国語学習_進捗バックアップ_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importProgressBackup(file, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const data = payload.data || payload;
      let importedCount = 0;
      ALL_STORAGE_KEYS.forEach((key) => {
        if (typeof data[key] === "string") {
          localStorage.setItem(key, data[key]);
          importedCount++;
        }
      });
      onDone(importedCount > 0);
    } catch (e) {
      onDone(false);
    }
  };
  reader.onerror = () => onDone(false);
  reader.readAsText(file);
}

function el(html) {
  const div = document.createElement("div");
  div.innerHTML = html.trim();
  return div.firstElementChild;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ==== タブ制御 ====

const viewEl = document.getElementById("view");
let currentTab = "home";

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tabName);
  });
  currentTab = tabName;
  render();
}

function render() {
  if (currentTab === "home") renderHome();
  else if (currentTab === "hangul") renderHangul();
  else if (currentTab === "words") renderWordsHome();
  else if (currentTab === "grammar") renderGrammar();
  else if (currentTab === "phrases") renderPhrases();
}

// ==== ホーム(学習コース)画面 ====

function renderHome() {
  viewEl.innerHTML = "";

  const streak = getCurrentStreak();
  if (streak > 0) {
    viewEl.appendChild(el(`<div class="streak-badge">🔥 ${streak}日連続学習中！</div>`));
  }

  const mistakeCount = getAllMistakeWords().length;
  if (mistakeCount > 0) {
    const reviewCard = el(`
      <div class="step-card review-card">
        <div class="step-badge">📝</div>
        <div class="step-body">
          <div class="step-title">苦手な単語を復習する</div>
          <div class="step-desc">クイズ・書き取りで間違えた単語が ${mistakeCount}個 たまっています。</div>
        </div>
      </div>
    `);
    reviewCard.addEventListener("click", () => goToMistakeReview());
    viewEl.appendChild(reviewCard);
  }

  const completedCount = STUDY_STEPS.filter((s) => isStepComplete(s)).length;
  viewEl.appendChild(el(`<div class="section-title">学習コース (${completedCount} / ${STUDY_STEPS.length} 完了)</div>`));
  viewEl.appendChild(el(`
    <div class="progress-bar-track">
      <div class="progress-bar-fill" style="width:${(completedCount / STUDY_STEPS.length) * 100}%"></div>
    </div>
  `));

  const nextStep = STUDY_STEPS.find((s) => !isStepComplete(s));

  STUDY_LEVELS.forEach((level) => {
    const stepsInLevel = STUDY_STEPS.filter((s) => s.level === level.id);
    const levelCompletedCount = stepsInLevel.filter((s) => isStepComplete(s)).length;
    const levelDone = levelCompletedCount === stepsInLevel.length;

    viewEl.appendChild(el(`
      <div class="level-header ${levelDone ? "done" : ""}">
        <div class="level-title">${level.label}${levelDone ? " ✓ 完了" : ""}</div>
        <div class="level-desc">${level.desc}</div>
        <div class="level-count">${levelCompletedCount} / ${stepsInLevel.length} 完了</div>
      </div>
    `));

    stepsInLevel.forEach((step, index) => {
      const done = isStepComplete(step);
      const isNext = step === nextStep;
      const card = el(`
        <div class="step-card ${done ? "done" : ""} ${isNext ? "next" : ""}">
          <div class="step-badge">${done ? "✓" : index + 1}</div>
          <div class="step-body">
            <div class="step-title">${step.title}${isNext ? '<span class="step-next-tag">次はこれ</span>' : ""}</div>
            <div class="step-desc">${step.desc}</div>
          </div>
        </div>
      `);
      card.addEventListener("click", () => goToStep(step));
      viewEl.appendChild(card);

      if (step.type === "manual") {
        const toggleBtn = el(`<button class="step-toggle-btn">${done ? "完了を取り消す" : "完了にする"}</button>`);
        toggleBtn.addEventListener("click", (evt) => {
          evt.stopPropagation();
          setStepComplete(step.id, !done);
          renderHome();
        });
        card.querySelector(".step-body").appendChild(toggleBtn);
      }
    });
  });

  viewEl.appendChild(el(`<div class="section-title">データ管理</div>`));
  viewEl.appendChild(el(`
    <div class="empty-note" style="text-align:left;padding:0 0 10px;">
      学習の記録はこの端末の中だけに保存されています。機種変更やブラウザのデータ削除で消えてしまうので、時々バックアップを取っておくと安心です。
    </div>
  `));

  const dataBtnRow = el(`<div class="card-controls" style="margin-top:0;"></div>`);
  const exportBtn = el(`<button class="btn-speak">⬇️ 進捗をバックアップ</button>`);
  const importBtn = el(`<button class="btn-prev">⬆️ 進捗を復元</button>`);
  exportBtn.addEventListener("click", () => downloadProgressBackup());
  const fileInput = el(`<input type="file" accept="application/json" style="display:none;" />`);
  importBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    importProgressBackup(file, (success) => {
      alert(success ? "進捗を復元しました。" : "読み込みに失敗しました。正しいバックアップファイルか確認してください。");
      if (success) renderHome();
      fileInput.value = "";
    });
  });
  dataBtnRow.appendChild(exportBtn);
  dataBtnRow.appendChild(importBtn);
  viewEl.appendChild(dataBtnRow);
  viewEl.appendChild(fileInput);
}

function goToStep(step) {
  switchTab(step.tab);
  if (step.tab === "words" && step.categoryId) {
    const cat = WORD_CATEGORIES.find((c) => c.id === step.categoryId);
    if (cat) renderCategoryDetail(cat, "flashcard");
  }
}

function goToMistakeReview() {
  switchTab("words");
  renderMistakeReview();
}

function renderMistakeReview() {
  viewEl.innerHTML = "";
  const back = el(`<button class="back-btn">‹ ホームに戻る</button>`);
  back.addEventListener("click", () => switchTab("home"));
  viewEl.appendChild(back);
  viewEl.appendChild(el(`<div class="section-title">苦手な単語の復習</div>`));

  const mistakeWords = getAllMistakeWords();
  const allWordsPool = WORD_CATEGORIES.flatMap((c) => c.words);

  viewEl.appendChild(
    buildQuiz(null, {
      words: mistakeWords,
      pool: allWordsPool,
      emptyMessage: "苦手な単語はありません。素晴らしいです!",
      onCorrect: (w) => clearMistake(w.catId, w.kr),
      onWrong: () => {},
      onFinish: () => {},
      onRetry: () => renderMistakeReview(),
    })
  );
}

// ==== ハングル画面 ====

let ganadaOrderMode = "standard"; // "standard" | "grouped"

let hangulViewMode = "browse"; // "browse" | "drill"

function renderHangul() {
  viewEl.innerHTML = "";

  if (hangulViewMode === "drill") {
    const back = el(`<button class="back-btn">‹ ハングル一覧に戻る</button>`);
    back.addEventListener("click", () => {
      hangulViewMode = "browse";
      renderHangul();
    });
    viewEl.appendChild(back);
    viewEl.appendChild(el(`<div class="section-title">文字の書き取り練習</div>`));
    viewEl.appendChild(buildHangulTypingDrill());
    return;
  }

  viewEl.appendChild(el(`<div class="section-title">가나다표(五十音表に相当) タップで発音</div>`));

  const orderSwitch = el(`
    <div class="mode-switch">
      <button data-order="standard" class="${ganadaOrderMode === "standard" ? "active" : ""}">標準順</button>
      <button data-order="grouped" class="${ganadaOrderMode === "grouped" ? "active" : ""}">母音グループ順</button>
    </div>
  `);
  orderSwitch.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      ganadaOrderMode = b.dataset.order;
      renderHangul();
    });
  });
  viewEl.appendChild(orderSwitch);

  viewEl.appendChild(buildGanadaTable());
  viewEl.appendChild(el(`<div class="section-title">母音 (タップで発音)</div>`));
  viewEl.appendChild(buildHangulGrid(HANGUL_VOWELS));
  viewEl.appendChild(el(`<div class="section-title">子音 (タップで発音)</div>`));
  viewEl.appendChild(buildHangulGrid(HANGUL_CONSONANTS));

  const drillBtn = el(`<button class="card-controls btn-speak" style="width:100%;border:none;border-radius:10px;padding:12px;margin-top:16px;">✍️ 母音・子音の書き取り練習をする</button>`);
  drillBtn.addEventListener("click", () => {
    hangulViewMode = "drill";
    renderHangul();
  });
  viewEl.appendChild(drillBtn);
}

// ハングルの子音+母音を合成して1文字にする(Unicode合成規則)
const CHOSEONG_LIST = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const JUNGSEONG_LIST = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
function composeHangul(consonantChar, vowelChar) {
  const choIndex = CHOSEONG_LIST.indexOf(consonantChar);
  const jungIndex = JUNGSEONG_LIST.indexOf(vowelChar);
  if (choIndex === -1 || jungIndex === -1) return consonantChar + vowelChar;
  const code = 0xac00 + (choIndex * 21 + jungIndex) * 28;
  return String.fromCharCode(code);
}

function buildGanadaTable() {
  // table/tr/th/tdは innerHTML経由(el関数)だとブラウザに無視されるため createElement で組み立てる
  const wrap = document.createElement("div");
  wrap.className = "ganada-wrap";
  const table = document.createElement("table");
  table.className = "ganada-table";

  const columns =
    ganadaOrderMode === "grouped"
      ? GANADA_COL_VOWELS_GROUPED_ORDER.map((ch) => GANADA_COL_VOWELS.find((v) => v.char === ch))
      : GANADA_COL_VOWELS;
  const rows =
    ganadaOrderMode === "grouped"
      ? GANADA_ROW_CONSONANTS_GROUPED_ORDER.map((ch) => GANADA_ROW_CONSONANTS.find((c) => c.char === ch))
      : GANADA_ROW_CONSONANTS;

  const headRow = document.createElement("tr");
  headRow.appendChild(document.createElement("th"));
  columns.forEach((v) => {
    const th = document.createElement("th");
    th.textContent = v.char;
    headRow.appendChild(th);
  });
  table.appendChild(headRow);

  rows.forEach((c) => {
    const row = document.createElement("tr");
    const rowHeader = document.createElement("th");
    rowHeader.textContent = c.char;
    row.appendChild(rowHeader);
    columns.forEach((v) => {
      const syllable = composeHangul(c.char, v.char);
      const kanaColIndex = GANADA_COL_VOWELS.findIndex((ov) => ov.char === v.char);
      const kana = (GANADA_KANA_MAP[c.char] || [])[kanaColIndex] || "";
      const td = document.createElement("td");

      const chSpan = document.createElement("div");
      chSpan.className = "ganada-ch";
      chSpan.textContent = syllable;
      td.appendChild(chSpan);

      const kanaSpan = document.createElement("div");
      kanaSpan.className = "ganada-kana";
      kanaSpan.textContent = kana;
      td.appendChild(kanaSpan);

      td.addEventListener("click", () => speak(syllable));
      row.appendChild(td);
    });
    table.appendChild(row);
  });

  wrap.appendChild(table);
  return wrap;
}

// ==== タイピング(書き取り)問題の共通部品 ====
// options: { prompt(item)->string, promptSub(item)->string|null, answer(item)->string,
//            answerReading(item)->string|null, onAnswer(item,isCorrect), onFinish(correct,total), onRetry() }
function buildTypingDrill(items, options) {
  const container = el(`<div></div>`);
  const questions = shuffle(items);
  let qIndex = 0;
  let correctCount = 0;

  const tip = el(`
    <div class="typing-tip">
      💡 iPhoneで韓国語を入力するには、設定 › 一般 › キーボード › 新しいキーボードを追加 › 한국어 で韓国語キーボードを追加してください。
    </div>
  `);

  function drawQuestion() {
    container.innerHTML = "";
    container.appendChild(tip);

    const q = questions[qIndex];
    const progressTrack = el(`
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${(qIndex / questions.length) * 100}%"></div>
      </div>
    `);
    container.appendChild(progressTrack);

    const subText = options.promptSub ? options.promptSub(q) : "";
    const card = el(`
      <div class="flashcard" style="cursor:default;">
        <div class="main-text">${options.prompt(q)}</div>
        ${subText ? `<div class="yomi-text">${subText}</div>` : ""}
        <div class="hint">${qIndex + 1} / ${questions.length}問 ・ 韓国語を入力してください</div>
      </div>
    `);
    container.appendChild(card);

    const inputWrap = el(`
      <div class="typing-input-wrap">
        <input type="text" class="typing-input" placeholder="ここに韓国語を入力" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
        <button class="typing-check-btn">答え合わせ</button>
      </div>
    `);
    container.appendChild(inputWrap);
    const input = inputWrap.querySelector(".typing-input");
    const checkBtn = inputWrap.querySelector(".typing-check-btn");

    const resultArea = el(`<div></div>`);
    container.appendChild(resultArea);

    let checked = false;
    function doCheck() {
      if (checked || !input.value.trim()) return;
      checked = true;
      const correctAnswer = options.answer(q);
      const isCorrect = input.value.trim() === correctAnswer.trim();
      if (isCorrect) correctCount++;
      if (options.onAnswer) options.onAnswer(q, isCorrect);
      input.disabled = true;
      checkBtn.disabled = true;

      const readingText = options.answerReading ? options.answerReading(q) : "";
      resultArea.appendChild(el(`
        <div class="typing-feedback ${isCorrect ? "correct" : "wrong"}">
          <div>${isCorrect ? "◯ 正解です" : "✕ 不正解"}</div>
          <div class="typing-correct-answer">正解: ${correctAnswer}${readingText ? " (" + readingText + ")" : ""}</div>
        </div>
      `));
      const nextBtn = el(`
        <button class="card-controls btn-speak" style="width:100%;border:none;border-radius:10px;padding:12px;margin-top:10px;">
          ${qIndex + 1 < questions.length ? "次へ" : "結果を見る"}
        </button>
      `);
      nextBtn.addEventListener("click", () => {
        if (qIndex + 1 < questions.length) {
          qIndex++;
          drawQuestion();
        } else {
          drawResult();
        }
      });
      resultArea.appendChild(nextBtn);
    }

    checkBtn.addEventListener("click", doCheck);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doCheck();
    });
    setTimeout(() => input.focus(), 0);
  }

  function drawResult() {
    container.innerHTML = "";
    container.appendChild(el(`
      <div class="quiz-result">
        <div class="score">${correctCount} / ${questions.length}</div>
        <div class="empty-note">正解しました</div>
      </div>
    `));
    if (options.onFinish) options.onFinish(correctCount, questions.length);
    const retryBtn = el(`<button class="card-controls btn-speak" style="width:100%;border:none;border-radius:10px;padding:12px;">もう一度挑戦する</button>`);
    retryBtn.addEventListener("click", () => {
      if (options.onRetry) options.onRetry();
    });
    container.appendChild(retryBtn);
  }

  drawQuestion();
  return container;
}

function buildHangulTypingDrill() {
  const items = HANGUL_VOWELS.concat(HANGUL_CONSONANTS);
  return buildTypingDrill(items, {
    prompt: (item) => `${item.kana}`,
    promptSub: (item) => `(${item.romaja})`,
    answer: (item) => item.char,
    onRetry: () => {
      hangulViewMode = "drill";
      renderHangul();
    },
  });
}

function buildHangulGrid(list) {
  const grid = el(`<div class="grid"></div>`);
  list.forEach((item) => {
    const tile = el(`
      <div class="hangul-tile">
        <div class="ch">${item.char}</div>
        <div class="romaja">${item.romaja}</div>
        <div class="kana">${item.kana}</div>
      </div>
    `);
    tile.addEventListener("click", () => speak(item.char));
    grid.appendChild(tile);
  });
  return grid;
}

// ==== 単語帳画面 ====

function renderWordsHome() {
  viewEl.innerHTML = "";
  viewEl.appendChild(el(`<div class="section-title">カテゴリを選んでください</div>`));
  const progress = loadProgress();
  const dictationProgress = loadDictationProgress();
  WORD_CATEGORIES.forEach((cat) => {
    const p = progress[cat.id];
    const d = dictationProgress[cat.id];
    let progressText = p ? `クイズ ベスト ${p.bestScore}/${cat.words.length}` : "クイズ未挑戦";
    progressText += d ? ` ・ 書き取り ベスト ${d.bestScore}/${cat.words.length}` : " ・ 書き取り未挑戦";
    const card = el(`
      <div class="category-card">
        <div>
          <div class="cat-name">${cat.name}</div>
          <div class="cat-progress">${progressText}</div>
        </div>
        <div>›</div>
      </div>
    `);
    card.addEventListener("click", () => renderCategoryDetail(cat));
    viewEl.appendChild(card);
  });
}

function renderCategoryDetail(cat, mode = "flashcard") {
  viewEl.innerHTML = "";
  const back = el(`<button class="back-btn">‹ カテゴリ一覧に戻る</button>`);
  back.addEventListener("click", renderWordsHome);
  viewEl.appendChild(back);

  viewEl.appendChild(el(`<div class="section-title">${cat.name}</div>`));

  const switchBar = el(`
    <div class="mode-switch">
      <button data-mode="flashcard" class="${mode === "flashcard" ? "active" : ""}">カード</button>
      <button data-mode="quiz" class="${mode === "quiz" ? "active" : ""}">クイズ</button>
      <button data-mode="listening" class="${mode === "listening" ? "active" : ""}">🎧 聞く</button>
      <button data-mode="dictation" class="${mode === "dictation" ? "active" : ""}">✍️ 書く</button>
    </div>
  `);
  switchBar.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => renderCategoryDetail(cat, b.dataset.mode));
  });
  viewEl.appendChild(switchBar);

  if (mode === "flashcard") {
    viewEl.appendChild(buildFlashcards(cat));
  } else if (mode === "quiz") {
    viewEl.appendChild(
      buildQuiz(cat, {
        onCorrect: (w) => clearMistake(cat.id, w.kr),
        onWrong: (w) => recordMistake(cat.id, w.kr),
      })
    );
  } else if (mode === "listening") {
    viewEl.appendChild(buildListeningQuiz(cat));
  } else {
    viewEl.appendChild(buildWordDictation(cat));
  }
}

function buildListeningQuiz(cat) {
  const container = el(`<div></div>`);
  const questions = shuffle(cat.words);
  let qIndex = 0;
  let correctCount = 0;
  let answered = false;

  function drawQuestion() {
    container.innerHTML = "";
    const q = questions[qIndex];

    const progressTrack = el(`
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${(qIndex / questions.length) * 100}%"></div>
      </div>
    `);
    container.appendChild(progressTrack);

    const card = el(`
      <div class="flashcard" style="cursor:default;">
        <button class="listen-play-btn">🔊 タップして聞く</button>
        <div class="hint">${qIndex + 1} / ${questions.length}問 ・ 聞こえた意味を選んでください</div>
      </div>
    `);
    card.querySelector(".listen-play-btn").addEventListener("click", () => speak(q.kr));
    container.appendChild(card);

    const wrongOptions = shuffle(cat.words.filter((w) => w.kr !== q.kr)).slice(0, 3).map((w) => w.jp);
    const options = shuffle([q.jp, ...wrongOptions]);

    const optWrap = el(`<div style="margin-top:14px;"></div>`);
    options.forEach((opt) => {
      const btn = el(`<button class="quiz-option">${opt}</button>`);
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        if (opt === q.jp) {
          btn.classList.add("correct");
          correctCount++;
          clearMistake(cat.id, q.kr);
        } else {
          btn.classList.add("wrong");
          [...optWrap.children].find((b) => b.textContent === q.jp).classList.add("correct");
          recordMistake(cat.id, q.kr);
        }
        container.insertBefore(
          el(`<div class="listening-reveal">${q.kr} <span>(${q.yomi})</span></div>`),
          optWrap
        );
        setTimeout(() => {
          answered = false;
          if (qIndex + 1 < questions.length) {
            qIndex++;
            drawQuestion();
          } else {
            drawResult();
          }
        }, 1200);
      });
      optWrap.appendChild(btn);
    });
    container.appendChild(optWrap);

    // 問題の切り替え時に自動再生を試みる(ブロックされた場合は上のボタンで手動再生できる)
    speak(q.kr);
  }

  function drawResult() {
    container.innerHTML = "";
    container.appendChild(el(`
      <div class="quiz-result">
        <div class="score">${correctCount} / ${questions.length}</div>
        <div class="empty-note">正解しました</div>
      </div>
    `));
    const retryBtn = el(`<button class="card-controls btn-speak" style="width:100%;border:none;border-radius:10px;padding:12px;">もう一度挑戦する</button>`);
    retryBtn.addEventListener("click", () => renderCategoryDetail(cat, "listening"));
    container.appendChild(retryBtn);
  }

  drawQuestion();
  return container;
}

function buildWordDictation(cat) {
  return buildTypingDrill(cat.words, {
    prompt: (w) => w.jp,
    answer: (w) => w.kr,
    answerReading: (w) => w.yomi,
    onAnswer: (w, isCorrect) => {
      if (isCorrect) clearMistake(cat.id, w.kr);
      else recordMistake(cat.id, w.kr);
    },
    onFinish: (correct, total) => recordDictationResult(cat.id, correct, total),
    onRetry: () => renderCategoryDetail(cat, "dictation"),
  });
}

function buildFlashcards(cat) {
  const container = el(`<div></div>`);
  let index = 0;
  let flipped = false;

  function draw() {
    container.innerHTML = "";
    const word = cat.words[index];

    const progressTrack = el(`
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${((index + 1) / cat.words.length) * 100}%"></div>
      </div>
    `);
    container.appendChild(progressTrack);

    const card = el(`
      <div class="flashcard ${flipped ? "flipped" : ""}">
        <div class="main-text">${word.kr}</div>
        <div class="yomi-text">${word.yomi}</div>
        <div class="sub-text">${word.jp}</div>
        <div class="hint">${flipped ? "タップで韓国語に戻る" : "タップで意味を表示"}</div>
      </div>
    `);
    card.addEventListener("click", () => {
      flipped = !flipped;
      draw();
    });
    container.appendChild(card);

    const controls = el(`
      <div class="card-controls">
        <button class="btn-prev">‹ 前</button>
        <button class="btn-speak">🔊 発音</button>
        <button class="btn-next">次 ›</button>
      </div>
    `);
    controls.querySelector(".btn-prev").addEventListener("click", () => {
      index = (index - 1 + cat.words.length) % cat.words.length;
      flipped = false;
      draw();
    });
    controls.querySelector(".btn-next").addEventListener("click", () => {
      index = (index + 1) % cat.words.length;
      flipped = false;
      draw();
    });
    controls.querySelector(".btn-speak").addEventListener("click", () => speak(word.kr));
    container.appendChild(controls);

    container.appendChild(el(`<div class="empty-note">${index + 1} / ${cat.words.length} 枚目</div>`));
  }

  draw();
  return container;
}

// opts: { words(出題対象、省略時cat.words), pool(誤答選択肢の抽出元、省略時cat.words),
//         onCorrect(word), onWrong(word), onFinish(correct,total), onRetry(), emptyMessage }
function buildQuiz(cat, opts) {
  opts = opts || {};
  const container = el(`<div></div>`);
  const sourceWords = opts.words || cat.words;
  const pool = opts.pool || cat.words;

  if (sourceWords.length === 0) {
    container.appendChild(el(`<div class="empty-note">${opts.emptyMessage || "出題できる単語がありません。"}</div>`));
    return container;
  }

  const questions = shuffle(sourceWords);
  let qIndex = 0;
  let correctCount = 0;
  let answered = false;

  function drawQuestion() {
    container.innerHTML = "";
    const q = questions[qIndex];

    const progressTrack = el(`
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${(qIndex / questions.length) * 100}%"></div>
      </div>
    `);
    container.appendChild(progressTrack);

    container.appendChild(el(`
      <div class="flashcard" style="cursor:default;">
        <div class="main-text">${q.kr}</div>
        <div class="yomi-text">${q.yomi}</div>
        <div class="hint">${qIndex + 1} / ${questions.length}問 ・ 意味を選んでください</div>
      </div>
    `));

    const wrongOptions = shuffle(pool.filter((w) => w.kr !== q.kr)).slice(0, 3).map((w) => w.jp);
    const options = shuffle([q.jp, ...wrongOptions]);

    const optWrap = el(`<div style="margin-top:14px;"></div>`);
    options.forEach((opt) => {
      const btn = el(`<button class="quiz-option">${opt}</button>`);
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        if (opt === q.jp) {
          btn.classList.add("correct");
          correctCount++;
          if (opts.onCorrect) opts.onCorrect(q);
        } else {
          btn.classList.add("wrong");
          [...optWrap.children].find((b) => b.textContent === q.jp).classList.add("correct");
          if (opts.onWrong) opts.onWrong(q);
        }
        setTimeout(() => {
          answered = false;
          if (qIndex + 1 < questions.length) {
            qIndex++;
            drawQuestion();
          } else {
            if (opts.onFinish) opts.onFinish(correctCount, questions.length);
            else recordResult(cat.id, correctCount, questions.length);
            drawResult();
          }
        }, 700);
      });
      optWrap.appendChild(btn);
    });
    container.appendChild(optWrap);
  }

  function drawResult() {
    container.innerHTML = "";
    container.appendChild(el(`
      <div class="quiz-result">
        <div class="score">${correctCount} / ${questions.length}</div>
        <div class="empty-note">正解しました</div>
      </div>
    `));
    const retryBtn = el(`<button class="card-controls btn-speak" style="width:100%;border:none;border-radius:10px;padding:12px;">もう一度挑戦する</button>`);
    retryBtn.addEventListener("click", () => {
      if (opts.onRetry) opts.onRetry();
      else renderCategoryDetail(cat, "quiz");
    });
    container.appendChild(retryBtn);
  }

  drawQuestion();
  return container;
}

// ==== 文法画面 ====

function renderGrammar() {
  viewEl.innerHTML = "";
  GRAMMAR_LESSONS.forEach((lesson) => {
    viewEl.appendChild(el(`<div class="section-title">${lesson.title}</div>`));
    viewEl.appendChild(el(`<div class="grammar-explanation">${lesson.explanation}</div>`));
    lesson.points.forEach((point) => {
      const card = el(`
        <div class="phrase-card">
          <div class="grammar-pattern">${point.pattern}</div>
          <div class="kr">${point.kr}<span class="speak-icon">🔊</span></div>
          <div class="yomi-text">${point.yomi}</div>
          <div class="jp">${point.jp}</div>
        </div>
      `);
      card.querySelector(".speak-icon").addEventListener("click", () => speak(point.kr));
      viewEl.appendChild(card);
    });
  });
}

// ==== フレーズ画面 ====

function renderPhrases() {
  viewEl.innerHTML = "";
  PHRASES.forEach((group) => {
    viewEl.appendChild(el(`<div class="section-title">${group.title}</div>`));
    group.items.forEach((item) => {
      const card = el(`
        <div class="phrase-card">
          <div class="kr">${item.kr}<span class="speak-icon">🔊</span></div>
          <div class="yomi-text">${item.yomi}</div>
          <div class="jp">${item.jp}</div>
        </div>
      `);
      card.querySelector(".speak-icon").addEventListener("click", () => speak(item.kr));
      viewEl.appendChild(card);
    });
  });
}

// ==== 初期表示 ====
recordTodayActivity();
render();

// ==== PWA: Service Worker登録 ====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
