## 2.54.60 (2026-02-20)
- Export default policy update (shared engine):
  - `export-card.js` default `showSource` changed to `false`.
  - New export defaults now consistently hide source by default across desktop/mobile flows unless explicitly enabled.
- Mobile title consistency:
  - `mobile.js` now sets document title from i18n brand title on load (`HORD 手机管理器 · HORD`).

## 2.54.59 (2026-02-20)
- Mobile quote export polish:
  - Dialog export now uses the *current dialog content* (including unsaved edits in text/translation/note) instead of stale record values.
  - Added dedicated `exportCurrentDialogQuoteImage()` path for single-quote export from dialog.
  - Preview now auto-rerenders on viewport resize while dialog is open.
- Mobile quote dialog visual/readability refinement:
  - Added scrollable dialog body with max-height cap to prevent action/footer overlap on small screens.
  - Improved preview control spacing and range slider sizing.
  - On narrow screens, quote action buttons switch to a 2-column layout for clearer touch targets.

## 2.54.58 (2026-02-20)
- Mobile quote export upgraded to preview-first workflow:
  - Added in-dialog export preview canvas for single-quote export.
  - Added mobile export tuning controls: template, ratio, EN/CN fonts, and font-size adjustment.
  - Controls are synchronized between quote list toolbar and quote dialog preview.
- Mobile quote dialog readability polish:
  - Removed sticky/overlapping footer behavior for action bar.
  - Improved visual rhythm for preview area and action section.
- Export defaults remain product-safe:
  - Source and annotation are disabled by default.
  - Watermark mode kept as bottom signature only.
- Mobile smoke check script corrected to assert current Smart Focus wording.

## 2.54.57 (2026-02-20)
- Mobile quote dialog visual refactor (show-first):
  - Added dedicated reading view block (`quoteReadEn/quoteReadCn`) as default.
  - Edit inputs moved into separate edit panel (hidden by default).
  - Dialog action bar redesigned to cleaner sticky footer, unified button heights, reduced visual noise.
  - Edit/Delete controls are now low-frequency in view mode (delete hidden unless editing).
- Mobile export defaults aligned with product rule:
  - Default export now disables `showSource` and `showAnnotation`.
  - Watermark mode forced to bottom signature (`watermarkMode: 'signature'`) for mobile export.

## 2.54.56 (2026-02-20)
- Popup diagnostics panel removal:
  - Removed inline diagnostics window trigger path from `content.js`.
  - Removed `Alt+Shift+D` hotkey listener for diagnostics panel.
  - Kept core popup behavior unchanged; only removed intrusive debug UI.

## 2.54.55 (2026-02-20)
- Gemini reliability (quota protection):
  - Added automatic cooldown for Gemini after `429/403` to avoid repeated failing calls and popup latency spikes.
  - Cooldown window: ~15 minutes in background worker memory.
  - Added Options error mapping for `google_gemini_cooldown` with clear Chinese guidance.

## 2.54.54 (2026-02-20)
- Popup trigger anti-noise hardening:
  - Added stricter URL/domain-like snippet filtering in `content.js` trigger gate.
  - Added symbol-density guard to avoid popup on mixed technical/noisy text selections.
  - Goal: reduce false popup triggers on URL snippets, query fragments, and mixed-content blocks.

## 2.54.53 (2026-02-20)
- Mobile quote dialog keyboard hardening (iOS/Safari):
  - Added strict view-mode guard to prevent keyboard popup unless `编辑` is explicitly enabled.
  - Added focus/pointer/touch interception on quote fields in view mode.
  - Added `enforceQuoteViewNoKeyboard()` fallback after opening/cancel-edit.

## 2.54.52 (2026-02-20)
- Mojibake/garbled text fix:
  - Fixed mobile review low-frequency action label (`删除本词`) rendering issue.
  - Fixed iPhone export hint text in quote export toast to proper Chinese.
- Translation popup:
  - Retained previous `translateResultCount` behavior fix (web popup now follows configured result count).
