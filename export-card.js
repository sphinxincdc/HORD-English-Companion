(function(global){
  'use strict';

  const BRAND_NAME = 'HORD';
  const BRAND_TAGLINE = 'OWN YOUR WORDS';

  const FONT_STACK_QUOTE = '"Inter","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif';
  const FONT_STACK_BODY = '"Noto Sans SC","PingFang SC","Microsoft YaHei","Segoe UI",sans-serif';
  const FONT_STACK_BRAND = '"Inter","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif';

  const MAIN_FONT_OPTIONS = {
    inter: { label: 'Inter', stack: '"Inter","Segoe UI","Helvetica Neue",Arial,sans-serif', primary: 'Inter' },
    playfair: { label: 'Playfair Display', stack: '"Playfair Display","Times New Roman",serif', primary: 'Playfair Display' },
    garamond: { label: 'EB Garamond', stack: '"EB Garamond","Garamond","Times New Roman",serif', primary: 'EB Garamond' },
    lora: { label: 'Lora', stack: '"Lora","Georgia","Times New Roman",serif', primary: 'Lora' },
  };

  const CJK_FONT_OPTIONS = {
    notoSansSC: { label: 'Noto Sans SC', stack: '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif', primary: 'Noto Sans SC' },
    notoSerifSC: { label: 'Noto Serif SC', stack: '"Noto Serif SC","Songti SC","STSong","SimSun",serif', primary: 'Noto Serif SC' },
    lxgwWenKai: { label: 'LXGW WenKai', stack: '"LXGW WenKai","Kaiti SC","KaiTi","STKaiti",serif', primary: 'LXGW WenKai' },
  };

  const DEFAULT_FEATURES = {
    advancedTemplates: false,
    backgroundWatermark: false,
    highResolutionExport: false,
  };

  const DEFAULT_SETTINGS = {
    template: 'light',
    ratio: '1:1',
    density: 'standard',
    fontAdjust: 0,
    mainFont: 'inter',
    cjkFont: 'notoSansSC',
    enhanceContent: true,
    annotationStyle: 'normal',
    showTranslation: true,
    showAnnotation: false,
    showSource: true,
    showWatermark: true,
    watermarkMode: 'signature',
    isProUser: false,
    features: DEFAULT_FEATURES,
    allowAutoHideSecondary: false,
    debugLayout: false,
    previewScale: 1,
    previewFit: true,
    previewScaleMode: 'fit',
    previewMaxHeight: 0,
    previewMaxWidth: 0,
    filenamePattern: 'hord-{date}-{template}-{ratio}',
    sourceTextOverride: '',
    annotationTextOverride: '',
  };

  const RATIO_MAP = {
    '4:5': { width: 1080, height: 1350 },
    '1:1': { width: 1080, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '16:9': { width: 1280, height: 720 },
    '3:4': { width: 900, height: 1200 },
  };

  const RATIO_LAYOUT = {
    '4:5': { quoteMaxLines: 6, translationMaxLines: 4, annotationMaxLines: 3, sourceMaxLines: 2, paddingFactor: 0.045, quoteBaseDiv: 12, extraBottom: 0.02 },
    '1:1': { quoteMaxLines: 5, translationMaxLines: 3, annotationMaxLines: 3, sourceMaxLines: 2, paddingFactor: 0.05, quoteBaseDiv: 12, extraBottom: 0.01 },
    '9:16': { quoteMaxLines: 7, translationMaxLines: 4, annotationMaxLines: 3, sourceMaxLines: 2, paddingFactor: 0.04, quoteBaseDiv: 12, extraBottom: 0.05 },
    '16:9': { quoteMaxLines: 4, translationMaxLines: 3, annotationMaxLines: 2, sourceMaxLines: 2, paddingFactor: 0.045, quoteBaseDiv: 14, extraBottom: 0.01 },
    '3:4': { quoteMaxLines: 6, translationMaxLines: 4, annotationMaxLines: 3, sourceMaxLines: 2, paddingFactor: 0.045, quoteBaseDiv: 12, extraBottom: 0.02 },
  };

  const WATERMARK_MODES = ['signature', 'cornerLogo', 'backgroundLogo'];
  const PRO_TEMPLATE_KEYS = ['hordSignature', 'editorial', 'gradientSoft', 'boldImpact', 'letterClassic', 'parchment', 'inkJournal', 'typewriter'];

  const TEMPLATE_CONFIG = {
    light: {
      background: { type: 'gradient', from: '#f8fbff', to: '#eff3ff' },
      card: { bg: '#ffffff', radius: 16, shadow: 'rgba(73, 93, 179, 0.12)', borderColor: '#dce4f6', borderWidth: 1 },
      quoteStyle: { color: '#1e2446', fontWeight: 780, lineHeightMultiplier: 1.26, quoteScale: 1.0 },
      translationStyle: { color: '#45556f', fontWeight: 540, lineHeightMultiplier: 1.34, scale: 0.62 },
      annotationStyle: { color: '#6d7589', fontWeight: 500, lineHeightMultiplier: 1.34, scale: 0.55 },
      sourceStyle: { color: '#5f6f87', fontWeight: 520, lineHeightMultiplier: 1.3, scale: 0.42 },
      footerStyle: { color: '#697893', fontWeight: 650, lineColor: '#d9e0f3' },
      watermarkStyle: { color: '#7a86b2', signatureOpacity: 0.30, cornerOpacity: 0.18, backgroundOpacity: 0.06 },
      spacingScale: 1.0,
      contentWidthRatio: 0.86,
      texture: { type: 'none' },
    },
    dark: {
      background: { type: 'gradient', from: '#13142d', to: '#1e2251' },
      card: { bg: '#191c35', radius: 16, shadow: 'rgba(3, 8, 25, 0.28)', borderColor: '#2f3a64', borderWidth: 1 },
      quoteStyle: { color: '#edf1ff', fontWeight: 740, lineHeightMultiplier: 1.30, quoteScale: 0.97 },
      translationStyle: { color: '#c3ccf2', fontWeight: 520, lineHeightMultiplier: 1.34, scale: 0.62 },
      annotationStyle: { color: '#b0b9dd', fontWeight: 500, lineHeightMultiplier: 1.34, scale: 0.55 },
      sourceStyle: { color: '#b8c2e9', fontWeight: 520, lineHeightMultiplier: 1.3, scale: 0.42 },
      footerStyle: { color: '#c7cff0', fontWeight: 650, lineColor: '#34406b' },
      watermarkStyle: { color: '#bdc7ef', signatureOpacity: 0.28, cornerOpacity: 0.18, backgroundOpacity: 0.06 },
      spacingScale: 0.95,
      contentWidthRatio: 0.84,
      texture: { type: 'none' },
    },
    hordSignature: {
      background: { type: 'gradient', from: '#2c2c54', to: '#40407a' },
      card: { bg: '#f7f8ff', radius: 16, shadow: 'rgba(28, 33, 88, 0.2)' },
      quoteStyle: { color: '#1f2752', fontWeight: 820, lineHeightMultiplier: 1.22, quoteScale: 1.04 },
      translationStyle: { color: '#3c477d', fontWeight: 560, lineHeightMultiplier: 1.30, scale: 0.63 },
      annotationStyle: { color: '#555e8f', fontWeight: 540, lineHeightMultiplier: 1.32, scale: 0.55 },
      sourceStyle: { color: '#49507b', fontWeight: 520, lineHeightMultiplier: 1.3, scale: 0.42 },
      footerStyle: { color: '#2c2c54', fontWeight: 660, lineColor: '#cfd3ea' },
      watermarkStyle: { color: '#40407a', signatureOpacity: 0.30, cornerOpacity: 0.18, backgroundOpacity: 0.06 },
      spacingScale: 1.05,
      contentWidthRatio: 0.82,
      texture: { type: 'none' },
    },
    editorial: {
      background: { type: 'gradient', from: '#f7f4ed', to: '#ece6da' },
      card: { bg: '#fffdf7', radius: 16, shadow: 'rgba(95, 74, 36, 0.16)' },
      quoteStyle: { color: '#2f2720', fontWeight: 700, lineHeightMultiplier: 1.34, quoteScale: 0.92 },
      translationStyle: { color: '#564638', fontWeight: 500, lineHeightMultiplier: 1.38, scale: 0.61 },
      annotationStyle: { color: '#6d5c4b', fontWeight: 500, lineHeightMultiplier: 1.38, scale: 0.55 },
      sourceStyle: { color: '#6f604f', fontWeight: 520, lineHeightMultiplier: 1.3, scale: 0.42 },
      footerStyle: { color: '#3d3127', fontWeight: 650, lineColor: '#e0d5c4' },
      watermarkStyle: { color: '#6f604f', signatureOpacity: 0.30, cornerOpacity: 0.18, backgroundOpacity: 0.06 },
      spacingScale: 1.08,
      contentWidthRatio: 0.80,
      texture: { type: 'none' },
    },
    gradientSoft: {
      background: { type: 'gradient', from: '#eef2ff', to: '#f4ecff' },
      card: { bg: '#ffffff', radius: 16, shadow: 'rgba(117, 95, 184, 0.16)' },
      quoteStyle: { color: '#25234d', fontWeight: 760, lineHeightMultiplier: 1.27, quoteScale: 0.98 },
      translationStyle: { color: '#554d84', fontWeight: 530, lineHeightMultiplier: 1.35, scale: 0.62 },
      annotationStyle: { color: '#66618f', fontWeight: 510, lineHeightMultiplier: 1.35, scale: 0.55 },
      sourceStyle: { color: '#66618e', fontWeight: 520, lineHeightMultiplier: 1.3, scale: 0.42 },
      footerStyle: { color: '#39386c', fontWeight: 650, lineColor: '#e3dcfa' },
      watermarkStyle: { color: '#7062b3', signatureOpacity: 0.30, cornerOpacity: 0.18, backgroundOpacity: 0.06 },
      spacingScale: 1.0,
      contentWidthRatio: 0.85,
      texture: { type: 'none' },
    },
    boldImpact: {
      background: { type: 'gradient', from: '#0f122c', to: '#2b1b53' },
      card: { bg: '#161a3a', radius: 16, shadow: 'rgba(5, 7, 24, 0.34)' },
      quoteStyle: { color: '#f5f7ff', fontWeight: 860, lineHeightMultiplier: 1.2, quoteScale: 1.1 },
      translationStyle: { color: '#d6dcff', fontWeight: 560, lineHeightMultiplier: 1.28, scale: 0.60 },
      annotationStyle: { color: '#c2c9ee', fontWeight: 530, lineHeightMultiplier: 1.3, scale: 0.55 },
      sourceStyle: { color: '#c1caec', fontWeight: 520, lineHeightMultiplier: 1.28, scale: 0.42 },
      footerStyle: { color: '#e2e7ff', fontWeight: 650, lineColor: '#323a69' },
      watermarkStyle: { color: '#d0d8ff', signatureOpacity: 0.30, cornerOpacity: 0.18, backgroundOpacity: 0.06 },
      spacingScale: 0.9,
      contentWidthRatio: 0.87,
      texture: { type: 'none' },
    },
    letterClassic: {
      background: { type: 'gradient', from: '#f4efe4', to: '#efe7d8' },
      card: { bg: '#fffaf1', radius: 16, shadow: 'rgba(92, 72, 36, 0.16)', borderColor: '#d8c7a8', borderWidth: 1.2 },
      quoteStyle: { color: '#2f2a24', fontWeight: 700, lineHeightMultiplier: 1.32, quoteScale: 0.96 },
      translationStyle: { color: '#52473b', fontWeight: 520, lineHeightMultiplier: 1.36, scale: 0.60 },
      annotationStyle: { color: '#6a5d4d', fontWeight: 510, lineHeightMultiplier: 1.36, scale: 0.55 },
      sourceStyle: { color: '#6f604f', fontWeight: 520, lineHeightMultiplier: 1.3, scale: 0.42 },
      footerStyle: { color: '#4a3e33', fontWeight: 650, lineColor: '#d8c7a8' },
      watermarkStyle: { color: '#6f604f', signatureOpacity: 0.24, cornerOpacity: 0.16, backgroundOpacity: 0.05 },
      spacingScale: 1.02,
      contentWidthRatio: 0.84,
      texture: { type: 'letter' },
    },
    parchment: {
      background: { type: 'gradient', from: '#e7d3a8', to: '#d6bf8d' },
      card: { bg: '#f1dfb5', radius: 16, shadow: 'rgba(92, 62, 17, 0.2)', borderColor: '#b89863', borderWidth: 1.4 },
      quoteStyle: { color: '#3a2c1d', fontWeight: 690, lineHeightMultiplier: 1.34, quoteScale: 0.92 },
      translationStyle: { color: '#5b4730', fontWeight: 520, lineHeightMultiplier: 1.36, scale: 0.6 },
      annotationStyle: { color: '#664f37', fontWeight: 500, lineHeightMultiplier: 1.36, scale: 0.55 },
      sourceStyle: { color: '#755a3c', fontWeight: 520, lineHeightMultiplier: 1.3, scale: 0.42 },
      footerStyle: { color: '#523e29', fontWeight: 650, lineColor: '#b89863' },
      watermarkStyle: { color: '#6f5335', signatureOpacity: 0.22, cornerOpacity: 0.14, backgroundOpacity: 0.04 },
      spacingScale: 1.04,
      contentWidthRatio: 0.82,
      texture: { type: 'parchment' },
    },
    inkJournal: {
      background: { type: 'gradient', from: '#edf1f4', to: '#e4e9ee' },
      card: { bg: '#f8fbfe', radius: 16, shadow: 'rgba(55, 65, 81, 0.14)', borderColor: '#cfd9e4', borderWidth: 1.1 },
      quoteStyle: { color: '#202a36', fontWeight: 720, lineHeightMultiplier: 1.3, quoteScale: 0.97 },
      translationStyle: { color: '#445364', fontWeight: 520, lineHeightMultiplier: 1.34, scale: 0.61 },
      annotationStyle: { color: '#526173', fontWeight: 510, lineHeightMultiplier: 1.34, scale: 0.55 },
      sourceStyle: { color: '#5f6d7d', fontWeight: 520, lineHeightMultiplier: 1.3, scale: 0.42 },
      footerStyle: { color: '#37475a', fontWeight: 650, lineColor: '#c4d0dd' },
      watermarkStyle: { color: '#5b6a7a', signatureOpacity: 0.22, cornerOpacity: 0.14, backgroundOpacity: 0.05 },
      spacingScale: 1.0,
      contentWidthRatio: 0.85,
      texture: { type: 'journal' },
    },
    typewriter: {
      background: { type: 'gradient', from: '#dbdcd4', to: '#d0d2c9' },
      card: { bg: '#f1f2eb', radius: 14, shadow: 'rgba(43, 45, 35, 0.12)', borderColor: '#b8bba8', borderWidth: 1.2 },
      quoteStyle: { color: '#2f312e', fontWeight: 690, lineHeightMultiplier: 1.3, quoteScale: 0.95 },
      translationStyle: { color: '#4b4f47', fontWeight: 520, lineHeightMultiplier: 1.34, scale: 0.6 },
      annotationStyle: { color: '#5a5e55', fontWeight: 500, lineHeightMultiplier: 1.34, scale: 0.55 },
      sourceStyle: { color: '#63675f', fontWeight: 520, lineHeightMultiplier: 1.3, scale: 0.42 },
      footerStyle: { color: '#4b4f47', fontWeight: 650, lineColor: '#b4b8aa' },
      watermarkStyle: { color: '#585d55', signatureOpacity: 0.2, cornerOpacity: 0.14, backgroundOpacity: 0.04 },
      spacingScale: 0.94,
      contentWidthRatio: 0.84,
      texture: { type: 'typewriter' },
    },
  };

  function clamp(v, min, max){
    return Math.max(min, Math.min(max, v));
  }

  function normalizeFeatures(features){
    const out = Object.assign({}, DEFAULT_FEATURES, features || {});
    out.advancedTemplates = !!out.advancedTemplates;
    out.backgroundWatermark = !!out.backgroundWatermark;
    out.highResolutionExport = !!out.highResolutionExport;
    return out;
  }

  function normalizeSettings(settings){
    const raw = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const out = Object.assign({}, raw);
    out.features = normalizeFeatures(raw.features);
    out.showTranslation = !!raw.showTranslation;
    out.showAnnotation = !!raw.showAnnotation;
    out.showSource = !!raw.showSource;
    out.showWatermark = !!raw.showWatermark;
    out.isProUser = !!raw.isProUser;
    out.allowAutoHideSecondary = !!raw.allowAutoHideSecondary;
    out.debugLayout = !!raw.debugLayout;
    out.density = ['compact', 'standard', 'airy'].includes(raw.density) ? raw.density : 'standard';
    out.fontAdjust = clamp(Number(raw.fontAdjust || 0), -8, 8);
    out.mainFont = MAIN_FONT_OPTIONS[raw.mainFont] ? raw.mainFont : 'inter';
    out.cjkFont = CJK_FONT_OPTIONS[raw.cjkFont] ? raw.cjkFont : 'notoSansSC';
    out.enhanceContent = raw.enhanceContent !== false;
    out.annotationStyle = raw.annotationStyle === 'emphasis' ? 'emphasis' : 'normal';
    out.previewScaleMode = String(raw.previewScaleMode || 'fit');
    out.previewFit = raw.previewFit !== false;
    out.previewMaxHeight = Number(raw.previewMaxHeight || 0);
    out.previewMaxWidth = Number(raw.previewMaxWidth || 0);
    out.filenamePattern = String(raw.filenamePattern || 'hord-{date}-{template}-{ratio}').trim() || 'hord-{date}-{template}-{ratio}';
    out.sourceTextOverride = String(raw.sourceTextOverride || '').trim();
    out.annotationTextOverride = String(raw.annotationTextOverride || '').trim();
    if(!RATIO_MAP[out.ratio]) out.ratio = DEFAULT_SETTINGS.ratio;
    if(!TEMPLATE_CONFIG[out.template]) out.template = DEFAULT_SETTINGS.template;
    if(!WATERMARK_MODES.includes(out.watermarkMode)) out.watermarkMode = DEFAULT_SETTINGS.watermarkMode;
    return out;
  }

  function getUiState(rawSettings){
    const settings = normalizeSettings(rawSettings);
    return {
      settings,
      features: settings.features,
      allowedTemplates: Object.keys(TEMPLATE_CONFIG),
      allowedWatermarkModes: WATERMARK_MODES.slice(),
      proTemplateKeys: PRO_TEMPLATE_KEYS.slice(),
      mainFontOptions: Object.keys(MAIN_FONT_OPTIONS),
      cjkFontOptions: Object.keys(CJK_FONT_OPTIONS),
      policyNote: 'Pro 结构已预留，当前版本全部开放。',
    };
  }

  function getFontStacks(settings){
    const s = normalizeSettings(settings || {});
    const main = MAIN_FONT_OPTIONS[s.mainFont] || MAIN_FONT_OPTIONS.inter;
    const cjk = CJK_FONT_OPTIONS[s.cjkFont] || CJK_FONT_OPTIONS.notoSansSC;
    const quote = `${main.stack},${cjk.stack}`;
    const body = cjk.stack;
    const brand = `${FONT_STACK_BRAND},${cjk.stack}`;
    return {
      mainKey: s.mainFont,
      cjkKey: s.cjkFont,
      quote,
      body,
      brand,
      loadFamilies: [main.primary, cjk.primary],
    };
  }

  async function ensureFontsLoaded(settings){
    try{
      if(!document?.fonts?.load) return;
      const stacks = getFontStacks(settings);
      const loaders = [];
      for(const fam of stacks.loadFamilies){
        loaders.push(document.fonts.load(`700 40px "${fam}"`));
        loaders.push(document.fonts.load(`500 28px "${fam}"`));
      }
      await Promise.allSettled(loaders);
    }catch(_){
      // ignore; canvas will fallback to available fonts
    }
  }

  function calculateFontSize(text, containerWidth, containerHeight){
    const baseSize = containerWidth / 12;
    const lengthFactor = String(text || '').length / 100;
    const next = baseSize - (lengthFactor * 2);
    const floor = Math.max(18, containerHeight * 0.08);
    const ceil = Math.min(Math.max(floor, containerHeight * 0.30), 72);
    return clamp(next, floor, ceil);
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

  function toReadableSource(text){
    const raw = String(text || '').trim();
    if(!raw) return '';
    try{
      const u = new URL(raw);
      const host = u.hostname.replace(/^www\./i, '');
      const path = (u.pathname || '/').replace(/\/+$/, '');
      if(!path || path === '/') return host;
      const seg = path.split('/').filter(Boolean);
      if(seg.length <= 2) return `${host}${path}`;
      return `${host}/${seg[0]}/.../${seg[seg.length - 1]}`;
    }catch(_){
      return raw;
    }
  }

  function roundedRectPath(ctx, x, y, w, h, r){
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function fillBackground(ctx, width, height, background){
    if(background?.type === 'gradient'){
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, background.from || '#f8fafc');
      grad.addColorStop(1, background.to || '#eef2ff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      return;
    }
    ctx.fillStyle = background?.color || '#f8fafc';
    ctx.fillRect(0, 0, width, height);
  }

  function drawPaperTexture(ctx, card, texture){
    const type = texture?.type || 'none';
    if(type === 'none') return;
    ctx.save();
    roundedRectPath(ctx, card.x, card.y, card.w, card.h, card.r);
    ctx.clip();

    if(type === 'letter'){
      ctx.globalAlpha = 0.12;
      for(let y = card.y + 18; y < card.y + card.h; y += 36){
        ctx.fillStyle = '#c7b08a';
        ctx.fillRect(card.x + 14, y, card.w - 28, 0.6);
      }
      ctx.globalAlpha = 0.05;
      for(let i = 0; i < 90; i += 1){
        const x = card.x + ((i * 37) % card.w);
        const y = card.y + ((i * 53 + (i % 7) * 11) % card.h);
        ctx.fillStyle = '#7c6c53';
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }else if(type === 'parchment'){
      const g = ctx.createRadialGradient(card.x + card.w * 0.55, card.y + card.h * 0.45, card.w * 0.1, card.x + card.w * 0.5, card.y + card.h * 0.5, card.w * 0.7);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(121,84,35,0.18)');
      ctx.fillStyle = g;
      ctx.fillRect(card.x, card.y, card.w, card.h);
      ctx.globalAlpha = 0.08;
      for(let i = 0; i < 200; i += 1){
        const x = card.x + ((i * 29 + (i % 5) * 7) % card.w);
        const y = card.y + ((i * 47 + (i % 11) * 3) % card.h);
        ctx.fillStyle = '#6f5335';
        ctx.fillRect(x, y, 1, 1);
      }
    }else if(type === 'journal'){
      ctx.globalAlpha = 0.13;
      for(let y = card.y + 30; y < card.y + card.h; y += 34){
        ctx.fillStyle = '#a2b6c9';
        ctx.fillRect(card.x + 12, y, card.w - 24, 0.8);
      }
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#d16b6b';
      ctx.fillRect(card.x + 36, card.y + 18, 1.3, card.h - 36);
    }else if(type === 'typewriter'){
      ctx.globalAlpha = 0.1;
      for(let i = 0; i < 220; i += 1){
        const x = card.x + ((i * 31 + (i % 13) * 9) % card.w);
        const y = card.y + ((i * 59 + (i % 17) * 5) % card.h);
        const w = 0.5 + ((i % 7) / 6) * 1.5;
        const h = 0.5 + ((i % 5) / 4) * 1.5;
        ctx.fillStyle = '#6a6c62';
        ctx.fillRect(x, y, w, h);
      }
      ctx.globalAlpha = 0.06;
      for(let y = card.y + 16; y < card.y + card.h; y += 20){
        ctx.fillStyle = '#73766a';
        ctx.fillRect(card.x + 10, y, card.w - 20, 0.5);
      }
    }
    ctx.restore();
  }

  function parseHexColor(input){
    const s = String(input || '').trim();
    const m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if(!m) return null;
    const hex = m[1];
    if(hex.length === 3){
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  function relativeLuminance(rgb){
    const toLin = (v)=>{
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
  }

  function contrastRatio(a, b){
    const c1 = parseHexColor(a);
    const c2 = parseHexColor(b);
    if(!c1 || !c2) return null;
    const l1 = relativeLuminance(c1);
    const l2 = relativeLuminance(c2);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  function collapseSpaces(s){
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function enhanceTextFlow(text){
    let next = String(text || '');
    next = next.replace(/\r/g, '\n');
    next = next.replace(/[ \t]+/g, ' ');
    next = next.replace(/\n{3,}/g, '\n\n');
    next = next.replace(/([,.;:!?])([^\s])/g, '$1 $2');
    next = next.replace(/\s+([,.;:!?])/g, '$1');
    return next.trim();
  }

  function tokenizeForWrap(line){
    if(!line) return [];
    const out = [];
    const chars = Array.from(line);
    let i = 0;
    while(i < chars.length){
      const ch = chars[i];
      if(/\s/.test(ch)){
        let j = i + 1;
        while(j < chars.length && /\s/.test(chars[j])) j += 1;
        out.push(chars.slice(i, j).join(''));
        i = j;
        continue;
      }
      if(/[A-Za-z0-9]/.test(ch)){
        let j = i + 1;
        while(j < chars.length && /[A-Za-z0-9'’_-]/.test(chars[j])) j += 1;
        out.push(chars.slice(i, j).join(''));
        i = j;
        continue;
      }
      out.push(ch);
      i += 1;
    }
    return out;
  }

  function wrapByWidth(ctx, text, maxWidth){
    const source = String(text || '').replace(/\r/g, '');
    const rows = source.split('\n');
    const lines = [];

    for(const row of rows){
      const current = row || '';
      if(!current.trim()){
        lines.push('');
        continue;
      }

      const tokens = tokenizeForWrap(current);
      let buffer = '';
      for(const token of tokens){
        const next = buffer + token;
        if(!buffer || ctx.measureText(next).width <= maxWidth){
          buffer = next;
          continue;
        }

        const clean = buffer.trimEnd();
        lines.push(clean);
        const tokenTrim = token.trimStart();
        if(ctx.measureText(tokenTrim).width <= maxWidth){
          buffer = tokenTrim;
          continue;
        }

        let charBuf = '';
        for(const ch of Array.from(tokenTrim)){
          const attempt = charBuf + ch;
          if(!charBuf || ctx.measureText(attempt).width <= maxWidth){
            charBuf = attempt;
          }else{
            lines.push(charBuf.trimEnd());
            charBuf = ch;
          }
        }
        buffer = charBuf;
      }
      if(buffer) lines.push(buffer.trimEnd());
    }
    return lines.length ? lines : [''];
  }

  function truncateLineWordAware(line){
    const input = String(line || '').trimEnd();
    if(!input) return '…';
    const ws = input.lastIndexOf(' ');
    if(ws > 6) return `${input.slice(0, ws).trimEnd()}…`;
    return `${input.slice(0, Math.max(0, input.length - 1)).trimEnd()}…`;
  }

  function measureTextBlock(ctx, options){
    const text = String(options.text || '');
    const maxWidth = Math.max(1, Number(options.maxWidth) || 1);
    const maxLines = Math.max(1, Number(options.maxLines) || 1);
    const fontSize = Math.max(1, Number(options.fontSize) || 1);
    const lineHeightRatio = Number(options.lineHeightRatio || 1.3);
    const fontWeight = Number(options.fontWeight || 600);
    const fontFamily = options.fontFamily || FONT_STACK_BODY;
    const ellipsisMode = options.ellipsisMode || 'word';

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const wrapped = wrapByWidth(ctx, text, maxWidth);
    const overflow = wrapped.length > maxLines;
    const lines = wrapped.slice(0, maxLines);

    if(overflow && lines.length){
      lines[lines.length - 1] = ellipsisMode === 'char'
        ? `${String(lines[lines.length - 1] || '').slice(0, Math.max(0, String(lines[lines.length - 1] || '').length - 1))}…`
        : truncateLineWordAware(lines[lines.length - 1]);
    }

    const lineHeight = Math.round(fontSize * lineHeightRatio);
    return {
      lines,
      lineHeight,
      height: lines.length * lineHeight,
      isOverflow: overflow,
      rawLineCount: wrapped.length,
    };
  }

  function fitPrimaryQuote(ctx, quoteText, cfg){
    const maxSize = clamp(cfg.maxSize, 18, 72);
    const minSize = Math.max(18, cfg.minSize);
    let size = maxSize;
    let metrics = null;
    while(size >= minSize){
      metrics = measureTextBlock(ctx, {
        text: quoteText,
        maxWidth: cfg.maxWidth,
        maxLines: cfg.maxLines,
        fontSize: size,
        lineHeightRatio: cfg.lineHeightRatio,
        fontWeight: cfg.fontWeight,
        fontFamily: cfg.fontFamily || FONT_STACK_QUOTE,
        ellipsisMode: 'word',
      });
      if(!metrics.isOverflow) break;
      size -= 2;
    }
    if(!metrics){
      metrics = measureTextBlock(ctx, {
        text: quoteText,
        maxWidth: cfg.maxWidth,
        maxLines: cfg.maxLines,
        fontSize: minSize,
        lineHeightRatio: cfg.lineHeightRatio,
        fontWeight: cfg.fontWeight,
        fontFamily: cfg.fontFamily || FONT_STACK_QUOTE,
        ellipsisMode: 'word',
      });
    }
    return { size: Math.max(minSize, size), metrics };
  }

  function fitSecondaryBlock(ctx, cfg){
    if(!cfg.text) return null;
    let size = clamp(cfg.startSize, cfg.minSize, cfg.maxSize);
    let maxLines = cfg.maxLines;
    let metrics = null;

    while(size >= cfg.minSize){
      metrics = measureTextBlock(ctx, {
        text: cfg.text,
        maxWidth: cfg.maxWidth,
        maxLines,
        fontSize: size,
        lineHeightRatio: cfg.lineHeightRatio,
        fontWeight: cfg.fontWeight,
        fontFamily: cfg.fontFamily,
        ellipsisMode: cfg.ellipsisMode || 'word',
      });
      if(metrics.height <= cfg.maxHeight) return { size, maxLines, metrics, hidden: false };
      size -= cfg.step;
    }

    while(maxLines > 1){
      maxLines -= 1;
      metrics = measureTextBlock(ctx, {
        text: cfg.text,
        maxWidth: cfg.maxWidth,
        maxLines,
        fontSize: cfg.minSize,
        lineHeightRatio: cfg.lineHeightRatio,
        fontWeight: cfg.fontWeight,
        fontFamily: cfg.fontFamily,
        ellipsisMode: cfg.ellipsisMode || 'word',
      });
      if(metrics.height <= cfg.maxHeight) return { size: cfg.minSize, maxLines, metrics, hidden: false };
    }

    if(cfg.allowAutoHide) return { hidden: true };

    metrics = measureTextBlock(ctx, {
      text: cfg.text,
      maxWidth: cfg.maxWidth,
      maxLines: 1,
      fontSize: cfg.minSize,
      lineHeightRatio: cfg.lineHeightRatio,
      fontWeight: cfg.fontWeight,
      fontFamily: cfg.fontFamily,
      ellipsisMode: cfg.ellipsisMode || 'word',
    });
    return { size: cfg.minSize, maxLines: 1, metrics, hidden: false };
  }

  function buildModules(sentence, settings){
    const quoteRaw = String(sentence?.text || '').trim();
    const quote = settings.enhanceContent ? enhanceTextFlow(quoteRaw) : quoteRaw;
    if(!quote) throw new Error('该金句缺少英文原文，无法导出。');

    const translationRaw = settings.showTranslation ? String(sentence?.translation || '').trim() : '';
    const translation = settings.enhanceContent ? enhanceTextFlow(translationRaw) : translationRaw;
    const sourceAuto = getDomainText(sentence?.url || sentence?.sourceUrl || sentence?.pageUrl || '');
    const source = settings.showSource
      ? toReadableSource(settings.sourceTextOverride || sourceAuto)
      : '';
    const annotationBase = settings.annotationTextOverride || String(sentence?.note || '');
    const annotationRaw = settings.showAnnotation ? collapseSpaces(annotationBase) : '';
    const annotation = settings.enhanceContent ? enhanceTextFlow(annotationRaw) : annotationRaw;

    return {
      quote,
      translation,
      annotation,
      source,
      watermark: settings.showWatermark ? settings.watermarkMode : '',
      brandFooter: `${BRAND_NAME} · ${BRAND_TAGLINE}`,
    };
  }

  function makeLayoutEngine(ctx, canvasWidth, canvasHeight, settings, template, modules){
    const ratioCfg = RATIO_LAYOUT[settings.ratio] || RATIO_LAYOUT['1:1'];
    const densityMap = {
      compact: { width: 0.92, space: 0.9 },
      standard: { width: 1, space: 1 },
      airy: { width: 0.82, space: 1.12 },
    };
    const density = densityMap[settings.density] || densityMap.standard;

    const padding = clamp(canvasWidth * ratioCfg.paddingFactor, 32, 64);
    const contentWidth = canvasWidth - padding * 2;
    const contentHeight = canvasHeight - padding * 2;

    const quoteStyle = template.quoteStyle || {};
    const translationStyle = template.translationStyle || {};
    const annotationStyle = template.annotationStyle || {};
    const sourceStyle = template.sourceStyle || {};
    const fonts = getFontStacks(settings);

    const boost = Math.max(0, Number(settings.fontAdjust || 0));
    const quoteLen = String(modules.quote || '').length;
    // Larger manual font-adjust should also give text more horizontal room,
    // otherwise long quotes get stuck at tiny sizes.
    const widthBoost = clamp((boost * 0.025) + Math.max(0, (quoteLen - 180) / 1800), 0, 0.22);
    const effectiveWidthRatio = clamp(((template.contentWidthRatio || 0.86) * density.width) + widthBoost, 0.78, 0.97);
    const contentInnerWidth = contentWidth * effectiveWidthRatio;
    const contentX = padding + (contentWidth - contentInnerWidth) / 2;

    const spacingBase = Math.round(clamp(contentHeight * 0.022, 12, 34) * (template.spacingScale || 1) * density.space);
    const spacing = {
      quoteToTranslation: spacingBase,
      translationToAnnotation: spacingBase,
      annotationToSource: Math.max(10, Math.round(spacingBase * 0.9)),
      sourceToFooter: Math.max(10, Math.round(spacingBase * 0.8)),
    };

    const footerSize = clamp(calculateFontSize('footer', contentInnerWidth, contentHeight) * 0.30, 14, 18);
    const footerLineHeight = Math.round(footerSize * 1.25);

    const quoteMaxSize = clamp((Math.min(canvasWidth / 10, 72) * (quoteStyle.quoteScale || 1)) + settings.fontAdjust, 18, 72);
    // Let positive font-adjust truly "force bigger text":
    // when space is not enough, prefer truncation over shrinking below the adjusted floor.
    const quoteMinSize = clamp(18 + (boost * 2), 18, 50);
    const quoteBaseSize = clamp(contentInnerWidth / ratioCfg.quoteBaseDiv, 28, 64) * (quoteStyle.quoteScale || 1) + settings.fontAdjust;

    const quoteMaxLines = Math.min(10, ratioCfg.quoteMaxLines + Math.floor(boost / 2));
    const quoteFit = fitPrimaryQuote(ctx, modules.quote, {
      maxWidth: contentInnerWidth,
      maxLines: quoteMaxLines,
      maxSize: Math.min(quoteMaxSize, quoteBaseSize),
      minSize: quoteMinSize,
      lineHeightRatio: quoteStyle.lineHeightMultiplier || 1.28,
      fontWeight: quoteStyle.fontWeight || 760,
      fontFamily: fonts.quote,
    });

    const quoteHeight = quoteFit.metrics.height;
    const fixedBottomReserve = footerLineHeight + spacing.sourceToFooter + Math.round(contentHeight * ratioCfg.extraBottom);
    const availableSecondary = Math.max(0, contentHeight - quoteHeight - fixedBottomReserve - spacing.quoteToTranslation);

    let remain = availableSecondary;

    let translationFit = null;
    if(modules.translation){
      const startSize = clamp(quoteFit.size * clamp(translationStyle.scale || 0.62, 0.56, 0.68), 14, quoteFit.size * 0.68);
      translationFit = fitSecondaryBlock(ctx, {
        text: modules.translation,
        maxWidth: contentInnerWidth,
        maxHeight: Math.max(30, remain * (modules.annotation || modules.source ? 0.55 : 0.8)),
        maxLines: ratioCfg.translationMaxLines,
        startSize,
        minSize: 14,
        maxSize: startSize,
        step: 1,
        lineHeightRatio: translationStyle.lineHeightMultiplier || 1.34,
        fontWeight: translationStyle.fontWeight || 520,
        fontFamily: fonts.body,
        ellipsisMode: 'word',
        allowAutoHide: settings.allowAutoHideSecondary,
      });
      if(translationFit && !translationFit.hidden){
        remain = Math.max(0, remain - translationFit.metrics.height - spacing.translationToAnnotation);
      }
    }

    let annotationFit = null;
    if(modules.annotation){
      const startSize = clamp(quoteFit.size * 0.55, 14, quoteFit.size * 0.65);
      annotationFit = fitSecondaryBlock(ctx, {
        text: modules.annotation,
        maxWidth: contentInnerWidth,
        maxHeight: Math.max(28, remain * (modules.source ? 0.64 : 0.9)),
        maxLines: ratioCfg.annotationMaxLines,
        startSize,
        minSize: 14,
        maxSize: startSize,
        step: 1,
        lineHeightRatio: annotationStyle.lineHeightMultiplier || 1.34,
        fontWeight: annotationStyle.fontWeight || 500,
        fontFamily: fonts.body,
        ellipsisMode: 'char',
        allowAutoHide: settings.allowAutoHideSecondary,
      });
      if(annotationFit && !annotationFit.hidden){
        remain = Math.max(0, remain - annotationFit.metrics.height - spacing.annotationToSource);
      }
    }

    let sourceFit = null;
    if(modules.source){
      const startSize = clamp(quoteFit.size * 0.42, 12, 28);
      sourceFit = fitSecondaryBlock(ctx, {
        text: modules.source,
        maxWidth: contentInnerWidth,
        maxHeight: Math.max(24, remain),
        maxLines: ratioCfg.sourceMaxLines,
        startSize,
        minSize: 12,
        maxSize: startSize,
        step: 1,
        lineHeightRatio: sourceStyle.lineHeightMultiplier || 1.3,
        fontWeight: sourceStyle.fontWeight || 520,
        fontFamily: fonts.body,
        ellipsisMode: 'word',
        allowAutoHide: settings.allowAutoHideSecondary,
      });
    }

    const blocks = [];
    blocks.push({ key: 'quote', size: quoteFit.size, metrics: quoteFit.metrics, weight: quoteStyle.fontWeight || 760, family: fonts.quote, color: quoteStyle.color || '#111827' });
    if(translationFit && !translationFit.hidden){
      blocks.push({ key: 'translation', size: translationFit.size, metrics: translationFit.metrics, weight: translationStyle.fontWeight || 520, family: fonts.body, color: translationStyle.color || '#475569' });
    }
    if(annotationFit && !annotationFit.hidden){
      blocks.push({ key: 'annotation', size: annotationFit.size, metrics: annotationFit.metrics, weight: annotationStyle.fontWeight || 500, family: fonts.body, color: annotationStyle.color || '#6b7280' });
    }
    if(sourceFit && !sourceFit.hidden){
      blocks.push({ key: 'source', size: sourceFit.size, metrics: sourceFit.metrics, weight: sourceStyle.fontWeight || 520, family: fonts.body, color: sourceStyle.color || '#64748b' });
    }

    let totalContentHeight = footerLineHeight;
    for(let i = 0; i < blocks.length; i += 1){
      totalContentHeight += blocks[i].metrics.height;
      if(i < blocks.length - 1){
        if(blocks[i].key === 'quote') totalContentHeight += spacing.quoteToTranslation;
        else if(blocks[i].key === 'translation') totalContentHeight += spacing.translationToAnnotation;
        else totalContentHeight += spacing.annotationToSource;
      }
    }
    if(blocks.length) totalContentHeight += spacing.sourceToFooter;

    const opticalAdjust = quoteFit.size * 0.12;
    const freeSpace = Math.max(0, contentHeight - totalContentHeight);
    // Keep content visually centered but slightly top-biased to avoid "large blank top/bottom" feeling.
    const baseStartY = padding + (freeSpace * (boost >= 4 ? 0.34 : 0.42));
    const maxStartY = padding + Math.max(0, contentHeight - totalContentHeight);
    const startY = clamp(baseStartY + (opticalAdjust * 0.85), padding + 4, maxStartY);

    const layoutDebug = {
      canvas: { w: canvasWidth, h: canvasHeight, padding },
      quote: { size: quoteFit.size, lines: quoteFit.metrics.lines.length, rawLines: quoteFit.metrics.rawLineCount, maxLines: quoteMaxLines, height: quoteFit.metrics.height },
      translation: translationFit && !translationFit.hidden ? { size: translationFit.size, lines: translationFit.metrics.lines.length, rawLines: translationFit.metrics.rawLineCount, maxLines: translationFit.maxLines, height: translationFit.metrics.height } : null,
      annotation: annotationFit && !annotationFit.hidden ? { size: annotationFit.size, lines: annotationFit.metrics.lines.length, rawLines: annotationFit.metrics.rawLineCount, maxLines: annotationFit.maxLines, height: annotationFit.metrics.height } : null,
      source: sourceFit && !sourceFit.hidden ? { size: sourceFit.size, lines: sourceFit.metrics.lines.length, rawLines: sourceFit.metrics.rawLineCount, maxLines: sourceFit.maxLines, height: sourceFit.metrics.height } : null,
      footer: { size: footerSize, height: footerLineHeight },
      totalHeight: totalContentHeight,
      startY,
      contentBlockTopOffset: startY - padding,
      measureCount: (quoteFit.metrics.rawLineCount || 0)
        + (translationFit?.metrics?.rawLineCount || 0)
        + (annotationFit?.metrics?.rawLineCount || 0)
        + (sourceFit?.metrics?.rawLineCount || 0),
    };

    return {
      contentX,
      contentInnerWidth,
      startY,
      spacing,
      footerLineHeight,
      footerSize,
      blocks,
      layoutDebug,
      fonts,
      lineColor: template.footerStyle?.lineColor || '#d9e0f3',
      footerColor: template.footerStyle?.color || '#64748b',
      footerWeight: template.footerStyle?.fontWeight || 650,
    };
  }

  function getQualityReport(rawSettings, layoutDebug){
    const settings = normalizeSettings(rawSettings);
    const template = TEMPLATE_CONFIG[settings.template] || TEMPLATE_CONFIG.light;
    const debug = layoutDebug || null;
    const warnings = [];
    if(!debug) return { level: 'unknown', warnings: ['暂无质量数据。'], metrics: {} };

    const quoteSize = Number(debug?.quote?.size || 0);
    if(quoteSize > 0 && quoteSize < 24){
      warnings.push(`主句字号偏小（${quoteSize}px），建议减少内容或增大字号。`);
    }

    const canvasH = Number(debug?.canvas?.h || 0);
    const used = Number(debug?.totalHeight || 0);
    const usage = canvasH > 0 ? used / canvasH : 0;
    if(usage > 0.9){
      warnings.push('信息密度偏高，内容接近满版，建议关闭部分模块。');
    }

    const infoLines = (debug?.translation?.lines || 0) + (debug?.annotation?.lines || 0) + (debug?.source?.lines || 0);
    if(infoLines >= 8){
      warnings.push('附加信息较多，卡片层级可能偏拥挤。');
    }

    const quoteColor = template.quoteStyle?.color || '#111827';
    const cardBg = template.card?.bg || '#ffffff';
    const ratio = contrastRatio(quoteColor, cardBg);
    if(ratio != null && ratio < 4.3){
      warnings.push(`文本对比度偏低（${ratio.toFixed(2)}），建议换模板或加深文字颜色。`);
    }

    const level = warnings.length >= 3 ? 'high' : warnings.length >= 1 ? 'medium' : 'ok';
    return {
      level,
      warnings,
      metrics: {
        quoteSize,
        usage,
        contrast: ratio,
      },
    };
  }

  function drawWatermark(ctx, mode, template, quoteSize, card, stacks){
    if(!mode) return;
    const wm = template.watermarkStyle || {};
    const color = wm.color || '#7c3aed';

    if(mode === 'backgroundLogo'){
      ctx.save();
      ctx.globalAlpha = wm.backgroundOpacity ?? 0.06;
      ctx.fillStyle = color;
      ctx.font = `800 ${Math.round(card.w * 0.16)}px ${stacks.quote || FONT_STACK_QUOTE}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(BRAND_NAME, card.x + card.w / 2, card.y + card.h * 0.62);
      ctx.restore();
      return;
    }

    if(mode === 'cornerLogo'){
      ctx.save();
      ctx.globalAlpha = wm.cornerOpacity ?? 0.18;
      ctx.fillStyle = color;
      const sz = Math.max(16, Math.round(card.w * 0.06));
      ctx.font = `800 ${sz}px ${stacks.quote || FONT_STACK_QUOTE}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(BRAND_NAME, card.x + card.w - 18, card.y + card.h - 16);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = wm.signatureOpacity ?? 0.30;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const titleSize = Math.max(14, Math.round(quoteSize * 0.25));
    const subSize = Math.max(11, Math.round(titleSize * 0.56));
    const baseY = card.y + card.h - 22;
    ctx.font = `700 ${titleSize}px ${stacks.quote || FONT_STACK_QUOTE}`;
    ctx.fillText(BRAND_NAME, card.x + card.w / 2, baseY - subSize - 2);
    ctx.font = `600 ${subSize}px ${(stacks.brand || FONT_STACK_BRAND)}`;
    ctx.fillText(BRAND_TAGLINE, card.x + card.w / 2, baseY);
    ctx.restore();
  }

  function drawAnnotationEmphasis(ctx, block, x, y, width, color, quoteStack){
    // Keep emphasis decoration strictly inside annotation block bounds
    // so it never overlaps source/footer text.
    const bgY = y + 1;
    const bgH = Math.max(10, block.metrics.height - 2);
    const bgX = x;
    const bgW = width;
    ctx.save();
    roundedRectPath(ctx, bgX, bgY, bgW, bgH, 10);
    ctx.fillStyle = 'rgba(100, 116, 139, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Place quote glyphs outside text area to avoid masking characters.
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.28;
    ctx.font = `700 ${Math.max(14, Math.round(block.size * 0.92))}px ${quoteStack || FONT_STACK_QUOTE}`;
    ctx.textBaseline = 'top';
    ctx.fillText('“', bgX - 10, bgY + 2);
    const qw = ctx.measureText('”').width;
    ctx.fillText('”', bgX + bgW - qw + 10, bgY + bgH - Math.max(24, Math.round(block.size * 1.06)));
    ctx.restore();
  }

  function drawCard(sentence, rawSettings, targetCanvas){
    const settings = normalizeSettings(rawSettings);
    const dims = RATIO_MAP[settings.ratio];
    const template = TEMPLATE_CONFIG[settings.template] || TEMPLATE_CONFIG.light;
    const modules = buildModules(sentence, settings);

    const canvas = targetCanvas || document.createElement('canvas');
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d');
    if(!ctx) throw new Error('浏览器不支持 Canvas 导出。');

    fillBackground(ctx, canvas.width, canvas.height, template.background);

    const ratioCfg = RATIO_LAYOUT[settings.ratio] || RATIO_LAYOUT['1:1'];
    const pad = clamp(canvas.width * ratioCfg.paddingFactor, 32, 64);
    const card = {
      x: pad,
      y: pad,
      w: canvas.width - pad * 2,
      h: canvas.height - pad * 2,
      r: template.card?.radius || 16,
    };

    ctx.save();
    ctx.shadowColor = template.card?.shadow || 'rgba(15, 23, 42, 0.12)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundedRectPath(ctx, card.x, card.y, card.w, card.h, card.r);
    ctx.fillStyle = template.card?.bg || '#fff';
    ctx.fill();
    ctx.restore();

    if(template.card?.borderColor){
      ctx.save();
      roundedRectPath(ctx, card.x, card.y, card.w, card.h, card.r);
      ctx.strokeStyle = template.card.borderColor;
      ctx.lineWidth = Number(template.card.borderWidth || 1);
      ctx.stroke();
      ctx.restore();
    }

    drawPaperTexture(ctx, card, template.texture);

    const layoutEngine = makeLayoutEngine(ctx, card.w, card.h, settings, template, modules);

    drawWatermark(ctx, modules.watermark, template, layoutEngine.blocks[0]?.size || 28, card, layoutEngine.fonts || {});

    const baseX = card.x + layoutEngine.contentX;
    const baseY = card.y;
    let y = baseY + layoutEngine.startY;

    for(let i = 0; i < layoutEngine.blocks.length; i += 1){
      const block = layoutEngine.blocks[i];
      if(block.key === 'annotation' && settings.annotationStyle === 'emphasis'){
        drawAnnotationEmphasis(ctx, block, baseX, y, layoutEngine.contentInnerWidth, block.color, layoutEngine.fonts?.quote);
      }
      ctx.fillStyle = block.color;
      ctx.font = `${block.weight} ${block.size}px ${block.family}`;
      ctx.textBaseline = 'top';
      const lines = block.metrics.lines;
      for(const line of lines){
        ctx.fillText(line, baseX, y);
        y += block.metrics.lineHeight;
      }
      if(i < layoutEngine.blocks.length - 1){
        if(block.key === 'quote') y += layoutEngine.spacing.quoteToTranslation;
        else if(block.key === 'translation') y += layoutEngine.spacing.translationToAnnotation;
        else y += layoutEngine.spacing.annotationToSource;
      }
    }

    y += layoutEngine.spacing.sourceToFooter;
    const lineY = y - Math.round(layoutEngine.spacing.sourceToFooter * 0.45);
    ctx.strokeStyle = layoutEngine.lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(baseX, lineY);
    ctx.lineTo(baseX + layoutEngine.contentInnerWidth, lineY);
    ctx.stroke();

    ctx.fillStyle = layoutEngine.footerColor;
    ctx.font = `${layoutEngine.footerWeight} ${layoutEngine.footerSize}px ${(layoutEngine.fonts?.brand || FONT_STACK_BRAND)}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    ctx.fillText(modules.brandFooter, baseX + layoutEngine.contentInnerWidth, y + layoutEngine.footerLineHeight);

    canvas.__layoutDebug = layoutEngine.layoutDebug;
    if(settings.debugLayout){
      console.debug('[QuoteCardLayout]', layoutEngine.layoutDebug);
    }
    return canvas;
  }

  function getTimestamp(){
    const d = new Date();
    const pad = (n)=>String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  function sanitizeFilenamePart(input){
    return String(input || '')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function resolveFilename(settings, options){
    const d = new Date();
    const pad = (n)=>String(n).padStart(2, '0');
    const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}${pad(d.getMinutes())}`;
    const datetime = `${date}-${time}`;
    const pattern = String(options?.filenamePattern || settings?.filenamePattern || '').trim();
    const fallbackPrefix = String(options?.filenamePrefix || 'hord-quote');
    const index = Number(options?.index || settings?.batchIndex || 0);
    const indexText = index > 0 ? String(index).padStart(2, '0') : '';

    if(!pattern){
      return `${sanitizeFilenamePart(fallbackPrefix)}-${datetime}.png`;
    }
    const resolved = pattern
      .replace(/\{date\}/g, date)
      .replace(/\{time\}/g, time)
      .replace(/\{datetime\}/g, datetime)
      .replace(/\{template\}/g, sanitizeFilenamePart(settings?.template || 'light'))
      .replace(/\{ratio\}/g, sanitizeFilenamePart(String(settings?.ratio || '1:1').replace(':', 'x')))
      .replace(/\{index\}/g, indexText)
      .replace(/\{brand\}/g, 'hord');
    const safe = sanitizeFilenamePart(resolved) || `${sanitizeFilenamePart(fallbackPrefix)}-${datetime}`;
    return safe.endsWith('.png') ? safe : `${safe}.png`;
  }

  async function exportPng(sentence, settings, options){
    const normalized = normalizeSettings(settings);
    await ensureFontsLoaded(normalized);
    const canvas = drawCard(sentence, normalized);
    const blob = await new Promise((resolve, reject)=>{
      canvas.toBlob((b)=>{
        if(b) resolve(b);
        else reject(new Error('图片生成失败，请重试。'));
      }, 'image/png');
    });

    const filename = resolveFilename(normalized, options || {});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    try{
      anchor.click();
    }finally{
      setTimeout(()=>{
        URL.revokeObjectURL(url);
        anchor.remove();
      }, 160);
    }
    return filename;
  }

  async function copyPngToClipboard(sentence, settings){
    const normalized = normalizeSettings(settings);
    await ensureFontsLoaded(normalized);
    const canvas = drawCard(sentence, normalized);
    if(!navigator.clipboard || typeof navigator.clipboard.write !== 'function' || typeof ClipboardItem === 'undefined'){
      throw new Error('当前浏览器不支持复制图片到剪贴板。');
    }
    const blob = await new Promise((resolve, reject)=>{
      canvas.toBlob((b)=>{
        if(b) resolve(b);
        else reject(new Error('图片生成失败，请重试。'));
      }, 'image/png');
    });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  }

  function renderPreview(sentence, rawSettings, canvas){
    if(!canvas) return;
    const settings = normalizeSettings(rawSettings);
    const dims = RATIO_MAP[settings.ratio];

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const requestedScale = Number(settings.previewScale || 1);
    const scale = clamp(Number.isFinite(requestedScale) ? requestedScale : 1, 0.65, 1.25);
    const clientWidth = Math.max(220, Math.floor(Number(settings.previewMaxWidth || 0) || canvas.clientWidth || 360));
    const fitMode = settings.previewFit !== false || settings.previewScaleMode === 'fit';
    const maxHeight = Math.max(0, Math.floor(Number(settings.previewMaxHeight || 0)));
    let baseWidth = clientWidth;
    if(fitMode && maxHeight > 0){
      const byHeight = Math.floor(maxHeight * (dims.width / dims.height) * 0.88);
      const byWidth = Math.floor(clientWidth * 0.94);
      baseWidth = Math.max(180, Math.min(byWidth, byHeight || byWidth));
    }
    const width = Math.max(180, Math.floor(baseWidth * (fitMode ? 1 : scale)));
    const height = Math.floor(width * (dims.height / dims.width));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.height = `${height}px`;
    canvas.style.width = `${width}px`;

    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ensureFontsLoaded(settings);
    const full = drawCard(sentence, settings);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(full, 0, 0, width, height);
    canvas.__layoutDebug = full.__layoutDebug || null;
  }

  global.QuoteCardExporter = {
    BRAND_NAME,
    BRAND_TAGLINE,
    DEFAULT_FEATURES,
    DEFAULT_SETTINGS,
    PRO_TEMPLATE_KEYS,
    MAIN_FONT_OPTIONS,
    CJK_FONT_OPTIONS,
    TEMPLATE_CONFIG,
    RATIO_MAP,
    RATIO_LAYOUT,
    WATERMARK_MODES,
    normalizeSettings,
    getUiState,
    calculateFontSize,
    getDomainText,
    toReadableSource,
    measureTextBlock,
    getQualityReport,
    getFontStacks,
    ensureFontsLoaded,
    resolveFilename,
    drawCard,
    exportPng,
    copyPngToClipboard,
    renderPreview,
    getTimestamp,
  };
})(globalThis);
