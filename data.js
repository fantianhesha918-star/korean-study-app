// 学習データ定義

// ハングル: 母音・子音の一覧(発音はカタカナの目安)
const HANGUL_VOWELS = [
  { char: "ㅏ", romaja: "a", kana: "ア" },
  { char: "ㅑ", romaja: "ya", kana: "ヤ" },
  { char: "ㅓ", romaja: "eo", kana: "オ" },
  { char: "ㅕ", romaja: "yeo", kana: "ヨ" },
  { char: "ㅗ", romaja: "o", kana: "オ" },
  { char: "ㅛ", romaja: "yo", kana: "ヨ" },
  { char: "ㅜ", romaja: "u", kana: "ウ" },
  { char: "ㅠ", romaja: "yu", kana: "ユ" },
  { char: "ㅡ", romaja: "eu", kana: "ウ" },
  { char: "ㅣ", romaja: "i", kana: "イ" },
  { char: "ㅐ", romaja: "ae", kana: "エ" },
  { char: "ㅔ", romaja: "e", kana: "エ" },
  { char: "ㅘ", romaja: "wa", kana: "ワ" },
  { char: "ㅝ", romaja: "wo", kana: "ウォ" },
  { char: "ㅟ", romaja: "wi", kana: "ウィ" },
  { char: "ㅢ", romaja: "ui", kana: "ウィ" },
];

const HANGUL_CONSONANTS = [
  { char: "ㄱ", romaja: "g/k", kana: "ク" },
  { char: "ㄴ", romaja: "n", kana: "ヌ" },
  { char: "ㄷ", romaja: "d/t", kana: "トゥ" },
  { char: "ㄹ", romaja: "r/l", kana: "ル" },
  { char: "ㅁ", romaja: "m", kana: "ム" },
  { char: "ㅂ", romaja: "b/p", kana: "プ" },
  { char: "ㅅ", romaja: "s", kana: "ス" },
  { char: "ㅇ", romaja: "(無音/ng)", kana: "ウ" },
  { char: "ㅈ", romaja: "j", kana: "チュ" },
  { char: "ㅊ", romaja: "ch", kana: "チュ" },
  { char: "ㅋ", romaja: "k", kana: "ク" },
  { char: "ㅌ", romaja: "t", kana: "トゥ" },
  { char: "ㅍ", romaja: "p", kana: "プ" },
  { char: "ㅎ", romaja: "h", kana: "フ" },
  { char: "ㄲ", romaja: "kk", kana: "ック" },
  { char: "ㄸ", romaja: "tt", kana: "ットゥ" },
  { char: "ㅃ", romaja: "pp", kana: "ップ" },
  { char: "ㅆ", romaja: "ss", kana: "ッス" },
  { char: "ㅉ", romaja: "jj", kana: "ッチュ" },
];

// 가나다표(カナダ表): 日本語の五十音図に相当する、子音×母音の組み合わせ表
// 行=基本子音14、列=基本母音10
const GANADA_ROW_CONSONANTS = [
  { char: "ㄱ", romaja: "g/k" },
  { char: "ㄴ", romaja: "n" },
  { char: "ㄷ", romaja: "d/t" },
  { char: "ㄹ", romaja: "r/l" },
  { char: "ㅁ", romaja: "m" },
  { char: "ㅂ", romaja: "b/p" },
  { char: "ㅅ", romaja: "s" },
  { char: "ㅇ", romaja: "-" },
  { char: "ㅈ", romaja: "j" },
  { char: "ㅊ", romaja: "ch" },
  { char: "ㅋ", romaja: "k" },
  { char: "ㅌ", romaja: "t" },
  { char: "ㅍ", romaja: "p" },
  { char: "ㅎ", romaja: "h" },
];