- Mobile review:
  - Retained previous default/persisted session-size fix (`default 20`, custom value persists).

## 2.54.51 (2026-02-20)
- Popup translation result count:
  - Web popup now strictly follows configured result count (`translateResultCount`) instead of hardcoded 2.
  - `content.js` now reads `resultLimit` from background response and slices translation cards accordingly.
- Mobile review session size:
  - Added persistent session-size setting (`hord_mobile_review_limit_v1`) with default fallback = 20.
  - Review count input now sanitizes/persists on `change/blur/Enter`.
  - Start review always uses persisted value and writes back normalized value.

## 2.54.50 (2026-02-20)
- Translation reliability (non-YouTube):
  - `fallback_google` is now always appended as final provider in enabled order normalization.
  - Added emergency final fallback call in `translatePipeline` to reduce empty popup cases when selected providers all fail.
  - Added clear Gemini panel note in options: `429/403` will auto-degrade and not block popup translation.
- Mobile top-bar polish:
  - Reserved right-side space in top header and tuned theme toggle style/position for better visual integration.

## 2.54.49 (2026-02-20)
- Options quick recovery:
  - Added `修复弹窗配置` action to reset popup blockers in one click:
    - `global_disable = false`
    - `blacklist_domain = []`
    - `blacklist_page = []`
- Options compact UX:
  - Added persistent compact/full view toggle in top nav (`⚡ 简版视图` / `🧩 完整视图`).
  - Compact view hides low-frequency Step 1/2 cards and keeps high-frequency Step 3 focused.

## 2.54.48 (2026-02-20)
- Options UX and performance:
  - Added `简版视图 / 完整视图` toggle on top nav (`toggleCompactView`).
  - Default to compact view (focus on Step 3 high-frequency operations), with Step 1/2 hidden until expanded.
  - Added compact state persistence via localStorage (`options_compact_view_v1`).
  - Reduced provider panel jank by debouncing high-frequency list re-renders.
- Mobile stability follow-up:
  - Continued hardening for UTF-8/mobile consistency from previous patch with passing smoke checks.

## 2.54.47 (2026-02-20)
- Mobile encoding and icon chain hardening:
  - Rebuilt `mobile.html` to valid UTF-8 and fixed broken static labels/tags.
  - Rebuilt `mobile.webmanifest` to valid UTF-8 JSON with stable iOS/Android icon declarations.
  - Updated Apple touch icon and manifest cache-busting query to `2.54.47`.
- Mobile quote dialog keyboard guard strengthened:
  - In default view mode, quote fields are now `readonly + disabled + tabindex=-1 + pointer-events:none`.
  - Keyboard appears only after pressing `编辑`.
- Options page performance tune:
  - Added debounced provider list rendering (`scheduleRenderProviderOrderList`).
  - Replaced high-frequency immediate re-render on filters/config edits with scheduled updates.

## 2.54.46 (2026-02-19)
- Review session size: restored default to 20 and removed Laser hard clamp in both mobile review (`mobile.js`) and desktop test page (`test.js`). Custom session size now works normally.
- Review scoring durability: desktop review now persists `OP_RATE_WORD` before advancing, so unfinished sessions still count to backend stats immediately.
- Review pronunciation UX:
  - Mobile review card now shows US/UK phonetics with `🔰 US` / `🔰 UK` play buttons.
  - Desktop review card now adds US/UK play buttons with audio URL first, `speechSynthesis` fallback.
- Popup trigger hygiene:
  - Word-mode phrase threshold changed to <= 3 words.
  - URL/domain/email-like selections no longer trigger popup.
- Mobile web delivery:
  - Added `scripts/watch_mobile_publish.ps1` for auto build/sync/commit/push to site repo.
  - Added npm script `watch:mobile-web:push`.

