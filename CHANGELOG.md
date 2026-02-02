## 2.53.33 (2026-01-31)
- Files changed: popup.html, manifest.json, CHANGELOG.md
- Change: Popup UI reorganized with top-right settings icon, brand subtitle, white-card tool entries, and a separate gray system-control area.
- Risk: Low; layout-only changes.
- Rollback: Restore listed files from 2.53.32 and bump manifest version.

## 2.53.32 (2026-01-31)
- Files changed: background.js, test.html, test.js, manager.js, manifest.json, CHANGELOG.md
- Change: Background writes now normalize vocab keys to lowercase to prevent case mismatches; review page answer display supports multi-select and defaults to all; removed review-page auto-pronounce; English meaning lookup is case-tolerant in manager.
- Risk: Low; storage keys are normalized but values are preserved; review UI behavior only.
- Rollback: Restore listed files from 2.53.31 and bump manifest version.

## 2.53.31 (2026-01-31)
- Files changed: manager.js, manifest.json, CHANGELOG.md
- Change: Large imports now write in batches with progress, preventing “import does nothing” for big JSON payloads. Version sync.
- Risk: Low; import flow only.
- Rollback: Restore listed files from 2.53.30 and bump manifest version.

## 2.53.30 (2026-01-31)
- Files changed: content.js, manager.js, manifest.json, CHANGELOG.md
- Change: Sync word marking to background packed DB to prevent “marked but not saved” cases; manager status normalization now maps learning/mastered/stranger to yellow/green/red. Version sync.
- Risk: Low; new background sync is best-effort and non-blocking.
- Rollback: Restore listed files from 2.53.29 and bump manifest version.

## 2.53.29 (2026-01-31)
- Files changed: manager.html, manifest.json, CHANGELOG.md
- Change: Search input narrowed further while keeping the “搜索” placeholder visible. Version sync.
- Risk: UI-only change.
- Rollback: Restore listed files from 2.53.28 and bump manifest version.

## 2.53.28 (2026-01-31)
- Files changed: manager.js, manifest.json, CHANGELOG.md
- Change: Exports now include full word/sentence fields (meanings, notes, phonetics, audio, source); import stores data directly and skips API refetch for imported items; sentence templates updated with sourceLabel. Version sync.
- Risk: Export/import schema expanded; backward compatibility preserved.
- Rollback: Restore listed files from 2.53.27 and bump manifest version.

## 2.53.27 (2026-01-31)
- Files changed: manager.html, manifest.json, CHANGELOG.md
- Change: Stat cards padding increased to shift text weight slightly right. Version sync.
- Risk: UI-only change.
- Rollback: Restore listed files from 2.53.26 and bump manifest version.

## 2.53.26 (2026-01-31)
- Files changed: manager.html, manifest.json, CHANGELOG.md
- Change: Word toolbar buttons renamed to “导入 / 导出”; search input narrowed further while keeping placeholder “搜索”. Version sync.
- Risk: UI-only change.
- Rollback: Restore listed files from 2.53.25 and bump manifest version.

## 2.53.25 (2026-01-30)
- Files changed: background.js, content.js, manager.html, manager.js, manifest.json, CHANGELOG.md
- Change: New word marks now store source/time and English meanings; source labels truncate to 100 chars and show “来源：—” when missing; sentence toolbar adds translation/note toggles; search inputs shrink to 1/4 with “搜索” placeholder; import/export adds English meaning field and imports set time/source to “导入”. Version sync.
- Risk: Import/export schema updated and new vocabEn storage field. Existing data remains compatible.
- Rollback: Restore listed files from 2.53.24 and bump manifest version.

## 2.53.24 (2026-01-30)
- Files changed: content.js, manager.js, manager.html, styles.css, manifest.json, CHANGELOG.md
- Change: Improve popup status button text contrast; English meanings default to show under Chinese with same toggle logic; single-item delete no longer needs confirmation (bulk delete still double-confirm); clear buttons relabeled to “清空”; sentence cards show “来源：—” when missing; note button purple matches “有批注” card. Version sync.
- Risk: UI changes and delete flow tweak for single items; bulk deletion still protected by double confirm.
- Rollback: Restore listed files from 2.53.23 and bump manifest version.