const GANADA_COL_VOWELS = [
  { char: "ㅏ", romaja: "a" },
  { char: "ㅑ", romaja: "ya" },
  { char: "ㅓ", romaja: "eo" },
  { char: "ㅕ", romaja: "yeo" },
  { char: "ㅗ", romaja: "o" },
  { char: "ㅛ", romaja: "yo" },
  { char: "ㅜ", romaja: "u" },
  { char: "ㅠ", romaja: "yu" },
  { char: "ㅡ", romaja: "eu" },
  { char: "ㅣ", romaja: "i" },
];

// 母音を「単純な母音」→「や行っぽい母音」の2グループに分けた並び替え版
const GANADA_COL_VOWELS_GROUPED_ORDER = ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ", "ㅑ", "ㅕ", "ㅛ", "ㅠ"];

// 子音を日本語の「あかさたなはまら行」の並びに近づけた並び替え版
// ㅋ→か行の強い発音、ㅌ→た行の強い発音、ㅈㅊ→た行に近い音、ㅂㅍ→は行に近い音としてまとめて配置
// (「や行」「わ行」に対応する子音はハングルに存在しないため省略)
const GANADA_ROW_CONSONANTS_GROUPED_ORDER = ["ㅇ", "ㄱ", "ㅋ", "ㅅ", "ㄷ", "ㅌ", "ㅈ", "ㅊ", "ㄴ", "ㅎ", "ㅂ", "ㅍ", "ㅁ", "ㄹ"];

// 가나다표の読み仮名(カタカナ目安)。GANADA_COL_VOWELSの並び(a,ya,eo,yeo,o,yo,u,yu,eu,i)に対応
const GANADA_KANA_MAP = {
  "ㄱ": ["ガ", "ギャ", "ゴ", "ギョ", "ゴ", "ギョ", "グ", "ギュ", "グ", "ギ"],
  "ㄴ": ["ナ", "ニャ", "ノ", "ニョ", "ノ", "ニョ", "ヌ", "ニュ", "ヌ", "ニ"],
  "ㄷ": ["ダ", "ディャ", "ド", "ディョ", "ド", "ディョ", "ドゥ", "ディュ", "ドゥ", "ディ"],
  "ㄹ": ["ラ", "リャ", "ロ", "リョ", "ロ", "リョ", "ル", "リュ", "ル", "リ"],
  "ㅁ": ["マ", "ミャ", "モ", "ミョ", "モ", "ミョ", "ム", "ミュ", "ム", "ミ"],
  "ㅂ": ["バ", "ビャ", "ボ", "ビョ", "ボ", "ビョ", "ブ", "ビュ", "ブ", "ビ"],
  "ㅅ": ["サ", "シャ", "ソ", "ショ", "ソ", "ショ", "ス", "シュ", "ス", "シ"],
  "ㅇ": ["ア", "ヤ", "オ", "ヨ", "オ", "ヨ", "ウ", "ユ", "ウ", "イ"],
  "ㅈ": ["ジャ", "ジャ", "ジョ", "ジョ", "ジョ", "ジョ", "ジュ", "ジュ", "ジュ", "ジ"],
  "ㅊ": ["チャ", "チャ", "チョ", "チョ", "チョ", "チョ", "チュ", "チュ", "チュ", "チ"],
  "ㅋ": ["カ", "キャ", "コ", "キョ", "コ", "キョ", "ク", "キュ", "ク", "キ"],
  "ㅌ": ["タ", "ティャ", "ト", "ティョ", "ト", "ティョ", "トゥ", "ティュ", "トゥ", "ティ"],
  "ㅍ": ["パ", "ピャ", "ポ", "ピョ", "ポ", "ピョ", "プ", "ピュ", "プ", "ピ"],
  "ㅎ": ["ハ", "ヒャ", "ホ", "ヒョ", "ホ", "ヒョ", "フ", "ヒュ", "フ", "ヒ"],
};