## 2.54.45 (2026-02-19)
- Mobile quote dialog: hardened default view mode (readonly + inputmode=none), added iOS keyboard guard (blur active element on open, keep focus on dialog container until Edit).
- Mobile theme control: fixed floating top-right control anchoring with safe-area right alignment.
- Popup diagnostics: added in-page diagnostics panel (Alt+Shift+D), trigger logs, and one-click reset for popup disable/blacklist config.
- Popup stability guard: narrowed trigger blocking to unsafe contexts only and added immediate selection snapshot trigger path on mouseup/dblclick.

## 2.54.44 (2026-02-19)
- Mobile icon chain hardening: added iOS apple-touch-icon sizes (180/167/152/120) and cache-busting query in mobile.html.
- Mobile web manifest normalized to UTF-8 and corrected localized metadata/icons for stable Add-to-Home-Screen behavior on iOS.
- Added generated icon assets: icon-180.png, icon-167.png, icon-152.png, icon-120.png.

## 2.54.43 (2026-02-19)
- Fix: selection/double-click popup reliability on web pages. Popup trigger now snapshots selection immediately and only blocks unsafe contexts (input/textarea/contenteditable, code/editor, sensitive form flow).
- Fix: manual selection popup no longer gets suppressed by generic layout-container heuristics.
- Fix: content build marker updated to 2.54.43-popupfix for field diagnostics.
- Release: bumped extension version to 2.54.43.

## 2.53.70 (2026-02-03)
- Rebrand: Unified product name to `HORD English Companion` across popup/manager/options/content/manifest and docs.
- Rebrand: Unified slogan to `Yesterday, You Said Tomorrow` in UI and export brand copy.
- Tweak: Updated release zip/output naming and quote card export default filename prefix to the new brand.
- Scope: `manifest.json`, `popup.html`, `manager.html`, `manager.js`, `options.html`, `content.js`, `README.md`, `export-card.js`, `quote_card_export.js`, `scripts/release_zip.sh`, `CHANGELOG.md`.

## 2.53.70 (2026-02-03)
- Tweak: BYOK 设置页（浅色模式）降低“过白/刺眼”观感：背景与卡片/输入框改为更柔和的浅紫灰系渐变与半透明 surface，减少纯白占比但不改任何功能逻辑。
- Tweak: 管理页品牌标题区文案结构优化（更清晰的中英文品牌层级 + 标语），版本号仍由 `manifest.json` 自动注入。
- Scope: `options.html`, `manager.html`, `README.md`, `manifest.json`, `CHANGELOG.md`.

## 2.53.69 (2026-02-03)
- Tweak: 复习会话改为“仅提示不加题”模式：低分与错题仅给补充复习建议，不再自动把题量从设定值（如 20）扩展到更多。
- Scope: `test.js`, `manifest.json`, `CHANGELOG.md`.

## 2.53.68 (2026-02-03)
- Tweak: 去除评分按钮禁用态上的斜纹遮罩，仅保留低饱和/低对比与弱阴影，视觉更干净。
- Tweak: 强化“待翻面”状态条提示：新增左侧锁图标与更浅蓝底（夜间也同步增强），与按钮禁用语义保持一致。
- Scope: `test.js`, `styles.css`, `manifest.json`, `CHANGELOG.md`.

## 2.53.67 (2026-02-03)
- Tweak: 优化复习页评分按钮禁用态视觉（未翻面时）：降低饱和度与对比、弱化阴影，并增加轻微斜纹遮罩，强化“当前不可评分”识别度。
- Scope: `styles.css`, `manifest.json`, `CHANGELOG.md`.

## 2.53.66 (2026-02-03)
- Tweak: 消除复习页“横条横跳”与底部抖动：评分区改为固定占位，按钮始终可见（未翻面时禁用态），不再因翻面触发布局重排。
- Tweak: 状态工具栏改为固定双列网格（左状态/右快捷键），统一宽度并启用溢出省略，避免文案长度变化导致重心漂移。
- Tweak: 状态切换仅做文案与可用态变化（不再显示/隐藏整块），整体交互节奏更稳定。
- Scope: `test.js`, `test.html`, `styles.css`, `manifest.json`, `CHANGELOG.md`.