## 2.53.23 (2026-01-30)
- Files changed: manager.html, manager.js, styles.css, manifest.json, CHANGELOG.md
- Change: Rename “本周到期” to “英语仓库”; add global toggles for CN/EN/notes and per-card fold buttons; search input shortened and placeholder centered; word meta line moved to last line; sentence source matches word behavior; toolbar sticky. Version sync.
- Risk: UI-only change with new view toggles.
- Rollback: Restore listed files from 2.53.22 and bump manifest version.

## 2.53.22 (2026-01-30)
- Files changed: manager.js, styles.css, manifest.json, CHANGELOG.md
- Change: Sentence cards vertically centered; source link now inline after date and hidden when missing. Version sync.
- Risk: UI-only change.
- Rollback: Restore listed files from 2.53.21 and bump manifest version.

## 2.53.21 (2026-01-30)
- Files changed: manager.js, styles.css, manifest.json, CHANGELOG.md
- Change: Remove sentence list link button; move English meaning toggle under Chinese meaning. Version sync.
- Risk: UI-only change.
- Rollback: Restore listed files from 2.53.20 and bump manifest version.

## 2.53.20 (2026-01-30)
- Files changed: manager.js, styles.css, manifest.json, CHANGELOG.md
- Change: EN button simplified to “EN” text with inner light-blue fill only. Version sync.
- Risk: UI-only change.
- Rollback: Restore listed files from 2.53.19 and bump manifest version.

## 2.53.19 (2026-01-30)
- Files changed: manager.js, manager.html, styles.css, manifest.json, CHANGELOG.md
- Change: Right-side buttons add emoji and neutral EN styling; sentence source moved after date; word cards show date/source; stat cards further compressed and pill buttons taller. Version sync.
- Risk: UI-only change with minor metadata display.
- Rollback: Restore listed files from 2.53.18 and bump manifest version.

## 2.53.18 (2026-01-30)
- Files changed: styles.css, manager.html, manifest.json, CHANGELOG.md
- Change: Right-side action icons restored with neutral EN styling; stat card height reduced ~40%. Version sync.
- Risk: UI-only change.
- Rollback: Restore listed files from 2.53.17 and bump manifest version.

## 2.53.17 (2026-01-30)
- Files changed: styles.css, manifest.json, CHANGELOG.md
- Change: Restore right-side action icons and remove blue fill from English meaning button; center word card content vertically. Version sync.
- Risk: UI-only change.
- Rollback: Restore listed files from 2.53.16 and bump manifest version.

## 2.53.16 (2026-01-30)
- Files changed: manager.js, styles.css, manifest.json, CHANGELOG.md
- Change: Right-side button frame shrinks with background; stat card hints rendered as pill buttons; align word/sentence action column widths to reduce right overflow. Version sync.
- Risk: UI-only change.
- Rollback: Restore listed files from 2.53.15 and bump manifest version.

## 2.53.15 (2026-01-30)
- Files changed: manager.js, manager.html, styles.css, manifest.json, CHANGELOG.md
- Change: Note edit/delete now inline within cards; right-side action buttons keep icons with smaller background; top stat cards compressed and bottom bars removed; word/sentence card overflow adjustments. Version sync.
- Risk: UI-only change with inline editor behavior.
- Rollback: Restore listed files from 2.53.14 and bump manifest version.

## 2.53.14 (2026-01-30)
- Files changed: styles.css, manifest.json, CHANGELOG.md
- Change: Word cards allow visible overflow to avoid right button clipping; right-side button backgrounds shrink via content-box while keeping icons visible. Version sync.
- Risk: UI-only change.
- Rollback: Restore listed files from 2.53.13 and bump manifest version.

## 2.53.13 (2026-01-30)
- Files changed: styles.css, manifest.json, CHANGELOG.md
- Change: Word cards further aligned to sentence card layout to prevent right-side clipping; right-side action buttons use 60% background fill for words and sentences. Version sync.
- Risk: UI layout-only change.
- Rollback: Restore listed files from 2.53.12 and bump manifest version.