// 単語帳: カテゴリ別
const WORD_CATEGORIES = [
  {
    id: "greeting",
    name: "あいさつ",
    words: [
      { kr: "안녕하세요", yomi: "アンニョンハセヨ", jp: "こんにちは" },
      { kr: "안녕히 가세요", yomi: "アンニョンヒ ガセヨ", jp: "さようなら(去る人へ)" },
      { kr: "안녕히 계세요", yomi: "アンニョンヒ ケセヨ", jp: "さようなら(残る人へ)" },
      { kr: "감사합니다", yomi: "カムサハムニダ", jp: "ありがとうございます" },
      { kr: "죄송합니다", yomi: "チェソンハムニダ", jp: "すみません" },
      { kr: "네", yomi: "ネ", jp: "はい" },
      { kr: "아니요", yomi: "アニヨ", jp: "いいえ" },
      { kr: "괜찮아요", yomi: "クェンチャナヨ", jp: "大丈夫です" },
    ],
  },
  {
    id: "number",
    name: "数字",
    words: [
      { kr: "하나", yomi: "ハナ", jp: "1つ(固有数詞)" },
      { kr: "둘", yomi: "トゥル", jp: "2つ(固有数詞)" },
      { kr: "셋", yomi: "セッ", jp: "3つ(固有数詞)" },
      { kr: "일", yomi: "イル", jp: "1(漢数詞)" },
      { kr: "이", yomi: "イ", jp: "2(漢数詞)" },
      { kr: "삼", yomi: "サム", jp: "3(漢数詞)" },
      { kr: "사", yomi: "サ", jp: "4(漢数詞)" },
      { kr: "오", yomi: "オ", jp: "5(漢数詞)" },
    ],
  },
  {
    id: "family",
    name: "家族",
    words: [
      { kr: "가족", yomi: "カジョク", jp: "家族" },
      { kr: "아버지", yomi: "アボジ", jp: "お父さん" },
      { kr: "어머니", yomi: "オモニ", jp: "お母さん" },
      { kr: "형", yomi: "ヒョン", jp: "兄(弟から見て)" },
      { kr: "누나", yomi: "ヌナ", jp: "姉(弟から見て)" },
      { kr: "동생", yomi: "トンセン", jp: "弟・妹" },
      { kr: "친구", yomi: "チング", jp: "友達" },
    ],
  },
  {
    id: "food",
    name: "食べ物",
    words: [
      { kr: "밥", yomi: "パプ", jp: "ご飯" },
      { kr: "물", yomi: "ムル", jp: "水" },
      { kr: "김치", yomi: "キムチ", jp: "キムチ" },
      { kr: "고기", yomi: "コギ", jp: "肉" },
      { kr: "커피", yomi: "コピ", jp: "コーヒー" },
      { kr: "맛있어요", yomi: "マシッソヨ", jp: "おいしいです" },
      { kr: "배고파요", yomi: "ペゴパヨ", jp: "お腹が空きました" },
    ],
  },
  {
    id: "daily",
    name: "日常表現",
    words: [
      { kr: "이거", yomi: "イゴ", jp: "これ" },
      { kr: "저거", yomi: "チョゴ", jp: "あれ" },
      { kr: "얼마예요?", yomi: "オルマエヨ?", jp: "いくらですか?" },
      { kr: "어디예요?", yomi: "オディエヨ?", jp: "どこですか?" },
      { kr: "이름이 뭐예요?", yomi: "イルミ ムォエヨ?", jp: "名前は何ですか?" },
      { kr: "저는 일본 사람이에요", yomi: "チョヌン イルボン サラミエヨ", jp: "私は日本人です" },
      { kr: "한국어를 공부해요", yomi: "ハングゴルル コンブヘヨ", jp: "韓国語を勉強します" },
    ],
  },
  {
    id: "shopping",
    name: "買い物",
    words: [
      { kr: "이거 주세요", yomi: "イゴ ジュセヨ", jp: "これください" },
      { kr: "싸요", yomi: "サヨ", jp: "安いです" },
      { kr: "비싸요", yomi: "ピッサヨ", jp: "高いです" },
      { kr: "카드", yomi: "カドゥ", jp: "カード" },
      { kr: "현금", yomi: "ヒョングム", jp: "現金" },
      { kr: "영수증", yomi: "ヨンスジュン", jp: "レシート" },
      { kr: "세일", yomi: "セイル", jp: "セール" },
      { kr: "다른 색 있어요?", yomi: "タルン セク イッソヨ?", jp: "他の色はありますか?" },
    ],
  },
  {
    id: "time",
    name: "時間・曜日",
    words: [
      { kr: "지금", yomi: "チグム", jp: "今" },
      { kr: "오늘", yomi: "オヌル", jp: "今日" },
      { kr: "내일", yomi: "ネイル", jp: "明日" },
      { kr: "어제", yomi: "オジェ", jp: "昨日" },
      { kr: "월요일", yomi: "ウォリョイル", jp: "月曜日" },
      { kr: "화요일", yomi: "ファヨイル", jp: "火曜日" },
      { kr: "수요일", yomi: "スヨイル", jp: "水曜日" },
      { kr: "주말", yomi: "チュマル", jp: "週末" },
    ],
  },
  {
    id: "color",
    name: "色",
    words: [
      { kr: "빨간색", yomi: "ッパルガンセク", jp: "赤色" },
      { kr: "파란색", yomi: "パランセク", jp: "青色" },
      { kr: "노란색", yomi: "ノランセク", jp: "黄色" },
      { kr: "검은색", yomi: "コムンセク", jp: "黒色" },
      { kr: "흰색", yomi: "フィンセク", jp: "白色" },
      { kr: "초록색", yomi: "チョロクセク", jp: "緑色" },
    ],
  },
  {
    id: "transport",
    name: "交通・移動",
    words: [
      { kr: "버스", yomi: "ボス", jp: "バス" },
      { kr: "지하철", yomi: "チハチョル", jp: "地下鉄" },
      { kr: "택시", yomi: "テクシ", jp: "タクシー" },
      { kr: "기차", yomi: "キチャ", jp: "電車・汽車" },
      { kr: "공항", yomi: "コンハン", jp: "空港" },
      { kr: "여기", yomi: "ヨギ", jp: "ここ" },
      { kr: "저기", yomi: "チョギ", jp: "あそこ" },
      { kr: "얼마나 걸려요?", yomi: "オルマナ コルリョヨ?", jp: "どれくらいかかりますか?" },
    ],
  },
  {
    id: "emotion",
    name: "感情表現",
    words: [
      { kr: "좋아요", yomi: "チョアヨ", jp: "いいです・好きです" },
      { kr: "싫어요", yomi: "シロヨ", jp: "嫌いです" },
      { kr: "기뻐요", yomi: "キポヨ", jp: "嬉しいです" },
      { kr: "슬퍼요", yomi: "スルポヨ", jp: "悲しいです" },
      { kr: "화나요", yomi: "ファナヨ", jp: "怒っています" },
      { kr: "피곤해요", yomi: "ピゴネヨ", jp: "疲れました" },
      { kr: "재미있어요", yomi: "チェミイッソヨ", jp: "面白いです" },
    ],
  },
];

