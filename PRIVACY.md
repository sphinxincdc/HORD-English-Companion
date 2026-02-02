# Privacy Policy — Vocabulary Builder Pro

**Last updated:** 2026-01-29  
**Applies to:** Vocabulary Builder Pro (Chrome extension) v2.50.7+

Vocabulary Builder Pro is an English-learning Chrome extension. This policy describes how the extension accesses, stores, and transmits data.

## What the extension does
- Shows word/phrase meanings and translations when you select text on a webpage.
- Saves words and “golden sentences” to your vocabulary notebook.
- Provides review and progress features.

## 1) Data the extension stores (on your device)
The extension stores the following **locally in your browser** using `chrome.storage`:
- **Words** you add (word text, meaning, notes, status, review counters, timestamps, phonetics/audio links if present).
- **Sentences** you add (sentence text, optional translation, optional source URL/title, timestamps).
- **Settings** (review settings, UI preferences, blacklist for pages/domains, global enable/disable).
- **API keys (BYOK)** if you choose to enter them.

The extension does **not** require login, and it does **not** store your data on the developer’s server.

## 2) Data the extension sends over the network
When you request a translation/meaning (e.g., selecting text to translate), the extension may send the selected text to one of the configured translation/dictionary providers.

Depending on your settings, requests may go to providers such as:
- Microsoft Translator (Azure)
- Google Translate (unofficial endpoint)
- Youdao dictionary services
- Tencent / Aliyun / Caiyun translation APIs

**What is sent:**
- The **text you selected** (or text you typed in the popup search box)
- Technical metadata required by the provider’s API (request headers, parameters)

**What is not sent by us:**
- We do not intentionally transmit your full browsing history.
- We do not send your stored wordbook database to any server.

Note: Third‑party providers may log requests according to their own privacy policies. If you are concerned, use your own API keys (BYOK) and/or disable network features.

## 3) Data we do NOT collect
- No analytics identifiers
- No ad identifiers
- No tracking across sites
- No sale of personal data

## 4) Permissions explanation
The extension requests the following permissions and uses them only for the stated purposes:

- `storage` — to save your wordbook and settings locally.
- `contextMenus` — to add right‑click actions (e.g., “Add to vocabulary”).
- `activeTab` — to allow actions on the page you are currently using.
- `tabs` — used to read the **current active tab’s URL/title** so the extension can:
  - show the correct source link for saved items,
  - apply “disable on this page/domain” rules accurately,
  - open the manager/options pages in a new tab when you click related buttons.

The extension also declares **host permissions** only for specific translation/dictionary API domains that it may call. (As of v2.50.7, it no longer requests `<all_urls>` in `host_permissions`.)

The content script runs on webpages to detect user text selection and show the learning popup. It does not read your browsing data unless you interact with it.

## 5) Data retention and deletion
- Your data stays in Chrome storage until you delete it.
- You can remove individual words/sentences or clear your database from the manager UI.
- Uninstalling the extension removes its stored data from your browser.

## 6) Security
- API keys you enter are stored locally in Chrome storage.
- The extension does not upload your API keys to any developer server.

## 7) Contact
If you have questions about this policy, contact the developer using the support channel provided on the Chrome Web Store listing.