## 2.53.12 (2026-01-30)
- Files changed: manager.js, styles.css, manifest.json, CHANGELOG.md
- Change: Fix sentence import (CSV/TXT) createdAt collisions so multiple items import in one click; adjust word card layout to align with sentence cards and reduce right-side clipping. Version sync.
- Risk: UI layout changes plus import timestamp logic adjustment.
- Rollback: Restore listed files from 2.53.11 and bump manifest version.

## 2.53.11 (2026-01-30)
- Files changed: manager.html, styles.css, manifest.json, CHANGELOG.md
- Change: Swap bulk buttons order; enlarge logo with purple background; tighten word card grid to avoid right clipping. Version sync.
- Risk: UI-only change.
- Rollback: Restore listed files from 2.53.10 and bump manifest version.

## 2.53.10 (2026-01-30)
- Files changed: manager.js, manifest.json, CHANGELOG.md
- Change: Sentence import now validates payload and shows feedback instead of silent failure. Version sync.
- Risk: UI-only change.
- Rollback: Restore manager.js/manifest.json from 2.53.9 and bump manifest version.

## 2.53.9 (2026-01-30)
- Files changed: manager.html, manager.js, styles.css, popup.html, options.html, content.js, manifest.json, CHANGELOG.md
- Change: Rebrand to 全能英语单词本PRO / Personal English Asset System; logo purple embed + larger; tagline font updated; word-card right overflow further constrained; action button sizes unified. Version sync.
- Risk: UI-only changes.
- Rollback: Restore listed files from 2.53.8 and bump manifest version.

## 2.53.8 (2026-01-30)
- Files changed: styles.css, manifest.json, CHANGELOG.md
- Change: Fix word card right-side overflow by tightening card layout widths and constraints. Version sync.
- Risk: UI-only change.
- Rollback: Restore styles.css/manifest.json from 2.53.7 and bump manifest version.

## 2.53.7 (2026-01-30)
- Files changed: manager.html, manager.js, styles.css, background.js, manifest.json, CHANGELOG.md
- Change: Word list switched to cards with meaning/note beside phonetics; added English meaning toggle; bulk delete light red + double confirm; sentence toolbar adds sort/import/export and right-aligned actions; link button uses light blue; tagline gold script. Version sync.
- Risk: UI and import/export flow changes; confirm dialogs added for deletes.
- Rollback: Restore listed files from 2.53.6 and bump manifest version.

## 2.53.6 (2026-01-30)
- Files changed: manager.html, manager.js, background.js, styles.css, content.js, test.js, manifest.json, CHANGELOG.md
- Change: Word list adds purple note button; sentence toolbar/actions aligned with word styles; sentence source link shown; flags rendered as cross-platform icons (avoid Windows "UK/GB"). Version sync.
- Risk: UI changes plus new note update message; no storage schema changes.
- Rollback: Restore listed files from 2.53.5 and bump manifest version.

## 2.53.5 (2026-01-30)
- Files changed: manager.html, manager.css, manager.js, manifest.json, CHANGELOG.md
- Change: Manager header layout refreshed (logo larger than title, version moved after Pro, tagline more prominent); fix status counts in summary cards; Gold Learner badge now gold. Version sync.
- Risk: UI-only changes; counting now aligns with meta.status.
- Rollback: Restore manager.html/manager.css/manager.js/manifest.json from 2.53.4 and bump manifest version.

## 2.53.4 (2026-01-30)
- Files changed: popup.js, popup.html, manifest.json, CHANGELOG.md
- Change: Fix popup add-word error caused by undefined url/title; add emoji font fallback in popup for Windows. Version sync.
- Risk: UI-only change in popup; add-word flow now uses active tab data.
- Rollback: Restore popup.js/popup.html/manifest.json from 2.53.3 and bump manifest version.

## 2.53.3 (2026-01-30)
- Files changed: manager.html, manager.js, test.html, test.js, manifest.json, CHANGELOG.md
- Change: Manager header tagline updated to "Craft Your Personal English Asset System"; review test completion now shows score + encouragement. Version sync.
- Risk: UI-only changes; test flow unchanged.
- Rollback: Restore manager.html/manager.js/test.html/test.js/manifest.json from 2.53.2 and bump manifest version.

