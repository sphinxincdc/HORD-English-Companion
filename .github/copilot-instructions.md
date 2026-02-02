# Copilot / AI Coding Guidelines for this repository

Purpose: quick, actionable notes for AI coding agents who will edit this Chrome extension.

Big picture
- This is a Manifest V3 Chrome extension (MV3). Core pieces:
  - background service worker: `background.js` (single source of truth, DB merge, translation providers)
  - content script: `content.js` (selection/dblclick popup, hover popups, CSS.highlights integration)
  - popup UI: `popup.html` + `popup.js` (quick add / toggles)
  - manager UI: `manager.html` + `manager.js` (bulk management, import/export, review scheduling)
  - options UI: `options.html` + `options.js` (provider credentials)
  - manifest: `manifest.json` (permissions / host_permissions / content script run_at)

Data & storage
- Primary packed DB key: `vocab_builder_db` (see `KEY_DB` in `background.js`). Background mirrors this to root-level keys for backward compatibility.
- Root-level keys used across pages: `vocabList`, `vocabDict`, `vocabNotes`, `vocabMeta`, `vocabPhonetics`, `vocabAudio`, `yellowList`, `greenList`, `collectedSentences`, etc. Changes must maintain compatibility with both packed and root keys (see `getDB()` / `setDB()` merge logic in `background.js`).
- When changing schema: bump `DB_VERSION` at top of `background.js` and add a migration path in `ensureDbVersion()`.

Message APIs (chrome.runtime.sendMessage)
- Background exposes message-based RPC. Key message types (examples):
  - `OP_GET_STATE` -> returns `{ok:true, db}` (used by `manager.js`).
  - `UPSERT_WORD` payload: `{type:'UPSERT_WORD', word, meaning?, note?, status?}` returns `{ok:true}`.
  - `ADD_SENTENCE` payload: `{type:'ADD_SENTENCE', text, translation?, url?, title?}` returns `{ok:true}`.
  - `GET_TRANSLATIONS` payload: `{type:'GET_TRANSLATIONS', text, mode:'translate'|'word'}` returns translation or HTML for word lookups.
  - Bulk and admin ops: `OP_UPSERT_BULK`, `OP_DELETE_WORDS`, `OP_CLEAR_ALL_WORDS`, `OP_RATE_WORD`, `OP_SET_WORD_STATUS`, `OP_DELETE_SENTENCES`, `OP_UPSERT_BULK`.
- When modifying or adding message handlers, update the listener in `background.js` (single `onMessage` listener) and keep responses consistent (always `sendResponse(...)` and return `true` when async).

Translation providers
- Background implements multiple provider wrappers and a fallback pipeline (`translatePipeline()` in `background.js`). Credentials are stored via `chrome.storage.local` keys (see `getSettings()` and `options.js`): `azureKey`, `azureRegion`, `tencentId`, `tencentKey`, `aliyunId`, `aliyunKey`, `caiyunToken`, etc.
- Respect timeout and graceful degradation: the code uses `fetchWithTimeout` and returns informative `{ok:false, error:'...'} ` objects when providers fail.

Content script caveats
- `content.js` contains many compatibility helpers. Important patterns:
  - Use `storageGet()` instead of calling `chrome.storage.local.get` directly; it sanitizes inputs and avoids MV3 parameter errors.
  - Highlights use CSS.Highlights API; ensure `ensureHighlightStyles()` is present and do not assume highlights are visible without it.
  - `content.js` expects specific storage keys (see `STORAGE_KEYS`) and semantic status strings: `stranger|learning|mastered|note`.

Developer workflows & debugging
- Loading during development: open Chrome/Edge Extensions -> Load unpacked -> point to this repository folder. After changes to `background.js`, use the extension devtools to inspect the service worker (background service worker may stop when idle — open Service Worker devtools to keep it running for debugging).
- To inspect storage: use Chrome DevTools Application -> Storage -> Local Storage (or `chrome.storage` in extension devtools). For quick checks, run `await chrome.storage.local.get(null)` in the service worker console.
- Content script changes: refresh the target tab and reopen the extension popup or reload the extension to ensure content script re-injects.

Conventions and gotchas (project-specific)
- Keep `getDB()` / `setDB()` behavior intact. Many pages rely on mirrored root keys; removing mirroring will break older code paths.
- Avoid passing `undefined`/`null` into `chrome.storage.local.get` (see `storageGet()`); prefer omitting the parameter to read all keys.
- Word normalization: the project lowercases keys widely (see `normalizeWordKey` / `uniqLower`) — follow this when reading/writing keys.
- Translation requests: the pipeline tries providers in order and then falls back to an unofficial Google endpoint. Don't hard-remove fallback without adding a replacement.

Files to read for examples
- Message handler examples: `background.js` (search for `onMessage` and `type === 'UPSERT_WORD'`).
- UI logic: `manager.js` (import/export, review scheduling), `popup.js` (quick add flows), `options.js` (credential storage).
- Content interactions & highlighting: `content.js` (search/selection flow, `STORAGE_KEYS`, `ensureHighlightStyles`).

If you change behavior that affects storage or message formats: add a brief comment near the modified handler and update `DB_VERSION` + migration stub in `background.js`.

Next step: I added this file to the repo — tell me if you want a longer version (include examples for each message payload), or to run a quick smoke test (load unpacked + verify `OP_GET_STATE`).