// 文法レッスン: 語順→助詞→です/だ→ある/いる→動詞の基本形→過去/否定/疑問 の順で
// 「単語を組み合わせて文章を作るルール」を段階的に紹介する
const GRAMMAR_LESSONS = [
  {
    id: "word-order",
    title: "① 語順の感覚をつかむ",
    explanation:
      "韓国語は日本語と同じ「主語→目的語→動詞」の順番(SOV)です。英語のような語順の並べ替えを考えなくてよいので、日本語の文をそのまま韓国語の単語に置き換えていく感覚でOKです。",
    points: [
      { pattern: "私は ご飯を 食べます", kr: "저는 밥을 먹어요.", yomi: "チョヌン パブル モゴヨ", jp: "私はご飯を食べます。" },
      { pattern: "私は 学校に 行きます", kr: "저는 학교에 가요.", yomi: "チョヌン ハッキョエ カヨ", jp: "私は学校に行きます。" },
    ],
  },
  {
    id: "particles",
    title: "② 助詞(조사)を覚える",
    explanation:
      "韓国語の助詞は日本語の助詞とほぼ1対1で対応します。直前の文字がパッチム(下に子音がつく文字)で終わるかどうかで形が変わるものが多いです。",
    points: [
      { pattern: "〜は (パッチムあり→은 / なし→는)", kr: "저는 / 이것은", yomi: "チョヌン / イゴスン", jp: "私は / これは" },
      { pattern: "〜が (パッチムあり→이 / なし→가)", kr: "밥이 / 학교가", yomi: "パビ / ハッキョガ", jp: "ご飯が / 学校が" },
      { pattern: "〜を (パッチムあり→을 / なし→를)", kr: "밥을 / 커피를", yomi: "パブル / コピルル", jp: "ご飯を / コーヒーを" },
      { pattern: "〜に/へ (場所・方向)", kr: "학교에", yomi: "ハッキョエ", jp: "学校に" },
      { pattern: "〜で (場所)", kr: "학교에서", yomi: "ハッキョエソ", jp: "学校で" },
      { pattern: "〜も", kr: "저도", yomi: "チョド", jp: "私も" },
      { pattern: "〜の(会話ではよく省略される)", kr: "저의 가족", yomi: "チョエ カジョク", jp: "私の家族" },
    ],
  },
  {
    id: "copula",
    title: "③ 「〜です/〜だ」の言い方",
    explanation:
      "名詞の後ろに「이에요/예요」をつけると「〜です」になります。直前の文字にパッチムがあれば이에요、なければ예요です。",
    points: [
      { pattern: "パッチムあり＋이에요", kr: "학생이에요.", yomi: "ハクセンイエヨ", jp: "学生です。" },
      { pattern: "パッチムなし＋예요", kr: "저는 다나카예요.", yomi: "チョヌン タナカエヨ", jp: "私は田中です。" },
      { pattern: "이것 + 은 + 책 + 이에요", kr: "이것은 책이에요.", yomi: "イゴスン チェギエヨ", jp: "これは本です。" },
    ],
  },
  {
    id: "existence",
    title: "④ 「ある/いる・ない/いない」",
    explanation: "「있어요」で『ある・いる』、「없어요」で『ない・いない』を表します。人にもモノにも同じ単語を使えます。",
    points: [
      { pattern: "〜があります", kr: "시간이 있어요.", yomi: "シガニ イッソヨ", jp: "時間があります。" },
      { pattern: "〜がいます", kr: "친구가 있어요.", yomi: "チングガ イッソヨ", jp: "友達がいます。" },
      { pattern: "〜がありません", kr: "돈이 없어요.", yomi: "トニ オプソヨ", jp: "お金がありません。" },
    ],
  },
  {
    id: "verb-basic",
    title: "⑤ 動詞・形容詞の基本の言い方(해요体)",
    explanation:
      "辞書の見出し語は「〜다」で終わります。この「다」を取って、直前の母音がㅏ/ㅗなら「아요」、それ以外なら「어요」をつけると、日常会話でよく使う丁寧な言い方になります(하다で終わる言葉は해요になります)。",
    points: [
      { pattern: "가다(行く) → 가요", kr: "가요.", yomi: "カヨ", jp: "行きます。" },
      { pattern: "먹다(食べる) → 먹어요", kr: "먹어요.", yomi: "モゴヨ", jp: "食べます。" },
      { pattern: "공부하다(勉強する) → 공부해요", kr: "공부해요.", yomi: "コンブヘヨ", jp: "勉強します。" },
    ],
  },
  {
    id: "past-neg-question",
    title: "⑥ 過去形・否定文・疑問文",
    explanation:
      "過去形は「아요/어요」を「았어요/었어요」に変えます。否定文は動詞の前に「안」をつけるだけ。疑問文は文末を「？」で上げて発音するだけで作れます(語順を変える必要がありません)。",
    points: [
      { pattern: "過去形: 가요 → 갔어요", kr: "어제 학교에 갔어요.", yomi: "オジェ ハッキョエ カッソヨ", jp: "昨日学校に行きました。" },
      { pattern: "否定形: 안 + 動詞", kr: "저는 안 가요.", yomi: "チョヌン アン ガヨ", jp: "私は行きません。" },
      { pattern: "疑問文: 文末を上げて発音", kr: "학교에 가요?", yomi: "ハッキョエ カヨ?", jp: "学校に行きますか?" },
    ],
  },
  {
    id: "want",
    title: "⑦ 「〜したいです」",
    explanation: "動詞の다を取って「고 싶어요」をつけると「〜したいです」という願望を表せます。日本語の「〜たい」とほぼ同じ感覚で使えます。",
    points: [
      { pattern: "먹다(食べる) → 먹고 싶어요", kr: "김치찌개를 먹고 싶어요.", yomi: "キムチッチゲルル モッコ シポヨ", jp: "キムチチゲが食べたいです。" },
      { pattern: "가다(行く) → 가고 싶어요", kr: "한국에 가고 싶어요.", yomi: "ハングゲ カゴ シポヨ", jp: "韓国に行きたいです。" },
    ],
  },
  {
    id: "but",
    title: "⑧ 「〜だけど」(逆接)",
    explanation: "動詞・形容詞の다を取って「지만」をつけると「〜だけど・〜けれども」という逆接を表せます。前後の内容を対比させたいときに使います。",
    points: [
      { pattern: "비싸다(高い) → 비싸지만", kr: "비싸지만 맛있어요.", yomi: "ピッサジマン マシッソヨ", jp: "高いけどおいしいです。" },
      { pattern: "어렵다(難しい) → 어렵지만", kr: "한국어는 어렵지만 재미있어요.", yomi: "ハングゴヌン オリョプチマン チェミイッソヨ", jp: "韓国語は難しいけど面白いです。" },
    ],
  },
  {
    id: "because",
    title: "⑨ 「〜なので」(理由)",
    explanation: "動詞・形容詞の語幹に、最後の母音がㅏ/ㅗなら「아서」、それ以外なら「어서」をつけると「〜なので・〜して」という理由を表せます(過去形にはできない点に注意)。",
    points: [
      { pattern: "피곤하다(疲れている) → 피곤해서", kr: "피곤해서 집에 가요.", yomi: "ピゴネソ チベ カヨ", jp: "疲れたので家に帰ります。" },
      { pattern: "배고프다(お腹が空いている) → 배고파서", kr: "배고파서 밥을 먹어요.", yomi: "ペゴパソ パブル モゴヨ", jp: "お腹が空いたのでご飯を食べます。" },
    ],
  },
  {
    id: "can",
    title: "⑩ 「〜できます/できません」",
    explanation: "動詞の다を取って「을 수 있어요(できます)」「을 수 없어요(できません)」をつけると可能・不可能を表せます。パッチムがなければ「ㄹ 수」になります。",
    points: [
      { pattern: "하다(する) → 할 수 있어요", kr: "한국어를 할 수 있어요.", yomi: "ハングゴルル ハル ス イッソヨ", jp: "韓国語ができます。" },
      { pattern: "먹다(食べる) → 먹을 수 없어요", kr: "매운 음식을 먹을 수 없어요.", yomi: "メウン ウムシグル モグル ス オプソヨ", jp: "辛い食べ物が食べられません。" },
    ],
  },
];

