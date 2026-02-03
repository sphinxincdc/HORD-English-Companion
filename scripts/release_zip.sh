#!/usr/bin/env bash
set -euo pipefail

# 在项目根目录执行
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 从 manifest.json 里取 version（不依赖 jq）
VERSION="$(node -e "const m=require('./manifest.json'); console.log(m.version || '0.0.0')")"

OUTDIR="dist"
ZIPNAME="HORD-English-Companion-${VERSION}.zip"

rm -rf "$OUTDIR"
mkdir -p "$OUTDIR"

# 排除开发杂项（按需增减）
zip -r "$OUTDIR/$ZIPNAME" . \
  -x "*.git*" \
  -x "dist/*" \
  -x "node_modules/*" \
  -x "*.DS_Store" \
  -x "*.log" \
  -x "*.zip" \
  -x "scripts/*" \
  -x "assets/screenshots/*" \
  -x "vocab_words_*.json"

echo "✅ Built: $OUTDIR/$ZIPNAME"
