import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function read(rel) {
  return fs.readFile(path.join(ROOT, rel), 'utf8');
}

function ensureContains(content, pattern, label, failures) {
  if (!content.includes(pattern)) failures.push(label);
}

async function main() {
  const failures = [];

  const html = await read('mobile.html');
  const js = await read('mobile.js');
  const css = await read('mobile.css');

  // Core UX checkpoints
  ensureContains(html, 'id="btn-theme"', 'mobile.html missing #btn-theme', failures);
  ensureContains(html, 'id="brandSlogan"', 'mobile.html missing #brandSlogan', failures);
  ensureContains(html, 'id="dlg-w-play-us"', 'mobile.html missing #dlg-w-play-us', failures);
  ensureContains(html, 'id="dlg-w-play-uk"', 'mobile.html missing #dlg-w-play-uk', failures);
  ensureContains(html, 'id="dlg-w-english"', 'mobile.html missing #dlg-w-english', failures);
  ensureContains(html, 'id="dlg-q-export"', 'mobile.html missing #dlg-q-export', failures);
  ensureContains(html, 'id="btn-cache-bust"', 'mobile.html missing #btn-cache-bust', failures);
  ensureContains(html, 'id="w-sort-state"', 'mobile.html missing #w-sort-state', failures);
  ensureContains(html, 'id="q-sort-state"', 'mobile.html missing #q-sort-state', failures);

  // User-facing wording checkpoints
  ensureContains(html, 'Smart Focus Review (50-100)', 'LASER user wording not applied in mobile.html', failures);
  ensureContains(js, 'laser_badge', 'mobile.js missing laser_badge i18n key', failures);
  ensureContains(js, '\\u667a\\u80fd\\u7cbe\\u9009\\u590d\\u4e60\\uff0850-100\\uff09', 'mobile.js missing zh smart-focus wording', failures);

  // Theme + pronunciation behavior checkpoints
  ensureContains(js, 'resolveThemeMode', 'mobile.js missing resolveThemeMode()', failures);
  ensureContains(js, "themeMode === 'auto'", 'mobile.js missing auto theme mode branch', failures);
  ensureContains(js, 'bindThemeMediaWatcher', 'mobile.js missing system theme watcher', failures);
  ensureContains(js, 'playWordPronounce', 'mobile.js missing playWordPronounce()', failures);
  ensureContains(js, 'speechSynthesis', 'mobile.js missing speechSynthesis fallback', failures);
  ensureContains(js, 'stopWordPronounce', 'mobile.js missing stopWordPronounce()', failures);
  ensureContains(css, '.btn.is-playing', 'mobile.css missing play-state style', failures);

  if (failures.length) {
    console.error('MOBILE_SMOKE_CHECK: FAIL');
    for (const f of failures) console.error(`- ${f}`);
    process.exit(1);
  }

  console.log('MOBILE_SMOKE_CHECK: PASS');
}

main().catch((err) => {
  console.error('MOBILE_SMOKE_CHECK: ERROR');
  console.error(err?.stack || String(err));
  process.exit(1);
});
