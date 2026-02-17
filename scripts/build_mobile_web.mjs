import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'mobile_web', 'dist');

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function copyFile(src, dst) {
  await fs.copyFile(src, dst);
}

function patchHtml(html) {
  let out = html;
  out = out.replace('<title>HORD Mobile Manager</title>', '<title>HORD Mobile Web Manager</title>');
  return out;
}

async function main() {
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await ensureDir(OUT_DIR);

  const files = [
    'mobile.js',
    'mobile.css',
    'idb-kv.js',
    'data-layer.js',
    'review-engine.js',
    'icon128.png',
    'logo-square-1024.png',
  ];

  for (const f of files) {
    await copyFile(path.join(ROOT, f), path.join(OUT_DIR, f));
  }

  const html = await fs.readFile(path.join(ROOT, 'mobile.html'), 'utf8');
  await fs.writeFile(path.join(OUT_DIR, 'index.html'), patchHtml(html), 'utf8');
  await fs.copyFile(path.join(ROOT, 'mobile.webmanifest'), path.join(OUT_DIR, 'manifest.webmanifest'));

  const headers = [
    '/*',
    '  Cache-Control: public, max-age=600',
    '',
    '/index.html',
    '  Cache-Control: no-store',
    '',
  ].join('\n');
  await fs.writeFile(path.join(OUT_DIR, '_headers'), headers, 'ascii');

  process.stdout.write(`MOBILE_WEB_DIST: ${OUT_DIR}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