## 2.53.65 (2026-02-03)
- Tweak: 重构复习页底部提示为“评分工具栏”样式（非悬浮横条）：移入评分区头部、降低视觉重量、与评分按钮形成同一交互区。
- Tweak: 工具栏状态改为双态文案（待翻面 / 待评分），并在右侧同步展示对应快捷键提示（翻面后不再强调 Space）。
- Scope: `test.html`, `test.js`, `styles.css`, `manifest.json`, `CHANGELOG.md`.

## 2.53.64 (2026-02-03)
- Tweak: 复习页顶部“结束复习”按钮改为直接跳转回单词本（`manager.html`），不再关闭窗口。
- Scope: `test.js`, `manifest.json`, `CHANGELOG.md`.

## 2.53.63 (2026-02-03)
- Revert: 撤回“进入复习页默认折叠配置区”的改动；恢复为首次进入默认展开配置项（应用后仍保持摘要折叠态）。
- Scope: `test.js`, `manifest.json`, `CHANGELOG.md`.

## 2.53.62 (2026-02-03)
- Tweak: 复习页状态条文案按卡片状态动态切换：未翻面提示 `Space`，翻面后提示直接评分 `1/2/3`，避免语义冲突。
- Tweak: 复习页默认进入“配置摘要折叠态”，做题更聚焦，可通过“修改设置”展开。
- Tweak: 新增评分按钮“最近一次选择”短暂高亮反馈（约 600ms），强化操作确认感。
- Scope: `test.js`, `styles.css`, `manifest.json`, `CHANGELOG.md`.

## 2.53.61 (2026-02-03)
- Tweak: 合并复习页底部“评分反馈条 + 快捷键提示”为统一状态条，改为更稳的实底卡片样式，避免透明叠层冲突与视觉噪音。
- Tweak: 快捷键提示改为仅在未翻面时显示，翻面后自动隐藏，减少干扰。
- Fix: 复习页取消对“英文释义/批注”开关的专业版强制锁定，恢复可手动切换。
- Scope: `test.html`, `test.js`, `styles.css`, `manifest.json`, `CHANGELOG.md`.

## 2.53.60 (2026-02-03)
- Feature: 复习会话新增自适应结束策略：连续高分可提前结束，低分累计会自动补充巩固词，避免“机械刷完固定题量”。
- Feature: 新增错题二次出现机制：本轮首次评分为 `0/3` 的词会在会话尾部自动再刷一轮。
- Feature: 新增答后即时反馈条，显示“下次复习时间 + 掌握度变化 + 易错词状态”。
- Feature: 结束页新增会话复盘（最弱 Top5、建议下轮模式、预计下轮用时 + 本轮用时）。
- Scope: `test.js`, `test.html`, `styles.css`, `manifest.json`, `CHANGELOG.md`.

## 2.53.59 (2026-02-03)
- Tweak: 复习页键盘评分改为“先翻面再确认”流程：未翻面时按 `1/2/3` 仅翻到答案面，不立即计分；再次按 `1/2/3` 才按确认键计分。
- Scope: `test.js`, `manifest.json`, `CHANGELOG.md`.

## 2.53.58 (2026-02-03)
- Tweak: 艾宾浩斯复习页放宽键盘评分限制，未翻面（未显示释义）时也可直接按 `1/2/3` 评分，提升纯键盘刷题效率。
- Scope: `test.js`, `manifest.json`, `CHANGELOG.md`.

## 2.53.57 (2026-02-03)
- Tweak: 艾宾浩斯复习页新增“悬浮快捷键提示条”（`Space / 1 / 2 / 3`），位于评分区上方，便于键盘刷题。
- Tweak: 配置摘要新增“本次入口模式”展示（如英语仓库/易错词/陌生词等），便于确认当前复习来源。
- Scope: `test.html`, `test.js`, `styles.css`, `manifest.json`.

