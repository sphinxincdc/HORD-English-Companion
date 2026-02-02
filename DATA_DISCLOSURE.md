# Privacy / Data Disclosure — Chrome Web Store

**Version:** v2.50.7  
**Last updated:** 2026-01-29

This file is intended to be kept in sync with each release and used when completing the Chrome Web Store **Privacy practices** / **Data disclosure** questionnaire.

## A. Do you collect user data?
No. Vocabulary Builder Pro has **no developer-owned backend** and includes **no analytics, ads, or tracking**. We do not collect, sell, or share user data.

## B. What data is processed (on-device / for functionality)
The extension may process the following **for the user-requested features**:
1) **Selected text / typed text** — the word/phrase or sentence you choose, to show meaning/translation and (optionally) add to your vocabulary.
2) **Page context (URL/domain/title)** — used to support per-site/per-page disable switches and to attach an optional “source link” to saved sentences.
3) **Learning content you create** — words, notes, sentences, review status, and timestamps.
4) **Optional API keys (BYOK)** — if you enter keys, they are stored locally to call your chosen translation provider.

## C. Where is data stored?
- **Local only:** Stored in Chrome via `chrome.storage` on your device.
- **Export/Import:** When you export, a JSON file is downloaded locally. When you import, the file is read locally.

## D. What is transmitted over the network?
Only when you use translation/dictionary features, the extension may send:
- The selected/typed text (and sometimes source/target language info)
- To the provider endpoints you configure/use

No browsing history is uploaded; only the specific text needed for translation is sent at the moment you trigger the feature.

## E. Data sharing / selling
- **No selling.**
- **No sharing with third parties** except the translation/dictionary provider you choose to call for the requested result.

## F. Data security
- API keys (if provided) are stored locally in `chrome.storage`.
- The extension does not intentionally transmit keys to any domain other than the selected provider.

## G. User controls
- Disable the extension globally, per domain, or per page.
- Delete words/sentences at any time.
- Export your data as JSON, or clear storage by removing the extension.