// 学習コース: 学びやすい順に並べたステップ
// type "manual": ユーザーが自分で「完了にする」を押して完了とする
// type "quiz": 単語帳のクイズに1回挑戦したら自動で完了とする
// level: "beginner"(初級) | "intermediate"(中級) | "advanced"(上級)
const STUDY_LEVELS = [
  { id: "beginner", label: "初級", desc: "ハングルの読み方と基本の単語・文型を覚える" },
  { id: "intermediate", label: "中級", desc: "使える単語を増やし、文法のバリエーションを広げる" },
  { id: "advanced", label: "上級", desc: "気持ちや理由を伝える表現を覚えて会話に近づける" },
];

const STUDY_STEPS = [
  // ---- 初級 ----
  {
    id: "vowels",
    title: "母音の読み方を覚える",
    desc: "「ハングル」タブの母音一覧をタップして、発音を聞きながら読み方を覚えましょう。",
    tab: "hangul",
    type: "manual",
    level: "beginner",
  },
  {
    id: "consonants",
    title: "子音の読み方を覚える",
    desc: "「ハングル」タブの子音一覧をタップして、発音を確認しましょう。",
    tab: "hangul",
    type: "manual",
    level: "beginner",
  },
  {
    id: "ganada",
    title: "가나다표で組み合わせ読みを練習する",
    desc: "子音+母音を組み合わせた文字(가,나,다…)をタップして声に出して読んでみましょう。",
    tab: "hangul",
    type: "manual",
    level: "beginner",
  },
  {
    id: "greeting",
    title: "あいさつの単語を覚える",
    desc: "フラッシュカードで覚えたら、クイズに挑戦しましょう。",
    tab: "words",
    categoryId: "greeting",
    type: "quiz",
    level: "beginner",
  },
  {
    id: "number",
    title: "数字を覚える",
    desc: "フラッシュカードで覚えたら、クイズに挑戦しましょう。",
    tab: "words",
    categoryId: "number",
    type: "quiz",
    level: "beginner",
  },
  {
    id: "family",
    title: "家族の単語を覚える",
    desc: "フラッシュカードで覚えたら、クイズに挑戦しましょう。",
    tab: "words",
    categoryId: "family",
    type: "quiz",
    level: "beginner",
  },
  {
    id: "food",
    title: "食べ物の単語を覚える",
    desc: "フラッシュカードで覚えたら、クイズに挑戦しましょう。",
    tab: "words",
    categoryId: "food",
    type: "quiz",
    level: "beginner",
  },
  {
    id: "daily",
    title: "日常表現を覚える",
    desc: "フラッシュカードで覚えたら、クイズに挑戦しましょう。",
    tab: "words",
    categoryId: "daily",
    type: "quiz",
    level: "beginner",
  },
  {
    id: "grammar-word-order",
    title: "文法: 語順の感覚をつかむ",
    desc: "「文法」タブで、韓国語と日本語の語順が同じであることを確認しましょう。",
    tab: "grammar",
    type: "manual",
    level: "beginner",
  },
  {
    id: "grammar-particles",
    title: "文法: 助詞(조사)を覚える",
    desc: "「文法」タブで、日本語の助詞に対応する韓国語の助詞を確認しましょう。",
    tab: "grammar",
    type: "manual",
    level: "beginner",
  },
  {
    id: "grammar-copula",
    title: "文法: 「〜です/〜だ」の言い方",
    desc: "「文法」タブで、名詞に「이에요/예요」をつける言い方を確認しましょう。",
    tab: "grammar",
    type: "manual",
    level: "beginner",
  },

  // ---- 中級 ----
  {
    id: "shopping",
    title: "買い物の単語を覚える",
    desc: "フラッシュカードで覚えたら、クイズに挑戦しましょう。",
    tab: "words",
    categoryId: "shopping",
    type: "quiz",
    level: "intermediate",
  },
  {
    id: "time",
    title: "時間・曜日の単語を覚える",
    desc: "フラッシュカードで覚えたら、クイズに挑戦しましょう。",
    tab: "words",
    categoryId: "time",
    type: "quiz",
    level: "intermediate",
  },
  {
    id: "color",
    title: "色の単語を覚える",
    desc: "フラッシュカードで覚えたら、クイズに挑戦しましょう。",
    tab: "words",
    categoryId: "color",
    type: "quiz",
    level: "intermediate",
  },
  {
    id: "transport",
    title: "交通・移動の単語を覚える",
    desc: "フラッシュカードで覚えたら、クイズに挑戦しましょう。",
    tab: "words",
    categoryId: "transport",
    type: "quiz",
    level: "intermediate",
  },
  {
    id: "emotion",
    title: "感情表現の単語を覚える",
    desc: "フラッシュカードで覚えたら、クイズに挑戦しましょう。",
    tab: "words",
    categoryId: "emotion",
    type: "quiz",
    level: "intermediate",
  },
  {
    id: "grammar-existence",
    title: "文法: 「ある/いる・ない/いない」",
    desc: "「文法」タブで、있어요/없어요の使い方を確認しましょう。",
    tab: "grammar",
    type: "manual",
    level: "intermediate",
  },
  {
    id: "grammar-verb-basic",
    title: "文法: 動詞・形容詞の基本の言い方",
    desc: "「文法」タブで、해요体(丁寧な言い方)の作り方を確認しましょう。",
    tab: "grammar",
    type: "manual",
    level: "intermediate",
  },
  {
    id: "grammar-past-neg-question",
    title: "文法: 過去形・否定文・疑問文",
    desc: "「文法」タブで、過去形・否定文・疑問文の作り方を確認しましょう。",
    tab: "grammar",
    type: "manual",
    level: "intermediate",
  },

  // ---- 上級 ----
  {
    id: "grammar-want",
    title: "文法: 「〜したいです」",
    desc: "「文法」タブで、고 싶어요の使い方を確認しましょう。",
    tab: "grammar",
    type: "manual",
    level: "advanced",
  },
  {
    id: "grammar-but",
    title: "文法: 「〜だけど」",
    desc: "「文法」タブで、지만の使い方を確認しましょう。",
    tab: "grammar",
    type: "manual",
    level: "advanced",
  },
  {
    id: "grammar-because",
    title: "文法: 「〜なので」",
    desc: "「文法」タブで、아서/어서の使い方を確認しましょう。",
    tab: "grammar",
    type: "manual",
    level: "advanced",
  },
  {
    id: "grammar-can",
    title: "文法: 「〜できます/できません」",
    desc: "「文法」タブで、을 수 있어요/없어요の使い方を確認しましょう。",
    tab: "grammar",
    type: "manual",
    level: "advanced",
  },
  {
    id: "phrases",
    title: "総仕上げ: 基本フレーズで文章を作ってみる",
    desc: "ここまで覚えた単語と文法を使って、自己紹介や質問の言い方を「フレーズ」タブで確認しましょう。",
    tab: "phrases",
    type: "manual",
    level: "advanced",
  },
];