## 2.53.2 (2026-01-30)
- Files changed: content.js, manifest.json, CHANGELOG.md
- Change: Fix emoji font fallback for Windows; status buttons now reflect single-click changes immediately; popup typography tweaks (word larger, section titles and footer links smaller). Version sync.
- Risk: UI-only change.
- Rollback: Restore content.js and manifest.json from 2.53.1 and bump manifest version.

## 2.53.1 (2026-01-30)
- Files changed: content.js, manifest.json, CHANGELOG.md
- Change: Popup default stranger button stays light until clicked; single-click status sets consistent highlight; title word larger, footer links smaller, section titles smaller. Version sync.
- Risk: UI-only change.
- Rollback: Restore content.js and manifest.json from 2.53.0 and bump manifest version.

## 2.53.0 (2026-01-30)
- Files changed: content.js, manifest.json, CHANGELOG.md
- Change: Popup header now keeps word/phonetic/speaker on one line; stranger button stays light until clicked; status changes on single click with instant UI feedback. Version sync.
- Risk: UI-only change.
- Rollback: Restore content.js and manifest.json from 2.52.9 and bump manifest version.

## 2.52.9 (2026-01-30)
- Files changed: content.js, manifest.json, CHANGELOG.md
- Change: Translate section titles show provider names only; active status buttons use stronger colors; favorite quote button uses gold fill. Version sync.
- Risk: UI-only change.
- Rollback: Restore content.js and manifest.json from 2.52.8 and bump manifest version.

## 2.52.8 (2026-01-30)
- Files changed: manifest.json, CHANGELOG.md
- Change: Update manifest description to include latest version entry (per-version updates). Version sync.
- Risk: Metadata-only change.
- Rollback: Restore manifest.json from 2.52.7 and bump manifest version.

## 2.52.7 (2026-01-30)
- Files changed: options.html, options.js, background.js, manifest.json, CHANGELOG.md
- Change: Per-provider test buttons added next to each API source in BYOK settings. Version sync.
- Risk: UI-only change.
- Rollback: Restore options.html/options.js/background.js/manifest.json from 2.52.6 and bump manifest version.

## 2.52.6 (2026-01-30)
- Files changed: options.html, options.js, background.js, manifest.json, CHANGELOG.md
- Change: Add “测试翻译接口” button in BYOK settings to test configured providers and show results. Version sync.
- Risk: UI-only change.
- Rollback: Restore options.html/options.js/background.js/manifest.json from 2.52.5 and bump manifest version.

## 2.52.5 (2026-01-30)
- Files changed: content.js, manifest.json, CHANGELOG.md
- Change: Add phrase highlighting so multi-word vocabulary is colored on pages after marking. Version sync.
- Risk: Highlight-only change.
- Rollback: Restore content.js and manifest.json from 2.52.4 and bump manifest version.

## 2.52.4 (2026-01-30)
- Files changed: background.js, content.js, popup.js, manifest.json, CHANGELOG.md
- Change: Translate pipeline now returns up to two results; popup/selection display shows two translations when available. Version sync.
- Risk: UI-only change; falls back to single translation if only one available.
- Rollback: Restore background.js/content.js/popup.js/manifest.json from 2.52.3 and bump manifest version.

## 2.52.3 (2026-01-30)
- Files changed: content.js, manifest.json, CHANGELOG.md
- Change: Popup status label renamed from 陌生 to 生词 (display-only). Version sync.
- Risk: Display-only change.
- Rollback: Restore content.js and manifest.json from 2.52.2 and bump manifest version.

## 2.52.2 (2026-01-30)
- Files changed: content.js, manifest.json, CHANGELOG.md
- Change: Popup label for Youdao section renamed to 中文释义 (display-only). Version sync.
- Risk: Display-only change.
- Rollback: Restore content.js and manifest.json from 2.52.1 and bump manifest version.

## 2.52.1 (2026-01-30)
- Files changed: content.js, manifest.json, CHANGELOG.md
- Change: Reposition popup after content updates to avoid overflow; update extension description to reflect latest changes. Version sync.
- Risk: UI-only change.
- Rollback: Restore content.js and manifest.json from 2.52.0 and bump manifest version.