## 2.53.56 (2026-02-03)
- Fix: 修复艾宾浩斯复习页在夜间深色模式下出现大面积白底的问题（复习窗口、配置区、卡片面、结束页统一深紫暗色）。
- Fix: 为复习页补齐与 popup/manager/options 一致的主题同步逻辑（storage 变更、`THEME_UPDATED` 消息、系统深色监听）。
- Scope: `test.js`, `styles.css`, `manifest.json`.

## 2.53.55 (2026-02-03)
- Fix: 修复 BYOK 页面输入框在带“显示/隐藏”按钮时的横向溢出问题（统一 box-sizing，限制卡片与输入容器宽度，避免“长条穿出卡片”）。
- Tweak: 优化 popup 顶部品牌区密度与对齐（标题更紧凑、设置按钮缩小、间距下调），缓解“拥挤/偏右”观感。
- Scope: `options.html`, `popup.html`, `manifest.json`.

## 2.53.54 (2026-02-03)
- Fix: 首轮修复 BYOK 输入行与眼睛按钮在部分分辨率下的布局溢出，补充 inputWrap/card/grid 的最小宽度与溢出保护。
- Tweak: popup 标题区缩小设置按钮并收紧间距，提升标题可读性。
- Scope: `options.html`, `popup.html`, `manifest.json`.

## 2.53.53 (2026-02-03)
- Fix: 修复管理页夜间模式下单词/金句卡片释义对比度问题（避免浅色文字落在浅背景导致看不清）。
- Fix: 清理 manager 工具栏样式中的转义换行残留，恢复 CSS 规则稳定解析。
- Scope: `manager.html`, `manifest.json`.

## 2.53.52 (2026-02-03)
- Files: manifest.json, CHANGELOG.md, popup.html, popup.js, options.html, options.js, manager.html, manager.js, content.js
- Change: 统一主题切换为单一 `themeMode`（auto/light/dark）并保持旧键兼容，popup/options/manager/content 全部即时响应主题更新；优化 popup 视觉密度（更紧凑输入区、设置按钮缩小、自动/手动夜间主从禁用态更明显），并强化“完全关闭插件”危险态（开启深红底白字、关闭红描边）；BYOK 页面收紧间距、测试按钮状态色统一、底部操作区 sticky、敏感 key 新增显示/隐藏切换。
- Scope: UI/主题交互一致性增强，不改词库/复习/同步业务逻辑。
- Risk: 主题切换跨页面联动依赖 storage/message 监听，若浏览器限制消息派发，页面仍会在重新打开后正确生效。

## 2.53.51 (2026-02-03)
- Files: manifest.json, theme.css, popup.html, popup.js, manager.html, manager.js, options.html, options.js, CHANGELOG.md
- Change: 品牌名称统一改为“HORD English Companion”（manifest、popup、manager、options）；深色主题开关升级为“自动夜间深色模式 + 夜间深色模式”双逻辑（自动=跟随系统；关闭自动后可手动强制夜间）；手动夜间与系统自动夜间使用同一套深紫主题令牌，并同步应用到 popup、manager（单词本）、options（设置页）。
- Scope: UI/主题与文案同步，不改词库/复习等业务逻辑。
- Risk: 若个别模块对 `popup_force_dark` 旧键有依赖，已保留兼容回退读取。

## 2.53.50 (2026-02-03)
- Files: popup.html, popup.js, manifest.json, CHANGELOG.md
- Change: Added a manual dark-mode switch in popup menu (深色模式) so users can force deep-purple night UI during daytime; preference persisted in storage key `popup_force_dark`.
- Risk: Popup-only UI toggle; no business/data logic impact.
- Rollback: Restore listed files from 2.53.49 and bump manifest version.

## 2.53.49 (2026-02-03)
- Files: theme.css, popup.html, options.html, manager.html, manifest.json, CHANGELOG.md
- Change: Unified deep-purple night mode for popup/options/manager (auto via system dark mode), matching content popup style tokens; no logic/data changes.
- Risk: UI-only theme override; if any contrast issue appears on specific blocks, revert affected HTML style block and keep token layer.
- Rollback: Restore listed files from 2.53.48 and bump manifest version.

