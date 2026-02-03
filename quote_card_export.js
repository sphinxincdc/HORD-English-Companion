(function(global){
  'use strict';

  const FONT_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif';

  const DEFAULT_SETTINGS = {
    template: 'light',
    ratio: '1:1',
    showTranslation: true,
    showSource: true,
    showWatermark: true,
  };

  const RATIO_MAP = {
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
  };

  const TEMPLATES = {
    light: {
      pageBg: '#f8fafc',
      cardBg: '#ffffff',
      text: '#0f172a',
      subText: '#475569',
      meta: '#64748b',
      divider: '#e2e8f0',
      shadow: 'rgba(15, 23, 42, 0.12)'
    },
    dark: {
      pageBg: '#0b1220',
      cardBg: '#111c32',
      text: '#e2e8f0',
      subText: '#cbd5e1',
      meta: '#94a3b8',
      divider: '#334155',
      shadow: 'rgba(2, 6, 23, 0.35)'
    },
    academic: {
      pageBg: '#f3f4f6',
      cardBg: '#fffdf8',
      text: '#1f2937',
      subText: '#4b5563',
      meta: '#6b7280',
      divider: '#d1d5db',
      shadow: 'rgba(15, 23, 42, 0.10)'
    },
  };

  function normalizeSettings(settings){
    const next = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    if(!RATIO_MAP[next.ratio]) next.ratio = DEFAULT_SETTINGS.ratio;
    if(!TEMPLATES[next.template]) next.template = DEFAULT_SETTINGS.template;
    next.showTranslation = !!next.showTranslation;
    next.showSource = !!next.showSource;
    next.showWatermark = !!next.showWatermark;
    return next;
  }

  function getDomainText(url){
    const raw = String(url || '').trim();
    if(!raw) return '';
    try{
      return new URL(raw).hostname.replace(/^www\./i, '');
    }catch(_){
      return '';
    }
  }

  function roundedRectPath(ctx, x, y, w, h, r){
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function wrapTextByWidth(ctx, text, maxWidth){
    const source = String(text || '').replace(/\r/g, '');
    const rawLines = source.split('\n');
    const out = [];
    for(const rawLine of rawLines){
      const line = rawLine || '';
      if(!line.trim()){
        out.push('');
        continue;
      }
      let buf = '';
      for(const ch of Array.from(line)){
        const next = buf + ch;
        if(ctx.measureText(next).width <= maxWidth || !buf){
          buf = next;
        }else{
          out.push(buf.trimEnd());
          buf = ch;
        }
      }
      if(buf) out.push(buf.trimEnd());
    }
    return out.length ? out : [''];
  }

  function fitTextBlock(ctx, text, config){
    const {
      maxWidth,
      maxHeight,
      maxLines,
      startSize,
      minSize,
      weight = 700,
      lineHeightRatio = 1.28,
      fontFamily = FONT_STACK,
    } = config;

    let size = startSize;
    while(size >= minSize){
      ctx.font = `${weight} ${size}px ${fontFamily}`;
      const lines = wrapTextByWidth(ctx, text, maxWidth);
      const lineHeight = Math.round(size * lineHeightRatio);
      const totalHeight = lines.length * lineHeight;
      if(lines.length <= maxLines && totalHeight <= maxHeight){
        return { size, lines, lineHeight, totalHeight };
      }
      size -= 2;
    }

    ctx.font = `${weight} ${minSize}px ${fontFamily}`;
    const lineHeight = Math.round(minSize * lineHeightRatio);
    const lines = wrapTextByWidth(ctx, text, maxWidth);
    const safe = lines.slice(0, Math.max(1, maxLines));
    if(lines.length > safe.length){
      const last = safe[safe.length - 1] || '';
      safe[safe.length - 1] = `${last.slice(0, Math.max(0, last.length - 1))}…`;
    }
    const totalHeight = Math.min(maxHeight, safe.length * lineHeight);
    return { size: minSize, lines: safe, lineHeight, totalHeight };
  }

  function drawCard(sentence, rawSettings, targetCanvas){
    const settings = normalizeSettings(rawSettings);
    const dims = RATIO_MAP[settings.ratio];
    const palette = TEMPLATES[settings.template];

    const text = String(sentence?.text || '').trim();
    if(!text){
      throw new Error('该金句缺少英文原文，无法导出。');
    }

    const translation = settings.showTranslation ? String(sentence?.translation || '').trim() : '';
    const sourceDomain = settings.showSource
      ? getDomainText(sentence?.url || sentence?.sourceUrl || sentence?.pageUrl || '')
      : '';

    const canvas = targetCanvas || document.createElement('canvas');
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d');
    if(!ctx){
      throw new Error('浏览器不支持 Canvas 导出。');
    }

    const isPortrait = dims.height > dims.width;
    const outerPad = isPortrait ? 72 : 64;
    const cardRadius = 36;

    ctx.fillStyle = palette.pageBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const card = {
      x: outerPad,
      y: outerPad,
      w: canvas.width - outerPad * 2,
      h: canvas.height - outerPad * 2,
      r: cardRadius,
    };

    ctx.save();
    ctx.shadowColor = palette.shadow;
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    roundedRectPath(ctx, card.x, card.y, card.w, card.h, card.r);
    ctx.fillStyle = palette.cardBg;
    ctx.fill();
    ctx.restore();

    const contentX = card.x + 72;
    const contentW = card.w - 144;
    const titleTop = card.y + (isPortrait ? 130 : 112);
    const footerY = card.y + card.h - 92;

    let transBlock = null;
    if(translation){
      transBlock = fitTextBlock(ctx, translation, {
        maxWidth: contentW,
        maxHeight: isPortrait ? 220 : 170,
        maxLines: isPortrait ? 5 : 4,
        startSize: isPortrait ? 44 : 40,
        minSize: 24,
        weight: 500,
        lineHeightRatio: 1.35,
      });
    }

    const titleMaxHeight = Math.max(
      isPortrait ? 370 : 220,
      (footerY - titleTop - 24 - (transBlock ? (transBlock.totalHeight + 28) : 0))
    );

    const titleBlock = fitTextBlock(ctx, text, {
      maxWidth: contentW,
      maxHeight: titleMaxHeight,
      maxLines: isPortrait ? 12 : 9,
      startSize: isPortrait ? 78 : 82,
      minSize: 32,
      weight: 800,
      lineHeightRatio: 1.28,
    });

    ctx.fillStyle = palette.text;
    ctx.textBaseline = 'top';
    ctx.font = `800 ${titleBlock.size}px ${FONT_STACK}`;
    let y = titleTop;
    for(const line of titleBlock.lines){
      ctx.fillText(line, contentX, y);
      y += titleBlock.lineHeight;
    }

    if(transBlock){
      y += 28;
      ctx.fillStyle = palette.subText;
      ctx.font = `500 ${transBlock.size}px ${FONT_STACK}`;
      for(const line of transBlock.lines){
        ctx.fillText(line, contentX, y);
        y += transBlock.lineHeight;
      }
    }

    ctx.strokeStyle = palette.divider;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(contentX, footerY - 30);
    ctx.lineTo(contentX + contentW, footerY - 30);
    ctx.stroke();

    if(sourceDomain){
      ctx.fillStyle = palette.meta;
      ctx.font = `500 ${isPortrait ? 30 : 28}px ${FONT_STACK}`;
      ctx.fillText(sourceDomain, contentX, footerY);
    }

    if(settings.showWatermark){
      const mark = 'HORD English Companion';
      ctx.fillStyle = palette.meta;
      ctx.font = `600 ${isPortrait ? 28 : 26}px ${FONT_STACK}`;
      const markW = ctx.measureText(mark).width;
      ctx.fillText(mark, contentX + contentW - markW, footerY);
    }

    return canvas;
  }

  function getTimestamp(){
    const d = new Date();
    const pad = (n)=>String(n).padStart(2,'0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  async function exportPng(sentence, settings, options){
    const canvas = drawCard(sentence, settings);
    const blob = await new Promise((resolve, reject)=>{
      canvas.toBlob((b)=>{
        if(b) resolve(b);
        else reject(new Error('图片生成失败，请重试。'));
      }, 'image/png');
    });

    const prefix = (options && options.filenamePrefix) || 'hord-english-companion-quote';
    const filename = `${prefix}-${getTimestamp()}.png`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    try{
      a.click();
    }finally{
      setTimeout(()=>{
        URL.revokeObjectURL(url);
        a.remove();
      }, 120);
    }
    return filename;
  }

  function renderPreview(sentence, settings, canvas){
    if(!canvas) return;
    const s = normalizeSettings(settings);
    const dims = RATIO_MAP[s.ratio];
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const targetWidth = Math.max(220, Math.floor(canvas.clientWidth || 320));
    const targetHeight = Math.floor(targetWidth * (dims.height / dims.width));
    canvas.width = Math.floor(targetWidth * dpr);
    canvas.height = Math.floor(targetHeight * dpr);
    canvas.style.height = `${targetHeight}px`;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const temp = drawCard(sentence, s);
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(temp, 0, 0, targetWidth, targetHeight);
  }

  global.QuoteCardExporter = {
    DEFAULT_SETTINGS,
    normalizeSettings,
    getDomainText,
    drawCard,
    exportPng,
    renderPreview,
    getTimestamp,
  };
})(globalThis);
