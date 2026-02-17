(() => {
  // Prevent duplicate injection (e.g., extension reload/update)
  if (window.__VB_CONTENT_LOADED__) return;
  window.__VB_CONTENT_LOADED__ = true;

// Vocabulary Builder - content script
// Focus: stable selection/dblclick popup + hover popup on marked words

// ---------------- Storage helpers ----------------
const STORAGE_KEYS = {
    words: 'words',
// must align with manager.js
  vocabList: 'vocabList',
  vocabDict: 'vocabDict',
  vocabNotes: 'vocabNotes',
  vocabEn: 'vocabEn',
  vocabPhonetics: 'vocabPhonetics',
  vocabAudio: 'vocabAudio',
  greenList: 'greenList',
  yellowList: 'yellowList',
  vocabMeta: 'vocabMeta',
  blacklist_domain: 'blacklist_domain',
  blacklist_page: 'blacklist_page',
  global_disable: 'global_disable',
  // 与 manager.js 保持一致：收藏句子统一用 collectedSentences
  collectedSentences: 'collectedSentences'
};
// ===== Disable state (controlled by popup) =====
let __vb_globalDisable = false;
let __vb_blacklistDomain = [];
let __vb_blacklistPage = [];
let __vb_disabledNow = false;

function __vb_pageKey() {
  try { return location.href.split('#')[0]; } catch(e){ return ''; }
}
function __vb_domainKey() {
  try { return location.hostname || ''; } catch(e){ return ''; }
}
function __vb_updateDisabledNow() {
  const domain = (__vb_domainKey() || '').toLowerCase();
  const page = (__vb_pageKey() || '').toLowerCase();
  __vb_disabledNow =
    !!__vb_globalDisable ||
    (__vb_blacklistDomain || []).some(d => String(d||'').toLowerCase() === domain) ||
    (__vb_blacklistPage || []).some(u => String(u||'').toLowerCase() === page);
  // If disabled, best-effort remove highlights and hide box.
  try {
    if (__vb_disabledNow) {
      removeAllHighlightsFromCache && removeAllHighlightsFromCache();
      if (resultBox) resultBox.style.display = 'none';
    }
  } catch(e){}
}


// Selection heuristics
const MAX_PHRASE_WORDS = 5; // <= 5 words => treat as word/phrase popup (not translate)
const MAX_TRANSLATE_CHARS = 900; // hard limit for translation selection

// CSS Highlight API 需要在页面注入 ::highlight(...) 样式，否则即使 ranges 设置成功也不会显示任何颜色
function ensureHighlightStyles() {
  const id = 'mvp-vocab-highlight-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    ::highlight(my-vocab-red) { background: rgba(255, 59, 48, 0.28); }
    ::highlight(my-vocab-yellow) { background: rgba(255, 204, 0, 0.28); }
    ::highlight(my-vocab-green) { background: rgba(52, 199, 89, 0.28); }
    ::highlight(my-vocab-purple) { background: rgba(175, 82, 222, 0.30); }
    ::highlight(my-vocab-red),
    ::highlight(my-vocab-yellow),
    ::highlight(my-vocab-green),
    ::highlight(my-vocab-purple) {
      border-radius: 3px;
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 2px;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

// NOTE: chrome.storage.local.get 的 keys 参数是可选的。
// 之前的实现会把 key 包到数组里：get([key])。
// 如果某些调用方传了 undefined（例如 getDB() 想获取全部数据），
// 就会变成 get([undefined])，从而触发：
// "Error at parameter 'keys': Value did not match any choice."
// 这会导致 content script 逻辑中断，进而出现“划词/双击无弹窗”的现象。
function storageGet(keys) {
  return new Promise((resolve) => {
    // 统一规避 MV3 的参数约束：
// - chrome.storage.local.get() 允许“省略参数”来获取全部
// - 但不允许传入 null / [undefined] / {undefined: ...} 等非法 keys
if (keys === null || typeof keys === 'undefined') {
  chrome.storage.local.get((res) => resolve(res));
  return;
}

// 兼容数组：过滤掉非字符串 key（尤其是 undefined）
if (Array.isArray(keys)) {
  const filtered = keys.filter((k) => typeof k === 'string' && k.trim().length > 0);
  if (filtered.length === 0) {
    chrome.storage.local.get((res) => resolve(res));
    return;
  }
  chrome.storage.local.get(filtered, (res) => resolve(res));
  return;
}

// 兼容对象（含默认值的 get 形式）：仅保留合法字符串 key
if (keys && typeof keys === 'object') {
  const filteredObj = {};
  for (const [k, v] of Object.entries(keys)) {
    if (typeof k === 'string' && k.trim().length > 0) filteredObj[k] = v;
  }
  if (Object.keys(filteredObj).length === 0) {
    chrome.storage.local.get((res) => resolve(res));
    return;
  }
  chrome.storage.local.get(filteredObj, (res) => resolve(res));
  return;
}

// 字符串 key：只返回 value
chrome.storage.local.get(keys, (res) => resolve(res?.[keys]));

  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, () => resolve());
  });
}

// ---------------------------------------------------------------------------
// Backward-compatible helpers
// ---------------------------------------------------------------------------
// Some code paths (e.g. getCurrentWordRecord / applyHighlights) still call
// getDB/setDB, while earlier refactors removed these helpers from content.js.
// That throws "ReferenceError: getDB is not defined" and breaks ALL listeners,
// making selection/dblclick popups and highlights stop working.

async function getDB(keys = null) {
  // Keep the same schema as manager.js: root-level keys (vocabList/yellowList/greenList/vocabDict/vocabNotes/collectedSentences/vocabMeta).
  return await storageGet(keys);
}

async function setDB(patch) {
  // patch is an object to be merged into chrome.storage.local
  return await storageSet(patch);
}

async function getVocabDict() {
  return (await storageGet(STORAGE_KEYS.vocabDict)) || {};
}
async function setVocabDict(v) {
  await storageSet({ [STORAGE_KEYS.vocabDict]: v });
}

async function getVocabList() {
  return (await storageGet(STORAGE_KEYS.vocabList)) || [];
}
async function setVocabList(v) {
  await storageSet({ [STORAGE_KEYS.vocabList]: v });
}

async function getVocabNotes() {
  return (await storageGet(STORAGE_KEYS.vocabNotes)) || {};
}
async function setVocabNotes(v) {
  await storageSet({ [STORAGE_KEYS.vocabNotes]: v });
}

async function getVocabPhonetics() {
  return (await storageGet(STORAGE_KEYS.vocabPhonetics)) || {};
}
async function setVocabPhonetics(v) {
  await storageSet({ [STORAGE_KEYS.vocabPhonetics]: v });
}

async function getVocabAudio() {
  return (await storageGet(STORAGE_KEYS.vocabAudio)) || {};
}
async function setVocabAudio(v) {
  await storageSet({ [STORAGE_KEYS.vocabAudio]: v });
}

async function getGreenList() {
  return (await storageGet(STORAGE_KEYS.greenList)) || [];
}
async function setGreenList(v) {
  await storageSet({ [STORAGE_KEYS.greenList]: v });
}

async function getYellowList() {
  return (await storageGet(STORAGE_KEYS.yellowList)) || [];
}
async function setYellowList(v) {
  await storageSet({ [STORAGE_KEYS.yellowList]: v });
}

async function getSavedQuotes() {
  // 保持函数名不变，减少改动范围；底层 key 与 manager.js 的 collectedSentences 对齐
  return (await storageGet(STORAGE_KEYS.collectedSentences)) || [];
}
async function setSavedQuotes(v) {
  await storageSet({ [STORAGE_KEYS.collectedSentences]: v });
}

// ---------------- Highlighting (CSS Highlights API) ----------------
let wordsCache = [];              // [{word, status, note, ...}]
let wordMap = Object.create(null); // word(lower) -> record
let phraseKeys = [];              // phrase(lower) -> record

// ---------------- storage schema (shared with manager) ----------------
// ⚠️ content-script 内部使用“语义状态字符串”。
// red(陌生)=stranger, yellow(学习中)=learning, green(已掌握)=mastered, purple(批注)=note。
const STATUS = {
  NONE: "none",
  RED: "stranger",
  YELLOW: "learning",
  GREEN: "mastered",
  PURPLE: "note",
};


function normalizeWordKey(w) {
  return String(w || "").trim().toLowerCase();
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function rebuildWordsCacheFromDb(db) {
  const vocabList = Array.isArray(db.vocabList) ? db.vocabList : [];
  const yellow = new Set((db.yellowList || []).map(normalizeWordKey));
  const green = new Set((db.greenList || []).map(normalizeWordKey));
  const notes = db.vocabNotes && typeof db.vocabNotes === "object" ? db.vocabNotes : {};
  const dict = db.vocabDict && typeof db.vocabDict === "object" ? db.vocabDict : {};

  const out = [];
  for (const raw of vocabList) {
    const k = normalizeWordKey(raw);
    if (!k) continue;
    const hasNote = Boolean(notes[k] && String(notes[k]).trim());
    // 统一状态：
    // - 有批注 => note(紫)
    // - 在 greenList => mastered(绿)
    // - 在 yellowList => learning(黄)
    // - 只在 vocabList => stranger(红)
    let status = "stranger";
    if (hasNote) status = "note";
    else if (green.has(k)) status = "mastered";
    else if (yellow.has(k)) status = "learning";

    const d = dict[k] || {};
    out.push({
      word: k,
      status,
      note: hasNote ? String(notes[k]) : "",
      meaning: d.meaning || "",
      phoneticUS: d.phoneticUS || d.phoneticUs || "",
      phoneticUK: d.phoneticUK || d.phoneticUk || "",
      updatedAt: d.updatedAt || "",
      createdAt: d.createdAt || "",
    });
  }
  return out;
}

function getWordFromMap(word) {
  const k = normalizeWordKey(word);
  return k ? (wordMap[k] || null) : null;
}

// Minimal toast helper (content-script safe)
let __vbToastTimer = null;
function toast(message, ms = 1600) {
  try {
    const msg = String(message || "").trim();
    if (!msg) return;
    const root = shadowRoot || document.documentElement;
    let el = root.querySelector && root.querySelector("#vb-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "vb-toast";
      el.style.cssText = [
        "position: fixed",
        "z-index: 2147483647",
        "left: 50%",
        "bottom: 24px",
        "transform: translateX(-50%)",
        "background: rgba(0,0,0,.82)",
        "color: #fff",
        "padding: 10px 14px",
        "border-radius: 12px",
        "font-size: 13px",
        "max-width: min(520px, 90vw)",
        "box-shadow: 0 10px 24px rgba(0,0,0,.22)",
        "opacity: 0",
        "transition: opacity .12s ease",
        "pointer-events: none",
        "white-space: pre-wrap",
      ].join(";");
      (document.body || document.documentElement).appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(__vbToastTimer);
    __vbToastTimer = setTimeout(() => { el.style.opacity = "0"; }, ms);
  } catch (e) {
    console.log("[VB toast]", message);
  }
}

// Build a compact meaning string from Youdao payload (used for saving into vocabDict)
function buildMeaningFromYoudao(youdao) {
  try {
    const explains = youdao?.explains;
    if (Array.isArray(explains) && explains.length) {
      return explains
        .map((s) => String(s).trim())
        .filter(Boolean)
        .join("\n");
    }
  } catch (e) {}
  return "";
}

function rebuildWordMap() {
  wordMap = Object.create(null);
  phraseKeys = [];
  (wordsCache || []).forEach(w => {
    if (!w || !w.word) return;
    const key = String(w.word).toLowerCase();
    wordMap[key] = w;
    if (/\s/.test(key)) phraseKeys.push(key);
  });
}

function getWordRecord(word) {
  if (!word) return null;
  return wordMap[String(word).toLowerCase()] || null;
}

// Try to apply highlights on the page based on current wordsCache.
// Note: we do NOT attempt to highlight inside inputs/contenteditable.
function applyHighlights() {
  if (__vb_disabledNow) return;
  try {
    // Ensure ::highlight styles exist; otherwise highlights may be invisible.
    try { ensureHighlightStyles(); } catch (e) {}

    if (!('CSS' in window) || !('highlights' in CSS)) return;

    // Clear existing highlights
    CSS.highlights.clear();

    // Build ranges for each status bucket
    const rangesStranger = [];
    const rangesLearning = [];
    const rangesMastered = [];
    const rangesNoted = [];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName ? p.tagName.toLowerCase() : '';
        if (tag === 'script' || tag === 'style' || tag === 'noscript') return NodeFilter.FILTER_REJECT;
        if (p.closest('input, textarea, [contenteditable="true"], #vb-root')) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const wordRegex = /[A-Za-z][A-Za-z\-']{1,}/g;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.nodeValue;
      const textLower = text.toLowerCase();
      let match;
      while ((match = wordRegex.exec(text)) !== null) {
        const raw = match[0];
        const key = raw.toLowerCase();
        const rec = getWordRecord(key);
        if (!rec) continue;

        const r = new Range();
        r.setStart(node, match.index);
        r.setEnd(node, match.index + raw.length);

        if (rec.note && String(rec.note).trim()) {
          rangesNoted.push(r);
        } else if (rec.status === 'stranger') {
          rangesStranger.push(r);
        } else if (rec.status === 'mastered') {
          rangesMastered.push(r);
        } else if (rec.status === 'learning') {
          rangesLearning.push(r);
        }
      }

      if (phraseKeys.length) {
        for (const phrase of phraseKeys) {
          let idx = 0;
          while ((idx = textLower.indexOf(phrase, idx)) !== -1) {
            const rec = getWordRecord(phrase);
            if (rec) {
              const r = new Range();
              r.setStart(node, idx);
              r.setEnd(node, idx + phrase.length);
              if (rec.note && String(rec.note).trim()) {
                rangesNoted.push(r);
              } else if (rec.status === 'stranger') {
                rangesStranger.push(r);
              } else if (rec.status === 'mastered') {
                rangesMastered.push(r);
              } else if (rec.status === 'learning') {
                rangesLearning.push(r);
              }
            }
            idx += phrase.length;
          }
        }
      }
    }

    if (rangesStranger.length) CSS.highlights.set('my-vocab-red', new Highlight(...rangesStranger));
    if (rangesLearning.length) CSS.highlights.set('my-vocab-yellow', new Highlight(...rangesLearning));
    if (rangesMastered.length) CSS.highlights.set('my-vocab-green', new Highlight(...rangesMastered));
    if (rangesNoted.length) CSS.highlights.set('my-vocab-purple', new Highlight(...rangesNoted));
  } catch (e) {
    // fail silently - highlighting is best-effort
  }
}

// Compatibility alias: earlier builds used applyHighlightsFromCache().
// Some codepaths still call it; keep it to avoid ReferenceError.
function applyHighlightsFromCache() {
  applyHighlights();
}

async function initStorageCache() {
  try {
    const db = await getDB([
      STORAGE_KEYS.vocabList,
      STORAGE_KEYS.yellowList,
      STORAGE_KEYS.greenList,
      STORAGE_KEYS.vocabNotes,
      STORAGE_KEYS.vocabDict,
      STORAGE_KEYS.blacklist_domain,
      STORAGE_KEYS.blacklist_page,
      STORAGE_KEYS.global_disable,
    ]);

    const schemaDb = {
      vocabList: db[STORAGE_KEYS.vocabList],
      yellowList: db[STORAGE_KEYS.yellowList],
      greenList: db[STORAGE_KEYS.greenList],
      vocabNotes: db[STORAGE_KEYS.vocabNotes],
      vocabDict: db[STORAGE_KEYS.vocabDict],
    };
    // Also cache disable flags for this page
    try {
      __vb_globalDisable = !!db[STORAGE_KEYS.global_disable];
      __vb_blacklistDomain = Array.isArray(db[STORAGE_KEYS.blacklist_domain]) ? db[STORAGE_KEYS.blacklist_domain].slice() : [];
      __vb_blacklistPage = Array.isArray(db[STORAGE_KEYS.blacklist_page]) ? db[STORAGE_KEYS.blacklist_page].slice() : [];
    } catch(e) {
      __vb_globalDisable = false;
      __vb_blacklistDomain = [];
      __vb_blacklistPage = [];
    }
    __vb_updateDisabledNow();


    wordsCache = rebuildWordsCacheFromDb(schemaDb);
    rebuildWordMap();
    applyHighlights();
  } catch (e) {
    wordsCache = [];
    rebuildWordMap();
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  const watched = [
    STORAGE_KEYS.vocabList,
    STORAGE_KEYS.yellowList,
    STORAGE_KEYS.greenList,
    STORAGE_KEYS.vocabNotes,
    STORAGE_KEYS.vocabDict,
    STORAGE_KEYS.blacklist_domain,
    STORAGE_KEYS.blacklist_page,
    STORAGE_KEYS.global_disable,
  ];

  if (watched.some((k) => Object.prototype.hasOwnProperty.call(changes, k))) {
    // 统一从 storage 重新构建缓存，保证 content-script 与管理页同一套 schema
    initStorageCache();
  }
});


(async function () { await initStorageCache(); })();


// ---------------- Popup UI ----------------
let resultBox = null;
let shadowRoot = null;
let boxState = null;

// Sync popup button active states with the latest word record.
function updateStatusButtons(word) {
  try {
    if (!shadowRoot) return;
    const actions = shadowRoot.getElementById('vb-actions');
    if (!actions) return;

    const key = normalizeWordKey(word || boxState?.word || '');
    if (!key) return;
    const rec = getWordRecord(key);
    if (!rec && !(boxState && normalizeWordKey(boxState.word) === key)) return;
    const activeStatus = (boxState && normalizeWordKey(boxState.word) === key)
      ? boxState.status
      : rec.status;
    const explicit = (boxState && normalizeWordKey(boxState.word) === key)
      ? !!boxState.statusExplicit
      : false;

    // Status buttons
    actions.querySelectorAll('button[data-act="status"]').forEach((btn) => {
      const isStranger = btn.dataset.status === 'stranger';
      const active = isStranger
        ? (activeStatus === 'stranger' && explicit)
        : (activeStatus === btn.dataset.status);
      btn.dataset.active = active ? '1' : '';
    });

    // Note button
    const noteBtn = actions.querySelector('button[data-act="note"]');
    if (noteBtn) {
      const hasNote = !!(rec.note && String(rec.note).trim());
      noteBtn.dataset.active = hasNote ? '1' : '';
    }
  } catch (e) {
    // Never block main flow
  }
}

function setBtnUI(btn, ui){
  try{
    if(!btn) return;
    btn.dataset.ui = ui || '';
    if(ui === 'disabled' || ui === 'loading') btn.disabled = true;
    else btn.disabled = false;
  }catch(e){}
}
function setGroupDisabled(disabled){
  try{
    if(!shadowRoot) return;
    shadowRoot.querySelectorAll('button.tagbtn, button.iconbtn').forEach(b=>{
      if(!(b instanceof HTMLButtonElement)) return;
      if(disabled){
        b.dataset.prevDisabled = b.disabled ? '1' : '';
        b.disabled = true;
        b.dataset.ui = b.dataset.ui || 'disabled';
      }else{
        const prev = b.dataset.prevDisabled === '1';
        b.disabled = prev;
        if(!prev && b.dataset.ui === 'disabled') b.dataset.ui = '';
        delete b.dataset.prevDisabled;
      }
    });
  }catch(e){}
}
async function runBtnAction(btn, fn){
  // pressed -> loading -> done
  try{
    if(btn){ btn.dataset.ui = 'pressed'; }
    await Promise.resolve(); // allow paint
    setGroupDisabled(true);
    if(btn) btn.dataset.ui = 'loading';
    const r = await fn();
    if(btn) btn.dataset.ui = 'done';
    setTimeout(()=>{ try{ if(btn && btn.dataset.ui==='done') btn.dataset.ui=''; }catch(e){} }, 700);
    return r;
  } finally {
    setTimeout(()=>setGroupDisabled(false), 0);
  }
}

let boxPinned = false;
let lastHoverWord = '';
let lastBoxRect = null;
let hoverTimer = null;

const VB_LINKS = [
  { key: 'deepl', label: 'DeepL', color: 'deepblue', href: (q, mode) => mode === 'translate'
      ? `https://www.deepl.com/translator#auto/zh/${encodeURIComponent(q)}`
      : `https://www.deepl.com/translator#en/zh/${encodeURIComponent(q)}` },
  { key: 'baidu', label: '百度', color: 'lightblue', href: (q, mode) => `https://fanyi.baidu.com/#auto/zh/${encodeURIComponent(q)}` },
  { key: 'caiyun', label: '彩云', color: 'cyan', href: (q) => `https://fanyi.caiyunapp.com/#/${encodeURIComponent(q)}` },
  { key: 'bing', label: 'Bing', color: 'sky', href: (q) => `https://www.bing.com/dict/search?q=${encodeURIComponent(q)}` },
  { key: 'youdao', label: '有道', color: 'green', href: (q) => `https://dict.youdao.com/result?word=${encodeURIComponent(q)}&lang=en` },
  { key: 'collins', label: 'Collins', color: 'red', href: (q) => `https://www.collinsdictionary.com/dictionary/english/${encodeURIComponent(q)}` },
  { key: 'cambridge', label: 'Cambridge', color: 'dark', href: (q) => `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(q)}` },
  { key: 'urban', label: 'Urban', color: 'black', href: (q) => `https://www.urbandictionary.com/define.php?term=${encodeURIComponent(q)}` },
  { key: 'vocabulary', label: 'Vocabulary', color: 'purple', href: (q) => `https://www.vocabulary.com/dictionary/${encodeURIComponent(q)}` },
  { key: 'google', label: 'Google', color: 'gray', href: (q, mode) => mode === 'translate'
      ? `https://translate.google.com/?sl=auto&tl=zh-CN&text=${encodeURIComponent(q)}&op=translate`
      : `https://www.google.com/search?q=${encodeURIComponent(q + ' definition')}` }
];

function ensureResultBox() {
  if (resultBox) return;
  resultBox = document.createElement('div');
  resultBox.id = 'trans-result-box';
  resultBox.style.position = 'fixed';
  resultBox.style.zIndex = '2147483647';
  resultBox.style.display = 'none';
  resultBox.style.left = '20px';
  resultBox.style.top = '20px';
  resultBox.style.maxWidth = '380px';

  shadowRoot = resultBox.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host{
      all: initial;
      --vb-brand-1:#7c3aed;
      --vb-brand-2:#a855f7;
      --vb-brand-grad:linear-gradient(135deg,var(--vb-brand-1) 0%,var(--vb-brand-2) 100%);

      --vb-success-bg:rgba(34,197,94,.14);
      --vb-success-bd:rgba(34,197,94,.28);
      --vb-success-fg:#166534;

      --vb-warning-bg:rgba(245,158,11,.16);
      --vb-warning-bd:rgba(245,158,11,.30);
      --vb-warning-fg:#92400e;

      --vb-danger-bg:rgba(239,68,68,.14);
      --vb-danger-bd:rgba(239,68,68,.28);
      --vb-danger-fg:#991b1b;

      --vb-surface:#fff;
      --vb-surface-2:rgba(248,250,252,.92);
      --vb-surface-elev:#fff;
      --vb-text:#0f172a;
      --vb-muted:rgba(15,23,42,.62);
      --vb-border:rgba(15,23,42,.10);
      --vb-border-2:rgba(15,23,42,.14);
      --vb-soft-bg:rgba(15,23,42,.05);
      --vb-soft-bg-2:rgba(15,23,42,.04);
      --vb-top-bg:linear-gradient(180deg, rgba(79,70,229,.10), rgba(255,255,255,0));
      --vb-input-bg:#fff;
      --vb-notechip-bg:rgba(124,58,237,.10);
      --vb-notechip-bd:rgba(124,58,237,.22);
      --vb-notechip-fg:#4c1d95;
      --vb-note-head-bg:rgba(124,58,237,.10);
      --vb-note-head-fg:#4c1d95;
      --vb-overlay-bg:rgba(0,0,0,.18);

      --vb-r-card:16px;
      --vb-r-btn:10px;
      --vb-r-input:12px;
      --vb-r-pill:999px;

      --vb-shadow-md:0 6px 20px rgba(0,0,0,0.08);

      --vb-fs-h1:22px;
      --vb-fs-h2:18px;
      --vb-fs-body:14px;
      --vb-fs-cap:12px;

      --vb-card-pad:24px;
    }

    .vb.vb-dark{
      --vb-brand-1:#7c3aed;
      --vb-brand-2:#a855f7;
      --vb-brand-grad:linear-gradient(135deg,var(--vb-brand-1) 0%,var(--vb-brand-2) 100%);

      --vb-success-bg:rgba(34,197,94,.20);
      --vb-success-bd:rgba(74,222,128,.38);
      --vb-success-fg:#bbf7d0;

      --vb-warning-bg:rgba(245,158,11,.22);
      --vb-warning-bd:rgba(251,191,36,.42);
      --vb-warning-fg:#fde68a;

      --vb-danger-bg:rgba(239,68,68,.20);
      --vb-danger-bd:rgba(248,113,113,.40);
      --vb-danger-fg:#fecaca;

      --vb-surface:rgba(12,14,30,.92);
      --vb-surface-2:rgba(10,12,26,.86);
      --vb-surface-elev:rgba(16,18,36,.92);
      --vb-text:#eef2ff;
      --vb-muted:rgba(226,232,240,.68);
      --vb-border:rgba(148,163,184,.18);
      --vb-border-2:rgba(148,163,184,.26);
      --vb-soft-bg:rgba(255,255,255,.06);
      --vb-soft-bg-2:rgba(255,255,255,.04);
      --vb-top-bg:linear-gradient(180deg, rgba(124,58,237,.22), rgba(12,14,30,0));
      --vb-input-bg:rgba(10,12,26,.86);
      --vb-notechip-bg:rgba(124,58,237,.24);
      --vb-notechip-bd:rgba(167,139,250,.44);
      --vb-notechip-fg:#efe5ff;
      --vb-note-head-bg:rgba(124,58,237,.24);
      --vb-note-head-fg:#efe5ff;
      --vb-overlay-bg:rgba(9,6,18,.58);

      --vb-shadow-md:0 16px 34px rgba(0,0,0,.46);
    }

    .vb{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;
      font-size:var(--vb-fs-body);
      color:var(--vb-text);
    }

    .card{
      width:360px;
      max-width:90vw;
      background:var(--vb-surface);
      border:1px solid var(--vb-border);
      border-radius:var(--vb-r-card);
      box-shadow:var(--vb-shadow-md);
      overflow:hidden;
    }

    .top{
      padding:18px var(--vb-card-pad) 12px;
      display:flex;
      gap:12px;
      align-items:flex-start;
      background:var(--vb-top-bg);
    }

    .title{ flex:1; min-width:0; }
    .headrow{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }

    .word{
      font-size:var(--vb-fs-h1);
      font-weight:900;
      line-height:1.2;
      word-break:break-word;
    }

    .meta{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
    .phonetic{ font-size:var(--vb-fs-cap); color:var(--vb-muted); }

    .iconbtn{
      border:1px solid var(--vb-border);
      background:var(--vb-soft-bg);
      border-radius:var(--vb-r-btn);
      padding:6px 10px;
      cursor:pointer;
      font-size:var(--vb-fs-cap);
      line-height:1;
      display:inline-flex;
      align-items:center;
      gap:8px;
    }
    .iconbtn:hover{ filter:brightness(.99); }

    .flag{ display:inline-block; width:18px; height:12px; border-radius:2px; box-shadow:0 0 0 1px rgba(0,0,0,.12); background-size:cover; background-position:center; }
    .flag-us{ background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 12'><rect width='18' height='12' fill='%23b91c1c'/><rect y='1' width='18' height='1' fill='%23ffffff'/><rect y='3' width='18' height='1' fill='%23ffffff'/><rect y='5' width='18' height='1' fill='%23ffffff'/><rect y='7' width='18' height='1' fill='%23ffffff'/><rect y='9' width='18' height='1' fill='%23ffffff'/><rect y='11' width='18' height='1' fill='%23ffffff'/><rect width='7' height='7' fill='%231e3a8a'/></svg>"); }
    .flag-uk{ background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 12'><rect width='18' height='12' fill='%231e3a8a'/><path d='M0 0 L18 12 M18 0 L0 12' stroke='%23ffffff' stroke-width='2'/><path d='M0 0 L18 12 M18 0 L0 12' stroke='%23b91c1c' stroke-width='1'/><rect x='7' width='4' height='12' fill='%23ffffff'/><rect y='4' width='18' height='4' fill='%23ffffff'/><rect x='7.6' width='2.8' height='12' fill='%23b91c1c'/><rect y='4.6' width='18' height='2.8' fill='%23b91c1c'/></svg>"); }

    .xbtn{ border:none; background:transparent; cursor:pointer; font-size:16px; line-height:1; padding:4px 6px; color:var(--vb-muted); }
    .xbtn:hover{ color:var(--vb-text); }

    .notechip{
      margin:4px var(--vb-card-pad) 0;
      padding:12px 14px;
      background:var(--vb-notechip-bg);
      border:1px solid var(--vb-notechip-bd);
      border-radius:var(--vb-r-card);
      color:var(--vb-notechip-fg);
      font-size:var(--vb-fs-body);
      white-space:pre-wrap;
    }

    .actions{
      padding:8px var(--vb-card-pad);
      display:flex;
      gap:8px;
      align-items:center;
      flex-wrap:wrap;
    }

    .tagbtn{
      position:relative;
      border:1px solid var(--vb-border);
      background:var(--vb-soft-bg);
      border-radius:var(--vb-r-btn);
      padding:10px 12px;
      cursor:pointer;
      font-size:var(--vb-fs-body);
      font-weight:800;
      transition:transform .06s ease, box-shadow .12s ease, border-color .12s ease, filter .12s ease;
      color:var(--vb-text);
    }
    .tagbtn:hover{ filter:brightness(.99); }
    .tagbtn:active{ transform:translateY(1px); }

    /* --- Button UI state machine (pressed/loading/done/disabled) --- */
    .tagbtn[data-ui="pressed"]{ transform:translateY(1px); box-shadow:0 0 0 2px rgba(0,0,0,.08) inset; }
    .tagbtn[data-ui="loading"]{ opacity:.65; cursor:wait; }
    .tagbtn[data-ui="loading"]::before{ content:"…"; position:absolute; left:10px; top:8px; font-size:12px; color:rgba(0,0,0,.55); }
    .tagbtn[data-ui="done"]{ border-color:rgba(0,0,0,.42); }
    .tagbtn[data-ui="disabled"], .tagbtn:disabled{ opacity:.45; cursor:not-allowed; }

    .tagbtn[data-active="1"]{ border-color:rgba(0,0,0,.35); box-shadow:0 0 0 2px rgba(0,0,0,.10) inset; }

    /* Status tags (pill chips) */
    .tag-red,.tag-yellow,.tag-green,.tag-purple{
      border-radius:var(--vb-r-pill);
      padding:6px 10px;
      font-size:var(--vb-fs-cap);
      font-weight:900;
      background:#fff;
    }
    .tag-red{ background:var(--vb-danger-bg); border-color:var(--vb-danger-bd); color:var(--vb-danger-fg); }
    .tag-yellow{ background:var(--vb-warning-bg); border-color:var(--vb-warning-bd); color:var(--vb-warning-fg); }
    .tag-green{ background:var(--vb-success-bg); border-color:var(--vb-success-bd); color:var(--vb-success-fg); }
    .tag-purple{ background:rgba(124,58,237,.14); border-color:rgba(124,58,237,.28); color:#5b21b6; }

    .tag-red[data-active="1"]{
      background:#dc2626;
      border-color:#b91c1c;
      color:#fff;
    }
    .tag-yellow[data-active="1"]{
      background:#d97706;
      border-color:#b45309;
      color:#fff;
    }
    .tag-green[data-active="1"]{
      background:#16a34a;
      border-color:#15803d;
      color:#fff;
    }
    .tag-purple[data-active="1"]{
      background:#6d28d9;
      border-color:#5b21b6;
      color:#fff;
    }

    .tag-fav{ border-radius:var(--vb-r-pill); padding:6px 10px; font-size:var(--vb-fs-cap); font-weight:900; background:rgba(124,58,237,.14); border-color:rgba(124,58,237,.28); color:#5b21b6; }
    .tag-fav[data-active="1"]{ background:var(--vb-brand-grad); border-color:rgba(255,255,255,.35); color:#fff; }
    .tag-export{
      border-radius:var(--vb-r-pill);
      padding:6px 12px;
      font-size:var(--vb-fs-cap);
      font-weight:900;
      background:var(--vb-brand-grad);
      border-color:rgba(255,255,255,.4);
      color:#fff;
      box-shadow:var(--vb-shadow-md);
    }

    /* Delete button */
    .tag-trash{
      margin-left:auto;
      background:var(--vb-danger-bg);
      border-color:var(--vb-danger-bd);
      color:var(--vb-danger-fg);
      width:42px;
      min-width:42px;
      height:34px;
      padding:0;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      font-size:14px;
    }

    /* Primary button helper (used for note save) */
    .tagbtn.primary{ border:0; background:var(--vb-brand-grad); color:#fff; box-shadow:var(--vb-shadow-md); }

    .content{ padding:10px var(--vb-card-pad) 14px; display:flex; flex-direction:column; gap:12px; }

    .section{ border:1px solid var(--vb-border); border-radius:var(--vb-r-card); overflow:hidden; background:var(--vb-surface-elev); }
    .sec-h{ padding:10px 12px; font-size:var(--vb-fs-cap); font-weight:900; background:var(--vb-soft-bg-2); display:flex; align-items:center; justify-content:space-between; }
    .sec-b{ padding:12px; font-size:var(--vb-fs-body); line-height:1.55; }
    .sec-b ul{ margin:0; padding-left:18px; }
    .muted{ color:var(--vb-muted); }

    .links{ padding:14px var(--vb-card-pad) 18px; display:flex; flex-wrap:wrap; gap:10px; position:relative; }
    .lbtn{ text-decoration:none; font-size:var(--vb-fs-cap); padding:8px 10px; border-radius:var(--vb-r-pill); display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--vb-border); background:var(--vb-soft-bg); color:var(--vb-text); cursor:pointer; }
    button.lbtn{ -webkit-appearance:none; appearance:none; }
    .lbtn:hover{ filter:brightness(.99); }

    /* neutralize legacy engine color classes to keep a single palette */
    .c-deepblue,.c-lightblue,.c-cyan,.c-sky,.c-green,.c-red,.c-dark,.c-black,.c-purple,.c-gray{ background:var(--vb-soft-bg); color:var(--vb-text); border-color:var(--vb-border); }

    .morePanel{
      display:none;
      flex-wrap:wrap;
      gap:10px;
      flex-basis:100%;
      margin-top:2px;
    }
    .morePanel[data-open="1"]{ display:flex; }

    .overlay{ position:absolute; inset:0; background:var(--vb-overlay-bg); display:none; align-items:center; justify-content:center; padding:16px; }
    .overlay[data-show="1"]{ display:flex; }

    .note-modal{ width: 340px; max-width: 90vw; background:var(--vb-surface-elev); border-radius:var(--vb-r-card); border:1px solid var(--vb-notechip-bd); overflow:hidden; box-shadow:var(--vb-shadow-md); }
    .note-h{ padding:14px 16px; background:var(--vb-note-head-bg); display:flex; align-items:center; justify-content:space-between; font-weight:900; color:var(--vb-note-head-fg); }
    .note-b{ padding:14px 16px; }
    .note-b textarea{ width:100%; box-sizing:border-box; min-height:86px; resize:vertical; padding:10px 12px; border-radius:var(--vb-r-input); border:1px solid var(--vb-border); background:var(--vb-input-bg); color:var(--vb-text); font-size:var(--vb-fs-body); font-family:inherit; }
    .note-f{ padding:14px 16px; display:flex; justify-content:flex-end; gap:10px; }

    .vb.vb-dark .card{
      border-color:rgba(181,150,255,.38);
      box-shadow:0 22px 48px rgba(6,2,18,.62);
    }
    .vb.vb-dark .tagbtn{
      border-color:rgba(181,150,255,.42);
      background:rgba(255,255,255,.08);
      color:#f3ecff;
    }
    .vb.vb-dark .tag-red{
      background:rgba(239,68,68,.24);
      border-color:rgba(248,113,113,.50);
      color:#fecaca;
    }
    .vb.vb-dark .tag-yellow{
      background:rgba(245,158,11,.24);
      border-color:rgba(251,191,36,.52);
      color:#fde68a;
    }
    .vb.vb-dark .tag-green{
      background:rgba(34,197,94,.22);
      border-color:rgba(74,222,128,.48);
      color:#bbf7d0;
    }
    .vb.vb-dark .tag-purple,
    .vb.vb-dark .tag-fav{
      background:rgba(124,58,237,.30);
      border-color:rgba(167,139,250,.62);
      color:#efe5ff;
    }
    .vb.vb-dark .tag-purple{
      background:linear-gradient(135deg,rgba(124,58,237,.42),rgba(109,40,217,.34));
      border-color:rgba(196,181,253,.78);
      color:#ffffff;
      text-shadow:0 1px 0 rgba(0,0,0,.25);
      box-shadow:0 0 0 1px rgba(196,181,253,.22) inset;
    }
    .vb.vb-dark .tag-purple:hover{
      filter:brightness(1.06);
    }
    .vb.vb-dark .tag-purple[data-active="1"]{
      background:linear-gradient(135deg,#8b5cf6,#7c3aed);
      border-color:rgba(216,180,255,.86);
      color:#ffffff;
    }
    .vb.vb-dark .tag-red[data-active="1"]{
      background:#dc2626;
      border-color:#f87171;
      color:#fff;
    }
    .vb.vb-dark .tag-yellow[data-active="1"]{
      background:#d97706;
      border-color:#fbbf24;
      color:#fff;
    }
    .vb.vb-dark .tag-green[data-active="1"]{
      background:#16a34a;
      border-color:#4ade80;
      color:#fff;
    }
    .vb.vb-dark .tag-fav[data-active="1"]{
      border-color:rgba(216,180,255,.72);
      color:#fff;
    }
    .vb.vb-dark .section{
      border-color:rgba(181,150,255,.36);
      background:rgba(40,30,68,.84);
    }
    .vb.vb-dark .sec-h{
      background:rgba(255,255,255,.08);
      color:#efe5ff;
    }
    .vb.vb-dark .lbtn{
      border-color:rgba(181,150,255,.44);
      background:rgba(255,255,255,.09);
      color:#f3ecff;
    }
    .vb.vb-dark .xbtn{
      color:rgba(232,220,255,.8);
    }
    .vb.vb-dark .xbtn:hover{
      color:#ffffff;
    }
  `;

  shadowRoot.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'vb';
  wrapper.innerHTML = `
    <div class="card" role="dialog" aria-label="HORD English Companion">
      <div class="top">
        <div class="title">
          <div class="headrow">
            <div class="word" id="vb-title"></div>
            <div class="meta" id="vb-meta"></div>
          </div>
        </div>
        <button class="xbtn" id="vb-close" title="关闭">✕</button>
      </div>

      <div class="actions" id="vb-actions"></div>
      <div class="notechip" id="vb-notechip" style="display:none"></div>

      <div class="content" id="vb-content"></div>

      <div class="links" id="vb-links"></div>

      <div class="overlay" id="vb-note-overlay">
        <div class="note-modal">
          <div class="note-h">
            <div>批注</div>
            <button class="xbtn" id="vb-note-cancel" title="关闭">✕</button>
          </div>
          <div class="note-b">
            <textarea id="vb-note-text" placeholder="在此输入批注…"></textarea>
          </div>
          <div class="note-f">
            <button class="tagbtn primary" id="vb-note-save">保存批注</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const resolveThemeMode = (db) => {
    if(db && (db.themeMode === 'auto' || db.themeMode === 'light' || db.themeMode === 'dark')) return db.themeMode;
    const autoMode = db?.theme_auto_mode !== false;
    const manualDark = db?.theme_dark_mode != null ? !!db.theme_dark_mode : !!db?.popup_force_dark;
    if(autoMode) return 'auto';
    return manualDark ? 'dark' : 'light';
  };

  const applyNightMode = async () => {
    let mode = 'auto';
    try{
      const db = await chrome.storage.local.get(['themeMode','theme_auto_mode','theme_dark_mode','popup_force_dark']);
      mode = resolveThemeMode(db);
    }catch(_){/* ignore */}
    const byClass =
      document.documentElement.classList.contains('dark') ||
      document.body?.classList?.contains('dark');
    const byMedia = !!window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    const isDark = mode === 'dark' || (mode === 'auto' && (byClass || byMedia));
    wrapper.classList.toggle('vb-dark', isDark);
  };
  void applyNightMode();
  try{
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if(mq?.addEventListener) mq.addEventListener('change', ()=>void applyNightMode());
    else if(mq?.addListener) mq.addListener(()=>void applyNightMode());
    chrome.storage?.onChanged?.addListener((changes, area)=>{
      if(area !== 'local') return;
      if(!changes.themeMode && !changes.theme_auto_mode && !changes.theme_dark_mode && !changes.popup_force_dark) return;
      void applyNightMode();
    });
    chrome.runtime?.onMessage?.addListener((msg)=>{
      if(msg && msg.type === 'THEME_UPDATED') void applyNightMode();
    });
  }catch(_){/* ignore */}

  shadowRoot.appendChild(wrapper);
  document.body.appendChild(resultBox);

  // Prevent selection/drag within popup from triggering selection listeners
  resultBox.addEventListener('mousedown', (e) => { e.stopPropagation(); }, true);
  resultBox.addEventListener('mouseup', (e) => { e.stopPropagation(); }, true);
  resultBox.addEventListener('dblclick', (e) => { e.stopPropagation(); }, true);

  // Pin while hovering
  resultBox.addEventListener('mouseenter', () => { boxPinned = true; }, true);
  resultBox.addEventListener('mouseleave', () => { boxPinned = false; }, true);

  // Buttons
  shadowRoot.getElementById('vb-close').addEventListener('click', () => closeBox());
  shadowRoot.getElementById('vb-note-cancel').addEventListener('click', () => toggleNoteOverlay(false));
  shadowRoot.getElementById('vb-note-save').addEventListener('click', () => onSaveNote());
  shadowRoot.getElementById('vb-note-text').addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSaveNote();
    }
  });

  // Delegate clicks
  shadowRoot.addEventListener('click', async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const act = t.dataset && t.dataset.act;
    if (!act) return;
    if (act === 'speaker') {
      const word = t.dataset.word || (boxState && boxState.word) || '';
      const accent = t.dataset.accent || 'us';
      playPronunciation(word, accent);
    }
    if (act === 'status') {
      const status = t.dataset.status;
      // 保存状态时同时保存释义（取当前弹窗中已加载的有道解释）
      const meaning =
        buildMeaningFromYoudao(boxState?.youdao) ||
        (boxState?.meaning ? String(boxState.meaning) : '');
      // optimistic UI: single click shows active state immediately
      if (boxState) {
        boxState.status = status;
        boxState.statusExplicit = true;
      }
      updateStatusButtons(boxState?.word);
      await runBtnAction(t, async ()=> {
        let enMeaning = Array.isArray(boxState?.enMeaning) ? boxState.enMeaning : [];
        if(!enMeaning.length && boxState?.word){
          try{
            enMeaning = await fetchEnglishMeaning(boxState.word);
            boxState.enMeaning = enMeaning;
          }catch(e){}
        }
        const sourceUrl = location.href || '';
        const sourceTitle = (document.title || '').trim();
        await setWordStatus(boxState.word, status, { meaning, enMeaning, sourceUrl, sourceTitle });
        updateStatusButtons(boxState.word);
      });
    }
    if (act === 'note') {
      await runBtnAction(t, async ()=> {
        toggleNoteOverlay(true);
      });
    }
    if (act === 'favorite') {
      await runBtnAction(t, async ()=> {
        toggleFavoriteQuote();
      });
    }
    if (act === 'export-card') {
      await runBtnAction(t, async ()=> {
        await openManagerQuoteExporter();
      });
    }
  });
}

function toggleNoteOverlay(show) {
  if (!shadowRoot) return;
  const ov = shadowRoot.getElementById('vb-note-overlay');
  if (!ov) return;
  ov.dataset.show = show ? '1' : '0';
  if (show) {
    const ta = shadowRoot.getElementById('vb-note-text');
    ta.value = (boxState && boxState.note) ? boxState.note : '';
    setTimeout(() => ta.focus(), 0);
  }
}

function closeBox() {
  if (!resultBox) return;
  resultBox.style.display = 'none';
  boxState = null;
  boxPinned = false;
  lastHoverWord = '';
  lastBoxRect = null;
}

function positionBox(rectLike) {
  if (!resultBox) return;
  const padding = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // 使用实际渲染尺寸，避免靠边时弹窗被截断
  const boxRect = resultBox.getBoundingClientRect();
  const bxw = Math.max(260, Math.ceil(boxRect.width || 360));
  const bxh = Math.max(200, Math.ceil(boxRect.height || 240));

  const left = rectLike.left || 20;
  const right = rectLike.right || left;
  const top = rectLike.top || 20;
  const bottom = rectLike.bottom || top;

  let x = Math.min(left + padding, vw - bxw - padding);
  if (x < padding) x = Math.max(padding, Math.min(right - bxw - padding, vw - bxw - padding));

  let y = Math.min(bottom + padding, vh - bxh - padding);
  if (y < padding) y = Math.max(padding, Math.min(top - bxh - padding, vh - bxh - padding));
  x = Math.max(padding, x);
  y = Math.max(padding, y);

  resultBox.style.left = `${x}px`;
  resultBox.style.top = `${y}px`;
}

function isProbablyEnglishWord(text) {
  if (!text) return false;
  const t = text.trim();
  if (t.length > 40) return false;
  if (/\s/.test(t)) return false;
  if (!/^[A-Za-z][A-Za-z\-']*$/.test(t)) return false;
  return true;
}

function isShortEnglishPhrase(text) {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 2 || t.length > 60) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > MAX_PHRASE_WORDS) return false;
  // Each token should mostly look like a word (allow apostrophe and hyphen)
  for (const p of parts) {
    if (!/^[A-Za-z][A-Za-z'\-]*$/.test(p)) return false;
  }
  return true;
}

function normalizePhraseForWordMode(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  let s = raw
    .replace(/[\u2018\u2019\u201C\u201D"`]/g, '')
    .replace(/[.,!?;:()[\]{}\\/|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  // If non-latin scripts appear, do not force phrase mode.
  if (/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF\u0600-\u06FF\u0900-\u097F]/.test(s)) return '';
  return s;
}

function isSimpleEnglishPhraseForWordMode(text) {
  const s = normalizePhraseForWordMode(text);
  if (!s) return false;
  if (isProbablyEnglishWord(s)) return true;
  if (isShortEnglishPhrase(s)) return true;
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > MAX_PHRASE_WORDS) return false;
  for (const p of parts) {
    if (!/^[A-Za-z][A-Za-z'\-]*$/.test(p)) return false;
  }
  return true;
}

function parseYoudao(html) {
  if (!html) return null;

  // Youdao sometimes returns a large SPA/JS payload (e.g. window.__NUXT__) when there is no clean result.
  // Never fall back to dumping whole-page text into explains — it creates garbage meanings.
  const raw = String(html);
  const looksLikeSpaPayload = /window\.__NUXT__|id="__NUXT__"|Youdao\s+Ads|京ICP|serverRendered/i.test(raw);

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // phonetic: try multiple patterns
  let phonetic = '';
  const ph = doc.querySelector('.phonetic, .pronounce');
  if (ph) phonetic = (ph.textContent || '').trim();

  const explains = [];
  const li1 = doc.querySelectorAll('#phrsListTab .trans-container ul li');
  li1.forEach(li => {
    const s = (li.textContent || '').trim();
    if (s) explains.push(s);
  });
  if (!explains.length) {
    const li2 = doc.querySelectorAll('.basic .word-exp, .basic ul li');
    li2.forEach(li => {
      const s = (li.textContent || '').trim();
      if (s) explains.push(s);
    });
  }

  // If still empty, do NOT fall back to body text for SPA payloads.
  if (!explains.length && looksLikeSpaPayload) {
    return { phonetic, explains: [] };
  }

  // Conservative fallback for older Youdao pages: only accept short, human-readable lines.
  if (!explains.length) {
    const c = doc.querySelector('#phrsListTab') || doc.querySelector('.wordbook-js') || doc.querySelector('body');
    const txt = c ? (c.textContent || '').trim() : '';
    if (txt) {
      const lines = txt
        .split(/\n+/)
        .map(x => x.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .filter(x => x.length <= 120)
        .filter(x => !/window\.__NUXT__|京ICP|Youdao\s+Ads|serverRendered/i.test(x));
      lines.slice(0, 6).forEach(s => explains.push(s));
    }
  }

  return { phonetic, explains };
}

function parseBing(html) {
  if (!html) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const explains = [];
  const lis = doc.querySelectorAll('.qdef ul li, .def ul li, .qdef .se_li, .qdef .def');
  lis.forEach(li => {
    const s = (li.textContent || '').replace(/\s+/g, ' ').trim();
    if (s && s.length < 220) explains.push(s);
  });

  return explains.length ? { explains } : null;
}

const __vbEnMeaningCache = new Map();
async function fetchEnglishMeaning(word) {
  const w = String(word || '').trim().toLowerCase();
  if (!w) return [];
  if (__vbEnMeaningCache.has(w)) return __vbEnMeaningCache.get(w);
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return [];
    const defs = [];
    for (const entry of data) {
      const meanings = entry.meanings || [];
      for (const m of meanings) {
        const d = m?.definitions?.[0]?.definition;
        if (d) defs.push(String(d).trim());
        if (defs.length >= 6) break;
      }
      if (defs.length >= 6) break;
    }
    const out = defs.filter(Boolean);
    __vbEnMeaningCache.set(w, out);
    return out;
  } catch (_) {
    return [];
  }
}

function playPronunciation(word, accent = 'us') {
  const w = (word || '').trim();
  if (!w) return;
  // youdao dictvoice: type=0(US) type=1(UK)
  const type = accent === 'uk' ? 1 : 0;
  const url = `https://dict.youdao.com/dictvoice?type=${type}&audio=${encodeURIComponent(w)}`;
  try {
    const a = new Audio(url);
    a.play();
  } catch (_) {
    // ignore
  }
}


async function getCurrentWordRecord(word) {
  const key = normalizeWordKey(word);
  if (!key) return null;
  // wordMap 基于 vocabList/yellowList/greenList/vocabNotes/vocabDict 构建
  return wordMap[key] || null;
}



async function setWordStatus(word, nextStatus, extra) {
  // nextStatus: STATUS.YELLOW | STATUS.GREEN | STATUS.NONE (plus legacy: "new"|"learning"|"mastered"|"clear")
  const rawWord = (word || "").trim();
  if (!rawWord) return;

  const key = normalizeWordKey(rawWord);

  // Normalize status values to internal labels
  let status = nextStatus;
  // Backward-compat: UI or old builds may pass legacy strings like "none"
  if (typeof status === "string") {
    const s = status.toLowerCase();
    if (s === "none") status = "clear";
  }
  if (status === STATUS.GREEN) status = "mastered";
  else if (status === STATUS.YELLOW) status = "learning";
  else if (status === STATUS.NONE) status = "clear";
  else if (status === STATUS.RED) status = "new";

  const ex = extra && typeof extra === "object" ? extra : {};

  // Load current DB (root keys, same as manager.js)
  const db = await getDB([
    STORAGE_KEYS.vocabList,
    STORAGE_KEYS.yellowList,
    STORAGE_KEYS.greenList,
    STORAGE_KEYS.vocabDict,
    STORAGE_KEYS.vocabNotes,
    STORAGE_KEYS.vocabMeta,
    STORAGE_KEYS.vocabEn,
    STORAGE_KEYS.vocabPhonetics,
    STORAGE_KEYS.vocabAudio
  ]);

  const vocabList = Array.isArray(db.vocabList) ? [...db.vocabList] : [];
  const yellowList = Array.isArray(db.yellowList) ? [...db.yellowList] : [];
  const greenList = Array.isArray(db.greenList) ? [...db.greenList] : [];
  const vocabDict = db.vocabDict && typeof db.vocabDict === "object" ? { ...db.vocabDict } : {};
  const vocabNotes = db.vocabNotes && typeof db.vocabNotes === "object" ? { ...db.vocabNotes } : {};
  const vocabMeta = db.vocabMeta && typeof db.vocabMeta === "object" ? { ...db.vocabMeta } : {};
  const vocabPhonetics = db.vocabPhonetics && typeof db.vocabPhonetics === "object" ? { ...db.vocabPhonetics } : {};
  const vocabAudio = db.vocabAudio && typeof db.vocabAudio === "object" ? { ...db.vocabAudio } : {};
  const vocabEn = db.vocabEn && typeof db.vocabEn === "object" ? { ...db.vocabEn } : {};

  const hasInList = (arr, k) => arr.some((x) => normalizeWordKey(x) === k);
  const removeFromList = (arr, k) => arr.filter((x) => normalizeWordKey(x) !== k);
  const addToList = (arr, raw) => (hasInList(arr, key) ? arr : [...arr, raw]);

  // Ensure vocabList contains the word if we keep it
  const hasMeaning = typeof ex.meaning === "string" && ex.meaning.trim();
  const hasNote = typeof ex.note === "string" && ex.note.trim();
  const shouldKeep = status !== "clear" || hasMeaning || hasNote;

  let nextVocabList = vocabList;
  if (shouldKeep && !hasInList(vocabList, key)) nextVocabList = [...vocabList, rawWord];

  // Update status lists (manager understands yellowList/greenList)
  let nextYellow = yellowList;
  let nextGreen = greenList;

  if (status === "mastered") {
    nextGreen = addToList(greenList, rawWord);
    nextYellow = removeFromList(yellowList, key);
  } else if (status === "learning") {
    nextYellow = addToList(yellowList, rawWord);
    nextGreen = removeFromList(greenList, key);
  } else if (status === "new") {
    // "陌生/红色"：保留单词，但不在 yellow/green 列表里
    nextYellow = removeFromList(yellowList, key);
    nextGreen = removeFromList(greenList, key);
  } else if (status === "clear") {
    nextYellow = removeFromList(yellowList, key);
    nextGreen = removeFromList(greenList, key);
  }

  // Save meaning / note if provided
  if (hasMeaning) vocabDict[key] = ex.meaning.trim();

  if (typeof ex.note === "string") {
    const n = ex.note.trim();
    if (n) vocabNotes[key] = n;
    else delete vocabNotes[key];
  }

  // Meta record (optional)
  const nowTs = Date.now();
  vocabMeta[key] = {
    ...(vocabMeta[key] || {}),
    status,
    createdAt: vocabMeta[key]?.createdAt || nowTs,
    updatedAt: nowTs,
    sourceUrl: ex.sourceUrl || vocabMeta[key]?.sourceUrl || '',
    sourceTitle: ex.sourceTitle || vocabMeta[key]?.sourceTitle || ''
  };

  if (Array.isArray(ex.enMeaning) && ex.enMeaning.length) {
    vocabEn[key] = ex.enMeaning.slice(0, 6);
  }

  // If clearing, make it equivalent to "delete word" in manager:
  // remove from vocabList + status lists + all vocab* dicts
  if (status === "clear") {
    nextVocabList = removeFromList(nextVocabList, key);
    delete vocabDict[key];
    delete vocabNotes[key];
    delete vocabMeta[key];
    delete vocabPhonetics[key];
    delete vocabAudio[key];
    delete vocabEn[key];
  }

  await setDB({
    [STORAGE_KEYS.vocabList]: nextVocabList,
    [STORAGE_KEYS.yellowList]: nextYellow,
    [STORAGE_KEYS.greenList]: nextGreen,
    [STORAGE_KEYS.vocabDict]: vocabDict,
    [STORAGE_KEYS.vocabNotes]: vocabNotes,
    [STORAGE_KEYS.vocabMeta]: vocabMeta,
    [STORAGE_KEYS.vocabEn]: vocabEn,
    [STORAGE_KEYS.vocabPhonetics]: vocabPhonetics,
    [STORAGE_KEYS.vocabAudio]: vocabAudio
  });

  // Best-effort sync to background packed DB to avoid “marked but not visible”
  // issues when only root keys are updated.
  try {
    if (chrome?.runtime?.sendMessage) {
      if (status === "clear") {
        chrome.runtime.sendMessage({ type: "OP_DELETE_WORDS", words: [key] }).catch?.(()=>{});
      } else {
        const statusForMgr =
          status === "mastered" ? "green" :
          status === "learning" ? "yellow" :
          "red";
        const em = Array.isArray(vocabEn[key]) ? vocabEn[key] : (vocabEn[key] ? [vocabEn[key]] : []);
        chrome.runtime.sendMessage({
          type: "OP_UPSERT_BULK",
          payload: {
            words: [{
              word: key,
              meaning: vocabDict[key] || '',
              englishMeaning: em,
              note: vocabNotes[key] || '',
              status: statusForMgr,
              reviewCount: vocabMeta[key]?.reviewCount ?? 0,
              sourceUrl: vocabMeta[key]?.sourceUrl || '',
              sourceLabel: vocabMeta[key]?.sourceLabel || vocabMeta[key]?.sourceTitle || '',
              createdAt: vocabMeta[key]?.createdAt ?? nowTs,
              updatedAt: nowTs
            }],
            sentences: []
          }
        }).catch?.(()=>{});
      }
    }
  } catch (e) {}

  // Refresh caches + highlights
  const mergedDb = {
    ...db,
    vocabList: nextVocabList,
    yellowList: nextYellow,
    greenList: nextGreen,
    vocabDict,
    vocabNotes,
    vocabMeta
  };
  rebuildWordsCacheFromDb(mergedDb);
  rebuildWordMap();
  applyHighlightsFromCache();

  // Update popup buttons if needed
  if (boxState && boxState.word && normalizeWordKey(boxState.word) === key) {
    boxState.status = nextStatus; // keep original value for UI
    updateStatusButtons();
  }
}


async function onSaveNote() {
  if (!boxState) return;

  const ta = shadowRoot.getElementById('vb-note-text');
  const note = (ta?.value || '').trim();

  // Word/phrase note
  if (boxState.mode === 'word') {
    if (!boxState.word) return;
    const w = boxState.word.toLowerCase().trim();
    if (!w) return;

    const d = await getDB([
      STORAGE_KEYS.vocabList,
      STORAGE_KEYS.vocabNotes
    ]);
    let list = Array.isArray(d.vocabList) ? d.vocabList : [];
    const notes = d.vocabNotes || {};

    list = Array.from(new Set(list.map(x => String(x || '').toLowerCase().trim()).filter(Boolean)));
    if (!list.includes(w)) list.unshift(w);

    if (note) notes[w] = note;
    else delete notes[w];

    await setDB({ vocabList: list, vocabNotes: notes });
    boxState.note = note;
    renderBox(boxState);
    rebuildWordsCacheFromDb({ ...d, vocabList: list, vocabNotes: notes });
  rebuildWordMap();
  applyHighlightsFromCache();
    toggleNoteOverlay(false);
    return;
  }

  // Translate note => auto-save into quotes (金句收藏本)
  if (boxState.mode === 'translate') {
    // Safety guard: simple English phrases should not enter quote library.
    const phraseWord = normalizePhraseForWordMode(boxState.text || '');
    if (isSimpleEnglishPhraseForWordMode(phraseWord)) {
      const w = phraseWord.toLowerCase().trim();
      if (w) {
        const d = await getDB([
          STORAGE_KEYS.vocabList,
          STORAGE_KEYS.vocabNotes
        ]);
        let list = Array.isArray(d.vocabList) ? d.vocabList : [];
        const notes = d.vocabNotes || {};

        list = Array.from(new Set(list.map(x => String(x || '').toLowerCase().trim()).filter(Boolean)));
        if (!list.includes(w)) list.unshift(w);

        if (note) notes[w] = note;
        else delete notes[w];

        await setDB({ vocabList: list, vocabNotes: notes });
        boxState.mode = 'word';
        boxState.word = w;
        boxState.note = note;
        renderBox(boxState);
        rebuildWordsCacheFromDb({ ...d, vocabList: list, vocabNotes: notes });
        rebuildWordMap();
        applyHighlightsFromCache();
        toggleNoteOverlay(false);
        return;
      }
    }
    boxState.note = note;
    const text = boxState.text;
    if (!text) return;
    const url = location.href;
    let quotes = await getSavedQuotes();
    const idx = quotes.findIndex(q => q && q.text === text && q.url === url);
    if (idx >= 0) {
      quotes[idx] = {
        ...quotes[idx],
        translation: quotes[idx].translation || boxState.translation || '',
        note
      };
    } else {
      quotes.unshift({
        text,
        translation: boxState.translation || '',
        note,
        url,
        title: document.title,
        createdAt: Date.now()
      });
      quotes = quotes.slice(0, 500);
      boxState.isFavorite = true;
    }
    await setSavedQuotes(quotes);
    renderBox(boxState);
    toggleNoteOverlay(false);
  }
}

async function toggleFavoriteQuote() {
  if (!boxState || boxState.mode !== 'translate') return;
  if (isSimpleEnglishPhraseForWordMode(boxState.text || '')) {
    toast('简短英文词组默认归入单词本，不会加入金句库。');
    return;
  }
  const text = boxState.text;
  if (!text) return;
  const url = location.href;
  let quotes = await getSavedQuotes();
  const idx = quotes.findIndex(q => q && q.text === text && q.url === url);
  if (idx >= 0) {
    quotes.splice(idx, 1);
    boxState.isFavorite = false;
  } else {
    quotes.unshift({
      text,
      translation: boxState.translation || '',
      note: boxState.note || '',
      url,
      title: document.title,
      createdAt: Date.now()
    });
    quotes = quotes.slice(0, 500);
    boxState.isFavorite = true;
  }
  await setSavedQuotes(quotes);
  renderBox(boxState);
}

async function ensureQuoteForExport() {
  if (!boxState || boxState.mode !== 'translate') return null;
  if (isSimpleEnglishPhraseForWordMode(boxState.text || '')) return null;
  const text = String(boxState.text || '').trim();
  if (!text) return null;
  const url = location.href;
  let quotes = await getSavedQuotes();
  const idx = quotes.findIndex(q => q && q.text === text && q.url === url);
  const now = Date.now();
  let target = null;
  if (idx >= 0) {
    target = {
      ...quotes[idx],
      translation: quotes[idx].translation || boxState.translation || '',
      note: String(boxState.note || quotes[idx].note || ''),
      title: quotes[idx].title || document.title || '',
      createdAt: Number(quotes[idx].createdAt || quotes[idx].id || now)
    };
    quotes[idx] = target;
  } else {
    target = {
      text,
      translation: boxState.translation || '',
      note: boxState.note || '',
      url,
      title: document.title || '',
      createdAt: now
    };
    quotes.unshift(target);
    quotes = quotes.slice(0, 500);
    boxState.isFavorite = true;
  }
  await setSavedQuotes(quotes);
  renderBox(boxState);
  return Number(target.createdAt || target.id || 0) || null;
}

async function openManagerQuoteExporter() {
  const quoteId = await ensureQuoteForExport();
  if (!quoteId) {
    toast('未找到可导出的句子，请先完成翻译。');
    return;
  }
  try{
    const res = await chrome.runtime.sendMessage({
      type: 'OP_OPEN_MANAGER_EXPORT',
      payload: { quoteId }
    });
    if(res && res.ok){
      toast('已打开导出工作台');
      return;
    }
  }catch(_){/* fallback below */}

  // Fallback for older background versions.
  const url = new URL(chrome.runtime.getURL('manager.html'));
  url.searchParams.set('tab', 'sentences');
  url.searchParams.set('quoteExport', '1');
  url.searchParams.set('quoteId', String(quoteId));
  window.open(url.toString(), '_blank', 'noopener');
  toast('已尝试打开导出工作台');
}

function renderSection(title, bodyHtml, rightHtml = '') {
  return `
    <div class="section">
      <div class="sec-h"><span>${title}</span><span>${rightHtml || ''}</span></div>
      <div class="sec-b">${bodyHtml}</div>
    </div>
  `;
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function renderBox(state) {
  ensureResultBox();

  const title = shadowRoot.getElementById('vb-title');
  const meta = shadowRoot.getElementById('vb-meta');
  const actions = shadowRoot.getElementById('vb-actions');
  const content = shadowRoot.getElementById('vb-content');
  const links = shadowRoot.getElementById('vb-links');
  const notechip = shadowRoot.getElementById('vb-notechip');

  title.textContent = state.mode === 'translate' ? '翻译' : state.word;

  // meta
  meta.innerHTML = '';
  if (state.mode === 'word') {
    if (state.phonetic) {
      const ph = document.createElement('div');
      ph.className = 'phonetic';
      ph.textContent = state.phonetic;
      meta.appendChild(ph);
    }

    const spUS = document.createElement('button');
    spUS.className = 'iconbtn';
    spUS.innerHTML = '<span class="flag flag-us" aria-hidden="true"></span>';
    spUS.dataset.act = 'speaker';
    spUS.dataset.accent = 'us';
    spUS.dataset.word = state.word;
    spUS.setAttribute('aria-label', 'US');
    spUS.title = 'US';

    const spUK = document.createElement('button');
    spUK.className = 'iconbtn';
    spUK.innerHTML = '<span class="flag flag-uk" aria-hidden="true"></span>';
    spUK.dataset.act = 'speaker';
    spUK.dataset.accent = 'uk';
    spUK.dataset.word = state.word;
    spUK.setAttribute('aria-label', 'UK');
    spUK.title = 'UK';

    meta.appendChild(spUS);
    meta.appendChild(spUK);
  } else {
    // 翻译模式：不显示原文（避免冗余）
  }

  // note chip
  if (state.note) {
    notechip.style.display = 'block';
    notechip.textContent = state.note;
  } else {
    notechip.style.display = 'none';
    notechip.textContent = '';
  }

  // actions
  actions.innerHTML = '';
  if (state.mode === 'word') {
    const btnNote = document.createElement('button');
    btnNote.className = 'tagbtn tag-purple';
    btnNote.textContent = '📝 批注';
    btnNote.dataset.act = 'note';

    const bRed = document.createElement('button');
    bRed.className = 'tagbtn tag-red';
    bRed.textContent = '生词';
    bRed.dataset.act = 'status';
    bRed.dataset.status = 'stranger';

    const bY = document.createElement('button');
    bY.className = 'tagbtn tag-yellow';
    bY.textContent = '学习中';
    bY.dataset.act = 'status';
    bY.dataset.status = 'learning';

    const bG = document.createElement('button');
    bG.className = 'tagbtn tag-green';
    bG.textContent = '已掌握';
    bG.dataset.act = 'status';
    bG.dataset.status = 'mastered';

    const bC = document.createElement('button');
    bC.className = 'tagbtn tag-trash';
    bC.textContent = '🗑';
    bC.title = '清除状态（彻底删除）';
    bC.dataset.act = 'status';
    bC.dataset.status = 'none';

    const active = state.status || 'stranger';
    bRed.dataset.active = (active === 'stranger' && !!state.statusExplicit) ? '1' : '0';
    bY.dataset.active = active === 'learning' ? '1' : '0';
    bG.dataset.active = active === 'mastered' ? '1' : '0';

    actions.appendChild(btnNote);
    actions.appendChild(bRed);
    actions.appendChild(bY);
    actions.appendChild(bG);
    actions.appendChild(bC);
  } else {
    const btnNote = document.createElement('button');
    btnNote.className = 'tagbtn tag-purple';
    btnNote.textContent = '📝 批注';
    btnNote.dataset.act = 'note';
    actions.appendChild(btnNote);

    const fav = document.createElement('button');
    fav.className = 'tagbtn tag-fav';
    fav.textContent = state.isFavorite ? '★ 已收藏' : '☆ 收藏金句';
    fav.dataset.act = 'favorite';
    fav.dataset.active = state.isFavorite ? '1' : '';
    actions.appendChild(fav);

    const exp = document.createElement('button');
    exp.className = 'tagbtn tag-export';
    exp.textContent = '🖼 导出图片';
    exp.dataset.act = 'export-card';
    actions.appendChild(exp);
  }

  // content sections
  content.innerHTML = '';

  if (state.mode === 'word') {
    const parts = [];

    if (state.youdao && state.youdao.explains && state.youdao.explains.length) {
      const ul = `<ul>${state.youdao.explains.slice(0, 12).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
      parts.push(renderSection('中文释义', ul));
    }
    if (state.enMeaning && state.enMeaning.length) {
      const ul = `<ul>${state.enMeaning.slice(0, 6).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
      parts.push(renderSection('英文释义', ul));
    }

    if (state.bing && state.bing.explains && state.bing.explains.length) {
      const ul = `<ul>${state.bing.explains.slice(0, 12).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
      parts.push(renderSection('Bing（第二）', ul));
    }

    if (!parts.length) {
      parts.push(renderSection('结果', `<div class="muted">暂无结果（你可以使用下方按钮跳转查询）</div>`));
    }

    content.innerHTML = parts.join('');

  } else {
    const list = Array.isArray(state.translations) && state.translations.length
      ? state.translations
      : (state.translation ? [{text: state.translation, provider: state.translationProvider || ''}] : []);
      if(list.length >= 2){
      const nameMap = {
        tencent: 'Tencent',
        aliyun: 'Aliyun',
        azure: 'Azure',
        caiyun: 'Caiyun',
        youdao: 'Youdao',
        youdao_web: 'Youdao Web',
        baidu_web: 'Baidu',
        fallback_google: 'Google',
        google: 'Google'
      };
      const parts = list.slice(0, 2).map((it)=>{
        const title = nameMap[it.provider] || it.provider || '翻译';
        return renderSection(title, `<div style="font-size:14px;">${escapeHtml(it.text)}</div>`);
      });
      content.innerHTML = parts.join('');
    }else{
      const t = list.length ? escapeHtml(list[0].text) : '';
      content.innerHTML = renderSection(
        '翻译',
        t ? `<div style="font-size:14px;">${t}</div>` : `<div class="muted">暂无翻译结果（可用下方按钮跳转翻译）</div>`
      );
    }
  }

  // footer links
  links.innerHTML = '';

  const qForLink = state.mode === 'word' ? state.word : state.text;
  const primaryKeys = new Set(['baidu','cambridge','urban']);
  const primary = VB_LINKS.filter(l => primaryKeys.has(l.key));
  const extra = VB_LINKS.filter(l => !primaryKeys.has(l.key));

  const addLink = (l, parent) => {
    const a = document.createElement('a');
    a.className = `lbtn c-${l.color}`;
    a.textContent = l.label;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.href = l.href(qForLink, state.mode);
    parent.appendChild(a);
  };

  primary.forEach(l => addLink(l, links));

  if (extra.length) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lbtn c-gray';
    btn.textContent = '更多引擎 ▾';
    btn.setAttribute('aria-expanded', 'false');

    const panel = document.createElement('div');
    panel.className = 'morePanel';
    panel.dataset.open = '0';
    extra.forEach(l => addLink(l, panel));

    btn.addEventListener('click', () => {
      const open = panel.dataset.open === '1';
      panel.dataset.open = open ? '0' : '1';
      btn.textContent = open ? '更多引擎 ▾' : '更多引擎 ▴';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });

    links.appendChild(btn);
    links.appendChild(panel);
  }


  if (lastBoxRect) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => positionBox(lastBoxRect));
    });
  }
}

async function showResultBox(rect, text, trigger = 'select') {
  ensureResultBox();
  lastBoxRect = rect;
  positionBox(rect);

  const trimmed = (text || '').trim();
  if (!trimmed) return;

  // Mode decision:
  // - single word or simple English phrase => word mode
  // - otherwise => translate mode
  const normalizedWordLike = normalizePhraseForWordMode(trimmed);
  const mode = isSimpleEnglishPhraseForWordMode(trimmed) ? 'word' : 'translate';
  const word = mode === 'word' ? (normalizedWordLike || trimmed) : '';

  if (mode === 'translate' && trimmed.length > MAX_TRANSLATE_CHARS) {
    // Still show the popup, but with a clear message (do not silently 'disappear').
    boxState = {
      mode,
      trigger,
      text: trimmed,
      word: '',
      note: '',
      status: 'stranger',
      statusExplicit: false,
      phonetic: '',
      youdao: null,
      bing: null,
      enMeaning: null,
      translation: `选中文本过长（${trimmed.length} 字符），请缩短到 ${MAX_TRANSLATE_CHARS} 字符以内再翻译。`,
      translations: [],
      isFavorite: false
    };

    await renderBox(boxState);
    resultBox.style.display = 'block';
    toast(`选中文本过长（${trimmed.length} 字符），请缩短到 ${MAX_TRANSLATE_CHARS} 字符以内再翻译。`);
    return;
  }

  // load current record if word
  let note = '';
  let status = 'stranger';
  if (mode === 'word') {
    const rec = await getCurrentWordRecord(word.toLowerCase());
    note = (rec && rec.note) ? rec.note : '';
    status = (rec && rec.status) ? rec.status : 'stranger';
  }

  // favorite status for quote
  let isFavorite = false;
  if (mode === 'translate') {
    const quotes = await getSavedQuotes();
    const url = location.href;
    isFavorite = quotes.some(q => q && q.text === trimmed && q.url === url);
  }

  boxState = {
    mode,
    trigger,
    text: trimmed,
    word,
    note,
    status,
    statusExplicit: false,
    phonetic: '',
    youdao: null,
    bing: null,
    enMeaning: null,
    translation: '',
    translations: [],
    isFavorite
  };

  // show immediately with loading state
  await renderBox(boxState);
  resultBox.style.display = 'block';

  // fetch data
  try {
    const resp = await chrome.runtime.sendMessage({
      type: 'GET_TRANSLATIONS',
      mode,
      text: mode === 'word' ? word : trimmed
    });

    if (resp && resp.ok) {
      if (mode === 'word') {
        const yd = parseYoudao(resp.youdaoHtml);
        const bg = parseBing(resp.bingHtml);
        boxState.youdao = yd;
        boxState.bing = bg;
        boxState.phonetic = (yd && yd.phonetic) ? yd.phonetic : '';
        try {
          boxState.enMeaning = await fetchEnglishMeaning(word || trimmed);
        } catch (_) {}
      } else {
        boxState.translation = resp.translation || '';
        boxState.translations = Array.isArray(resp.translations) ? resp.translations : [];
      }
    }
  } catch (_) {
    // ignore
  }

  await renderBox(boxState);
}

// ---------------- Popup triggers ----------------
let __vb_lastTriggerTs = 0;

function __vb_isEditableElement(el){
  if(!el || !(el instanceof Element)) return false;
  if(el.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return true;
  return false;
}

function __vb_isCodeLikeElement(el){
  if(!el || !(el instanceof Element)) return false;
  if(el.closest('pre, code, kbd, samp')) return true;
  if(el.closest('[class*="monaco" i], [class*="codemirror" i], [class*="ace" i], [class*="cm-" i], [class*="editor" i]')) return true;
  return false;
}

function __vb_isSensitiveOrFlowElement(el){
  if(!el || !(el instanceof Element)) return false;
  if(el.closest('form, dialog, [role="dialog"], [aria-modal="true"]')) return true;
  if(el.closest('input[type="password"], input[type="email"], input[type="tel"], input[type="number"], input[type="search"], input[type="url"]')) return true;
  return false;
}

function __vb_isYoutubeWatchPage() {
  try {
    return /(^|\\.)youtube\\.com$/i.test(location.hostname) && String(location.pathname || '').startsWith('/watch');
  } catch (_) {
    return false;
  }
}

function __vb_isYoutubeSubtitleEl(el){
  if(!__vb_isYoutubeWatchPage()) return false;
  if(!el || !(el instanceof Element)) return false;
  return !!el.closest('.ytp-caption-window-container, .caption-window, .ytp-caption-segment, .ytp-caption-window-bottom, .captions-text');
}

let __vb_lastYoutubePauseTs = 0;
function __vb_tryPauseYouTubeOnSubtitleHover(target){
  if(!__vb_isYoutubeSubtitleEl(target)) return;
  const now = Date.now();
  if(now - __vb_lastYoutubePauseTs < 260) return;
  const video = document.querySelector('video.html5-main-video, video');
  if(!(video instanceof HTMLVideoElement)) return;
  if(video.paused || video.ended) return;
  try{
    video.pause();
    __vb_lastYoutubePauseTs = now;
  }catch(_){}
}

function __vb_isNonReadingContainer(el){
  if(!el || !(el instanceof Element)) return false;
  if(el.closest('nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"]')) return true;
  if(el.closest('[class*="nav" i], [class*="sidebar" i], [class*="menu" i], [class*="toolbar" i], [class*="breadcrumb" i], [class*="footer" i], [class*="header" i], [class*="ad-" i], [class*="ads" i], [class*="cookie" i], [class*="banner" i], [class*="tooltip" i], [class*="modal" i], [class*="popup" i]')) return true;
  if(__vb_isYoutubeSubtitleEl(el)) return false;
  if(el.closest('video, audio, [class*="player" i], [class*="subtitle" i], [class*="caption" i]')) return true;
  return false;
}

function __vb_isBlockedContext(el){
  return __vb_isEditableElement(el) || __vb_isCodeLikeElement(el) || __vb_isSensitiveOrFlowElement(el) || __vb_isNonReadingContainer(el);
}

function __vb_getSelectionText() {
  const sel = (document.getSelection && document.getSelection()) || window.getSelection();
  if (!sel) return { text: '', rect: null };
  const text = (sel.toString() || '').trim();

  let rect = null;
  try {
    if (sel.rangeCount && text) {
      const range = sel.getRangeAt(0);
      rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) rect = null;
    }
  } catch (_) {
    rect = null;
  }

  return { text, rect };
}

function __vb_shouldTrigger(text, force = false) {
  if (!text) return false;
  // If it's over the translation limit, we will still trigger (and show a helpful message inside the popup).
  if (text.length > MAX_TRANSLATE_CHARS) return true;
  // Ignore selections containing too many newlines (usually whole-page selections)
  if ((text.match(/\n/g) || []).length > 10) return false;

  // ✅ 只对“纯英文选择”弹窗：
  // 任何包含明显的非拉丁文字（中/日/韩、俄文、阿拉伯等）都不触发。
  // 这是关键路径：避免在中文段落、金额条款、混排文本中误弹出翻译弹窗。
  // 注意：这里 **不区分** force（双击）与否，只要混入非拉丁文字就跳过。
  // 只要出现明显的非拉丁文字或全角字符（常见中文标点/全角数字），就不触发
  if (/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u3000-\u303F\uFF00-\uFFEF]/.test(text)) return false;

  // 兼容少数情况下的“非英文大量文本”误选：无拉丁字母且中文占比极高时也跳过。
  const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const hasLatin = /[A-Za-z]/.test(text);
  if (!hasLatin) return false; // 没有英文字符，直接不弹
  // 如果中文占比极高（混排），也跳过
  if (cn / Math.max(1, text.length) > 0.15) return false;

  // 允许英文单词/短语/句子（含常见标点）
  return text.length >= 2;
}

function __vb_triggerPopupFromEvent(e, force = false) {
  if (__vb_disabledNow) return;
  if (resultBox && resultBox.contains(e.target)) return;
  const target = e && e.target ? e.target : null;
  if (__vb_isBlockedContext(target)) return;
  const activeEl = document.activeElement;
  if (__vb_isBlockedContext(activeEl)) return;

  const now = Date.now();
  if (!force && now - __vb_lastTriggerTs < 220) return;

  const { text, rect } = __vb_getSelectionText();
  if (!__vb_shouldTrigger(text, force)) {
    // Some sites aggressively clear selection on dblclick/mouseup.
    // For dblclick (force), fall back to word-under-cursor to keep popup usable.
    if (!force) return;
    const x = (e && typeof e.clientX === 'number') ? e.clientX : 20;
    const y = (e && typeof e.clientY === 'number') ? e.clientY : 20;
    const w = getWordAtPoint(x, y);
    if (!w) return;
    __vb_lastTriggerTs = now;
    const r = rect || { left: x, top: y, right: x, bottom: y, width: 1, height: 1 };
    showResultBox(r, w, 'dblclick');
    return;
  }

  __vb_lastTriggerTs = now;

  let r = rect;
  if (!r) {
    const x = (e && typeof e.clientX === 'number') ? e.clientX : 20;
    const y = (e && typeof e.clientY === 'number') ? e.clientY : 20;
    r = { left: x, top: y, right: x, bottom: y, width: 1, height: 1 };
  }

  showResultBox(r, text, force ? 'dblclick' : 'select');
}

// Selection by dragging
document.addEventListener('mouseup', (e) => {
  setTimeout(() => __vb_triggerPopupFromEvent(e, false), 0);
}, true);

// Double click word
document.addEventListener('dblclick', (e) => {
  setTimeout(() => __vb_triggerPopupFromEvent(e, true), 0);
}, true);

// Click outside to close
document.addEventListener('mousedown', (e) => {
  if (resultBox && resultBox.style.display === 'block' && !resultBox.contains(e.target)) closeBox();
}, true);

// Hover over marked words => popup (no click)
function getWordAtPoint(x, y) {
  let range = null;
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.setEnd(pos.offsetNode, pos.offset);
    }
  }
  if (!range) return '';
  const node = range.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE) return '';
  const text = node.nodeValue || '';
  const offset = range.startOffset;
  if (!text || offset < 0 || offset > text.length) return '';

  const isWordChar = (ch) => /[A-Za-z\-']/.test(ch);
  let i = offset;
  if (i >= text.length) i = text.length - 1;
  if (i < 0) return '';

  // if caret sits on non-word char, look left
  if (!isWordChar(text[i]) && i > 0 && isWordChar(text[i - 1])) i = i - 1;
  if (!isWordChar(text[i])) return '';

  let s = i, e = i;
  while (s > 0 && isWordChar(text[s - 1])) s--;
  while (e < text.length - 1 && isWordChar(text[e + 1])) e++;

  const w = text.slice(s, e + 1).trim();
  if (!w) return '';
  if (w.length < 2 || w.length > 40) return '';
  return w;
}

document.addEventListener('mousemove', (e) => {
  if (hoverTimer) clearTimeout(hoverTimer);
  hoverTimer = setTimeout(async () => {
    __vb_tryPauseYouTubeOnSubtitleHover(e.target);
    if (__vb_isBlockedContext(e.target)) return;
    // do not interfere while selecting text
    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && (sel.toString() || '').trim()) return;
    if (boxPinned) return;

    const w = getWordAtPoint(e.clientX, e.clientY);
    if (!w) return;
    const lw = w.toLowerCase();

    // only when this word is already tracked (status or note)
    // (use our unified words storage; avoid undefined legacy vars like vocabNotes/greenList/yellowList)
    const rec = getWordFromMap(lw);
    const isTracked = !!rec && (rec.status !== 'stranger' || !!(rec.note || '').trim());
    if (!isTracked) return;

    if (lastHoverWord === lw && resultBox && resultBox.style.display === 'block') return;
    lastHoverWord = lw;

    const r = { left: e.clientX, top: e.clientY, right: e.clientX, bottom: e.clientY, width: 1, height: 1 };
    showResultBox(r, lw, 'hover');
  }, 90);
}, true);

// ---------------- Boot ----------------
(async () => {
  try {
    await initStorageCache();
    applyHighlights();

    // Re-apply highlights on dynamic pages (SPA feeds, infinite scroll, etc.)
    const mo = new MutationObserver(() => {
      clearTimeout(applyHighlights.__t);
      applyHighlights.__t = setTimeout(() => applyHighlights(), 250);
    });
    if (document.body) {
      mo.observe(document.body, { subtree: true, childList: true, characterData: true });
    }
  } catch (e) {
    // fail quietly
  }
})();

})();