// 基本フレーズ・簡単な文法
const PHRASES = [
  {
    title: "自己紹介",
    items: [
      { kr: "저는 ○○예요.", yomi: "チョヌン ○○イエヨ", jp: "私は○○です。" },
      { kr: "만나서 반가워요.", yomi: "マンナソ パンガウォヨ", jp: "お会いできて嬉しいです。" },
      { kr: "잘 부탁드립니다.", yomi: "チャル プタクドゥリムニダ", jp: "よろしくお願いします。" },
    ],
  },
  {
    title: "基本文型:〜は〜です",
    items: [
      { kr: "이것은 책이에요.", yomi: "イゴスン チェギエヨ", jp: "これは本です。" },
      { kr: "저것은 가방이에요.", yomi: "チョゴスン カバンイエヨ", jp: "あれはかばんです。" },
    ],
  },
  {
    title: "基本文型:〜します(합니다体/해요体)",
    items: [
      { kr: "저는 공부해요.", yomi: "チョヌン コンブヘヨ", jp: "私は勉強します。" },
      { kr: "저는 밥을 먹어요.", yomi: "チョヌン パブル モゴヨ", jp: "私はご飯を食べます。" },
      { kr: "저는 학교에 가요.", yomi: "チョヌン ハッキョエ カヨ", jp: "私は学校に行きます。" },
    ],
  },
  {
    title: "疑問文",
    items: [
      { kr: "이게 뭐예요?", yomi: "イゲ ムォエヨ?", jp: "これは何ですか?" },
      { kr: "화장실이 어디예요?", yomi: "ファジャンシリ オディエヨ?", jp: "トイレはどこですか?" },
      { kr: "지금 몇 시예요?", yomi: "チグム ミョッ シエヨ?", jp: "今何時ですか?" },
    ],
  },
];
