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
const WORDS_NAV_STORAGE_KEY = "kr_words_nav_v1"; // ALL_STORAGE_KEYSより前に必要なため先頭で宣言
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

// ==== 間隔反復(SRS)による復習キュー ====
// 正解するたびにbox(1〜5)を上げて復習の間隔をあけ、間違えたらbox1(翌日)に戻す、簡易Leitner方式
const SRS_STORAGE_KEY = "kr_srs_v1";
const SRS_INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };
function loadSrs() {
  try {
    return JSON.parse(localStorage.getItem(SRS_STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveSrs(data) {
  localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(data));
}
function addDaysToDateStr(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return formatDateLocal(d);
}
function updateSrs(categoryId, kr, isCorrect) {
  const data = loadSrs();
  if (!data[categoryId]) data[categoryId] = {};
  const today = formatDateLocal(new Date());
  const prevBox = (data[categoryId][kr] && data[categoryId][kr].box) || 0;
  const box = isCorrect ? Math.min(prevBox + 1, 5) : 1;
  data[categoryId][kr] = { box, due: addDaysToDateStr(today, SRS_INTERVAL_DAYS[box]) };
  saveSrs(data);
}
// 既存の呼び出し箇所(クイズ・書き取り・聞き取り)を変えずに済むよう、同じ関数名でSRSに橋渡しする
function recordMistake(categoryId, kr) {
  updateSrs(categoryId, kr, false);
}
function clearMistake(categoryId, kr) {
  updateSrs(categoryId, kr, true);
}
function getDueReviewWords() {
  const data = loadSrs();
  const today = formatDateLocal(new Date());
  const result = [];
  WORD_CATEGORIES.forEach((cat) => {
    const catData = data[cat.id] || {};
    cat.words.forEach((w) => {
      const entry = catData[w.kr];
      if (entry && entry.due <= today) result.push({ ...w, catId: cat.id });
    });
  });
  return result;
}

// 文法・場面別会話も、単語と同じSRSの仕組みに乗せる。
// 1レッスン/1場面につき1件として、"grammar"/"situation"を疑似カテゴリID、lesson.id/sit.idをkr代わりのキーに使う。
// 自動採点できないため、本人が「覚えた/もう一度」を自己申告する形で正解・不正解を記録する。
function isReviewDue(namespace, id) {
  const data = loadSrs();
  const entry = data[namespace] && data[namespace][id];
  if (!entry) return false; // 一度も自己評価していないものは「復習」ではなく「未評価」として扱う
  return entry.due <= formatDateLocal(new Date());
}
function isGrammarDue(lessonId) {
  return isReviewDue("grammar", lessonId);
}
function isSituationDue(sitId) {
  return isReviewDue("situation", sitId);
}
function getDueGrammarLessons() {
  return GRAMMAR_LESSONS.filter((l) => isGrammarDue(l.id));
}
function getDueSituations() {
  return SITUATIONS.filter((s) => isSituationDue(s.id));
}
function buildSelfRateRow(namespace, id) {
  const entry = loadSrs()[namespace] && loadSrs()[namespace][id];
  const label = entry ? "この内容、覚えていますか?" : "読み終わったら記録しましょう";
  const row = el(`
    <div class="self-rate-row">
      <div class="self-rate-label">${label}</div>
      <button class="self-rate-btn again">🔁 もう一度</button>
      <button class="self-rate-btn good">✓ 覚えた</button>
    </div>
  `);
  row.querySelector(".again").addEventListener("click", () => {
    updateSrs(namespace, id, false);
    render();
  });
  row.querySelector(".good").addEventListener("click", () => {
    updateSrs(namespace, id, true);
    render();
  });
  return row;
}

const CATEGORY_MASTERY_RATE = 0.7; // クイズのベストスコアがこの割合以上で「マスター」とみなす
function isCategoryMastered(cat) {
  const p = loadProgress()[cat.id];
  if (!p) return false;
  return cat.words.length > 0 && p.bestScore / cat.words.length >= CATEGORY_MASTERY_RATE;
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
// 連続記録の途中で最大2日まで「抜け」を許容する(ストリークの保険/フリーズ)
// 別ストレージで消費数を管理せず、dates配列から毎回そのまま計算できるようにしている
const STREAK_FREEZE_ALLOWANCE = 2;
function getCurrentStreak() {
  const dateSet = new Set(loadStreakData().dates);
  let streak = 0;
  let freezesLeft = STREAK_FREEZE_ALLOWANCE;
  const cursor = new Date();
  while (true) {
    const dateStr = formatDateLocal(cursor);
    if (dateSet.has(dateStr)) {
      streak++;
    } else if (streak > 0 && freezesLeft > 0) {
      streak++; // この日はフリーズで補い、連続記録も日数もそのまま伸ばす
      freezesLeft--;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// このアプリが使うlocalStorageキー一覧(バックアップの書き出し/読み込みで使う)
const ALL_STORAGE_KEYS = [STORAGE_KEY, DICTATION_STORAGE_KEY, STREAK_STORAGE_KEY, SRS_STORAGE_KEY, WORDS_NAV_STORAGE_KEY];

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

// ワンポイントアドバイスの表示部品(単語帳・文法・場面別会話で共通利用)
function buildTipBox(text) {
  return el(`
    <div class="tip-box">
      <div class="tip-icon">💡</div>
      <div class="tip-body"><strong>ワンポイント</strong>${text}</div>
    </div>
  `);
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

  const dueWordCount = getDueReviewWords().length;
  const dueGrammarCount = getDueGrammarLessons().length;
  const dueSituationCount = getDueSituations().length;
  const totalDue = dueWordCount + dueGrammarCount + dueSituationCount;
  if (totalDue > 0) {
    const reviewCard = el(`
      <div class="step-card review-card">
        <div class="step-badge">🔁</div>
        <div class="step-body">
          <div class="step-title">今日の復習</div>
          <div class="step-desc">間隔をあけて復習するタイミングの単語・文法・会話が ${totalDue}個 あります。</div>
        </div>
      </div>
    `);
    reviewCard.addEventListener("click", () => goToReviewQueue());
    viewEl.appendChild(reviewCard);
  }

  const masteredCatCount = WORD_CATEGORIES.filter(isCategoryMastered).length;
  viewEl.appendChild(el(`<div class="section-title">学習コース</div>`));
  viewEl.appendChild(el(`
    <div class="empty-note" style="text-align:left;padding:0;">
      📚 単語マスター ${masteredCatCount} / ${WORD_CATEGORIES.length} カテゴリ(クイズで${Math.round(CATEGORY_MASTERY_RATE * 100)}%以上正解)
    </div>
  `));
  viewEl.appendChild(el(`
    <div class="progress-bar-track">
      <div class="progress-bar-fill" style="width:${(masteredCatCount / WORD_CATEGORIES.length) * 100}%"></div>
    </div>
  `));

  STUDY_LEVELS.forEach((level) => {
    const catsInLevel = WORD_CATEGORIES.filter((c) => c.level === level.id);
    const masteredInLevel = catsInLevel.filter(isCategoryMastered).length;

    viewEl.appendChild(el(`
      <div class="level-header">
        <div class="level-title">${level.icon || ""} ${level.label}</div>
        <div class="level-desc">${level.desc}</div>
        ${catsInLevel.length > 0 ? `<div class="level-count">📚 ${masteredInLevel} / ${catsInLevel.length} カテゴリをマスター</div>` : ""}
      </div>
    `));

    catsInLevel.forEach((cat) => {
      const p = loadProgress()[cat.id];
      const progressText = p ? `ベスト ${p.bestScore}/${cat.words.length}${isCategoryMastered(cat) ? " ✓マスター" : ""}` : "未挑戦";
      const card = el(`
        <div class="category-card">
          <div>
            <div class="cat-name">${cat.name}</div>
            <div class="cat-progress">${progressText}</div>
          </div>
          <div>›</div>
        </div>
      `);
      card.addEventListener("click", () => {
        switchTab("words");
        renderCategoryDetail(cat, "flashcard");
      });
      viewEl.appendChild(card);
    });

    (level.links || []).forEach((link) => {
      const card = el(`
        <div class="category-card">
          <div>
            <div class="cat-name">${link.icon || ""} ${link.title}</div>
            <div class="cat-progress">${link.desc}</div>
          </div>
          <div>›</div>
        </div>
      `);
      card.addEventListener("click", () => goToChapterLink(link));
      viewEl.appendChild(card);
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

function goToChapterLink(link) {
  if (link.situationMode) {
    phrasesViewMode = "situation";
    selectedSituation = null;
  }
  switchTab(link.tab);
}

function goToReviewQueue() {
  switchTab("words");
  renderReviewQueue();
}

function renderReviewQueue() {
  viewEl.innerHTML = "";
  const back = el(`<button class="back-btn">‹ ホームに戻る</button>`);
  back.addEventListener("click", () => switchTab("home"));
  viewEl.appendChild(back);
  viewEl.appendChild(el(`<div class="section-title">今日の復習</div>`));
  viewEl.appendChild(buildTipBox("間隔をあけて復習すると記憶に残りやすくなります。正解した単語は次の復習まで間隔が伸び、間違えた単語は明日また出題されます。"));

  const dueGrammar = getDueGrammarLessons();
  const dueSituations = getDueSituations();
  if (dueGrammar.length > 0 || dueSituations.length > 0) {
    viewEl.appendChild(el(`<div class="section-title" style="margin-top:0;">文法・会話</div>`));
    dueGrammar.forEach((lesson) => {
      const card = el(`
        <div class="category-card">
          <div>
            <div class="cat-name">📘 ${lesson.title}</div>
            <div class="cat-progress">文法タブで復習します</div>
          </div>
          <div>›</div>
        </div>
      `);
      card.addEventListener("click", () => switchTab("grammar"));
      viewEl.appendChild(card);
    });
    dueSituations.forEach((sit) => {
      const card = el(`
        <div class="category-card">
          <div>
            <div class="cat-name">🎭 ${sit.title}</div>
            <div class="cat-progress">フレーズタブで復習します</div>
          </div>
          <div>›</div>
        </div>
      `);
      card.addEventListener("click", () => {
        phrasesViewMode = "situation";
        selectedSituation = sit;
        switchTab("phrases");
      });
      viewEl.appendChild(card);
    });
    viewEl.appendChild(el(`<div class="section-title">単語</div>`));
  }

  const dueWords = getDueReviewWords();
  const allWordsPool = WORD_CATEGORIES.flatMap((c) => c.words);

  viewEl.appendChild(
    buildQuiz(null, {
      words: dueWords,
      pool: allWordsPool,
      emptyMessage: "今日復習する単語はありません。素晴らしいです!",
      onCorrect: (w) => updateSrs(w.catId, w.kr, true),
      onWrong: (w) => updateSrs(w.catId, w.kr, false),
      onFinish: () => {},
      onRetry: () => renderReviewQueue(),
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
  viewEl.appendChild(buildTipBox("ㅏとㅗは文法でよくペアになる母音です。あとで習う「해요体」では、語幹の最後の母音がㅏかㅗなら「아요」、それ以外なら「어요」を使う、というルールが出てきます(文法4章で詳しく)。今のうちに「ㅏ・ㅗは仲間」と意識しておくと、後の文法がスッと理解できます。"));
  viewEl.appendChild(el(`<div class="section-title">子音 (タップで発音)</div>`));
  viewEl.appendChild(buildHangulGrid(HANGUL_CONSONANTS));
  viewEl.appendChild(buildTipBox("子音はㄱ・ㅋ・ㄲ、ㄷ・ㅌ・ㄸ、ㅂ・ㅍ・ㅃ、ㅅ・ㅆ、ㅈ・ㅊ・ㅉのように、形も音も似た仲間(平音・激音・濃音)になっています。息を強く吐く激音(ㅋㅌㅍㅊ)、喉を締めて発音する濃音(ㄲㄸㅃㅆㅉ)と覚えると、形の違いも音の違いも一緒に整理できます。"));

  viewEl.appendChild(buildBatchimSection());

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

// パッチム(終声)付き文字の合成に使うUnicode順の終声一覧("" = パッチムなし)
const JONGSEONG_LIST = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
function composeHangulFull(consonantChar, vowelChar, batchimChar) {
  const choIndex = CHOSEONG_LIST.indexOf(consonantChar);
  const jungIndex = JUNGSEONG_LIST.indexOf(vowelChar);
  const jongIndex = JONGSEONG_LIST.indexOf(batchimChar || "");
  if (choIndex === -1 || jungIndex === -1 || jongIndex === -1) return consonantChar + vowelChar + (batchimChar || "");
  const code = 0xac00 + (choIndex * 21 + jungIndex) * 28 + jongIndex;
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

// ==== パッチム(終声)セクション ====

function buildBatchimSection() {
  const wrap = el(`<div></div>`);
  wrap.appendChild(el(`<div class="section-title">パッチム(終声)を覚える</div>`));
  wrap.appendChild(el(`
    <div class="grammar-explanation">
      韓国語の文字には、①子音+母音の2つで1文字になるもの(가, 나, 다…)と、②子音+母音+もう1つの子音で1文字になるものがあります。この最後につく子音を「パッチム(받침)」と呼びます。表記は様々でも、発音される音は代表的な7種類に集約されるので、まずはこの7つだけ覚えれば十分です。
    </div>
  `));

  const grid = el(`<div class="batchim-grid"></div>`);
  BATCHIM_EXAMPLES.forEach((b) => {
    const tile = el(`
      <div class="batchim-tile">
        <div class="batchim-jong">${b.jong} <span>[${b.romaja}]${b.group ? " " + b.group : ""}</span></div>
        <div class="batchim-example">${b.example}</div>
        <div class="batchim-example-yomi">${b.exampleYomi}(${b.exampleJp})</div>
      </div>
    `);
    tile.addEventListener("click", () => speak(b.example));
    grid.appendChild(tile);
  });
  wrap.appendChild(grid);

  wrap.appendChild(el(`<div class="section-title">同じ文字でもパッチムが変わると音が変わる</div>`));
  const demoRow = el(`<div class="batchim-demo-row"></div>`);
  ["", "ㄱ", "ㄴ", "ㄹ", "ㅁ", "ㅂ", "ㅇ"].forEach((jong) => {
    const syllable = composeHangulFull("ㄱ", "ㅏ", jong);
    const tile = el(`
      <div class="batchim-demo-tile">
        <div class="ch">${syllable}</div>
        <div class="label">${jong ? "+" + jong : "パッチムなし"}</div>
      </div>
    `);
    tile.addEventListener("click", () => speak(syllable));
    demoRow.appendChild(tile);
  });
  wrap.appendChild(demoRow);

  return wrap;
}

// ==== 単語帳画面 ====

// 単語帳タブは、まず「調べる(一覧)」か「問題(練習)」かを選ばせる。
// 単語を調べたいだけのときにクイズ等が挟まって鬱陶しくならないよう、参照用途と練習用途を明確に分離する。
// 練習の中はさらに「カテゴリ→モード」ではなく「目的→カテゴリ」の順にして、
// 1画面に複数のモード(カード/クイズ/聞く/書く)が並んで迷う状態を避ける。
const WORD_PURPOSES = {
  read: { label: "読む", icon: "📖", desc: "フラッシュカードとクイズで、意味を覚えます", modes: ["flashcard", "quiz"] },
  listen: { label: "聞く・発音", icon: "🎧", desc: "音声を聞き取り、声に出して真似します", modes: ["listening"] },
  write: { label: "書く", icon: "✍️", desc: "韓国語をタイピングして書く練習をします", modes: ["dictation"] },
};
const MODE_LABELS = { flashcard: "カード", quiz: "クイズ", listening: "🎧 聞く", dictation: "✍️ 書く" };
function purposeKeyForMode(mode) {
  return Object.keys(WORD_PURPOSES).find((k) => WORD_PURPOSES[k].modes.includes(mode)) || "read";
}

// 前回選んだ「調べる/問題」「目的」を端末に覚えておき、次に単語帳タブを開いたときは
// 選択画面を飛ばして続きから入れるようにする(選び直したい場合は各画面の戻るボタンから)
function loadWordsNav() {
  try {
    return JSON.parse(localStorage.getItem(WORDS_NAV_STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function setWordsSection(section) {
  wordsSection = section;
  localStorage.setItem(WORDS_NAV_STORAGE_KEY, JSON.stringify({ section, purpose: wordsPurpose }));
}
function setWordsPurpose(purpose) {
  wordsPurpose = purpose;
  localStorage.setItem(WORDS_NAV_STORAGE_KEY, JSON.stringify({ section: wordsSection, purpose }));
}

const savedWordsNav = loadWordsNav();
let wordsSection = savedWordsNav.section || null; // null | "browse" | "practice"
let wordsPurpose = savedWordsNav.purpose || null; // null | "read" | "listen" | "write" ("practice"時のみ使用)
let browseCategoryId = null; // "browse"時のみ使用(カテゴリまでは記憶しない)
let browseOrderMode = "category"; // "category" | "alpha" — 単語帳を見るときの並び順(カテゴリ別 or 가나다順)

function renderWordsHome() {
  viewEl.innerHTML = "";
  if (!wordsSection) {
    renderWordsSectionSelect();
  } else if (wordsSection === "browse") {
    const cat = WORD_CATEGORIES.find((c) => c.id === browseCategoryId);
    if (cat) renderWordListView(cat);
    else renderWordsBrowseCategoryList();
  } else if (!wordsPurpose) {
    renderWordsPurposeSelect();
  } else {
    renderWordsCategoryList(wordsPurpose);
  }
}

function renderWordsSectionSelect() {
  viewEl.appendChild(el(`<div class="section-title">単語帳でしたいことを選んでください</div>`));
  const sections = [
    { key: "browse", icon: "📋", label: "単語帳を見る", desc: "全部の単語を一覧でさっと確認できます(タップで発音のみ)" },
    { key: "practice", icon: "✏️", label: "問題に挑戦する", desc: "クイズ・聞き取り・書き取りで練習します" },
  ];
  sections.forEach((s) => {
    const card = el(`
      <div class="purpose-card">
        <div class="purpose-icon">${s.icon}</div>
        <div class="purpose-body">
          <div class="purpose-title">${s.label}</div>
          <div class="purpose-desc">${s.desc}</div>
        </div>
        <div>›</div>
      </div>
    `);
    card.addEventListener("click", () => {
      setWordsSection(s.key);
      renderWordsHome();
    });
    viewEl.appendChild(card);
  });
}

function renderWordsBrowseCategoryList() {
  const back = el(`<button class="back-btn">‹ 単語帳トップに戻る</button>`);
  back.addEventListener("click", () => {
    wordsSection = null;
    renderWordsHome();
  });
  viewEl.appendChild(back);
  viewEl.appendChild(el(`<div class="section-title">📋 単語帳: カテゴリを選ぶか、検索してください</div>`));

  const orderToggle = el(`
    <div class="mode-switch">
      <button data-order="category" class="${browseOrderMode === "category" ? "active" : ""}">📂 カテゴリ別</button>
      <button data-order="alpha" class="${browseOrderMode === "alpha" ? "active" : ""}">🔤 가나다順</button>
    </div>
  `);
  orderToggle.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      browseOrderMode = btn.dataset.order;
      renderWordsHome();
    });
  });
  viewEl.appendChild(orderToggle);

  const searchWrap = el(`
    <div class="word-search-wrap">
      <input type="search" class="word-search-input" placeholder="🔍 単語・読み方・意味で検索" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
    </div>
  `);
  viewEl.appendChild(searchWrap);

  const resultsWrap = el(`<div></div>`);
  viewEl.appendChild(resultsWrap);

  const listWrap = el(`<div></div>`);
  viewEl.appendChild(listWrap);
  if (browseOrderMode === "alpha") {
    const allWords = [];
    WORD_CATEGORIES.forEach((cat) => {
      cat.words.forEach((w) => allWords.push({ w, catName: cat.name }));
    });
    allWords.sort((a, b) => (a.w.kr < b.w.kr ? -1 : a.w.kr > b.w.kr ? 1 : 0));
    const alphaList = el(`<div class="word-list"></div>`);
    allWords.forEach(({ w, catName }) => alphaList.appendChild(buildWordListItem(w, catName)));
    listWrap.appendChild(alphaList);
  } else {
    WORD_CATEGORIES.forEach((cat) => {
      const card = el(`
        <div class="category-card">
          <div>
            <div class="cat-name">${cat.name}</div>
            <div class="cat-progress">${cat.words.length}語</div>
          </div>
          <div>›</div>
        </div>
      `);
      card.addEventListener("click", () => {
        browseCategoryId = cat.id;
        renderWordsHome();
      });
      listWrap.appendChild(card);
    });
  }

  const input = searchWrap.querySelector(".word-search-input");
  input.addEventListener("input", () => {
    const q = input.value.trim();
    resultsWrap.innerHTML = "";
    if (!q) {
      listWrap.style.display = "";
      return;
    }
    listWrap.style.display = "none";
    const matches = [];
    WORD_CATEGORIES.forEach((cat) => {
      cat.words.forEach((w) => {
        if (w.kr.includes(q) || w.yomi.includes(q) || w.jp.includes(q)) {
          matches.push({ ...w, catName: cat.name });
        }
      });
    });
    if (matches.length === 0) {
      resultsWrap.appendChild(el(`<div class="empty-note">「${q}」に一致する単語が見つかりませんでした。</div>`));
      return;
    }
    const list = el(`<div class="word-list"></div>`);
    matches.forEach((w) => {
      list.appendChild(buildWordListItem(w, w.catName));
    });
    resultsWrap.appendChild(list);
  });
}

function renderWordListView(cat) {
  const back = el(`<button class="back-btn">‹ 単語帳のカテゴリ一覧に戻る</button>`);
  back.addEventListener("click", () => {
    browseCategoryId = null;
    renderWordsHome();
  });
  viewEl.appendChild(back);
  viewEl.appendChild(el(`<div class="section-title">${cat.name}</div>`));
  if (cat.tip) viewEl.appendChild(buildTipBox(cat.tip));

  const list = el(`<div class="word-list"></div>`);
  cat.words.forEach((w) => {
    const item = buildWordListItem(w);
    list.appendChild(item);
  });
  viewEl.appendChild(list);
}

// 単語帳の一覧・検索結果で共通利用する1行分の部品。
// 品詞・活用形・類義語/対義語・使い方の補足・例文(2〜3個)は、行をタップすると開く詳細パネルに表示する。
function buildWordListItem(w, catName) {
  const hasSyn = w.related && w.related.syn && w.related.syn.length > 0;
  const hasAnt = w.related && w.related.ant && w.related.ant.length > 0;
  const hasDetail = !!((w.forms && w.forms.length) || hasSyn || hasAnt || w.note || (w.ex && w.ex.length));

  const item = el(`
    <div class="word-list-item">
      <div class="word-list-main-row ${hasDetail ? "expandable" : ""}">
        <div class="word-list-main">
          <div class="kr">${w.kr}<span class="speak-icon">🔊</span></div>
          <div class="yomi-text">${w.yomi}${w.pos ? `<span class="pos-tag">${w.pos}</span>` : ""}${catName ? " ・ " + catName : ""}</div>
        </div>
        <div class="word-list-jp">${w.jp}${hasDetail ? '<span class="detail-arrow">›</span>' : ""}</div>
      </div>
    </div>
  `);
  item.querySelector(".speak-icon").addEventListener("click", (evt) => {
    evt.stopPropagation();
    speak(w.kr);
  });

  if (hasDetail) {
    const detail = el(`<div class="word-list-detail" style="display:none;"></div>`);

    if (w.forms && w.forms.length) {
      const formsWrap = el(`<div class="word-forms"></div>`);
      w.forms.forEach((f) => {
        formsWrap.appendChild(el(`
          <div class="word-form-row">
            <span class="word-form-label">${f.label}</span>
            <span class="word-form-value">${f.kr}<span class="word-form-yomi">(${f.yomi})</span></span>
          </div>
        `));
      });
      detail.appendChild(formsWrap);
    }

    if (hasSyn || hasAnt) {
      const relWrap = el(`<div class="word-related"></div>`);
      if (hasSyn) {
        relWrap.appendChild(el(`<div class="word-related-row">🟰 類義語: ${w.related.syn.map((s) => `${s.kr}(${s.jp})`).join("、")}</div>`));
      }
      if (hasAnt) {
        relWrap.appendChild(el(`<div class="word-related-row">↔️ 対義語: ${w.related.ant.map((s) => `${s.kr}(${s.jp})`).join("、")}</div>`));
      }
      detail.appendChild(relWrap);
    }

    if (w.note) {
      detail.appendChild(el(`<div class="word-note">💡 ${w.note}</div>`));
    }

    if (w.ex && w.ex.length) {
      const exWrap = el(`<div class="word-examples"></div>`);
      w.ex.forEach((e) => {
        exWrap.appendChild(el(`
          <div class="word-list-example">
            <div class="word-list-example-kr">${e.kr}</div>
            <div class="word-list-example-sub">${e.yomi} ・ ${e.jp}</div>
          </div>
        `));
      });
      detail.appendChild(exWrap);
    }

    item.appendChild(detail);

    let expanded = false;
    item.querySelector(".word-list-main-row").addEventListener("click", () => {
      expanded = !expanded;
      detail.style.display = expanded ? "" : "none";
      item.querySelector(".detail-arrow").textContent = expanded ? "⌄" : "›";
    });
  }

  return item;
}

function renderWordsPurposeSelect() {
  const back = el(`<button class="back-btn">‹ 単語帳トップに戻る</button>`);
  back.addEventListener("click", () => {
    wordsSection = null;
    renderWordsHome();
  });
  viewEl.appendChild(back);
  viewEl.appendChild(el(`<div class="section-title">今日は何を練習しますか?</div>`));
  viewEl.appendChild(buildTipBox("目的を選ぶと、その練習だけに集中できます。あとから別の目的にいつでも切り替えられます。"));
  Object.keys(WORD_PURPOSES).forEach((key) => {
    const p = WORD_PURPOSES[key];
    const card = el(`
      <div class="purpose-card">
        <div class="purpose-icon">${p.icon}</div>
        <div class="purpose-body">
          <div class="purpose-title">${p.label}</div>
          <div class="purpose-desc">${p.desc}</div>
        </div>
        <div>›</div>
      </div>
    `);
    card.addEventListener("click", () => {
      setWordsPurpose(key);
      renderWordsHome();
    });
    viewEl.appendChild(card);
  });
}

function renderWordsCategoryList(purposeKey) {
  const purpose = WORD_PURPOSES[purposeKey];
  const back = el(`<button class="back-btn">‹ 目的選択に戻る</button>`);
  back.addEventListener("click", () => {
    wordsPurpose = null;
    renderWordsHome();
  });
  viewEl.appendChild(back);
  viewEl.appendChild(el(`<div class="section-title">${purpose.icon} ${purpose.label}: カテゴリを選んでください</div>`));

  const progress = loadProgress();
  const dictationProgress = loadDictationProgress();
  WORD_CATEGORIES.forEach((cat) => {
    let progressText;
    if (purposeKey === "read") {
      const p = progress[cat.id];
      progressText = p ? `ベスト ${p.bestScore}/${cat.words.length}` : "未挑戦";
    } else if (purposeKey === "write") {
      const d = dictationProgress[cat.id];
      progressText = d ? `ベスト ${d.bestScore}/${cat.words.length}` : "未挑戦";
    } else {
      progressText = `${cat.words.length}問`;
    }
    const card = el(`
      <div class="category-card">
        <div>
          <div class="cat-name">${cat.name}</div>
          <div class="cat-progress">${progressText}</div>
        </div>
        <div>›</div>
      </div>
    `);
    card.addEventListener("click", () => renderCategoryDetail(cat, purpose.modes[0]));
    viewEl.appendChild(card);
  });
}

function renderCategoryDetail(cat, mode = "flashcard") {
  viewEl.innerHTML = "";
  const purposeKey = purposeKeyForMode(mode);
  // 直接リンクされた場合(学習コースのステップなど)も、次回の「戻る」の行き先・記憶した続きを練習側に揃える
  setWordsSection("practice");
  setWordsPurpose(purposeKey);
  const purpose = WORD_PURPOSES[purposeKey];

  const back = el(`<button class="back-btn">‹ ${purpose.icon} ${purpose.label}のカテゴリ一覧に戻る</button>`);
  back.addEventListener("click", () => renderWordsCategoryList(purposeKey));
  viewEl.appendChild(back);

  viewEl.appendChild(el(`<div class="section-title">${cat.name}</div>`));

  if (purpose.modes.length > 1) {
    const switchBar = el(`<div class="mode-switch"></div>`);
    purpose.modes.forEach((m) => {
      const btn = el(`<button data-mode="${m}" class="${mode === m ? "active" : ""}">${MODE_LABELS[m]}</button>`);
      btn.addEventListener("click", () => renderCategoryDetail(cat, m));
      switchBar.appendChild(btn);
    });
    viewEl.appendChild(switchBar);
  }

  if (cat.tip) viewEl.appendChild(buildTipBox(cat.tip));

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
        <div class="sub-text">${word.jp}${word.pos ? `<span class="pos-tag">${word.pos}</span>` : ""}</div>
        ${
          word.ex && word.ex.length
            ? `<div class="example-text"><div>${word.ex[0].kr}</div><div class="example-sub">${word.ex[0].yomi} ・ ${word.ex[0].jp}</div></div>`
            : ""
        }
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
    const due = isGrammarDue(lesson.id);
    viewEl.appendChild(el(`<div class="section-title">${lesson.title}${due ? '<span class="due-tag">🔁復習</span>' : ""}</div>`));
    viewEl.appendChild(el(`<div class="grammar-explanation">${lesson.explanation}</div>`));
    if (lesson.tip) viewEl.appendChild(buildTipBox(lesson.tip));
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
    viewEl.appendChild(buildSelfRateRow("grammar", lesson.id));
  });
}

// ==== フレーズ画面 ====

let phrasesViewMode = "basic"; // "basic" | "situation"
let selectedSituation = null;

function renderPhrases() {
  viewEl.innerHTML = "";

  const switchBar = el(`
    <div class="mode-switch">
      <button data-mode="basic" class="${phrasesViewMode === "basic" ? "active" : ""}">基本フレーズ</button>
      <button data-mode="situation" class="${phrasesViewMode === "situation" ? "active" : ""}">🎭 場面別の会話</button>
    </div>
  `);
  switchBar.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      phrasesViewMode = b.dataset.mode;
      selectedSituation = null;
      renderPhrases();
    });
  });
  viewEl.appendChild(switchBar);

  if (phrasesViewMode === "situation") {
    if (selectedSituation) renderSituationDialogue(selectedSituation);
    else renderSituationList();
    return;
  }

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

function renderSituationList() {
  viewEl.appendChild(el(`<div class="section-title">場面を選んでください</div>`));
  SITUATIONS.forEach((sit) => {
    const due = isSituationDue(sit.id);
    const card = el(`
      <div class="category-card">
        <div>
          <div class="cat-name">${sit.title}${due ? '<span class="due-tag">🔁復習</span>' : ""}</div>
          <div class="cat-progress">${sit.desc}</div>
        </div>
        <div>›</div>
      </div>
    `);
    card.addEventListener("click", () => {
      selectedSituation = sit;
      renderPhrases();
    });
    viewEl.appendChild(card);
  });
}

function renderSituationDialogue(sit) {
  const back = el(`<button class="back-btn">‹ 場面一覧に戻る</button>`);
  back.addEventListener("click", () => {
    selectedSituation = null;
    renderPhrases();
  });
  viewEl.appendChild(back);
  viewEl.appendChild(el(`<div class="section-title">${sit.title}</div>`));
  viewEl.appendChild(el(`<div class="grammar-explanation">${sit.desc}</div>`));
  if (sit.tip) viewEl.appendChild(buildTipBox(sit.tip));

  const dialogueWrap = el(`<div class="dialogue-wrap"></div>`);
  sit.lines.forEach((line) => {
    const isMe = line.speaker === "나";
    const bubble = el(`
      <div class="dialogue-line ${isMe ? "me" : "other"}">
        <div class="dialogue-speaker">${line.speaker}</div>
        <div class="dialogue-bubble">
          <div class="kr">${line.kr}<span class="speak-icon">🔊</span></div>
          <div class="yomi-text">${line.yomi}</div>
          <div class="jp">${line.jp}</div>
        </div>
      </div>
    `);
    bubble.querySelector(".speak-icon").addEventListener("click", () => speak(line.kr));
    dialogueWrap.appendChild(bubble);
  });
  viewEl.appendChild(dialogueWrap);
  viewEl.appendChild(buildSelfRateRow("situation", sit.id));
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