## 2.52.0 (2026-01-30)
- Files changed: content.js, manifest.json, CHANGELOG.md
- Change: Popup positioning now auto-adjusts to stay fully within viewport when it would overflow. Version sync.
- Risk: UI-only change.
- Rollback: Restore content.js and manifest.json from 2.51.9 and bump manifest version.

## 2.51.9 (2026-01-30)
- Files changed: manager.js, content.js, manifest.json, CHANGELOG.md
- Change: Manager enrichment now uses Youdao for Chinese meanings while keeping dictionaryapi.dev for phonetics; popup shows English definitions under Youdao results. Version sync.
- Risk: External API dependency; if dictionaryapi.dev is unreachable, English definitions may be missing.
- Rollback: Restore manager.js/content.js/manifest.json from 2.51.8 and bump manifest version.

## 2.51.8 (2026-01-30)
- Files changed: manager.js, manifest.json, CHANGELOG.md
- Change: Fix phonetic display bug where meanings could appear in the phonetic column by preventing vocabDict string fallback. Version sync.
- Risk: Display-only fix.
- Rollback: Restore manager.js and manifest.json from 2.51.7 and bump manifest version.

## 2.51.7 (2026-01-30)
- Files changed: manager.js, manifest.json, CHANGELOG.md
- Change: Auto-enrich missing meanings/phonetics via dictionary API and store back into vocab DB; version sync. No background changes.
- Risk: External API dependency; if rate-limited, enrichment will be skipped without breaking core features.
- Rollback: Restore manager.js and manifest.json from 2.51.6 and bump manifest version.

## 2.51.6 (2026-01-30)
- Files changed: manifest.json, CHANGELOG.md
- Change: Sync manifest version and version_name for consistent display in Chrome extensions list. No logic changes.
- Risk: Metadata-only change.
- Rollback: Restore manifest.json from 2.51.5 and bump manifest version.

## 2.51.5 (2026-01-30)
- Files changed: manager.html, manager.css, manager.js, manifest.json, CHANGELOG.md
- Change: Fix review stats 0 bug by making countLastReviewBetween compatible with vocabList string arrays; add gamified dashboard with daily quest/streak/XP/mastery/compare/CTA modules. No backend changes.
- Risk: UI-only changes in manager page. If any layout issues, revert manager.* and bump manifest version.
- Rollback: Restore manager.html/manager.css/manager.js from 2.51.4 and bump manifest version.

## 2.51.4 (2026-01-30)
- Files changed: popup.html, manifest.json, CHANGELOG.md
- Change: Popup action buttons ("立即翻译" / "添加生词") now evenly split width and include emojis for clearer affordance. No logic or storage changes.
- Risk: Pure layout/text change in popup UI. If any layout issues, revert popup.html and bump manifest version.
- Rollback: Restore popup.html from 2.51.3 and bump manifest version.

## 2.51.3 (2026-01-30)
- Files changed: manifest.json, CHANGELOG.md
- Change: Sync manifest `version` and `version_name` to keep Chrome extensions list and manager page displaying the same version. No logic or storage changes.
- Risk: Manifest metadata-only change. If any issue, revert manifest.json and bump version.
- Rollback: Restore manifest.json from 2.51.2 and bump manifest version.

## 2.51.2 (2026-01-30)
- Files changed: manager.html, manifest.json, CHANGELOG.md
- Change: Pronunciation flag buttons (US/UK) in word list restyled to light badge (rounded 12px, #F4F6FA background, 1px subtle border, hover darken + shadow) with 8px spacing preserved. No logic or storage changes.
- Risk: Pure CSS change in manager page. If any layout issues, revert manager.html to previous style and bump manifest version.
- Rollback: Restore manager.html from 2.51.1 and bump manifest version.

## 2.51.1 (2026-01-30)
- Files changed: manager.css, manifest.json
- Change: Pronunciation flag buttons (US/UK) in word list updated from dark pill to light badge style. Now uses #F4F6FA background, 12px border-radius, 6px 12px padding, subtle border and hover effect. No logic or storage changes.
- Risk: Pure CSS change, no business logic affected. If any layout issues, revert manager.css to previous version.
- Rollback: Restore manager.css from 2.51.0 and bump manifest version.