## 2.53.48 (2026-02-03)
- Files changed: content.js, manifest.json, CHANGELOG.md
- Change: Added a deep-purple night mode for the in-page word popup (content dialog), including dark token palette, dark cards/inputs/chips, and automatic theme switch via `prefers-color-scheme` or page `dark` class, without changing popup behavior logic.
- Risk: Low; style-token/UI-only update inside content popup.
- Rollback: Restore listed files from 2.53.47 and bump manifest version.

## 2.53.47 (2026-02-03)
- Files changed: manager.js, manifest.json, CHANGELOG.md
- Change: Added a hidden DevTools debug hook `window.__vbDebugQuoteExport` for quote-card export self-testing (open modal by sentence id, render preview, export by id, list sentence ids), completing stage-3 minimal debug entry without changing business flow.
- Risk: Low; debug-only global helper, no existing user-facing logic changed.
- Rollback: Restore listed files from 2.53.46 and bump manifest version.

## 2.53.46 (2026-02-03)
- Files changed: manager.html, manager.js, styles.css, quote_card_export.js, manifest.json, CHANGELOG.md
- Change: Added sentence-level “导出卡片” flow in manager with canvas PNG export modal (Light/Dark/Academic templates, 1:1 & 4:5 ratios, translation/source/watermark switches, preview, and localStorage persistence); added per-card export action and shared toast/error feedback; extracted export rendering into standalone `quote_card_export.js`; updated brand signature placement to `Yesterday, You Said Tomorrow` under `HORD English Companion` and removed right-side gold artistic motto.
- Risk: Medium-low; manager UI gained one new modal and one new per-item action, no existing word/review data logic changed.
- Rollback: Restore listed files from 2.53.45 and bump manifest version.

## 2.53.45 (2026-02-03)
- Files changed: manager.html, popup.html, manifest.json, CHANGELOG.md
- Change: Added visible right-side gold artistic header motto “Yesterday, You Said Tomorrow”; rebuilt manager search expansion as an absolute floating field to prevent toolbar overlap and misalignment, with responsive expand width (wide 360px / narrow 260px); further compacted popup layout spacing; compressed top six stat cards to remove extra bottom blank space.
- Risk: Low; UI/CSS-only adjustments, no data or business-logic changes.
- Rollback: Restore listed files from 2.53.44 and bump manifest version.

## 2.53.44 (2026-02-03)
- Files changed: manager.html, popup.html, manifest.json, CHANGELOG.md
- Change: Added right-side gold artistic hero text “Yesterday, You Said Tomorrow”; fixed manager search expansion to responsive in-flow behavior (wide 360px / narrow 260px) to avoid overlap and toolbar misalignment; further tightened popup spacing for a denser layout; compressed top six stat cards again to remove extra bottom whitespace.
- Risk: Low; UI-only changes.
- Rollback: Restore listed files from 2.53.43 and bump manifest version.

## 2.53.43 (2026-02-03)
- Files changed: manager.html, popup.html, manifest.json, CHANGELOG.md
- Change: Fixed manager search expansion overlap/misalignment by opening expanded search below the toolbar row with higher local z-index; compacted popup spacing (brand/header/cards/tool rows/system controls) for denser layout; darkened manager clear buttons to a deeper red for stronger visual hierarchy.
- Risk: Low; UI/CSS-only adjustments.
- Rollback: Restore listed files from 2.53.42 and bump manifest version.

## 2.53.42 (2026-02-03)
- Files changed: manager.html, manager.js, content.js, manifest.json, CHANGELOG.md
- Change: Compacted the top six manager stat cards by reducing extra bottom whitespace/height; added Cmd/Ctrl+Enter quick-save for all note editors (word notes and sentence notes in manager, plus in-page word popup note editor).
- Risk: Low; UI spacing tweak + keyboard shortcut only.
- Rollback: Restore listed files from 2.53.41 and bump manifest version.

## 2.53.41 (2026-02-03)
- Files changed: manager.html, popup.html, manifest.json, CHANGELOG.md
- Change: Removed emoji from manager toolbar import/export/refresh buttons; word-manager search now expands as a right-side floating input so toolbar layout does not shift; popup disable toggles now show red active state (row + switch track); popup brand text block and settings button are vertically aligned top/bottom.
- Risk: Low; UI-only changes.
- Rollback: Restore listed files from 2.53.40 and bump manifest version.

## 2.53.40 (2026-02-03)
- Files changed: manager.js, manager.html, manager.css, manifest.json, CHANGELOG.md
- Change: Word status single-click now keeps the current list order (no immediate resort) until explicit refresh/re-enter/resort; top six stat cards are compacted with title/value left-aligned and card colors adjusted (英语仓库=浅青, 易错词=浅蓝); dashboard 8-card text contrast improved for readability.
- Risk: Low; one sorting behavior change on manager list interaction plus UI-only style tuning.
- Rollback: Restore listed files from 2.53.39 and bump manifest version.

## 2.53.39 (2026-02-03)
- Files changed: content.js, popup.html, options.html, manager.html, manifest.json, CHANGELOG.md
- Change: Moved in-page note chip to between status buttons and definition sections; removed top divider lines above status row and footer jump links; reduced blank spacing between action row and Chinese definitions; aligned popup settings button with title row and changed subtitle to “Yesterday, You Said Tomorrow”; restored emoji labels across popup/options/manager/content UI text.
- Risk: Low; UI text/style only, no functional logic changed.
- Rollback: Restore listed files from 2.53.38 and bump manifest version.

## 2.53.38 (2026-02-02)
- Files changed: popup.html, options.html, content.js, manifest.json, CHANGELOG.md
- Change: Reduced popup menu typography to prevent clipping; refactored BYOK options page into the same visual token system; restored in-page status-button active colors to deeper per-status tones (red/yellow/green/purple); resized clear-status button to match status button height; moved “更多引擎” to an inline pill button after Urban with expandable extra-engine panel; tightened top action-row vertical spacing in the in-page popup.
- Risk: Low; UI-only changes, no storage or logic paths changed.
- Rollback: Restore listed files from 2.53.37 and bump manifest version.

## 2.53.37 (2026-02-02)
- Files changed: theme.css, popup.html, manager.html, manager.css, content.js, manifest.json, CHANGELOG.md
- Change: Visual-unification refactor (no logic changes): unified color/radius/shadow/typography rules across popup, manager, and in-page content popup; removed emoji icons; mapped buttons to Primary/Secondary/Danger and status chips to pill tags.
- Risk: Low; styling/markup-only.
- Rollback: Restore listed files from 2.53.36 and bump manifest version.

## 2.53.36 (2026-02-02)
- Files changed: content.js, manifest.json, CHANGELOG.md
- Change: In-page popup footer shows only Baidu/Cambridge/Urban by default; remaining engines are moved under a collapsible “更多引擎” button.
- Risk: Low; popup UI only.
- Rollback: Restore listed files from 2.53.35 and bump manifest version.

## 2.53.35 (2026-02-02)
- Files changed: manager.html, manifest.json, CHANGELOG.md
- Change: Stat cards align title/value; search input expands on focus (and stays expanded when non-empty) to avoid truncation.
- Risk: Low; manager UI only.
- Rollback: Restore listed files from 2.53.34 and bump manifest version.

## 2.53.34 (2026-02-02)
- Files changed: popup.html, popup.js, manifest.json, CHANGELOG.md
- Change: Popup settings button enlarged and pinned top-right; removed popup version label; fixed long URL text squeezing the toggle switch.
- Risk: Low; popup UI only.
- Rollback: Restore listed files from 2.53.33 and bump manifest version.

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
- Change: Rebrand to HORD English Companion; logo purple embed + larger; tagline font updated; word-card right overflow further constrained; action button sizes unified. Version sync.
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
- Change: Manager header tagline updated to "Craft Your HORD English Companion"; review test completion now shows score + encouragement. Version sync.
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



