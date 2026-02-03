// HORD English Companion - Manager
// Stable manager script: reads DB via background OP_GET_STATE (single source of truth)

(async function(){
  'use strict';

  function systemDark(){
    try{ return !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }catch(_){ return false; }
  }

  function resolveThemeMode(db){
    if(db && (db.themeMode === 'auto' || db.themeMode === 'light' || db.themeMode === 'dark')) return db.themeMode;
    const autoMode = db?.theme_auto_mode !== false;
    const manualDark = db?.theme_dark_mode != null ? !!db.theme_dark_mode : !!db?.popup_force_dark;
    if(autoMode) return 'auto';
    return manualDark ? 'dark' : 'light';
  }

  function computeThemeDark(db){
    const mode = resolveThemeMode(db || {});
    return mode === 'dark' || (mode === 'auto' && systemDark());
  }

  function applyPageTheme(db){
    const dark = computeThemeDark(db || {});
    document.documentElement.classList.toggle('vb-dark', dark);
    document.body.classList.toggle('vb-force-dark', dark);
  }


  // --- Version self-check log ---
  try {
    const v = chrome.runtime.getManifest().version;
    console.info(`[Manager] running version: ${v}`);
    const verEl = document.getElementById('ver');
    const limitEl = document.getElementById('limitInfo');
    if (verEl) verEl.textContent = `v${v}`;
    if (limitEl) limitEl.textContent = 'OWN YOUR WORDS';
  } catch(e) {}

  applyPageTheme({});
  try{
    chrome.storage.local.get(['themeMode','theme_auto_mode','theme_dark_mode','popup_force_dark'], applyPageTheme);
    chrome.storage.onChanged.addListener((changes, area)=>{
      if(area !== 'local') return;
      if(!changes.themeMode && !changes.theme_auto_mode && !changes.theme_dark_mode && !changes.popup_force_dark) return;
      chrome.storage.local.get(['themeMode','theme_auto_mode','theme_dark_mode','popup_force_dark'], applyPageTheme);
    });
    chrome.runtime.onMessage.addListener((msg)=>{
      if(msg && msg.type === 'THEME_UPDATED'){
        chrome.storage.local.get(['themeMode','theme_auto_mode','theme_dark_mode','popup_force_dark'], applyPageTheme);
      }
    });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemTheme = ()=>chrome.storage.local.get(['themeMode','theme_auto_mode','theme_dark_mode','popup_force_dark'], applyPageTheme);
    if(mq.addEventListener) mq.addEventListener('change', onSystemTheme);
    else if(mq.addListener) mq.addListener(onSystemTheme);
  }catch(_){/* ignore */}

  // Extension version (for export meta / UI)
  // In extension pages (manager.html), chrome.runtime.getManifest() is available.
  const MANIFEST_VERSION = (globalThis?.chrome?.runtime?.getManifest?.() || {}).version || '0.0.0';

  const $ = (id)=>document.getElementById(id);

  const el = {
    ver: $('ver'),
    limitInfo: $('limitInfo'),
    topProgress: $('topProgress'),
    topProgressText: $('topProgressText'),
    reviewMini: $('reviewMini'),
    badgeRow: $('badgeRow'),
    tabWords: $('tabWords'),
    tabSentences: $('tabSentences'),
    btnStartReview: $('btnStartReview'),
    statCards: $('statCards'),

    toolbarWords: $('toolbarWords'),
    checkAll: $('checkAll'),
    search: $('search'),
    sortField: $('sortField'),
    sortDir: $('sortDir'),
    btnImport: $('btnImport'),
    btnExport: $('btnExport'),
    btnBulkDelete: $('btnBulkDelete'),
    btnBulkCycle: $('btnBulkCycle'),
    btnClearWords: $('btnClearWords'),
    btnRefresh: $('btnRefresh'),
    wordsWrap: $('wordsWrap'),
    wordCards: $('wordCards'),
    emptyWords: $('emptyWords'),
    toggleCn: $('toggleCn'),
    toggleEn: $('toggleEn'),
    toggleNote: $('toggleNote'),

    toolbarSentences: $('toolbarSentences'),
    checkAllSent: $('checkAllSent'),
    searchSentence: $('searchSentence'),
    sortSentenceField: $('sortSentenceField'),
    sortSentenceDir: $('sortSentenceDir'),
    btnImportSent: $('btnImportSent'),
    btnExportSent: $('btnExportSent'),
    toggleSentTrans: $('toggleSentTrans'),
    toggleSentNote: $('toggleSentNote'),
    btnBulkDeleteSent: $('btnBulkDeleteSent'),
    btnClearSentences: $('btnClearSentences'),
    btnRefresh2: $('btnRefresh2'),
    sentWrap: $('sentWrap'),
    sentCards: $('sentCards'),
    emptySent: $('emptySent'),

    modalMask: $('modalMask'),
    modalTitle: $('modalTitle'),
    modalClose: $('modalClose'),
    ioMode: $('ioMode'),
    ioFormat: $('ioFormat'),
    fileInput: $('fileInput'),
    btnChooseFile: $('btnChooseFile'),
    btnDownloadTemplate: $('btnDownloadTemplate'),
    fileInfo: $('fileInfo'),
    filePreviewWrap: $('filePreviewWrap'),
    filePreview: $('filePreview'),
    ioText: $('ioText'),
    ioHint: $('ioHint'),
    ioError: $('ioError'),
    btnCancel: $('btnCancel'),
    btnOk: $('btnOk'),

    quoteExportMask: $('quoteExportMask'),
    quoteExportClose: $('quoteExportClose'),
    quoteExportCancel: $('quoteExportCancel'),
    quoteQuickCopy: $('quoteQuickCopy'),
    quoteQuickExport: $('quoteQuickExport'),
    quoteCopyImage: $('quoteCopyImage'),
    quoteBatchExport: $('quoteBatchExport'),
    quoteExportSubmit: $('quoteExportSubmit'),
    quotePreset: $('quotePreset'),
    quoteTemplate: $('quoteTemplate'),
    quoteTemplateWall: $('quoteTemplateWall'),
    quoteRatio: $('quoteRatio'),
    quoteDensity: $('quoteDensity'),
    quoteMainFont: $('quoteMainFont'),
    quoteCjkFont: $('quoteCjkFont'),
    quoteFontAdjust: $('quoteFontAdjust'),
    quoteFontAdjustValue: $('quoteFontAdjustValue'),
    quoteEnhanceContent: $('quoteEnhanceContent'),
    quoteFavoritePreset: $('quoteFavoritePreset'),
    quoteSaveFavorite: $('quoteSaveFavorite'),
    quoteApplyFavorite: $('quoteApplyFavorite'),
    quoteDeleteFavorite: $('quoteDeleteFavorite'),
    quoteShowTranslation: $('quoteShowTranslation'),
    quoteShowSource: $('quoteShowSource'),
    quoteShowAnnotation: $('quoteShowAnnotation'),
    quoteAnnotationStyle: $('quoteAnnotationStyle'),
    quoteShowWatermark: $('quoteShowWatermark'),
    quoteWatermarkMode: $('quoteWatermarkMode'),
    quoteProHint: $('quoteProHint'),
    quoteSourceOverride: $('quoteSourceOverride'),
    quoteRestoreSource: $('quoteRestoreSource'),
    quoteAnnotationOverride: $('quoteAnnotationOverride'),
    quoteRestoreAnnotation: $('quoteRestoreAnnotation'),
    quoteAnnotationMeta: $('quoteAnnotationMeta'),
    quoteFilenamePattern: $('quoteFilenamePattern'),
    quotePreviewScale: $('quotePreviewScale'),
    quotePreviewStage: $('quotePreviewStage'),
    quotePreviewCanvas: $('quotePreviewCanvas'),
    quoteCurrentText: $('quoteCurrentText'),
    quoteQualityHint: $('quoteQualityHint'),
  };

  const state = {
    db: null,
    entitlements: null,
    tab: 'words',
    selectedWords: new Set(),
    selectedSent: new Set(),
    enMeaningCache: {},
    enLoading: new Set(),
    viewFlags: {cn:true,en:false,note:true},
    sentViewFlags: {translation:true,note:true},
    cardView: {},
    lockWordOrder: false,
    frozenWordOrder: [],
    quoteExport: null,
    quoteExportSentenceId: null,
    pendingQuoteExport: null,
  };

  function getInitialTabFromUrl(){
    try{
      const q = new URLSearchParams(String(location.search || ''));
      const tab = String(q.get('tab') || '').trim().toLowerCase();
      if(tab === 'sentences' || tab === 'quotes') return 'sentences';
      if(tab === 'words') return 'words';
      const hash = String(location.hash || '').replace(/^#/, '').trim().toLowerCase();
      if(hash === 'sentences' || hash === 'quotes') return 'sentences';
      if(hash === 'words') return 'words';
    }catch(_){/* ignore */}
    return 'words';
  }
  state.tab = getInitialTabFromUrl();

  function getPendingQuoteExportFromUrl(){
    try{
      const q = new URLSearchParams(String(location.search || ''));
      const shouldOpen = ['1', 'true', 'yes'].includes(String(q.get('quoteExport') || '').trim().toLowerCase());
      if(!shouldOpen) return null;
      const quoteId = Number(q.get('quoteId') || 0);
      return {
        quoteId: Number.isFinite(quoteId) && quoteId > 0 ? quoteId : null,
      };
    }catch(_){
      return null;
    }
  }
  state.pendingQuoteExport = getPendingQuoteExportFromUrl();

  const FREE_ENTITLEMENTS = Object.freeze({
    word_limit: 200,
    note_limit: 10,
    import_export: false,
    bulk_edit: false,
    review_mode: 'basic',
    quote_export_enabled: true,
    quote_templates: ['light'],
    quote_advanced_settings: false,
  });

  function normalizeEntitlements(raw){
    const out = { ...FREE_ENTITLEMENTS, ...(raw && typeof raw === 'object' ? raw : {}) };
    out.import_export = !!out.import_export;
    out.bulk_edit = !!out.bulk_edit;
    out.review_mode = String(out.review_mode || 'basic') === 'advanced' ? 'advanced' : 'basic';
    out.quote_export_enabled = out.quote_export_enabled !== false;
    out.quote_advanced_settings = !!out.quote_advanced_settings;
    out.quote_templates = Array.isArray(out.quote_templates) ? out.quote_templates.map(x=>String(x||'').trim()).filter(Boolean) : FREE_ENTITLEMENTS.quote_templates.slice();
    if(!out.quote_templates.length) out.quote_templates = FREE_ENTITLEMENTS.quote_templates.slice();
    return out;
  }

  function getEntitlements(){
    return normalizeEntitlements(state.entitlements);
  }

  function guardFeature(enabled, message, anchorEl=null){
    if(enabled) return true;
    showManagerToast(message || '该功能仅专业版可用。', 'error', { anchorEl });
    return false;
  }

  function clearWordOrderLock(){
    state.lockWordOrder = false;
    state.frozenWordOrder = [];
  }

  function getCurrentWordOrderFromDom(){
    if(!el.wordCards) return [];
    return Array.from(el.wordCards.querySelectorAll('.word-card[data-word]'))
      .map(node => node.getAttribute('data-word') || '')
      .filter(Boolean);
  }

  const QUOTE_EXPORT_SETTINGS_KEY = 'hord_quote_export_settings_v2';
  const QUOTE_EXPORT_FAVORITES_KEY = 'hord_quote_export_favorites_v1';
  const quoteExporter = globalThis.QuoteCardExporter || null;

  function loadQuoteExportSettings(){
    const base = quoteExporter?.DEFAULT_SETTINGS || {
      template:'light', ratio:'1:1', density:'standard', fontAdjust:0, mainFont:'inter', cjkFont:'notoSansSC', enhanceContent:true, showTranslation:true, showAnnotation:false, showSource:true, showWatermark:true, watermarkMode:'signature', isProUser:false, filenamePattern:'hord-{date}-{template}-{ratio}'
    };
    try{
      const raw = localStorage.getItem(QUOTE_EXPORT_SETTINGS_KEY);
      if(!raw) return Object.assign({}, base);
      const parsed = JSON.parse(raw);
      return quoteExporter?.normalizeSettings
        ? quoteExporter.normalizeSettings(Object.assign({}, base, parsed))
        : Object.assign({}, base, parsed);
    }catch(_){
      return Object.assign({}, base);
    }
  }

  function saveQuoteExportSettings(settings){
    try{
      localStorage.setItem(QUOTE_EXPORT_SETTINGS_KEY, JSON.stringify(settings));
    }catch(_){/* ignore */}
  }

  function loadQuoteExportFavorites(){
    try{
      const raw = localStorage.getItem(QUOTE_EXPORT_FAVORITES_KEY);
      if(!raw) return [];
      const parsed = JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      return parsed
        .filter(it => it && typeof it.name === 'string' && it.settings && typeof it.settings === 'object')
        .slice(0, 24);
    }catch(_){
      return [];
    }
  }

  function saveQuoteExportFavorites(list){
    try{
      localStorage.setItem(QUOTE_EXPORT_FAVORITES_KEY, JSON.stringify(Array.isArray(list) ? list.slice(0, 24) : []));
    }catch(_){/* ignore */}
  }

  function getSentenceById(id){
    const list = state.db?.collectedSentences || [];
    return list.find(item => Number(item.createdAt || item.id) === Number(id)) || null;
  }

  function readQuoteSettingsFromForm(){
    const raw = {
      template: el.quoteTemplate?.value || 'light',
      ratio: el.quoteRatio?.value || '1:1',
      density: el.quoteDensity?.value || 'standard',
      fontAdjust: Number(el.quoteFontAdjust?.value || 0),
      mainFont: el.quoteMainFont?.value || 'inter',
      cjkFont: el.quoteCjkFont?.value || 'notoSansSC',
      enhanceContent: el.quoteEnhanceContent ? !!el.quoteEnhanceContent.checked : true,
      annotationStyle: el.quoteAnnotationStyle?.value === 'emphasis' ? 'emphasis' : 'normal',
      showTranslation: !!el.quoteShowTranslation?.checked,
      showAnnotation: !!el.quoteShowAnnotation?.checked,
      showSource: !!el.quoteShowSource?.checked,
      showWatermark: !!el.quoteShowWatermark?.checked,
      watermarkMode: el.quoteWatermarkMode?.value || 'signature',
      previewScaleMode: el.quotePreviewScale?.value || 'fit',
      filenamePattern: String(el.quoteFilenamePattern?.value || 'hord-{date}-{template}-{ratio}').trim(),
      isProUser: false,
      features: {
        advancedTemplates: false,
        backgroundWatermark: false,
        highResolutionExport: false,
      },
    };
    state.quoteExport = quoteExporter?.normalizeSettings ? quoteExporter.normalizeSettings(raw) : raw;
    saveQuoteExportSettings(state.quoteExport);
    return state.quoteExport;
  }

  function readQuoteOverridesFromForm(){
    return {
      sourceTextOverride: String(el.quoteSourceOverride?.value || '').trim(),
      annotationTextOverride: String(el.quoteAnnotationOverride?.value || '').trim(),
    };
  }

  function getDefaultSourceText(sentence){
    return quoteExporter?.toReadableSource
      ? quoteExporter.toReadableSource(sentence?.url || sentence?.sourceUrl || sentence?.pageUrl || '')
      : (quoteExporter?.getDomainText ? quoteExporter.getDomainText(sentence?.url || sentence?.sourceUrl || sentence?.pageUrl || '') : '');
  }

  const QUOTE_PRESETS = {
    study: {
      template: 'light',
      ratio: '4:5',
      density: 'standard',
      fontAdjust: 1,
      mainFont: 'inter',
      cjkFont: 'notoSansSC',
      enhanceContent: true,
      annotationStyle: 'normal',
      showTranslation: true,
      showAnnotation: true,
      showSource: true,
      showWatermark: true,
      watermarkMode: 'signature',
      filenamePattern: 'hord-study-{date}-{template}-{ratio}',
    },
    social: {
      template: 'gradientSoft',
      ratio: '4:5',
      density: 'airy',
      fontAdjust: 2,
      mainFont: 'playfair',
      cjkFont: 'notoSerifSC',
      enhanceContent: true,
      annotationStyle: 'normal',
      showTranslation: true,
      showAnnotation: false,
      showSource: true,
      showWatermark: true,
      watermarkMode: 'cornerLogo',
      filenamePattern: 'hord-social-{date}-{template}-{ratio}',
    },
    minimal: {
      template: 'dark',
      ratio: '1:1',
      density: 'compact',
      fontAdjust: 0,
      mainFont: 'lora',
      cjkFont: 'notoSansSC',
      enhanceContent: true,
      annotationStyle: 'normal',
      showTranslation: false,
      showAnnotation: false,
      showSource: false,
      showWatermark: true,
      watermarkMode: 'signature',
      filenamePattern: 'hord-min-{date}-{template}-{ratio}',
    },
  };

  function applyQuotePreset(name){
    const preset = QUOTE_PRESETS[name];
    if(!preset) return;
    if(el.quoteTemplate) el.quoteTemplate.value = preset.template;
    if(el.quoteRatio) el.quoteRatio.value = preset.ratio;
    if(el.quoteDensity) el.quoteDensity.value = preset.density;
    if(el.quoteFontAdjust) el.quoteFontAdjust.value = String(preset.fontAdjust);
    if(el.quoteMainFont) el.quoteMainFont.value = preset.mainFont || 'inter';
    if(el.quoteCjkFont) el.quoteCjkFont.value = preset.cjkFont || 'notoSansSC';
    if(el.quoteEnhanceContent) el.quoteEnhanceContent.checked = preset.enhanceContent !== false;
    if(el.quoteAnnotationStyle) el.quoteAnnotationStyle.value = preset.annotationStyle || 'normal';
    if(el.quoteShowTranslation) el.quoteShowTranslation.checked = !!preset.showTranslation;
    if(el.quoteShowAnnotation) el.quoteShowAnnotation.checked = !!preset.showAnnotation;
    if(el.quoteShowSource) el.quoteShowSource.checked = !!preset.showSource;
    if(el.quoteShowWatermark) el.quoteShowWatermark.checked = !!preset.showWatermark;
    if(el.quoteWatermarkMode) el.quoteWatermarkMode.value = preset.watermarkMode;
    if(el.quoteFilenamePattern) el.quoteFilenamePattern.value = preset.filenamePattern;
    updateQuoteFontAdjustLabel();
    syncTemplateWallActive();
    renderQuotePreview();
  }

  function syncTemplateWallActive(){
    if(!el.quoteTemplateWall) return;
    const current = el.quoteTemplate?.value || '';
    for(const btn of Array.from(el.quoteTemplateWall.querySelectorAll('.quoteTplThumb[data-template]'))){
      btn.classList.toggle('active', btn.getAttribute('data-template') === current);
    }
  }

  function getTemplateWallOrder(){
    if(!el.quoteTemplateWall) return [];
    return Array.from(el.quoteTemplateWall.querySelectorAll('.quoteTplThumb[data-template]'))
      .map(btn => String(btn.getAttribute('data-template') || '').trim())
      .filter(Boolean);
  }

  function cycleQuoteTemplate(step){
    if(!el.quoteTemplate) return;
    const order = getTemplateWallOrder();
    if(!order.length) return;
    const cur = String(el.quoteTemplate.value || order[0]);
    const idx = Math.max(0, order.indexOf(cur));
    const next = order[(idx + step + order.length) % order.length];
    el.quoteTemplate.value = next;
    syncTemplateWallActive();
    renderQuotePreview();
  }

  function quoteModalOpen(){
    return !!(el.quoteExportMask && el.quoteExportMask.style.display === 'flex');
  }

  function getFavoriteSettingsSnapshot(){
    const settings = readQuoteSettingsFromForm();
    return {
      template: settings.template,
      ratio: settings.ratio,
      density: settings.density,
      fontAdjust: settings.fontAdjust,
      mainFont: settings.mainFont || 'inter',
      cjkFont: settings.cjkFont || 'notoSansSC',
      enhanceContent: settings.enhanceContent !== false,
      annotationStyle: settings.annotationStyle === 'emphasis' ? 'emphasis' : 'normal',
      showTranslation: settings.showTranslation,
      showAnnotation: settings.showAnnotation,
      showSource: settings.showSource,
      showWatermark: settings.showWatermark,
      watermarkMode: settings.watermarkMode,
      filenamePattern: settings.filenamePattern,
    };
  }

  function syncQuoteFavoriteOptions(){
    if(!el.quoteFavoritePreset) return;
    const list = loadQuoteExportFavorites();
    const current = el.quoteFavoritePreset.value || '';
    el.quoteFavoritePreset.innerHTML = '<option value="">选择收藏...</option>';
    for(const item of list){
      const op = document.createElement('option');
      op.value = item.name;
      op.textContent = item.name;
      el.quoteFavoritePreset.appendChild(op);
    }
    if(current && list.some(it => it.name === current)) el.quoteFavoritePreset.value = current;
  }

  function applyQuoteFavoriteByName(name){
    const target = String(name || '').trim();
    if(!target) return false;
    const list = loadQuoteExportFavorites();
    const found = list.find(it => it.name === target);
    if(!found || !found.settings) return false;
    const s = found.settings;
    if(el.quoteTemplate) el.quoteTemplate.value = s.template || 'light';
    if(el.quoteRatio) el.quoteRatio.value = s.ratio || '1:1';
    if(el.quoteDensity) el.quoteDensity.value = s.density || 'standard';
    if(el.quoteFontAdjust) el.quoteFontAdjust.value = String(Number(s.fontAdjust || 0));
    if(el.quoteMainFont) el.quoteMainFont.value = s.mainFont || 'inter';
    if(el.quoteCjkFont) el.quoteCjkFont.value = s.cjkFont || 'notoSansSC';
    if(el.quoteEnhanceContent) el.quoteEnhanceContent.checked = s.enhanceContent !== false;
    if(el.quoteAnnotationStyle) el.quoteAnnotationStyle.value = s.annotationStyle === 'emphasis' ? 'emphasis' : 'normal';
    if(el.quoteShowTranslation) el.quoteShowTranslation.checked = !!s.showTranslation;
    if(el.quoteShowAnnotation) el.quoteShowAnnotation.checked = !!s.showAnnotation;
    if(el.quoteShowSource) el.quoteShowSource.checked = !!s.showSource;
    if(el.quoteShowWatermark) el.quoteShowWatermark.checked = !!s.showWatermark;
    if(el.quoteWatermarkMode) el.quoteWatermarkMode.value = s.watermarkMode || 'signature';
    if(el.quoteFilenamePattern) el.quoteFilenamePattern.value = s.filenamePattern || 'hord-{date}-{template}-{ratio}';
    updateQuoteFontAdjustLabel();
    syncTemplateWallActive();
    renderQuotePreview();
    return true;
  }

  function applyQuoteUiPolicy(settings){
    const allTemplates = ['light', 'dark', 'hordSignature', 'editorial', 'gradientSoft', 'boldImpact', 'letterClassic', 'parchment', 'inkJournal', 'typewriter'];
    const allowedTpl = new Set(allTemplates);
    const allowedWm = new Set(['signature', 'cornerLogo', 'backgroundLogo']);
    if(el.quoteTemplate){
      for(const option of Array.from(el.quoteTemplate.options || [])){
        option.disabled = !allowedTpl.has(option.value);
      }
      if(!allowedTpl.has(el.quoteTemplate.value)){
        const first = Array.from(allowedTpl)[0];
        if(first) el.quoteTemplate.value = first;
      }
    }
    if(el.quoteWatermarkMode){
      for(const option of Array.from(el.quoteWatermarkMode.options || [])){
        option.disabled = !allowedWm.has(option.value);
      }
      if(!allowedWm.has(el.quoteWatermarkMode.value)){
        const first = Array.from(allowedWm)[0];
        if(first) el.quoteWatermarkMode.value = first;
      }
    }
    if(el.quoteRatio){
      for(const option of Array.from(el.quoteRatio.options || [])) option.disabled = false;
      el.quoteRatio.disabled = false;
    }
    if(el.quoteDensity){
      el.quoteDensity.disabled = false;
    }
    if(el.quoteFontAdjust){
      el.quoteFontAdjust.disabled = false;
    }
    if(el.quoteFilenamePattern){
      el.quoteFilenamePattern.disabled = false;
    }
    if(el.quoteShowWatermark){
      el.quoteShowWatermark.disabled = false;
    }
    if(el.quotePreset){
      el.quotePreset.disabled = false;
    }
    if(el.quoteEnhanceContent){
      el.quoteEnhanceContent.disabled = false;
    }
    if(el.quoteProHint){
      el.quoteProHint.textContent = '当前版本已开放全部模板与水印模式。';
    }
  }

  function updateQuoteFontAdjustLabel(){
    if(!el.quoteFontAdjustValue) return;
    const n = Number(el.quoteFontAdjust?.value || 0);
    const sign = n > 0 ? `+${n}` : `${n}`;
    el.quoteFontAdjustValue.textContent = sign;
  }

  function syncQuoteSettingsToForm(settings){
    if(!settings) return;
    if(el.quoteTemplate) el.quoteTemplate.value = settings.template;
    if(el.quoteRatio) el.quoteRatio.value = settings.ratio;
    if(el.quoteDensity) el.quoteDensity.value = settings.density || 'standard';
    if(el.quoteFontAdjust) el.quoteFontAdjust.value = String(Number(settings.fontAdjust || 0));
    if(el.quoteMainFont) el.quoteMainFont.value = settings.mainFont || 'inter';
    if(el.quoteCjkFont) el.quoteCjkFont.value = settings.cjkFont || 'notoSansSC';
    if(el.quoteEnhanceContent) el.quoteEnhanceContent.checked = settings.enhanceContent !== false;
    if(el.quoteAnnotationStyle) el.quoteAnnotationStyle.value = settings.annotationStyle === 'emphasis' ? 'emphasis' : 'normal';
    if(el.quoteFilenamePattern) el.quoteFilenamePattern.value = settings.filenamePattern || 'hord-{date}-{template}-{ratio}';
    if(el.quoteShowTranslation) el.quoteShowTranslation.checked = !!settings.showTranslation;
    if(el.quoteShowAnnotation) el.quoteShowAnnotation.checked = !!settings.showAnnotation;
    if(el.quoteShowSource) el.quoteShowSource.checked = !!settings.showSource;
    if(el.quoteShowWatermark) el.quoteShowWatermark.checked = !!settings.showWatermark;
    if(el.quoteWatermarkMode) el.quoteWatermarkMode.value = settings.watermarkMode || 'signature';
    if(el.quotePreviewScale) el.quotePreviewScale.value = settings.previewScaleMode || 'fit';
    updateQuoteFontAdjustLabel();
    applyQuoteUiPolicy(settings);
    syncTemplateWallActive();
  }

  function renderQuotePreview(){
    if(!state.quoteExportSentenceId || !quoteExporter || !el.quotePreviewCanvas) return;
    const sentence = getSentenceById(state.quoteExportSentenceId);
    if(!sentence) return;
    const settings = Object.assign({}, readQuoteSettingsFromForm(), readQuoteOverridesFromForm());
    const scaleMode = String(el.quotePreviewScale?.value || settings.previewScaleMode || 'fit');
    settings.previewScaleMode = scaleMode;
    if(scaleMode === 'fit'){
      settings.previewFit = true;
      settings.previewScale = 1;
    }else{
      settings.previewFit = false;
      settings.previewScale = Number(scaleMode || 1);
    }
    const stageH = Number(el.quotePreviewStage?.clientHeight || 0);
    const stageW = Number(el.quotePreviewStage?.clientWidth || 0);
    if(stageH > 0) settings.previewMaxHeight = Math.max(180, stageH - 8);
    if(stageW > 0) settings.previewMaxWidth = Math.max(220, stageW - 8);
    if(el.quoteCurrentText){
      const text = String(sentence.text || '').trim();
      el.quoteCurrentText.textContent = text ? `当前金句：${text.slice(0, 110)}${text.length > 110 ? '…' : ''}` : '当前金句：-';
    }
    syncTemplateWallActive();
    try{
      quoteExporter.renderPreview(sentence, settings, el.quotePreviewCanvas);
      renderQuoteQualityHint(settings, el.quotePreviewCanvas);
      renderQuoteAnnotationMeta(settings, el.quotePreviewCanvas);
    }catch(err){
      showManagerToast(err?.message || '预览生成失败');
      renderQuoteQualityHint(null, null, err?.message || '预览失败');
      renderQuoteAnnotationMeta(null, null, err?.message || '预览失败');
    }
  }

  function renderQuoteAnnotationMeta(settings, canvas, fallbackError){
    if(!el.quoteAnnotationMeta) return;
    if(fallbackError){
      el.quoteAnnotationMeta.textContent = `批注预估：${fallbackError}`;
      return;
    }
    if(!settings?.showAnnotation){
      el.quoteAnnotationMeta.textContent = '批注预估：未启用批注显示';
      return;
    }
    const val = String(el.quoteAnnotationOverride?.value || '').trim();
    if(!val){
      el.quoteAnnotationMeta.textContent = '批注预估：当前为空';
      return;
    }
    const ann = canvas?.__layoutDebug?.annotation || null;
    if(ann && Number.isFinite(ann.lines)){
      const lines = Number(ann.lines || 0);
      const maxLines = Number(ann.maxLines || 3);
      const raw = Number(ann.rawLines || lines);
      const truncated = raw > maxLines;
      el.quoteAnnotationMeta.textContent = truncated
        ? `批注预估：${lines}/${maxLines} 行，导出时会截断`
        : `批注预估：${lines}/${maxLines} 行，完整显示`;
      return;
    }
    el.quoteAnnotationMeta.textContent = '批注预估：正在计算...';
  }

  function renderQuoteQualityHint(settings, canvas, fallbackError){
    if(!el.quoteQualityHint) return;
    if(fallbackError){
      el.quoteQualityHint.className = 'quoteQualityHint high';
      el.quoteQualityHint.textContent = `质量提醒：${fallbackError}`;
      return;
    }
    const report = quoteExporter?.getQualityReport
      ? quoteExporter.getQualityReport(settings || {}, canvas?.__layoutDebug || null)
      : null;
    if(!report){
      el.quoteQualityHint.className = 'quoteQualityHint';
      el.quoteQualityHint.textContent = '质量提醒：暂无质量数据。';
      return;
    }
    const levelClass = report.level === 'ok' ? 'ok' : (report.level === 'high' ? 'high' : 'warn');
    el.quoteQualityHint.className = `quoteQualityHint ${levelClass}`;
    if(report.warnings && report.warnings.length){
      el.quoteQualityHint.textContent = `质量提醒：${report.warnings.join('；')}`;
    }else{
      el.quoteQualityHint.textContent = '质量提醒：排版状态良好。';
    }
  }

  function openQuoteExportModal(id){
    if(!quoteExporter){
      alert('导出模块未加载，请刷新页面后重试。');
      return;
    }
    const sentence = getSentenceById(id);
    if(!sentence){
      alert('找不到对应金句，可能已被删除。');
      return;
    }
    state.quoteExportSentenceId = Number(id);
    if(!state.quoteExport) state.quoteExport = loadQuoteExportSettings();
    syncQuoteSettingsToForm(state.quoteExport);
    syncQuoteFavoriteOptions();
    if(el.quotePreset) el.quotePreset.value = '';
    if(el.quoteSourceOverride){
      const source = getDefaultSourceText(sentence);
      el.quoteSourceOverride.value = source || '';
    }
    if(el.quoteAnnotationOverride){
      el.quoteAnnotationOverride.value = String(sentence?.note || '').trim();
    }
    document.body.classList.add('quote-export-open');
    if(el.quoteExportMask) el.quoteExportMask.style.display = 'flex';
    renderQuotePreview();
  }

  function closeQuoteExportModal(){
    if(el.quoteExportMask) el.quoteExportMask.style.display = 'none';
    document.body.classList.remove('quote-export-open');
    state.quoteExportSentenceId = null;
  }

  function clearPendingQuoteExportQuery(){
    try{
      const next = new URL(String(location.href || ''));
      next.searchParams.delete('quoteExport');
      next.searchParams.delete('quoteId');
      history.replaceState(null, '', next.toString());
    }catch(_){/* ignore */}
  }

  function tryOpenPendingQuoteExport(){
    if(!state.pendingQuoteExport) return;
    const list = state.db?.collectedSentences || [];
    const req = state.pendingQuoteExport;

    if(state.tab !== 'sentences') setTab('sentences');
    if(!list.length){
      showManagerToast('未找到可导出的金句，请先收藏一句再试。');
      state.pendingQuoteExport = null;
      clearPendingQuoteExportQuery();
      return;
    }

    let target = null;
    if(req.quoteId){
      target = list.find(item => Number(item.createdAt || item.id) === Number(req.quoteId)) || null;
    }
    if(!target) target = list[0];

    state.pendingQuoteExport = null;
    clearPendingQuoteExportQuery();
    openQuoteExportModal(Number(target.createdAt || target.id || 0));
  }

  // -----------------------------
  // Export/Import payload helpers
  // Preferred schema:
  // {
  //   version: string,
  //   exportedAt: ISO string,
  //   words: Word[],
  //   sentences: Sentence[]
  // }
  // Backward-compat import also supports:
  // {
  //   meta: { version, exportedAt },
  //   words: [...],
  //   sentences: [...]
  // }
  function buildExportPayload() {
    const version = getVersionTag();
    const exportedAt = new Date().toISOString();

    // Prefer exporting from the raw state.db (source of truth).
    const db = state.db || {};

    const wordsFromDb = (() => {
      const list = Array.isArray(db.vocabList) ? db.vocabList : [];
      const dict = db.vocabDict || {};
      const notes = db.vocabNotes || {};
      const enDict = db.vocabEn || {};
      const meta = db.vocabMeta || {};

      return list
        .map((w) => {
          const info = dict[w] || {};
          const m = meta[w] || {};
          return {
            word: w,
            meaning: info.meaning || '',
            englishMeaning: normalizeEnMeaning(enDict[w]),
            note: notes[w] || '',
            status: m.status || 'yellow',
            reviewCount: Number.isFinite(m.reviewCount) ? m.reviewCount : (m.reviewCount || 0),
            phoneticUS: info.phoneticUS || '',
            phoneticUK: info.phoneticUK || '',
            audioUS: info.audioUS || '',
            audioUK: info.audioUK || '',
            sourceUrl: m.sourceUrl || '',
            sourceLabel: m.sourceLabel || m.sourceTitle || '',
            createdAt: m.createdAt || Date.now(),
            updatedAt: m.updatedAt || m.createdAt || Date.now(),
          };
        })
        .filter((x) => x.word);
    })();

    const sentencesFromDb = (() => {
      const list = Array.isArray(db.collectedSentences) ? db.collectedSentences : (Array.isArray(db.sentences) ? db.sentences : []);
      return list.map((s) => ({
        text: s.text || '',
        title: s.title || '',
        url: s.url || '',
        sourceLabel: s.sourceLabel || '',
        translation: s.translation || '',
        note: s.note || '',
        createdAt: s.createdAt || Date.now(),
      })).filter((x) => x.text);
    })();

    // Fallback: if db is unavailable, export current in-memory state.
    const words = wordsFromDb.length ? wordsFromDb : (Array.isArray(state.words) ? state.words : []);
    const sentences = sentencesFromDb.length ? sentencesFromDb : (Array.isArray(state.sentences) ? state.sentences : []);

    return { version, exportedAt, words, sentences };
  }

  function normalizeImportPayload(raw) {
    if (!raw || typeof raw !== 'object') return null;
    // If wrapped under meta, flatten it.
    const version = raw.version || (raw.meta && raw.meta.version) || getVersionTag();
    const exportedAt = raw.exportedAt || (raw.meta && raw.meta.exportedAt) || new Date().toISOString();
    const words = Array.isArray(raw.words) ? raw.words : [];
    const sentences = Array.isArray(raw.sentences) ? raw.sentences : [];
    return { version, exportedAt, words, sentences };
  }
  function formatTimestamp(d=new Date()){
    const pad=(n)=>String(n).padStart(2,'0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  function getVersionTag(){
    // e.g. "v2.2.3" from DOM
    const raw = (el.ver?.textContent||'').trim();
    // Normalize to plain semver like "2.50.6"
    return raw ? raw.replace(/^v/i,'').trim() : '0.0.0';
  }

  function computeTopProgress(db){
    const words = (db?.words||[]);
    const total = words.length;
    const mastered = words.filter(w=>w?.status==='green').length;
    const pct = total ? Math.round((mastered/total)*100) : 0;
    return { total, mastered, pct };
  }

  function renderBadges(db){
    if(!el.badgeRow) return;
    const words = (db?.words||[]);
    const total = words.length;
    const noteCount = words.filter(w=>String(w?.note||'').trim()).length;
    const learned = words.filter(w=>w?.status==='green').length;
    const milestone = (n)=> total>=n;
    const badges = [];
    if(milestone(50)) badges.push({label:'入门 50+', tone:'gold'});
    if(milestone(200)) badges.push({label:'坚持 200+', tone:'green'});
    if(milestone(500)) badges.push({label:'硬核 500+', tone:'purple'});
    if(noteCount>=10) badges.push({label:`批注达人 ${noteCount}`, tone:'purple'});
    if(learned>=50) badges.push({label:`已掌握 ${learned}`, tone:'green'});
    if(!badges.length) badges.push({label:'从今天开始 ✨', tone:'muted'});

    el.badgeRow.innerHTML = badges.map(b=>{
      const cls = b.tone==='green' ? 'badge green' : b.tone==='purple' ? 'badge purple' : b.tone==='gold' ? 'badge gold' : 'badge muted';
      return `<span class="${cls}">${b.label}</span>`;
    }).join('');
  }

  function sendMessage(msg){
    return new Promise((resolve)=>{
      try{
        chrome.runtime.sendMessage(msg, (resp)=>{
          const err = chrome.runtime.lastError;
          if(err){
            resolve({ok:false, error: err.message || String(err)});
            return;
          }
          resolve(resp);
        });
      }catch(e){
        resolve({ok:false, error: e && e.message ? e.message : String(e)});
      }
    });
  }

  function formatBytes(bytes){
    const b = Number(bytes) || 0;
    if(b < 1024) return `${b} B`;
    const kb = b / 1024;
    if(kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  function resetImportPreview(){
    if(el.fileInfo){
      el.fileInfo.textContent = '';
      el.fileInfo.style.display = 'none';
    }
    if(el.filePreviewWrap){
      el.filePreviewWrap.style.display = 'none';
    }
    if(el.filePreview) el.filePreview.textContent = '';
  }

  function clearImportError(){
    if(el.ioError){
      el.ioError.textContent = '';
      el.ioError.style.display = 'none';
    }
  }

  function buildImportErrorTip(errMsg){
    const msg = String(errMsg||'').toLowerCase();
    if(!msg) return '';
    if(msg.includes('feature_locked_import_export')){
      return '该账号当前为免费版权益，导入功能仅专业版可用。';
    }
    if(msg.includes('free_limit_')){
      return '超过免费版单词上限（200），请升级专业版或减少导入数量。';
    }
    if(msg.includes('note_limit_')){
      return '超过免费版批注上限（10），请升级专业版或清理批注后重试。';
    }
    if(msg.includes('message') && (msg.includes('length') || msg.includes('size') || msg.includes('too large') || msg.includes('max'))){
      return '可能是消息过大：尝试拆分文件或减少导入数量。';
    }
    if(msg.includes('quota') || msg.includes('storage')){
      return '可能超过存储配额：请先删除部分数据再导入。';
    }
    if(msg.includes('permission') || msg.includes('denied') || msg.includes('unauthorized')){
      return '可能是权限问题：请检查扩展权限或重新打开管理页。';
    }
    if(msg.includes('port closed') || msg.includes('closed')){
      return '通信中断：请刷新页面后重试。';
    }
    return '';
  }

  async function getStateSnapshot(){
    const res = await sendMessage({type:'OP_GET_STATE'});
    if(res && res.ok && res.db){
      return {
        db: res.db,
        entitlements: normalizeEntitlements(res.entitlements || res.db?.auth?.entitlements),
      };
    }
    // fallback (shouldn't happen)
    const raw = await new Promise(r=>chrome.storage.local.get(null, r));
    const db = raw.vocab_builder_db || raw;
    return { db, entitlements: normalizeEntitlements(db?.auth?.entitlements) };
  }

  async function getDB(){
    const snapshot = await getStateSnapshot();
    return snapshot.db;
  }

  function applyAccessPolicy(){
    const ent = getEntitlements();
    const canImex = !!ent.import_export;
    const canBulk = !!ent.bulk_edit;

    const lockBtn = (node, locked, title)=>{
      if(!node) return;
      // Keep button clickable so guardFeature toast can explain why it's unavailable.
      node.disabled = false;
      node.setAttribute('aria-disabled', locked ? 'true' : 'false');
      node.dataset.locked = locked ? '1' : '0';
      node.style.opacity = locked ? '.58' : '';
      node.style.cursor = locked ? 'not-allowed' : '';
      node.title = locked ? (title || '专业版功能') : '';
    };

    lockBtn(el.btnImport, !canImex, '导入仅专业版可用');
    lockBtn(el.btnExport, !canImex, '导出仅专业版可用');
    lockBtn(el.btnImportSent, !canImex, '导入仅专业版可用');
    // 句子导出图片是核心高频功能，始终可用（与数据导出权限分离）。
    lockBtn(el.btnExportSent, false, '');
    lockBtn(el.btnBulkCycle, !canBulk, '批量编辑仅专业版可用');
    lockBtn(el.btnBulkDelete, !canBulk, '批量编辑仅专业版可用');
    lockBtn(el.btnBulkDeleteSent, !canBulk, '批量编辑仅专业版可用');

    if(el.limitInfo){
      el.limitInfo.textContent = ent.review_mode === 'advanced'
        ? 'HORD English Companion · Pro'
        : 'HORD English Companion · Free';
    }
  }

  function normalizeWordStatus(db, w){
    // Accept either a word string or a {word: "..."} object.
    const key = (typeof w === 'string') ? w : (w && typeof w === 'object' ? (w.word || w.text || '') : '');
    // prefer meta.status; else infer from yellow/green lists
    const m = key ? (db.vocabMeta?.[key]) : null;
    let s = (m?.status || '').toLowerCase();
    if(s === 'learning') s = 'yellow';
    else if(s === 'mastered') s = 'green';
    else if(s === 'stranger') s = 'red';
    if(!s){
      if(key && (db.greenList||[]).includes(key)) s='green';
      else if(key && (db.yellowList||[]).includes(key)) s='yellow';
      else s='red';
    }
    if(s === 'new') s='red';
    return s;
  }

  function statusLabel(s){
    if(s==='note') return '批注';
    if(s==='green') return '已掌握';
    if(s==='yellow') return '学习中';
    return '陌生';
  }
  function statusClass(s){
    if(s==='note') return 'st-note';
    if(s==='green') return 'st-green';
    if(s==='yellow') return 'st-yellow';
    return 'st-red';
  }

  // Cycle status in a predictable order
  function nextStatus(cur){
    const order=['red','yellow','green'];
    const i = Math.max(0, order.indexOf(cur||'red'));
    return order[(i+1)%order.length];
  }

  function escapeHtml(str){
    return (str ?? '').toString()
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function truncateText(text, max=100){
    const s = String(text || '');
    if(s.length <= max) return s;
    return s.slice(0, max);
  }
  function normalizeEnMeaning(raw){
    if(!raw) return [];
    if(Array.isArray(raw)) return raw.filter(Boolean).map(String);
    const s = String(raw);
    return s.split(/\s*\|\s*|\s*;\s*|\s*\n\s*/).filter(Boolean);
  }
  function getWordKeyVariants(word){
    const key = String(word || '').trim();
    const lower = key.toLowerCase();
    const upper = key.toUpperCase();
    return { key, lower, upper };
  }
  function getMetaItem(db, word){
    const { key, lower, upper } = getWordKeyVariants(word);
    const meta = db?.vocabMeta || {};
    return meta[key] || meta[lower] || meta[upper] || null;
  }
  function getEnglishMeaningFromDb(db, word){
    const { key, lower, upper } = getWordKeyVariants(word);
    const en = db?.vocabEn || {};
    return normalizeEnMeaning(en[key] ?? en[lower] ?? en[upper] ?? []);
  }
  function isHttpUrl(s){
    return /^https?:\/\//i.test(String(s || ''));
  }

  function getNoteValue(word, notes){
    return String((notes && notes[word]) || '');
  }

  function toCSV(rows){
    const esc = (v) => {
      const s = (v ?? '').toString();
      if(/[",\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
      return s;
    };
    const header = ['word','meaning','englishMeaning','note','status','reviewCount','phoneticUS','phoneticUK','audioUS','audioUK','sourceUrl','sourceLabel','createdAt','updatedAt'];
    const out = [header.join(',')];
    for(const r of rows){
      out.push([
        r.word, r.meaning, (r.englishMeaning||[]).join(' | '), r.note, r.status, r.reviewCount ?? 0,
        r.phoneticUS ?? '', r.phoneticUK ?? '', r.audioUS ?? '', r.audioUK ?? '',
        r.sourceUrl ?? '', r.sourceLabel ?? '',
        r.createdAt ?? '', r.updatedAt ?? ''
      ].map(esc).join(','));
    }
    return out.join('\n');
  }

  function downloadText(filename, text){
    const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    try{
      a.click();
    }catch(e){
      // Fallback: navigate to object URL (still allows save in most Chromium builds)
      window.open(url, '_blank');
    }
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  function showManagerToast(message, type='error', opts={}){
    let host = document.getElementById('managerToastHost');
    if(!host){
      host = document.createElement('div');
      host.id = 'managerToastHost';
      document.body.appendChild(host);
    }
    const item = document.createElement('div');
    item.className = `manager-toast ${type === 'success' ? 'success' : 'error'}`;
    item.textContent = String(message || '');
    const anchorEl = opts && opts.anchorEl && typeof opts.anchorEl.getBoundingClientRect === 'function'
      ? opts.anchorEl
      : null;
    if(anchorEl){
      const rect = anchorEl.getBoundingClientRect();
      const maxW = 320;
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      const estH = 46;
      const gap = 10;
      let left = rect.left + (rect.width / 2) - (maxW / 2);
      let top = rect.top - estH - gap;
      if(left < 8) left = 8;
      if(left + maxW > vw - 8) left = vw - maxW - 8;
      if(top < 8) top = Math.min(vh - estH - 8, rect.bottom + gap);
      item.classList.add('is-anchor');
      item.style.left = `${Math.round(left)}px`;
      item.style.top = `${Math.round(top)}px`;
      item.style.width = `${maxW}px`;
    }
    host.appendChild(item);
    requestAnimationFrame(()=> item.classList.add('show'));
    setTimeout(()=>{
      item.classList.remove('show');
      setTimeout(()=> item.remove(), 220);
    }, 2600);
  }

  async function exportSentenceToPng(sentence){
    if(!quoteExporter){
      throw new Error('导出模块未加载，请刷新页面重试。');
    }
    const settings = state.quoteExport || loadQuoteExportSettings();
    const normalized = quoteExporter.normalizeSettings ? quoteExporter.normalizeSettings(settings) : settings;
    return quoteExporter.exportPng(sentence, normalized, { filenamePrefix: 'hord-quote' });
  }

  async function copySentenceCardToClipboard(sentence){
    if(!quoteExporter){
      throw new Error('导出模块未加载，请刷新页面重试。');
    }
    const settings = state.quoteExport || loadQuoteExportSettings();
    const normalized = quoteExporter.normalizeSettings ? quoteExporter.normalizeSettings(settings) : settings;
    if(quoteExporter.copyPngToClipboard){
      return quoteExporter.copyPngToClipboard(sentence, normalized);
    }
    if(!navigator.clipboard || typeof navigator.clipboard.write !== 'function' || typeof ClipboardItem === 'undefined'){
      throw new Error('当前浏览器不支持复制图片到剪贴板。');
    }
    const canvas = quoteExporter.drawCard(sentence, normalized);
    const blob = await new Promise((resolve, reject)=>{
      canvas.toBlob((b)=>{
        if(b) resolve(b);
        else reject(new Error('图片生成失败，请重试。'));
      }, 'image/png');
    });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  }

  function getBatchSentenceList(){
    const list = state.db?.collectedSentences || [];
    const selected = Array.from(state.selectedSent || []).map(Number).filter(Number.isFinite);
    if(!selected.length){
      const current = getSentenceById(state.quoteExportSentenceId);
      return current ? [current] : [];
    }
    const mapped = selected
      .map(id => list.find(item => Number(item.createdAt || item.id) === id))
      .filter(Boolean);
    return mapped.length ? mapped : [];
  }

  async function batchExportSentenceCards(sentences){
    const settings = state.quoteExport || loadQuoteExportSettings();
    const total = sentences.length;
    for(let i = 0; i < total; i += 1){
      const item = sentences[i];
      const merged = Object.assign({}, settings, { batchIndex: i + 1, batchTotal: total });
      await quoteExporter.exportPng(item, merged, {
        filenamePrefix: 'hord-quote',
        index: i + 1,
        filenamePattern: settings.filenamePattern || 'hord-{date}-{template}-{ratio}',
      });
      showManagerToast(`批量导出中 ${i + 1}/${total}`, 'success');
      await new Promise(r => setTimeout(r, 80));
    }
    return total;
  }

  function pickAudio(db, w, variant){
    const obj = db.vocabAudio?.[w];
    if(!obj) return '';
    if(typeof obj === 'string') return obj;
    if(variant==='uk') return obj.uk || obj.UK || obj.audioUK || '';
    return obj.us || obj.US || obj.audioUS || '';
  }
  function pickPhonetic(db, w, variant){
    const dictObj = (db.vocabDict && typeof db.vocabDict[w] === 'object') ? db.vocabDict[w] : null;
    const obj = db.vocabPhonetics?.[w] || dictObj;
    if(!obj) return '';
    if(typeof obj === 'string') return obj;
    if(variant==='uk') return obj.uk || obj.UK || obj.phoneticUK || '';
    return obj.us || obj.US || obj.phoneticUS || '';
  }

  // ---- Auto-enrich missing meaning/phonetics ----
  const enrichState = {
    queue: [],
    inFlight: 0,
    requested: new Set(),
    maxConcurrent: 2
  };
  function isChineseText(s){
    return /[\u4e00-\u9fff]/.test(s || '');
  }
  function hasMeaning(db, w){
    const m = db.vocabDict?.[w];
    return typeof m === 'string' && m.trim().length > 0;
  }
  function needsMeaningEnrich(db, w){
    const m = db.vocabDict?.[w];
    if(typeof m !== 'string' || !m.trim()) return true;
    return !isChineseText(m);
  }
  function hasPhonetic(db, w){
    const p = db.vocabPhonetics?.[w];
    if(!p) return false;
    if(typeof p === 'string') return p.trim().length > 0;
    return !!(p.us || p.uk || p.phoneticUS || p.phoneticUK);
  }
  function hasAudio(db, w){
    const a = db.vocabAudio?.[w];
    if(!a) return false;
    if(typeof a === 'string') return a.trim().length > 0;
    return !!(a.us || a.uk || a.audioUS || a.audioUK);
  }
  function enqueueEnrich(word){
    if(enrichState.requested.has(word)) return;
    enrichState.requested.add(word);
    enrichState.queue.push(word);
    processEnrichQueue();
  }
  async function processEnrichQueue(){
    if(enrichState.inFlight >= enrichState.maxConcurrent) return;
    const word = enrichState.queue.shift();
    if(!word) return;
    enrichState.inFlight++;
    try{
      const info = await fetchWordInfo(word);
      if(info){
        await upsertWordInfo(word, info);
      }
    }catch(e){}
    finally{
      enrichState.inFlight--;
      if(enrichState.queue.length) processEnrichQueue();
    }
  }
  async function fetchWordInfo(word){
    const w = String(word||'').trim().toLowerCase();
    if(!w) return null;
    try{
      const [meaningCN, dictInfo] = await Promise.all([
        fetchYoudaoMeaning(w),
        fetchDictPhonetics(w)
      ]);
      if(!meaningCN && (!dictInfo || (!dictInfo.phoneticText && !dictInfo.audioUS && !dictInfo.audioUK))) return null;
      return {
        meaning: meaningCN || '',
        phoneticUS: dictInfo?.phoneticText || '',
        phoneticUK: dictInfo?.phoneticText || '',
        audioUS: dictInfo?.audioUS || '',
        audioUK: dictInfo?.audioUK || ''
      };
    }catch(e){
      return null;
    }
  }
  async function fetchDictPhonetics(w){
    try{
      const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`;
      const res = await fetch(url);
      if(!res.ok) return null;
      const data = await res.json();
      if(!Array.isArray(data) || !data.length) return null;
      let phoneticText = '';
      let audioUS = '';
      let audioUK = '';
      for(const entry of data){
        if(!phoneticText && entry.phonetic) phoneticText = entry.phonetic;
        if(Array.isArray(entry.phonetics)){
          for(const ph of entry.phonetics){
            if(!phoneticText && ph.text) phoneticText = ph.text;
            if(ph.audio){
              const a = ph.audio;
              if(/us/i.test(a) && !audioUS) audioUS = a;
              else if(/uk|gb|british/i.test(a) && !audioUK) audioUK = a;
              else if(!audioUS) audioUS = a;
            }
          }
        }
      }
      if(!phoneticText && !audioUS && !audioUK) return null;
      return {phoneticText, audioUS, audioUK};
    }catch(e){
      return null;
    }
  }
  function parseYoudao(html) {
    if (!html) return null;
    const raw = String(html);
    const looksLikeSpaPayload = /window\.__NUXT__|id="__NUXT__"|Youdao\s+Ads|京ICP|serverRendered/i.test(raw);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let phonetic = '';
    const ph = doc.querySelector('.phonetic, .pronounce');
    if (ph) phonetic = (ph.textContent || '').trim();
    const explains = [];
    const li1 = doc.querySelectorAll('#phrsListTab .trans-container ul li');
    li1.forEach(li => {
      const s = (li.textContent || '').trim();
      if (s) explains.push(s);
    });
    if (!explains.length) {
      const li2 = doc.querySelectorAll('.basic .word-exp, .basic ul li');
      li2.forEach(li => {
        const s = (li.textContent || '').trim();
        if (s) explains.push(s);
      });
    }
    if (!explains.length && looksLikeSpaPayload) {
      return { phonetic, explains: [] };
    }
    if (!explains.length) {
      const c = doc.querySelector('#phrsListTab') || doc.querySelector('.wordbook-js') || doc.querySelector('body');
      const txt = c ? (c.textContent || '').trim() : '';
      if (txt) {
        const lines = txt
          .split(/\n+/)
          .map(x => x.replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .filter(x => x.length <= 120)
          .filter(x => !/window\.__NUXT__|京ICP|Youdao\s+Ads|serverRendered/i.test(x));
        lines.slice(0, 6).forEach(s => explains.push(s));
      }
    }
    return { phonetic, explains };
  }
  function buildMeaningFromYoudao(youdao) {
    try {
      const explains = youdao?.explains;
      if (Array.isArray(explains) && explains.length) {
        return explains
          .map((s) => String(s).trim())
          .filter(Boolean)
          .join("\n");
      }
    } catch (e) {}
    return "";
  }
  async function fetchYoudaoMeaning(word){
    try{
      const resp = await sendMessage({type:'GET_TRANSLATIONS', mode:'word', text: word});
      if(!resp || !resp.youdaoHtml) return '';
      const yd = parseYoudao(resp.youdaoHtml);
      return buildMeaningFromYoudao(yd);
    }catch(e){
      return '';
    }
  }
  async function upsertWordInfo(word, info){
    const db = state.db || {};
    const payload = {word: word};
    if(needsMeaningEnrich(db, word) && info.meaning) payload.meaning = info.meaning;
    if(!hasPhonetic(db, word) && (info.phoneticUS || info.phoneticUK)){
      payload.phoneticUS = info.phoneticUS || '';
      payload.phoneticUK = info.phoneticUK || '';
    }
    if(!hasAudio(db, word) && (info.audioUS || info.audioUK)){
      payload.audioUS = info.audioUS || '';
      payload.audioUK = info.audioUK || '';
    }
    if(Object.keys(payload).length <= 1) return;
    await sendMessage({type:'OP_UPSERT_BULK', payload:{words:[payload], sentences:[]}});
    await refresh();
  }

  function playPron(text){
    if(!text) return;
    try{
      const u = new SpeechSynthesisUtterance(text);
      u.lang='en-US';
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }catch(e){}
  }
  function playAudio(url, fallbackText){
    if(url){
      try{
        const a = new Audio(url);
        a.play().catch(()=>playPron(fallbackText));
        return;
      }catch(e){}
    }
    playPron(fallbackText);
  }

  async function fetchEnglishMeaning(word){
    const w = String(word||'').trim().toLowerCase();
    if(!w) return [];
    try{
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
      if(!res.ok) return [];
      const data = await res.json();
      const defs = [];
      for(const entry of Array.isArray(data) ? data : []){
        const meanings = entry.meanings || [];
        for(const m of meanings){
          const d = m.definitions || [];
          for(const it of d){
            if(it && it.definition) defs.push(String(it.definition));
            if(defs.length >= 6) break;
          }
          if(defs.length >= 6) break;
        }
        if(defs.length >= 6) break;
      }
      return defs.slice(0, 6);
    }catch(e){
      return [];
    }
  }

  function ensureEnglishMeaning(word){
    const key = String(word || '').trim();
    if(!key) return;
    const cached = state.enMeaningCache[key];
    if((Array.isArray(cached) && cached.length) || state.enLoading.has(key)) return;
    if(getEnglishMeaningFromDb(state.db, key).length) return;
    if(getMetaItem(state.db, key)?.sourceLabel === '导入') return;
    state.enLoading.add(key);
    fetchEnglishMeaning(word)
      .then((defs)=>{
        state.enMeaningCache[key] = defs;
        if(defs && defs.length){
          sendMessage({type:'OP_UPSERT_BULK', payload:{words:[{word, englishMeaning: defs}], sentences:[]}}).catch(()=>{});
        }
      })
      .catch(()=>{})
      .finally(()=>{
        state.enLoading.delete(key);
        renderWords();
      });
  }

  function setTab(tab){
    if(tab === 'words') clearWordOrderLock();
    state.tab = tab;
    const isWords = tab === 'words';
    el.tabWords.classList.toggle('active', isWords);
    el.tabSentences.classList.toggle('active', !isWords);
    el.toolbarWords.style.display = isWords ? 'flex' : 'none';
    el.wordsWrap.style.display = isWords ? 'block' : 'none';
    el.toolbarSentences.style.display = isWords ? 'none' : 'flex';
    el.sentWrap.style.display = isWords ? 'none' : 'block';
    render();
  }

  function computeStats(db){
    const words = Array.isArray(db.vocabList) ? db.vocabList : [];
    const counts = {total: words.length, red:0, yellow:0, green:0};
    for(const w of words){
      const st = normalizeWordStatus(db, w);
      if(st === 'green') counts.green++;
      else if(st === 'yellow') counts.yellow++;
      else counts.red++;
    }
    const notes = db.vocabNotes ? Object.keys(db.vocabNotes).filter(k=>db.vocabNotes[k]).length : 0;
    return {total: counts.total, yellow: counts.yellow, green: counts.green, red: counts.red, notes};
  }

  // ---- Dashboard time helpers (unique words by lastReviewAt) ----
  function startOfDay(ts){
    const d = new Date(ts);
    d.setHours(0,0,0,0);
    return d.getTime();
  }
  function startOfWeek(ts){
    const d = new Date(ts);
    const day = (d.getDay()+6)%7; // Monday = 0
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - day);
    return d.getTime();
  }
  function startOfMonth(ts){
    const d = new Date(ts);
    d.setHours(0,0,0,0);
    d.setDate(1);
    return d.getTime();
  }
  function countInRange(db, start, end){
    const words = Array.isArray(db.vocabList) ? db.vocabList : [];
    const meta = db.vocabMeta || {};
    let n = 0;
    for(const w of words){
      const key = (typeof w === 'string') ? w : (w && typeof w === 'object' ? (w.word || w.text || '') : '');
      if(!key) continue;
      const m = meta[key] || meta[key.toLowerCase()] || meta[key.toUpperCase()] || null;
      const t = m && m.lastReviewAt;
      if(typeof t === 'number' && t >= start && t < end) n++;
    }
    return n;
  }
  function mapStatus(s){
    const st = String(s || '').toLowerCase();
    if(st === 'green' || st === 'master' || st === 'known') return 'green';
    if(st === 'yellow' || st === 'learning') return 'yellow';
    if(st === 'red' || st === 'new' || st === 'unknown') return 'red';
    return 'yellow';
  }
  function computeDashboardStats(db, now=Date.now()){
    const words = Array.isArray(db.vocabList) ? db.vocabList : [];
    const meta = db.vocabMeta || {};

    let greenCount = 0;
    const statusCounts = {red:0, yellow:0, green:0};
    let totalXP = 0;

    for(const w of words){
      const key = (typeof w === 'string') ? w : (w && typeof w === 'object' ? (w.word || w.text || '') : '');
      if(!key) continue;
      const m = meta[key] || meta[key.toLowerCase()] || meta[key.toUpperCase()] || {};
      const st = mapStatus(m.status || normalizeWordStatus(db, key));
      statusCounts[st] = (statusCounts[st] || 0) + 1;
      if(st === 'green') greenCount++;
      totalXP += Number(m.reviewCount || 0) * 2;
    }

    const totalCount = words.length;
    const masteryPercent = totalCount ? Math.round((greenCount / totalCount) * 100) : 0;

    const dayStart = startOfDay(now);
    const yStart = startOfDay(now - 24*3600*1000);
    const weekStart = startOfWeek(now);
    const weekPrevStart = startOfWeek(now - 7*24*3600*1000);
    const monthStart = startOfMonth(now);
    const dPrev = new Date(now); dPrev.setDate(1); dPrev.setHours(0,0,0,0); dPrev.setMonth(dPrev.getMonth()-1);
    const monthPrevStart = dPrev.getTime();

    const doneToday = countInRange(db, dayStart, now+1);
    const doneYesterday = countInRange(db, yStart, dayStart);
    const weekCur = countInRange(db, weekStart, now+1);
    const weekPrev = countInRange(db, weekPrevStart, weekStart);
    const monthCur = countInRange(db, monthStart, now+1);
    const monthPrev = countInRange(db, monthPrevStart, monthStart);

    // streak: walk back from today
    let streakDays = 0;
    let cursor = dayStart;
    while(true){
      const next = cursor + 24*3600*1000;
      const has = countInRange(db, cursor, next) > 0;
      if(!has) break;
      streakDays++;
      cursor -= 24*3600*1000;
      if(streakDays > 365) break;
    }

    const todayXP = doneToday * 10;
    const level = Math.floor(totalXP / 500) + 1;
    const levelProgress = (totalXP % 500) / 500;

    const targets = {daily:20, weekly:120, monthly:500};
    const remainDaily = Math.max(0, targets.daily - doneToday);
    const badges = [];
    if(doneToday >= 20) badges.push('🥇 Gold Learner');
    else if(doneToday >= 10) badges.push('🥈 Silver Learner');
    else if(doneToday >= 5) badges.push('🥉 Bronze Learner');

    return {
      totalCount,
      greenCount,
      statusCounts,
      masteryPercent,
      doneToday,
      doneYesterday,
      weekCur,
      weekPrev,
      monthCur,
      monthPrev,
      streakDays,
      todayXP,
      totalXP,
      level,
      levelProgress,
      targets,
      remainDaily,
      badges
    };
  }
  function computeReviewStats(words, vocabMeta){
    const now = Date.now();
    const sod = startOfDay(now);
    const sod_y = startOfDay(now - 24*3600*1000);
    const sow = startOfWeek(now);
    const sow_prev = startOfWeek(now - 7*24*3600*1000);
    const som = startOfMonth(now);
    const dPrev = new Date(now);
    dPrev.setDate(1); dPrev.setHours(0,0,0,0);
    dPrev.setMonth(dPrev.getMonth()-1);
    const som_prev = dPrev.getTime();
    const som_next_prev = som;

    const db = {vocabList: words || [], vocabMeta: vocabMeta || {}};
    return {
      today: { cur: countInRange(db, sod, now+1), prev: countInRange(db, sod_y, sod) },
      week: { cur: countInRange(db, sow, now+1), prev: countInRange(db, sow_prev, sow) },
      month:{ cur: countInRange(db, som, now+1), prev: countInRange(db, som_prev, som_next_prev) }
    };
  }

  function renderDashboard(stats){
    const dash = document.getElementById('dashboard');
    if(!dash) return;
    dash.innerHTML = `
      <div class="dash-wrap">
        <div class="dash-grid">

          <section class="dash-card dash-daily" id="dashDaily">
            <div class="dash-top">
              <div class="dash-title">🎯 今日任务</div>
              <div class="dash-badges" id="dashBadges"></div>
            </div>
            <div class="dash-kpi" id="dashDailyText"></div>
            <div class="dash-bar">
              <div class="dash-bar-fill" id="dashDailyFill"></div>
            </div>
            <div class="dash-sub" id="dashDailySub"></div>
          </section>

          <section class="dash-card dash-streak">
            <div class="dash-title">🔥 连胜</div>
            <div class="dash-kpi"><span id="dashStreakFire">🔥</span> <span id="dashStreakDays">0</span> 天</div>
            <div class="dash-sub" id="dashStreakHint"></div>
          </section>

          <section class="dash-card dash-level">
            <div class="dash-title">⭐ 等级</div>
            <div class="dash-kpi">Lv.<span id="dashLevel">1</span></div>
            <div class="dash-sub">今日 +<span id="dashTodayXP">0</span> XP · 总 <span id="dashTotalXP">0</span> XP</div>
            <div class="dash-bar">
              <div class="dash-bar-fill" id="dashLevelFill"></div>
            </div>
          </section>

          <section class="dash-card dash-mastery">
            <div class="dash-title">📊 掌握进度</div>
            <div class="dash-kpi"><span id="dashMasteryPct">0</span>%</div>
            <div class="dash-sub">已掌握 <span id="dashGreenCount">0</span>/<span id="dashTotalCount">0</span></div>
            <div class="dash-stack">
              <div class="dash-stack-red" id="dashStackRed"></div>
              <div class="dash-stack-yellow" id="dashStackYellow"></div>
              <div class="dash-stack-green" id="dashStackGreen"></div>
            </div>
          </section>

          <section class="dash-card dash-compare" data-kind="day">
            <div class="dash-title">📈 今日 vs 昨日</div>
            <div class="dash-compare-row">
              <div class="dash-compare-kpi">
                <span class="big" id="cmpDayCur">0</span>
                <span class="muted">昨日 <span id="cmpDayPrev">0</span></span>
              </div>
              <div class="dash-delta" id="cmpDayDelta">+0</div>
            </div>
            <div class="dash-bar">
              <div class="dash-bar-fill" id="cmpDayFill"></div>
            </div>
          </section>

          <section class="dash-card dash-compare" data-kind="week">
            <div class="dash-title">📈 本周 vs 上周</div>
            <div class="dash-compare-row">
              <div class="dash-compare-kpi">
                <span class="big" id="cmpWeekCur">0</span>
                <span class="muted">上周 <span id="cmpWeekPrev">0</span></span>
              </div>
              <div class="dash-delta" id="cmpWeekDelta">+0</div>
            </div>
            <div class="dash-bar">
              <div class="dash-bar-fill" id="cmpWeekFill"></div>
            </div>
          </section>

          <section class="dash-card dash-compare" data-kind="month">
            <div class="dash-title">📈 本月 vs 上月</div>
            <div class="dash-compare-row">
              <div class="dash-compare-kpi">
                <span class="big" id="cmpMonthCur">0</span>
                <span class="muted">上月 <span id="cmpMonthPrev">0</span></span>
              </div>
              <div class="dash-delta" id="cmpMonthDelta">+0</div>
            </div>
            <div class="dash-bar">
              <div class="dash-bar-fill" id="cmpMonthFill"></div>
            </div>
          </section>

          <section class="dash-card dash-cta">
            <div class="dash-title">▶️ 今日行动</div>
            <div class="dash-sub" id="dashCtaHint"></div>
            <button class="dash-btn" id="dashCtaBtn">▶️ 开始今日复习</button>
          </section>

        </div>
      </div>
    `;

    const byId = (id)=>document.getElementById(id);
    const dailyFill = Math.min(100, Math.round((stats.doneToday / stats.targets.daily) * 100));
    const levelFill = Math.round(stats.levelProgress * 100);
    const cmpDayFill = Math.min(100, Math.round((stats.doneToday / stats.targets.daily) * 100));
    const cmpWeekFill = Math.min(100, Math.round((stats.weekCur / stats.targets.weekly) * 100));
    const cmpMonthFill = Math.min(100, Math.round((stats.monthCur / stats.targets.monthly) * 100));
    const remain = stats.remainDaily;
    const fire = stats.streakDays >= 7 ? '🔥🔥🔥' : stats.streakDays >= 3 ? '🔥🔥' : stats.streakDays >= 1 ? '🔥' : '🧊';

    if(byId('dashDailyText')) byId('dashDailyText').textContent = stats.doneToday >= stats.targets.daily
      ? '🎉 今日任务完成！'
      : `🎯 今日任务：${stats.doneToday} / ${stats.targets.daily}`;
    if(byId('dashDailySub')) byId('dashDailySub').textContent = stats.doneToday >= stats.targets.daily
      ? '继续保持节奏'
      : `还差 ${remain} 个`;
    if(byId('dashDailyFill')) byId('dashDailyFill').style.width = `${dailyFill}%`;

    if(byId('dashStreakFire')) byId('dashStreakFire').textContent = fire;
    if(byId('dashStreakDays')) byId('dashStreakDays').textContent = String(stats.streakDays);
    if(byId('dashStreakHint')) byId('dashStreakHint').textContent = stats.streakDays >= 7 ? '大火持续中' : stats.streakDays >= 3 ? '中火稳定燃烧' : stats.streakDays >= 1 ? '小火已点燃' : '从今天开始点燃';

    if(byId('dashLevel')) byId('dashLevel').textContent = String(stats.level);
    if(byId('dashTodayXP')) byId('dashTodayXP').textContent = String(stats.todayXP);
    if(byId('dashTotalXP')) byId('dashTotalXP').textContent = String(stats.totalXP);
    if(byId('dashLevelFill')) byId('dashLevelFill').style.width = `${levelFill}%`;

    if(byId('dashMasteryPct')) byId('dashMasteryPct').textContent = String(stats.masteryPercent);
    if(byId('dashGreenCount')) byId('dashGreenCount').textContent = String(stats.greenCount);
    if(byId('dashTotalCount')) byId('dashTotalCount').textContent = String(stats.totalCount);
    const total = Math.max(1, stats.totalCount);
    if(byId('dashStackRed')) byId('dashStackRed').style.width = `${Math.round((stats.statusCounts.red/total)*100)}%`;
    if(byId('dashStackYellow')) byId('dashStackYellow').style.width = `${Math.round((stats.statusCounts.yellow/total)*100)}%`;
    if(byId('dashStackGreen')) byId('dashStackGreen').style.width = `${Math.round((stats.statusCounts.green/total)*100)}%`;

    if(byId('cmpDayCur')) byId('cmpDayCur').textContent = String(stats.doneToday);
    if(byId('cmpDayPrev')) byId('cmpDayPrev').textContent = String(stats.doneYesterday);
    if(byId('cmpDayDelta')) byId('cmpDayDelta').textContent = `${stats.doneToday - stats.doneYesterday >= 0 ? '+' : ''}${stats.doneToday - stats.doneYesterday}`;
    if(byId('cmpDayFill')) byId('cmpDayFill').style.width = `${cmpDayFill}%`;

    if(byId('cmpWeekCur')) byId('cmpWeekCur').textContent = String(stats.weekCur);
    if(byId('cmpWeekPrev')) byId('cmpWeekPrev').textContent = String(stats.weekPrev);
    if(byId('cmpWeekDelta')) byId('cmpWeekDelta').textContent = `${stats.weekCur - stats.weekPrev >= 0 ? '+' : ''}${stats.weekCur - stats.weekPrev}`;
    if(byId('cmpWeekFill')) byId('cmpWeekFill').style.width = `${cmpWeekFill}%`;

    if(byId('cmpMonthCur')) byId('cmpMonthCur').textContent = String(stats.monthCur);
    if(byId('cmpMonthPrev')) byId('cmpMonthPrev').textContent = String(stats.monthPrev);
    if(byId('cmpMonthDelta')) byId('cmpMonthDelta').textContent = `${stats.monthCur - stats.monthPrev >= 0 ? '+' : ''}${stats.monthCur - stats.monthPrev}`;
    if(byId('cmpMonthFill')) byId('cmpMonthFill').style.width = `${cmpMonthFill}%`;

    if(byId('dashBadges')){
      byId('dashBadges').innerHTML = (stats.badges || []).map(b=>{
        let cls = 'dash-badge';
        if(/gold/i.test(b)) cls += ' is-gold';
        else if(/silver/i.test(b)) cls += ' is-silver';
        else if(/bronze/i.test(b)) cls += ' is-bronze';
        return `<span class="${cls}">${b}</span>`;
      }).join('');
    }

    if(byId('dashCtaHint')) byId('dashCtaHint').textContent = remain > 0 ? `约 ${Math.ceil(remain/6)} 分钟` : '继续刷经验';
    if(byId('dashCtaBtn')) byId('dashCtaBtn').textContent = remain > 0 ? `▶️ 开始今日复习（${remain} 词）` : '✅ 今日已完成（继续刷经验）';
    if(byId('dashCtaBtn')){
      byId('dashCtaBtn').onclick = (e)=>{
        if(e && e.stopPropagation) e.stopPropagation();
        try{ document.getElementById('btnStartReview')?.click(); }catch(e){}
      };
    }

    const openReview = ()=>{
      const url = chrome.runtime.getURL('test.html');
      try{ chrome.tabs.create({url}); }catch(e){ location.href = url; }
    };
    dash.querySelectorAll('.dash-card').forEach(card=>{
      card.addEventListener('click', (e)=>{
        const tag = (e.target && e.target.tagName || '').toLowerCase();
        if(tag === 'button' || tag === 'input' || tag === 'select' || tag === 'label') return;
        openReview();
      });
    });

    if(stats.doneToday >= stats.targets.daily){
      const daily = byId('dashDaily');
      if(daily){
        daily.classList.add('celebrate');
        setTimeout(()=>daily.classList.remove('celebrate'), 1000);
      }
    }
  }
  function renderCompareCard(label, cur, prev, target){
    const delta = cur - prev;
    const pct = Math.min(100, Math.round((cur / Math.max(1,target)) * 100));
    const sign = delta >= 0 ? `+${delta}` : `${delta}`;
    return `
      <div class="dash-compare">
        <div class="dash-title">📈 ${label} vs 上期</div>
        <div class="dash-row" style="margin-top:4px">
          <div class="num">${cur}</div>
          <div class="delta">${sign}</div>
        </div>
        <div class="dash-sub">上期 ${prev}</div>
        <div class="dash-progress" style="margin-top:6px"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }

  function renderStats(){
    const db = state.db || {};
    const s = computeStats(db);

    // ---- Top progress
    const pct = s.total ? Math.round((s.green / s.total) * 100) : 0;
    if(el.topProgress){
      el.topProgress.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }
    if(el.topProgressText){
      el.topProgressText.textContent = `学习进度：${pct}%（已掌握 ${s.green}/${s.total}）`;
    }

    // ---- Badges (simple, motivating)
    if(el.badgeRow){
      const badges = [];
      if(s.total >= 50) badges.push({t:'📚 50+ 词库', k:'total50'});
      if(s.total >= 200) badges.push({t:'🏅 200+ 收藏', k:'total200'});
      if(pct >= 10) badges.push({t:'✨ 10% 进度', k:'p10'});
      if(pct >= 30) badges.push({t:'🔥 30% 进度', k:'p30'});
      if(pct >= 50) badges.push({t:'🏆 50% 进度', k:'p50'});
      if(Object.keys(db.vocabNotes||{}).filter(k=>db.vocabNotes[k]).length >= 10) badges.push({t:'📝 批注达人', k:'notes10'});
      const html = badges.slice(0,6).map(b=>`<span class="badge" data-k="${b.k}">${b.t}</span>`).join('')
        || '<span class="badge">🎯 从今天开始，保持节奏</span>';
      el.badgeRow.innerHTML = html;
    }

    // ---- Cards (today/week due + summary)
    const words = db.vocabList || [];
    const vocabMeta = db.vocabMeta || {};
    const rs = computeReviewStats(words, vocabMeta);
    console.group("📊 Dashboard Debug");
    console.log("Total words:", words.length);
    console.log("VocabMeta sample:", Object.keys(vocabMeta).slice(0,5));
    console.log("Review Stats:", rs);
    console.groupEnd();

    if(el.reviewMini){
      el.reviewMini.innerHTML = renderReviewMini(rs);
    }

    const dashStats = computeDashboardStats(db, Date.now());
    try{ renderDashboard(dashStats); }catch(e){ console.warn('[Dashboard] render failed', e); }

    if(!el.statCards) return;
    const meta = db.vocabMeta || {};
    const now = Date.now();

    // Keep the review schedule consistent with test page
    const intervalsMin = [10, 60, 24*60, 2*24*60, 7*24*60, 15*24*60, 30*24*60]; // minutes
    const nextReviewAt = (m)=>{
      if(!m) return null;
      const rc = Math.max(0, Number(m.reviewCount || 0));
      const base = Number(m.lastReviewAt || m.updatedAt || 0);
      if(!base) return null;
      const idx = Math.min(rc, intervalsMin.length-1);
      return base + intervalsMin[idx]*60*1000;
    };

    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);
    const endTodayTs = endOfToday.getTime();
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    endOfWeek.setHours(23,59,59,999);
    const endWeekTs = endOfWeek.getTime();

    let dueToday = 0;
    let dueWeek = 0;
    for(const w of (db.vocabList||[])){
      const m = meta[w] || {};
      // New word: never reviewed -> consider "due" to build the first memory
      if(!m.lastReviewAt || Number(m.reviewCount||0) === 0){
        dueToday++;
        dueWeek++;
        continue;
      }
      const nra = nextReviewAt(m);
      if(!nra) continue;
      if(nra <= endTodayTs) dueToday++;
      if(nra <= endWeekTs) dueWeek++;
    }

    el.statCards.innerHTML = '';
    const cards = [
      {title:'英语仓库', value: dueWeek, hint:'点击一键复习', id:'cardWeek', color:'indigo', mode:'due_week'},
      {title:'易错词', value: (db.difficultList||[]).length || 0, hint:'低分词自动收集', id:'cardHard', color:'sky', mode:'difficult'},
      {title:'陌生词', value: s.red, hint:'优先建立记忆', id:'cardRed', color:'red', mode:'status_red'},
      {title:'学习中', value: s.yellow, hint:'继续巩固', id:'cardYellow', color:'orange', mode:'status_yellow'},
      {title:'已掌握', value: s.green, hint:'点击复习巩固', id:'cardGreen', color:'green', mode:'status_green'},
      {title:'有批注', value: s.notes, hint:'点击按批注复习', id:'cardNotes', color:'purple', mode:'notes'},
    ];

    for(const c of cards){
      const d = document.createElement('div');
      d.className = 'card';
      d.classList.add('card--'+c.color);
      d.id = c.id;
      d.style.cursor = 'pointer';
      d.title = '点击进入复习';
      d.dataset.mode = c.mode || '';
      d.addEventListener('click', ()=>{
        const mode = d.dataset.mode || '';
        const url = chrome.runtime.getURL(`test.html?mode=${encodeURIComponent(mode)}`);
        try{ chrome.tabs.create({url}); }catch(e){ location.href = url; }
      });
      d.innerHTML = `
        <h3>${c.title}</h3>
        <div class="value">${c.value}</div>
        <button class="card-action" type="button">${c.hint}</button>
      `;
      el.statCards.appendChild(d);
    }
  }

  function getVisibleWords(){
    const db = state.db;
    const q = (el.search.value || '').trim().toLowerCase();
    let words = [...(db.vocabList||[])];
    // sort
    const field = el.sortField.value || 'time';
    const dir = (el.sortDir && el.sortDir.dataset && el.sortDir.dataset.dir) || 'desc';
    const mult = dir === 'asc' ? 1 : -1;

    const meta = db.vocabMeta || {};
    if(field === 'word'){
      words.sort((a,b)=>a.localeCompare(b)*mult);
    }else{
      words.sort((a,b)=>{
        const ta = meta[a]?.updatedAt || meta[a]?.createdAt || 0;
        const tb = meta[b]?.updatedAt || meta[b]?.createdAt || 0;
        return (ta - tb) * mult;
      });
    }
    if(q){
      const dict = db.vocabDict || {};
      const notes = db.vocabNotes || {};
      words = words.filter(w=>{
        const m = (dict[w]||'') + ' ' + (notes[w]||'');
        return w.toLowerCase().includes(q) || m.toLowerCase().includes(q);
      });
    }
    return words;
  }

  function renderWords(){
    const db = state.db;
    const words = getVisibleWords();

    // sort
    const meta = db.vocabMeta || {};
    const sortField = (el.sortField?.value || 'time');
    const sortDir = (el.sortDir?.dataset.dir || 'desc');
    const dir = (sortDir === 'asc') ? 1 : -1;

    const statusRank = (s)=>{
      const st = String(s||'').toLowerCase();
      if(st==='green') return 2;
      if(st==='yellow') return 1;
      return 0; // red/new/unknown
    };

    if(state.lockWordOrder && Array.isArray(state.frozenWordOrder) && state.frozenWordOrder.length){
      const rank = new Map(state.frozenWordOrder.map((w, i) => [w, i]));
      words.sort((a, b) => {
        const ra = rank.has(a) ? rank.get(a) : Number.MAX_SAFE_INTEGER;
        const rb = rank.has(b) ? rank.get(b) : Number.MAX_SAFE_INTEGER;
        if(ra !== rb) return ra - rb;
        return a.localeCompare(b, 'en', {sensitivity:'base'});
      });
    }else{
      words.sort((a,b)=>{
        if(sortField === 'alpha'){
          return a.localeCompare(b, 'en', {sensitivity:'base'}) * dir;
        }
        if(sortField === 'reviewCount' || sortField === 'count'){
          const av = Number(meta[a]?.reviewCount ?? 0);
          const bv = Number(meta[b]?.reviewCount ?? 0);
          return (av - bv) * dir;
        }
        if(sortField === 'mastery'){
          const av = Number(meta[a]?.mastery ?? meta[a]?.masteryLevel ?? 0);
          const bv = Number(meta[b]?.mastery ?? meta[b]?.masteryLevel ?? 0);
          return (av - bv) * dir;
        }
        if(sortField === 'status'){
          const av = statusRank(normalizeWordStatus(db, a));
          const bv = statusRank(normalizeWordStatus(db, b));
          // if same status, fall back to time
          if(av !== bv) return (av - bv) * dir;
        }

        // default: time
        const at = Number(meta[a]?.updatedAt ?? meta[a]?.createdAt ?? 0);
        const bt = Number(meta[b]?.updatedAt ?? meta[b]?.createdAt ?? 0);
        if(at !== bt) return (at - bt) * dir;
        return a.localeCompare(b, 'en', {sensitivity:'base'}) * dir;
      });
    }
    if(el.wordCards) el.wordCards.innerHTML = '';
    if(!words.length){
      el.emptyWords.style.display = 'block';
      return;
    }
    el.emptyWords.style.display = 'none';

    const dict = db.vocabDict || {};
    const notes = db.vocabNotes || {};

    for(const w of words){
      const card = document.createElement('div');
      card.className = 'word-card';
      card.dataset.word = w;

      const checked = state.selectedWords.has(w);
      const status = normalizeWordStatus(db, w);
      const reviewCount = meta[w]?.reviewCount ?? 0;
      const mastery = meta[w]?.mastery ?? 0;

      const phUS = pickPhonetic(db, w, 'us');
      const phUK = pickPhonetic(db, w, 'uk');
      const auUS = pickAudio(db, w, 'us');
      const auUK = pickAudio(db, w, 'uk');

      const cached = state.enMeaningCache[w];
      const enMeaning = (Array.isArray(cached) && cached.length)
        ? cached
        : getEnglishMeaningFromDb(state.db, w);
      const metaItem = getMetaItem(db, w) || {};
      const createdAt = metaItem.createdAt || metaItem.updatedAt || 0;
      const wordSource = (metaItem.sourceUrl || metaItem.source || metaItem.url || '').toString().trim();
      const wordSourceLabel = (metaItem.sourceLabel || metaItem.sourceTitle || metaItem.sourceText || wordSource || '').toString().trim();
      const hasWordSource = !!wordSourceLabel;
      const wordSourceText = truncateText(wordSourceLabel, 100);
      const wordSourceIsUrl = isHttpUrl(wordSource);
      const view = state.viewFlags || {cn:true,en:true,note:true};
      const cardView = state.cardView[w] || {};
      const showCn = view.cn ? (cardView.cn !== false) : (cardView.cn === true);
      const showNote = view.note ? (cardView.note !== false) : (cardView.note === true);
      const showEn = view.en ? (cardView.en !== false) : (cardView.en === true);
      card.innerHTML = `
        <div class="word-card-row">
          <div class="word-check">
            <input type="checkbox" class="word-check" data-word="${escapeHtml(w)}" ${checked?'checked':''}/>
          </div>
          <div class="word-main">
            <div class="word-left">
              <div class="word-title">${escapeHtml(w)}</div>
              <div class="word-phon">
                <div class="pronRow">
                  <button class="iconBtn pron" data-act="play-us" data-word="${escapeHtml(w)}" title="US" aria-label="US"><span class="flag flag-us" aria-hidden="true"></span></button>
                  <span class="muted">${escapeHtml(phUS||'')}</span>
                </div>
                <div class="pronRow">
                  <button class="iconBtn pron" data-act="play-uk" data-word="${escapeHtml(w)}" title="UK" aria-label="UK"><span class="flag flag-uk" aria-hidden="true"></span></button>
                  <span class="muted">${escapeHtml(phUK||'')}</span>
                </div>
              </div>
            </div>
          <div class="word-meaning-col">
            <div class="word-folds">
              <button class="fold-btn" data-act="toggle-cn" data-word="${escapeHtml(w)}">${showCn ? '隐藏中文释义' : '显示中文释义'}</button>
              <button class="fold-btn" data-act="toggle-en" data-word="${escapeHtml(w)}">${showEn ? '隐藏英文释义' : '显示英文释义'}</button>
              ${notes[w] ? `<button class="fold-btn" data-act="toggle-note" data-word="${escapeHtml(w)}">${showNote ? '隐藏批注' : '显示批注'}</button>` : ''}
            </div>
            ${showCn ? `<div class="word-meaning">${escapeHtml(dict[w]||'（暂无释义）')}</div>` : ``}
            ${showEn ? `<div class="word-en"><div class="word-en-title">英文释义</div><div>${enMeaning.length ? enMeaning.map(x=>escapeHtml(x)).join('<br/>') : (state.enLoading.has(w) ? '加载中…' : '（暂无英文释义）')}</div></div>` : ''}
            ${notes[w] && showNote ? `<div class="word-note">📝 ${escapeHtml(notes[w])}</div>` : ''}
            <div class="note-editor word-note-editor" data-word="${escapeHtml(w)}" style="display:none;">
              <textarea class="note-input" placeholder="添加批注...">${escapeHtml(getNoteValue(w, notes))}</textarea>
              <div class="note-actions">
                <button class="btn ghost" data-act="cancel-note" data-word="${escapeHtml(w)}">取消</button>
                <button class="btn primary" data-act="save-note" data-word="${escapeHtml(w)}">保存</button>
              </div>
            </div>
            <div class="word-meta-line muted">${createdAt ? new Date(createdAt).toLocaleString() : ''} · 来源：${hasWordSource ? (wordSourceIsUrl ? `<a href="${escapeHtml(wordSource)}" target="_blank" rel="noreferrer" title="${escapeHtml(wordSourceLabel)}">${escapeHtml(wordSourceText)}</a>` : `<span title="${escapeHtml(wordSourceLabel)}">${escapeHtml(wordSourceText)}</span>`) : '—'}</div>
          </div>
          <div class="word-meta">
            <button class="st ${statusClass(status)}" data-act="cycle-status" data-word="${escapeHtml(w)}" title="点击切换状态">${statusLabel(status)}</button>
            <span class="muted">${reviewCount} 次 · 掌握度 ${mastery}</span>
          </div>
        </div>
          <div class="word-actions">
            <button class="iconBtn note" data-act="edit-note" data-word="${escapeHtml(w)}" title="编辑批注"><span class="icon-emoji">📝</span></button>
            <button class="iconBtn danger" data-act="del" data-word="${escapeHtml(w)}" title="删除"><span class="icon-emoji">🗑</span></button>
          </div>
        </div>
      `;
      if(el.wordCards) el.wordCards.appendChild(card);
      if(showEn) ensureEnglishMeaning(w);

      if(metaItem.sourceLabel !== '导入' && (needsMeaningEnrich(db, w) || !hasPhonetic(db, w))){
        enqueueEnrich(w);
      }
    }

    // sync checkAll
    const allVisibleSelected = words.length && words.every(w=>state.selectedWords.has(w));
    el.checkAll.checked = !!allVisibleSelected;
  }

  function getVisibleSentences(){
    const db = state.db;
    const q = (el.searchSentence.value || '').trim().toLowerCase();
    let arr = [...(db.collectedSentences||[])];
    const field = (el.sortSentenceField?.value || 'time');
    const dir = (el.sortSentenceDir?.dataset?.dir || 'desc');
    const mult = dir === 'asc' ? 1 : -1;
    arr.sort((a,b)=>{
      const ta = String(a.text||'');
      const tb = String(b.text||'');
      if(field === 'alpha'){
        return ta.localeCompare(tb, 'en', {sensitivity:'base'}) * mult;
      }
      if(field === 'length'){
        return (ta.length - tb.length) * mult;
      }
      return ((a.createdAt||0) - (b.createdAt||0)) * mult;
    });
    if(q){
      arr = arr.filter(s=>{
        const t = `${s.text||''} ${s.translation||''}`.toLowerCase();
        return t.includes(q);
      });
    }
    return arr;
  }

  function renderSentences(){
    const arr = getVisibleSentences();
    el.sentCards.innerHTML = '';
    if(!arr.length){
      el.emptySent.style.display = 'block';
      el.checkAllSent.checked = false;
      return;
    }
    el.emptySent.style.display = 'none';

    for(const s of arr){
      const id = Number(s.createdAt||s.id||0);
      const checked = state.selectedSent.has(id);
      const url = (s.url || s.sourceUrl || s.pageUrl || s.source || s.originalUrl || s.originUrl || '').toString().trim();
      const sourceLabel = (s.sourceLabel || s.title || url || '').toString().trim();
      const hasUrl = !!url;
      const sourceText = truncateText(sourceLabel, 100);
      const sourceIsUrl = isHttpUrl(url);
      const note = s.note || '';
      const sView = state.sentViewFlags || {translation:true,note:true};
      const showTranslation = !!sView.translation;
      const showNote = !!sView.note;

      const card = document.createElement('div');
      card.className = 'sentence-card';
      card.innerHTML = `
        <div class="sentence-card-row">
          <div class="sentence-check">
            <input type="checkbox" class="sent-check" data-id="${id}" ${checked?'checked':''}/>
          </div>

          <div class="sentence-main">
            <div class="sentence-text">${escapeHtml(s.text||'')}</div>
            ${showTranslation ? (s.translation ? `<div class="sentence-translation">${escapeHtml(s.translation)}</div>` : `<div class="sentence-translation muted">（暂无翻译）</div>`) : ``}
            ${showNote ? (note ? `<div class="sentence-note">📝 ${escapeHtml(note)}</div>` : ``) : ``}
            <div class="note-editor sentence-note-editor" data-id="${id}" style="display:none;">
              <textarea class="note-input" placeholder="添加批注...">${escapeHtml(note||'')}</textarea>
              <div class="note-actions">
                <button class="btn ghost" data-act="cancel-sent-note" data-id="${id}">取消</button>
                <button class="btn primary" data-act="save-sent-note" data-id="${id}">保存</button>
              </div>
            </div>
            <div class="sentence-meta muted">${new Date(id||Date.now()).toLocaleString()} · 来源：${sourceLabel ? (sourceIsUrl ? `<a class="sentence-source-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer" title="${escapeHtml(sourceLabel)}">${escapeHtml(sourceText)}</a>` : `<span title="${escapeHtml(sourceLabel)}">${escapeHtml(sourceText)}</span>`) : '—'}</div>
          </div>

          <div class="sentence-actions">
            <button class="iconBtn link sentence-export-btn" data-act="export-sent" data-id="${id}" title="导出图片">
              <span class="icon-emoji">🖼️</span><span class="icon-text">导出图片</span>
            </button>
            <div class="sentence-side-actions">
              <button class="iconBtn note" data-act="edit-note" data_toggle="sent" data-id="${id}" title="编辑批注"><span class="icon-emoji">📝</span></button>
              <button class="iconBtn danger" data-act="del-sent" data-id="${id}" title="删除"><span class="icon-emoji">🗑</span></button>
            </div>
          </div>
        </div>
      `;
      el.sentCards.appendChild(card);
    }

    const allSelected = arr.length && arr.every(s=>state.selectedSent.has(Number(s.createdAt||s.id)));
    el.checkAllSent.checked = !!allSelected;
  }


  function render(){
    if(!state.db) return;
    renderStats();
    if(state.tab === 'words') renderWords();
    else renderSentences();
  }

  async function refresh(opts = {}){
    if(opts.explicit) clearWordOrderLock();
    const snap = await getStateSnapshot();
    state.db = snap.db;
    state.entitlements = snap.entitlements;
    applyAccessPolicy();
    applyQuoteUiPolicy(state.quoteExport || loadQuoteExportSettings());
    // version label
    try{
      const man = chrome.runtime.getManifest();
      if(el.ver) el.ver.textContent = `v${man.version}`;
      if(el.realTimeStat) el.realTimeStat.textContent = '';
    }catch(e){}
    render();
    tryOpenPendingQuoteExport();
  }

  // --- Events ---
  el.tabWords.addEventListener('click', ()=>setTab('words'));
  el.tabSentences.addEventListener('click', ()=>setTab('sentences'));

  el.search.addEventListener('input', ()=>{ clearWordOrderLock(); render(); });
  el.sortField.addEventListener('change', ()=>{ clearWordOrderLock(); render(); });
  if(el.toggleCn) el.toggleCn.addEventListener('change', ()=>{ state.viewFlags.cn = !!el.toggleCn.checked; render(); });
  if(el.toggleEn) el.toggleEn.addEventListener('change', ()=>{ state.viewFlags.en = !!el.toggleEn.checked; render(); });
  if(el.toggleNote) el.toggleNote.addEventListener('change', ()=>{ state.viewFlags.note = !!el.toggleNote.checked; render(); });
  if(el.toggleSentTrans) el.toggleSentTrans.addEventListener('change', ()=>{ state.sentViewFlags.translation = !!el.toggleSentTrans.checked; renderSentences(); });
  if(el.toggleSentNote) el.toggleSentNote.addEventListener('change', ()=>{ state.sentViewFlags.note = !!el.toggleSentNote.checked; renderSentences(); });
    // sort direction toggle button (sortDir is a <button>)
  if(el.sortDir){
    if(!el.sortDir.dataset.dir) el.sortDir.dataset.dir = 'desc';
    const syncSortDirLabel = ()=>{
      const dir = el.sortDir.dataset.dir || 'desc';
      el.sortDir.textContent = (dir==='asc') ? '↑ 正序' : '↓ 倒序';
    };
    syncSortDirLabel();
    el.sortDir.addEventListener('click', ()=>{
      el.sortDir.dataset.dir = (el.sortDir.dataset.dir==='asc') ? 'desc' : 'asc';
      syncSortDirLabel();
      clearWordOrderLock();
      render();
    });
  }

  if(el.sortSentenceDir){
    if(!el.sortSentenceDir.dataset.dir) el.sortSentenceDir.dataset.dir = 'desc';
    const syncSentDirLabel = ()=>{
      const dir = el.sortSentenceDir.dataset.dir || 'desc';
      el.sortSentenceDir.textContent = (dir==='asc') ? '↑ 正序' : '↓ 倒序';
    };
    syncSentDirLabel();
    el.sortSentenceDir.addEventListener('click', ()=>{
      el.sortSentenceDir.dataset.dir = (el.sortSentenceDir.dataset.dir==='asc') ? 'desc' : 'asc';
      syncSentDirLabel();
      renderSentences();
    });
  }

  if(el.sortSentenceField){
    el.sortSentenceField.addEventListener('change', ()=>renderSentences());
  }

  el.searchSentence.addEventListener('input', ()=>render());

  el.checkAll.addEventListener('change', ()=>{
    const words = getVisibleWords();
    if(el.checkAll.checked){
      for(const w of words) state.selectedWords.add(w);
    }else{
      for(const w of words) state.selectedWords.delete(w);
    }
    renderWords();
  });

  el.checkAllSent.addEventListener('change', ()=>{
    const arr = getVisibleSentences();
    if(el.checkAllSent.checked){
      for(const s of arr) state.selectedSent.add(Number(s.createdAt||s.id));
    }else{
      for(const s of arr) state.selectedSent.delete(Number(s.createdAt||s.id));
    }
    renderSentences();
  });

  // Delegate table clicks
  if(el.wordCards) el.wordCards.addEventListener('click', async (e)=>{
    const t = e.target instanceof HTMLElement ? e.target : null;
    if(!t) return;

    // Checkbox selection must work even when the clicked element has no data-act
    if(t.matches('input.word-check')){
      const w = t.getAttribute('data-word');
      if(!w) return;
      if(t.checked) state.selectedWords.add(w); else state.selectedWords.delete(w);
      // keep header checkbox in sync
      const vis = getVisibleWords();
      el.checkAll.checked = vis.length>0 && vis.every(x=>state.selectedWords.has(x));
      return;
    }

    const target = t.closest('[data-act]');
    if(!target) return;
    const act = target.getAttribute('data-act');
    if(act === 'cycle-status'){
      const w = target.getAttribute('data-word');
      if(!w) return;
      const current = normalizeWordStatus(state.db || {}, w);
      const next = nextStatus(current);
      state.frozenWordOrder = getCurrentWordOrderFromDom();
      state.lockWordOrder = state.frozenWordOrder.length > 0;
	  // background.js expects: msg.words OR msg.payload.words OR msg.word
	  await sendMessage({type:'OP_SET_WORD_STATUS', payload:{words:[w], status:next}});
      state.db = await getDB();
      render();
      return;
    }
    if(act === 'toggle-en'){
      const w = target.getAttribute('data-word');
      if(!w) return;
      const cv = state.cardView[w] || (state.cardView[w] = {});
      cv.en = (cv.en === false) ? true : false;
      renderWords();
      const view = state.viewFlags || {cn:true,en:true,note:true};
      const shouldShow = view.en ? (cv.en !== false) : (cv.en === true);
      if(shouldShow) ensureEnglishMeaning(w);
      return;
    }
    if(act === 'toggle-cn'){
      const w = target.getAttribute('data-word');
      if(!w) return;
      const cv = state.cardView[w] || (state.cardView[w] = {});
      cv.cn = (cv.cn === false) ? true : false;
      renderWords();
      return;
    }
    if(act === 'toggle-note'){
      const w = target.getAttribute('data-word');
      if(!w) return;
      const cv = state.cardView[w] || (state.cardView[w] = {});
      cv.note = (cv.note === false) ? true : false;
      renderWords();
      return;
    }
    if(act === 'edit-note'){
      const w = target.getAttribute('data-word');
      if(!w) return;
      const card = target.closest('.word-card');
      if(!card) return;
      const editor = card.querySelector('.word-note-editor');
      if(editor){
        const current = String(state.db?.vocabNotes?.[w] || '');
        const ta = editor.querySelector('textarea');
        if(ta) ta.value = current;
        editor.style.display = (editor.style.display === 'none' || !editor.style.display) ? 'block' : 'none';
        if(ta && editor.style.display === 'block') ta.focus();
      }
      return;
    }
    if(act === 'save-note'){
      const w = target.getAttribute('data-word');
      if(!w) return;
      const card = target.closest('.word-card');
      const editor = card ? card.querySelector('.word-note-editor') : null;
      const ta = editor ? editor.querySelector('textarea') : null;
      const next = ta ? ta.value : '';
      await sendMessage({type:'OP_SET_WORD_NOTE', payload:{word:w, note: next}});
      await refresh();
      return;
    }
    if(act === 'cancel-note'){
      const card = target.closest('.word-card');
      const editor = card ? card.querySelector('.word-note-editor') : null;
      if(editor) editor.style.display = 'none';
      return;
    }
    if(act === 'del'){
      const w = target.getAttribute('data-word');
      if(!w) return;
      await sendMessage({type:'OP_DELETE_WORDS', payload:{words:[w]}});
      state.selectedWords.delete(w);
      await refresh();
      return;
    }
    if(act === 'play-us' || act === 'play-uk'){
      const w = target.getAttribute('data-word');
      const variant = act === 'play-uk' ? 'uk' : 'us';
      const url = variant==='uk' ? pickAudio(state.db, w, 'uk') : pickAudio(state.db, w, 'us');
      playAudio(url, w);
      target.classList.add('pressed');
      setTimeout(()=>target.classList.remove('pressed'), 150);
      return;
    }
    // (selection handled above)
  });

  el.sentCards.addEventListener('click', async (e)=>{
    const t = e.target instanceof HTMLElement ? e.target : null;
    if(!t) return;

    // Checkbox selection must work even when the clicked element has no data-act
    if(t.matches('input.sent-check')){
      const id = Number(t.getAttribute('data-id'));
      if(!Number.isFinite(id)) return;
      if(t.checked) state.selectedSent.add(id); else state.selectedSent.delete(id);
      const vis = getVisibleSentences();
      el.checkAllSent.checked = vis.length>0 && vis.every(s=>state.selectedSent.has(Number(s.createdAt||s.id)));
      return;
    }

    const target = t.closest('[data-act]');
    if(!target) return;
    const act = target.getAttribute('data-act');
    if(act === 'open-url'){
      const url = target.getAttribute('data-url') || '';
      if(url) window.open(url, '_blank');
      return;
    }
    if(act === 'export-sent'){
      const id = Number(target.getAttribute('data-id'));
      if(!Number.isFinite(id)) return;
      openQuoteExportModal(id);
      return;
    }
    if(act === 'edit-note'){
      const id = Number(target.getAttribute('data-id'));
      if(!Number.isFinite(id)) return;
      const card = target.closest('.sentence-card');
      if(!card) return;
      const editor = card.querySelector('.sentence-note-editor');
      const cur = (state.db?.collectedSentences||[]).find(s=>Number(s.createdAt||s.id)===id);
      if(editor){
        const ta = editor.querySelector('textarea');
        if(ta) ta.value = String(cur?.note||'');
        editor.style.display = (editor.style.display === 'none' || !editor.style.display) ? 'block' : 'none';
        if(ta && editor.style.display === 'block') ta.focus();
      }
      return;
    }
    if(act === 'del-sent'){
      const id = Number(target.getAttribute('data-id'));
      if(!Number.isFinite(id)) return;
      await sendMessage({type:'OP_DELETE_SENTENCES', payload:{ids:[id]}});
      state.selectedSent.delete(id);
      await refresh();
      return;
    }
    if(act === 'save-sent-note'){
      const id = Number(target.getAttribute('data-id'));
      if(!Number.isFinite(id)) return;
      const card = target.closest('.sentence-card');
      const editor = card ? card.querySelector('.sentence-note-editor') : null;
      const ta = editor ? editor.querySelector('textarea') : null;
      const next = ta ? ta.value : '';
      await sendMessage({type:'OP_UPDATE_SENTENCE', payload:{id, note: next}});
      await refresh();
      return;
    }
    if(act === 'cancel-sent-note'){
      const card = target.closest('.sentence-card');
      const editor = card ? card.querySelector('.sentence-note-editor') : null;
      if(editor) editor.style.display = 'none';
      return;
    }
    
    // (selection handled above)
  });



  // Quick-save notes: Cmd/Ctrl + Enter
  if(el.wordCards) el.wordCards.addEventListener('keydown', (e)=>{
    if(!(e.target instanceof HTMLTextAreaElement)) return;
    if(!e.target.matches('.word-note-editor .note-input')) return;
    if(!(e.metaKey || e.ctrlKey) || e.key !== 'Enter') return;
    e.preventDefault();
    const editor = e.target.closest('.word-note-editor');
    const btn = editor ? editor.querySelector('[data-act="save-note"]') : null;
    if(btn instanceof HTMLButtonElement) btn.click();
  });

  if(el.sentCards) el.sentCards.addEventListener('keydown', (e)=>{
    if(!(e.target instanceof HTMLTextAreaElement)) return;
    if(!e.target.matches('.sentence-note-editor .note-input')) return;
    if(!(e.metaKey || e.ctrlKey) || e.key !== 'Enter') return;
    e.preventDefault();
    const editor = e.target.closest('.sentence-note-editor');
    const btn = editor ? editor.querySelector('[data-act="save-sent-note"]') : null;
    if(btn instanceof HTMLButtonElement) btn.click();
  });


  // Quote export modal
  if(!state.quoteExport) state.quoteExport = loadQuoteExportSettings();
  syncQuoteFavoriteOptions();
  syncTemplateWallActive();
  const quoteSettingsInputs = [
    el.quoteTemplate,
    el.quoteRatio,
    el.quoteDensity,
    el.quoteMainFont,
    el.quoteCjkFont,
    el.quoteEnhanceContent,
    el.quoteAnnotationStyle,
    el.quoteShowTranslation,
    el.quoteShowAnnotation,
    el.quoteShowSource,
    el.quoteShowWatermark,
    el.quoteWatermarkMode,
    el.quotePreviewScale
  ].filter(Boolean);
  for(const node of quoteSettingsInputs){
    node.addEventListener('change', renderQuotePreview);
  }
  const quoteTextInputs = [
    el.quoteSourceOverride,
    el.quoteAnnotationOverride,
    el.quoteFilenamePattern,
    el.quoteFontAdjust
  ].filter(Boolean);
  for(const node of quoteTextInputs){
    node.addEventListener('input', renderQuotePreview);
  }
  if(el.quoteFontAdjust) el.quoteFontAdjust.addEventListener('input', updateQuoteFontAdjustLabel);
  if(el.quoteTemplateWall) el.quoteTemplateWall.addEventListener('click', (e)=>{
    const t = e.target instanceof HTMLElement ? e.target.closest('.quoteTplThumb[data-template]') : null;
    if(!t || !el.quoteTemplate) return;
    const value = String(t.getAttribute('data-template') || '').trim();
    if(!value) return;
    el.quoteTemplate.value = value;
    syncTemplateWallActive();
    renderQuotePreview();
  });
  if(el.quotePreset) el.quotePreset.addEventListener('change', ()=>{
    const next = String(el.quotePreset.value || '').trim();
    if(!next) return;
    applyQuotePreset(next);
  });
  if(el.quoteSaveFavorite) el.quoteSaveFavorite.addEventListener('click', ()=>{
    const name = prompt('输入收藏名称（例如：社媒蓝调）');
    const title = String(name || '').trim();
    if(!title) return;
    const list = loadQuoteExportFavorites();
    const snapshot = getFavoriteSettingsSnapshot();
    const idx = list.findIndex(it => it.name === title);
    if(idx >= 0) list[idx] = { name: title, settings: snapshot };
    else list.unshift({ name: title, settings: snapshot });
    saveQuoteExportFavorites(list);
    syncQuoteFavoriteOptions();
    if(el.quoteFavoritePreset) el.quoteFavoritePreset.value = title;
    showManagerToast('已收藏当前模板配置', 'success');
  });
  if(el.quoteApplyFavorite) el.quoteApplyFavorite.addEventListener('click', ()=>{
    const target = String(el.quoteFavoritePreset?.value || '').trim();
    if(!target){
      showManagerToast('请先选择一个收藏项。');
      return;
    }
    if(!applyQuoteFavoriteByName(target)){
      showManagerToast('应用失败：未找到该收藏。');
      return;
    }
    showManagerToast('已应用收藏配置', 'success');
  });
  if(el.quoteDeleteFavorite) el.quoteDeleteFavorite.addEventListener('click', ()=>{
    const target = String(el.quoteFavoritePreset?.value || '').trim();
    if(!target){
      showManagerToast('请先选择一个收藏项。');
      return;
    }
    const list = loadQuoteExportFavorites().filter(it => it.name !== target);
    saveQuoteExportFavorites(list);
    syncQuoteFavoriteOptions();
    renderQuotePreview();
    showManagerToast('已删除收藏配置', 'success');
  });
  if(el.quoteExportClose) el.quoteExportClose.addEventListener('click', closeQuoteExportModal);
  if(el.quoteExportCancel) el.quoteExportCancel.addEventListener('click', closeQuoteExportModal);
  if(el.quoteQuickCopy) el.quoteQuickCopy.addEventListener('click', ()=>el.quoteCopyImage?.click());
  if(el.quoteQuickExport) el.quoteQuickExport.addEventListener('click', ()=>el.quoteExportSubmit?.click());
  if(el.quoteRestoreSource) el.quoteRestoreSource.addEventListener('click', ()=>{
    const sentence = getSentenceById(state.quoteExportSentenceId);
    if(!sentence) return;
    if(el.quoteSourceOverride) el.quoteSourceOverride.value = getDefaultSourceText(sentence) || '';
    renderQuotePreview();
  });
  if(el.quoteRestoreAnnotation) el.quoteRestoreAnnotation.addEventListener('click', ()=>{
    const sentence = getSentenceById(state.quoteExportSentenceId);
    if(!sentence) return;
    if(el.quoteAnnotationOverride) el.quoteAnnotationOverride.value = String(sentence?.note || '').trim();
    renderQuotePreview();
  });
  if(el.quoteExportMask) el.quoteExportMask.addEventListener('click', (e)=>{
    if(e.target === el.quoteExportMask) closeQuoteExportModal();
  });
  if(el.quoteExportSubmit) el.quoteExportSubmit.addEventListener('click', async ()=>{
    if(!state.quoteExportSentenceId) return;
    const sentence = getSentenceById(state.quoteExportSentenceId);
    if(!sentence){
      showManagerToast('导出失败：未找到该金句，请刷新后重试。');
      return;
    }
    try{
      state.quoteExport = Object.assign({}, readQuoteSettingsFromForm(), readQuoteOverridesFromForm());
      await exportSentenceToPng(sentence);
      showManagerToast('已导出 PNG');
      closeQuoteExportModal();
    }catch(err){
      const msg = err?.message || '导出失败，请重试。';
      showManagerToast(msg);
      alert(`${msg}\n建议：检查句子内容后重试。`);
    }
  });
  if(el.quoteCopyImage) el.quoteCopyImage.addEventListener('click', async ()=>{
    if(!state.quoteExportSentenceId) return;
    const sentence = getSentenceById(state.quoteExportSentenceId);
    if(!sentence){
      showManagerToast('复制失败：未找到该金句，请刷新后重试。');
      return;
    }
    try{
      state.quoteExport = Object.assign({}, readQuoteSettingsFromForm(), readQuoteOverridesFromForm());
      await copySentenceCardToClipboard(sentence);
      showManagerToast('已复制图片到剪贴板', 'success');
    }catch(err){
      const msg = err?.message || '复制失败，请重试。';
      showManagerToast(msg);
      alert(`${msg}\n建议：检查浏览器复制权限或改用导出 PNG。`);
    }
  });
  if(el.quoteBatchExport) el.quoteBatchExport.addEventListener('click', async ()=>{
    const list = getBatchSentenceList();
    if(!list.length){
      showManagerToast('批量导出失败：未选中任何金句。');
      return;
    }
    if(list.length > 1){
      const ok = confirm(`将按当前配置批量导出 ${list.length} 张卡片，继续吗？`);
      if(!ok) return;
    }
    try{
      state.quoteExport = Object.assign({}, readQuoteSettingsFromForm(), readQuoteOverridesFromForm());
      const total = await batchExportSentenceCards(list);
      showManagerToast(`批量导出完成，共 ${total} 张`, 'success');
      closeQuoteExportModal();
    }catch(err){
      const msg = err?.message || '批量导出失败，请重试。';
      showManagerToast(msg);
      alert(`${msg}\n建议：检查文件下载权限或减少批量数量后重试。`);
    }
  });
  document.addEventListener('keydown', (e)=>{
    if(!quoteModalOpen()) return;
    const target = e.target;
    const inTextInput = target instanceof HTMLTextAreaElement
      || (target instanceof HTMLInputElement && target.type !== 'checkbox' && target.type !== 'button')
      || target instanceof HTMLSelectElement;

    if((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !inTextInput){
      e.preventDefault();
      cycleQuoteTemplate(e.key === 'ArrowRight' ? 1 : -1);
      return;
    }
    if(e.key === 'Enter' && !e.altKey && !e.metaKey && !e.ctrlKey){
      if(target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      if(e.shiftKey){
        el.quoteCopyImage?.click();
      }else{
        el.quoteExportSubmit?.click();
      }
    }
  });
  window.addEventListener('resize', ()=>{
    if(quoteModalOpen()) renderQuotePreview();
  });

  // Hidden debug hook for quick self-test in DevTools (stage-3 requirement).
  globalThis.__vbDebugQuoteExport = {
    openById(id){ openQuoteExportModal(id); },
    close(){ closeQuoteExportModal(); },
    render(){ renderQuotePreview(); },
    exportById: async function(id){
      const sentence = getSentenceById(id);
      if(!sentence) throw new Error('Sentence not found');
      const settings = state.quoteExport || loadQuoteExportSettings();
      return exportSentenceToPng(sentence, settings);
    },
    listIds(){ return (state.db?.collectedSentences || []).map(it => Number(it.createdAt || it.id)).filter(Boolean); },
  };

  el.btnRefresh.addEventListener('click', ()=>refresh({ explicit: true }));
  el.btnRefresh2.addEventListener('click', ()=>refresh({ explicit: true }));

  el.btnStartReview?.addEventListener('click', ()=>{
    const url = chrome.runtime.getURL('test.html');
    window.open(url, '_blank');
  });

  el.btnClearWords.addEventListener('click', async ()=>{
    const ok1 = confirm('确认要清空【单词本】吗？此操作会删除所有单词记录，无法撤销。');
    if(!ok1) return;
    const ok2 = confirm('再次确认：真的要清空单词本？');
    if(!ok2) return;
    await sendMessage({type:'OP_CLEAR_ALL_WORDS'});
    await refresh();
  });

  el.btnBulkDelete.addEventListener('click', async (e)=>{
    if(!guardFeature(getEntitlements().bulk_edit, '批量删除仅专业版可用。', e.currentTarget)) return;
    const words = Array.from(state.selectedWords);
    if(!words.length) return;
    const ok1 = confirm(`确认删除已选中的 ${words.length} 个单词吗？`);
    if(!ok1) return;
    const ok2 = confirm('再次确认：删除后无法撤销。');
    if(!ok2) return;
    await sendMessage({type:'OP_DELETE_WORDS', payload:{words}});
    state.selectedWords.clear();
    await refresh();
  });

  el.btnBulkCycle.addEventListener('click', async (e)=>{
    if(!guardFeature(getEntitlements().bulk_edit, '批量状态切换仅专业版可用。', e.currentTarget)) return;
    const words = Array.from(state.selectedWords);
    if(!words.length) return;
    // cycle: red -> yellow -> green -> red
    const db = state.db;
    const current = normalizeWordStatus(db, words[0]);
    const next = current==='red' ? 'yellow' : (current==='yellow' ? 'green' : 'red');
    await sendMessage({type:'OP_SET_WORD_STATUS', payload:{words, status: next}});
    await refresh();
  });

  // Sentences bulk
  el.btnBulkDeleteSent.addEventListener('click', async (e)=>{
    if(!guardFeature(getEntitlements().bulk_edit, '批量删除仅专业版可用。', e.currentTarget)) return;
    const ids = Array.from(state.selectedSent);
    if(!ids.length) return;
    const ok1 = confirm(`确认删除已选中的 ${ids.length} 条金句吗？`);
    if(!ok1) return;
    const ok2 = confirm('再次确认：删除后无法撤销。');
    if(!ok2) return;
    await sendMessage({type:'OP_DELETE_SENTENCES', payload:{ids}});
    state.selectedSent.clear();
    await refresh();
  });
  el.btnClearSentences.addEventListener('click', async ()=>{
    const arr = (state.db?.collectedSentences||[]);
    const ids = arr.map(s=>Number(s.createdAt||s.id)).filter(x=>Number.isFinite(x));
    const ok1 = confirm('确认要清空【金句库】吗？此操作无法撤销。');
    if(!ok1) return;
    const ok2 = confirm('再次确认：真的要清空金句库？');
    if(!ok2) return;
    await sendMessage({type:'OP_DELETE_SENTENCES', payload:{ids}});
    state.selectedSent.clear();
    await refresh();
  });

  // Import / export modal
  let ioTarget = 'words';
  function openModal(mode, target='words'){
    ioTarget = target === 'sentences' ? 'sentences' : 'words';
    el.modalMask.style.display='flex';
    el.ioMode.value = mode;
    if(mode === 'import'){
      el.modalTitle.textContent = ioTarget === 'words' ? '导入单词' : '导入金句';
    }else{
      el.modalTitle.textContent = ioTarget === 'words' ? '导出单词' : '导出金句';
    }
    el.ioText.value = '';
    if(el.fileInput) el.fileInput.value = '';
    resetImportPreview();
    clearImportError();
    // UI differences
    const isImport = mode === 'import';
    el.btnChooseFile.style.display = isImport ? 'inline-flex' : 'none';
    el.btnDownloadTemplate.style.display = isImport ? 'inline-flex' : 'none';
    el.ioText.readOnly = !isImport;
    el.ioHint.textContent = mode === 'import'
      ? (ioTarget === 'words' ? '粘贴内容或选择文件导入单词（JSON / CSV / TXT）。' : '粘贴内容或选择文件导入金句（JSON / CSV / TXT）。')
      : '选择格式后生成导出内容（文件名自动带版本号与时间戳）。';

    if(!isImport){
      // Generate preview immediately for export
      generateExportPreview();
    }
  }
  function closeModal(){ el.modalMask.style.display='none'; }

  function buildExport(format){
    // Always export using the same data model as the UI preview
    // (vocabList + vocabDict + vocabNotes + vocabMeta + collectedSentences)
    const payload = buildExportPayload();
    // keep a dbVersion for debugging/migrations if available
    payload.dbVersion = state?.db?.dbVersion ?? state?.dbVersion ?? payload.dbVersion;

    const words = Array.isArray(payload.words) ? payload.words : [];
    const sentences = Array.isArray(payload.sentences) ? payload.sentences : [];

    const baseName = `${ioTarget === 'words' ? 'vocab_words' : 'vocab_sentences'}_${MANIFEST_VERSION}_${(new Date().toISOString().replace(/[:.]/g,'').replace('T','_').replace('Z',''))}`;

    if(format === 'csv'){
      if(ioTarget === 'sentences'){
        const header = 'text,translation,note,url,title,sourceLabel,createdAt';
        const lines = [header].concat(sentences.map(s=>[
          s.text, s.translation, s.note, s.url, s.title, s.sourceLabel, s.createdAt
        ].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')));
        return { filename: `${baseName}.csv`, mime: 'text/csv;charset=utf-8', text: lines.join('\n') };
      }
      const header = 'word,meaning,englishMeaning,note,status,reviewCount,phoneticUS,phoneticUK,audioUS,audioUK,sourceUrl,sourceLabel,createdAt,updatedAt';
      const lines = [header].concat(words.map(w=>[
        w.word, w.meaning, (w.englishMeaning||[]).join(' | '), w.note, w.status, w.reviewCount,
        w.phoneticUS, w.phoneticUK, w.audioUS, w.audioUK,
        w.sourceUrl, w.sourceLabel,
        w.createdAt, w.updatedAt
      ].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')));
      return { filename: `${baseName}.csv`, mime: 'text/csv;charset=utf-8', text: lines.join('\n') };
    }

    if(format === 'txt'){
      const lines = [];
      if(ioTarget === 'sentences'){
        for(const s of sentences){
          lines.push([
            (s.text||'').replace(/\n/g,' '),
            (s.translation||'').replace(/\n/g,' '),
            (s.note||'').replace(/\n/g,' '),
            s.url||'',
            s.title||'',
            s.sourceLabel||'',
            String(s.createdAt ?? '')
          ].join('\t'));
        }
      }else{
        for(const w of words){
          const en = Array.isArray(w.englishMeaning) ? w.englishMeaning.join(' | ') : '';
          lines.push([
            w.word || '',
            (w.meaning||'').replace(/\n/g,' '),
            en.replace(/\n/g,' '),
            (w.note||'').replace(/\n/g,' '),
            w.status || '',
            String(w.reviewCount ?? ''),
            w.phoneticUS || '',
            w.phoneticUK || '',
            w.audioUS || '',
            w.audioUK || '',
            w.sourceUrl || '',
            w.sourceLabel || '',
            String(w.createdAt ?? ''),
            String(w.updatedAt ?? '')
          ].join('\\t'));
        }
      }
      return { filename: `${baseName}.txt`, mime: 'text/plain;charset=utf-8', text: lines.join('\n') };
    }

    const out = ioTarget === 'sentences'
      ? {version: payload.version, exportedAt: new Date().toISOString(), sentences}
      : {version: payload.version, exportedAt: new Date().toISOString(), words};
    return { filename: `${baseName}.json`, mime: 'application/json;charset=utf-8', text: JSON.stringify(out, null, 2) };
  }

  el.btnImport.addEventListener('click', (e)=>{
    if(!guardFeature(getEntitlements().import_export, '导入仅专业版可用。', e.currentTarget)) return;
    openModal('import', 'words');
  });
  el.btnExport.addEventListener('click', (e)=>{
    if(!guardFeature(getEntitlements().import_export, '导出仅专业版可用。', e.currentTarget)) return;
    openModal('export', 'words');
  });
  if(el.btnImportSent) el.btnImportSent.addEventListener('click', (e)=>{
    if(!guardFeature(getEntitlements().import_export, '导入仅专业版可用。', e.currentTarget)) return;
    openModal('import', 'sentences');
  });
  if(el.btnExportSent) el.btnExportSent.addEventListener('click', ()=>{
    const selected = Array.from(state.selectedSent || []).map(Number).filter(Number.isFinite);
    let targetId = selected.length ? selected[0] : null;
    if(!targetId){
      const visible = getVisibleSentences();
      targetId = Number(visible?.[0]?.createdAt || visible?.[0]?.id || 0) || null;
    }
    if(!targetId){
      showManagerToast('当前没有可导出的金句，请先收藏或选中一条。');
      return;
    }
    openQuoteExportModal(targetId);
  });
  el.modalClose.addEventListener('click', closeModal);
  el.btnCancel.addEventListener('click', closeModal);
  el.modalMask.addEventListener('click', (e)=>{ if(e.target === el.modalMask) closeModal(); });

  el.btnChooseFile.addEventListener('click', ()=>el.fileInput.click());

  el.fileInput.addEventListener('change', async ()=>{
    const f = el.fileInput.files && el.fileInput.files[0];
    if(!f) return;
    const text = await f.text();
    el.ioText.value = text;
    clearImportError();
    el.ioHint.textContent = `已加载文件：${f.name}`;
    if(el.fileInfo){
      const meta = [f.name, f.type || 'unknown', formatBytes(f.size)].join(' · ');
      el.fileInfo.textContent = `已选择文件：${meta}`;
      el.fileInfo.style.display = 'block';
    }
    if(el.filePreviewWrap && el.filePreview){
      const lines = String(text).split(/\r?\n/);
      const previewLines = 80;
      let previewText = lines.slice(0, previewLines).join('\n');
      if(lines.length > previewLines){
        previewText += `\n...（共 ${lines.length} 行，预览前 ${previewLines} 行）`;
      }
      el.filePreview.textContent = previewText;
      el.filePreviewWrap.style.display = 'block';
    }
  });

  el.ioText.addEventListener('input', ()=>{
    if(el.ioMode.value === 'import') clearImportError();
  });

  el.ioFormat.addEventListener('change', ()=>{
    if(el.ioMode.value === 'export'){
      generateExportPreview();
    }
  });

  el.btnDownloadTemplate.addEventListener('click', ()=>{
    const fmt = el.ioFormat.value || 'json';
      if(fmt === 'csv'){
        if(ioTarget === 'sentences'){
          downloadText('sentences_template.csv', 'text,translation,note,url,title,sourceLabel,createdAt\nThis is a sample sentence.,这是一个示例句子。,我的批注,https://example.com,Example Title,导入,0\n');
        }else{
        downloadText('vocab_template.csv', 'word,meaning,englishMeaning,note,status,reviewCount,phoneticUS,phoneticUK,audioUS,audioUK,sourceUrl,sourceLabel,createdAt,updatedAt\nexample,例子,"an example | a representative case",我的批注,yellow,1,/ɪgˈzæmpəl/,/ɪgˈzɑːmpəl/,,,https://example.com,导入,0,0\n');
        }
      }else if(fmt === 'txt'){
        if(ioTarget === 'sentences'){
        downloadText('sentences_template.txt', [
          '# HORD English Companion Import Template (Sentences)',
          '# Lines starting with # are comments.',
          '# SENTENCE\tTRANSLATION\tNOTE\tURL\tTITLE\tSOURCE_LABEL\tCREATED_AT',
          'This is a sample sentence.\t这是一个示例句子。\t我的批注\thttps://example.com\tExample Title\t导入\t0',
          ''
        ].join('\n'));
      }else{
        downloadText('vocab_template.txt', [
          '# HORD English Companion Import Template (Words)',
          '# Lines starting with # are comments.',
          '# WORD\tMEANING\tENGLISH_MEANING\tNOTE\tSTATUS\tREVIEWCOUNT\tPHONETIC_US\tPHONETIC_UK\tAUDIO_US\tAUDIO_UK\tSOURCE_URL\tSOURCE_LABEL\tCREATED_AT\tUPDATED_AT',
          'example\t例子\tan example | a representative case\t我的批注\tyellow\t1\t/ɪgˈzæmpəl/\t/ɪgˈzɑːmpəl/\t\t\thttps://example.com\t导入\t0\t0',
          ''
        ].join('\n'));
      }
    }else{
      if(ioTarget === 'sentences'){
        downloadText('sentences_template.json', JSON.stringify({sentences:[{text:'This is a sample sentence.',translation:'这是一个示例句子。',note:'我的批注',url:'https://example.com',title:'Example Title',sourceLabel:'导入',createdAt:Date.now()}]}, null, 2));
      }else{
        downloadText('vocab_template.json', JSON.stringify({words:[{word:'example',meaning:'例子',englishMeaning:['an example','a representative case'],note:'我的批注',status:'yellow',reviewCount:1,phoneticUS:'/ɪgˈzæmpəl/',phoneticUK:'/ɪgˈzɑːmpəl/',audioUS:'',audioUK:'',sourceUrl:'https://example.com',sourceLabel:'导入',createdAt:Date.now(),updatedAt:Date.now()}]}, null, 2));
      }
    }
  });

  function parseCSV(text){
    const rows = [];
    const lines = text.split(/\r?\n/).filter(l=>l.trim().length);
    if(lines.length<=1) return rows;
    const header = lines[0].split(',').map(s=>s.trim());
    for(let i=1;i<lines.length;i++){
      const parts = lines[i].split(',');
      const obj = {};
      for(let j=0;j<header.length;j++){
        obj[header[j]] = parts[j] ?? '';
      }
      rows.push(obj);
    }
    return rows;
  }

  function generateExportPreview(){
    const mode = el.ioMode.value;
    if(mode !== 'export') return;
    const fmt = el.ioFormat.value || 'json';
    const db = state.db || {};
    const words = (db.vocabList||[]).map(w=>{
      const status = normalizeWordStatus(db, w);
      const meta = db.vocabMeta?.[w] || {};
      const phUS = pickPhonetic(db, w, 'us');
      const phUK = pickPhonetic(db, w, 'uk');
      const auUS = pickAudio(db, w, 'us');
      const auUK = pickAudio(db, w, 'uk');
      return {
        word: w,
        meaning: db.vocabDict?.[w] || '',
        englishMeaning: normalizeEnMeaning(db.vocabEn?.[w]),
        note: db.vocabNotes?.[w] || '',
        status,
        reviewCount: meta.reviewCount ?? 0,
        phoneticUS: phUS, phoneticUK: phUK,
        audioUS: auUS, audioUK: auUK,
        sourceUrl: meta.sourceUrl || '',
        sourceLabel: meta.sourceLabel || meta.sourceTitle || '',
        createdAt: meta.createdAt ?? 0,
        updatedAt: meta.updatedAt ?? 0,
      };
    });
    const sentences = (db.collectedSentences||[]).map(s=>({
      text: s.text||'',
      translation: s.translation||'',
      note: s.note||'',
      url: s.url||'',
      title: s.title||'',
      sourceLabel: s.sourceLabel||'',
      createdAt: s.createdAt||s.id||0,
    }));
    const ver = chrome.runtime.getManifest().version;
    if(ioTarget === 'sentences'){
      if(fmt === 'csv'){
        const header = 'text,translation,note,url,title,sourceLabel,createdAt';
        const lines = [header].concat(sentences.map(s=>[
          s.text, s.translation, s.note, s.url, s.title, s.sourceLabel, s.createdAt
        ].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')));
        el.ioText.value = lines.join('\n');
      }else if(fmt === 'txt'){
        const lines = [];
        lines.push(`# HORD English Companion Export (Sentences)`);
        lines.push(`# version: ${ver}`);
        lines.push(`# exportedAt: ${new Date().toISOString()}`);
        lines.push('');
        lines.push(`# Sentences (${sentences.length})`);
        for(const s of sentences){
          const t = (s.text||'').replace(/\s+/g,' ').trim();
          const tr = (s.translation||'').replace(/\s+/g,' ').trim();
          const note = (s.note||'').replace(/\s+/g,' ').trim();
          lines.push([t, tr, note, s.url||'', s.title||'', s.sourceLabel||'', String(s.createdAt ?? '')].join('\t').trimEnd());
        }
        el.ioText.value = lines.join('\n');
      }else{
        const payload = {version: ver, exportedAt: new Date().toISOString(), sentences};
        el.ioText.value = JSON.stringify(payload, null, 2);
      }
      return;
    }

    if(fmt === 'csv'){
      el.ioText.value = toCSV(words);
    }else if(fmt === 'txt'){
      const lines = [];
      lines.push(`# HORD English Companion Export (Words)`);
      lines.push(`# version: ${ver}`);
      lines.push(`# exportedAt: ${new Date().toISOString()}`);
      lines.push('');
      lines.push(`# Words (${words.length})`);
      lines.push(`# word\tmeaning\tenglishMeaning\tnote\tstatus\treviewCount\tphoneticUS\tphoneticUK\taudioUS\taudioUK\tsourceUrl\tsourceLabel\tcreatedAt\tupdatedAt`);
      for(const w of words){
        const note = (w.note||'').trim();
        const meaning = (w.meaning||'').trim();
        const en = Array.isArray(w.englishMeaning) ? w.englishMeaning.join(' | ') : '';
        lines.push([
          w.word||'',
          meaning,
          en,
          note,
          w.status||'',
          String(w.reviewCount ?? ''),
          w.phoneticUS||'',
          w.phoneticUK||'',
          w.audioUS||'',
          w.audioUK||'',
          w.sourceUrl||'',
          w.sourceLabel||'',
          String(w.createdAt ?? ''),
          String(w.updatedAt ?? '')
        ].join('\t').trimEnd());
      }
      el.ioText.value = lines.join('\n');
    }else{
      const payload = {version: ver, exportedAt: new Date().toISOString(), words};
      el.ioText.value = JSON.stringify(payload, null, 2);
    }
  }

  el.ioFormat.addEventListener('change', ()=>{
    if(el.ioMode.value === 'export') generateExportPreview();
  });

  el.btnOk.addEventListener('click', async (e)=>{
    const mode = el.ioMode.value;
    const fmt = el.ioFormat.value || 'json';
    if(mode === 'export'){
      if(!guardFeature(getEntitlements().import_export, '导出仅专业版可用。', e.currentTarget)) return;
      const out = buildExport(fmt);
      downloadText(out.filename, out.text);
      closeModal();
      return;
    }
    if(!guardFeature(getEntitlements().import_export, '导入仅专业版可用。', e.currentTarget)) return;

    // import
    const text = (el.ioText.value||'').trim();
    if(!text){ closeModal(); return; }

    let payload = null;
    if(fmt === 'csv'){
      const rows = parseCSV(text);
      if(ioTarget === 'sentences'){
        payload = {words: [], sentences: rows.map((r, i)=>({
          text: r.text||'',
          translation: r.translation||'',
          note: r.note||'',
          url: r.url||'',
          title: r.title||'',
          sourceLabel: r.sourceLabel||r.source||'',
          createdAt: Number(r.createdAt||0) || (Date.now() + i),
        }))};
      }else{
        payload = {words: rows.map((r,i)=>({
          word: r.word||'',
          meaning: r.meaning||'',
          englishMeaning: normalizeEnMeaning(r.englishMeaning || r.enMeaning || r.meaningEn || ''),
          note: r.note||'',
          status: (r.status||'red'),
          reviewCount: Number(r.reviewCount||0),
          phoneticUS: r.phoneticUS||'',
          phoneticUK: r.phoneticUK||'',
          audioUS: r.audioUS||'',
          audioUK: r.audioUK||'',
          sourceUrl: r.sourceUrl||r.url||'',
          sourceLabel: r.sourceLabel||r.source||'',
          createdAt: Number(r.createdAt||0) || (Date.now() + i),
          updatedAt: Number(r.updatedAt||0) || (Date.now() + i),
        })), sentences: []};
      }
    }else if(fmt === 'txt'){
      const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l && !l.startsWith('#'));
      if(ioTarget === 'sentences'){
        const sentences = [];
        let idx = 0;
        for(const line of lines){
          const parts = line.split('\t');
          const a = (parts[0]||'').trim();
          const b = (parts[1]||'').trim();
          const c = (parts[2]||'').trim();
          const d = (parts[3]||'').trim();
          const e = (parts[4]||'').trim();
          const f = (parts[5]||'').trim();
          const g = (parts[6]||'').trim();
          if(!a) continue;
          sentences.push({
            text:a,
            translation:b,
            note:c,
            url:d,
            title:e,
            sourceLabel:f,
            createdAt: Number(g||0) || (Date.now() + idx)
          });
          idx++;
        }
        payload = {words: [], sentences};
      }else{
        const words = [];
        for(const line of lines){
          const parts = line.split('\t');
          const a = (parts[0]||'').trim();
          const b = (parts[1]||'').trim();
          const c = (parts[2]||'').trim();
          const d = (parts[3]||'').trim();
          const e = (parts[4]||'').trim();
          const f = (parts[5]||'').trim();
          const g = (parts[6]||'').trim();
          const h = (parts[7]||'').trim();
          const i2 = (parts[8]||'').trim();
          const j = (parts[9]||'').trim();
          const k = (parts[10]||'').trim();
          const l = (parts[11]||'').trim();
          const m = (parts[12]||'').trim();
          const n = (parts[13]||'').trim();
          if(!a) continue;
          words.push({
            word:a,
            meaning:b,
            englishMeaning: normalizeEnMeaning(c),
            note:d,
            status:e || 'red',
            reviewCount: Number(f||0),
            phoneticUS: g,
            phoneticUK: h,
            audioUS: i2,
            audioUK: j,
            sourceUrl: k,
            sourceLabel: l,
            createdAt: Number(m||0) || Date.now(),
            updatedAt: Number(n||0) || Date.now()
          });
        }
        payload = {words, sentences: []};
      }
    }else{
      try{ payload = parseFlexibleJSON(text); }
      catch(e){
        const msg = e && e.message ? e.message : 'JSON 解析失败';
        el.ioHint.textContent = 'JSON 解析失败';
        if(el.ioError){
          el.ioError.textContent = `错误详情：${msg}`;
          el.ioError.style.display = 'block';
        }
        return;
      }
      if(ioTarget === 'sentences'){
        if(payload && payload.meta && payload.sentences){
          payload = {sentences: payload.sentences || []};
        }
        if(payload && payload.collectedSentences) payload = {sentences: payload.collectedSentences || []};
        if(payload && payload.sentences) payload = {sentences: payload.sentences || []};
        else payload = {sentences: []};
        payload = {words: [], sentences: payload.sentences.map((s, i)=>({
          text: s.text||s.sentence||'',
          translation: s.translation||s.trans||'',
          note: s.note||'',
          url: s.url||'',
          title: s.title||'',
          sourceLabel: s.sourceLabel||s.source||'',
          createdAt: Number(s.createdAt||0) || (Date.now() + i),
        }))};
      }else{
        if(payload && payload.meta && payload.words){
          payload = {words: payload.words || []};
        }
        if(payload && payload.words) payload = {words: payload.words || []};
        else if(payload && payload.vocabList && payload.vocabDict){
          payload = {words: (payload.vocabList||[]).map(w=>({
            word:w,
            meaning: payload.vocabDict[w]||'',
            englishMeaning: normalizeEnMeaning(payload.vocabEn?.[w]),
            note: payload.vocabNotes?.[w]||'',
            status: payload.vocabMeta?.[w]?.status||'red',
            reviewCount: payload.vocabMeta?.[w]?.reviewCount||0
          }))};
        }else{
          payload = {words: []};
        }
        payload = {words: (payload.words||[]).map((w,i)=>({
          word: w.word||w.text||w,
          meaning: w.meaning||'',
          englishMeaning: normalizeEnMeaning(w.englishMeaning || w.enMeaning || w.meaningEn || ''),
          note: w.note||'',
          status: (w.status||'red'),
          reviewCount: Number(w.reviewCount||0),
          phoneticUS: w.phoneticUS||'',
          phoneticUK: w.phoneticUK||'',
          audioUS: w.audioUS||'',
          audioUK: w.audioUK||'',
          sourceUrl: w.sourceUrl||w.url||'',
          sourceLabel: w.sourceLabel||w.source||'',
          createdAt: Number(w.createdAt||0) || (Date.now() + i),
          updatedAt: Number(w.updatedAt||0) || (Date.now() + i),
        })), sentences: []};
      }
    }
    const wordCount = Array.isArray(payload.words) ? payload.words.length : 0;
    const sentCount = Array.isArray(payload.sentences) ? payload.sentences.length : 0;
    if(ioTarget === 'sentences' && sentCount === 0){
      el.ioHint.textContent = '未识别到任何金句，请确认格式或选择 JSON 模式。';
      return;
    }
    if(ioTarget === 'words' && wordCount === 0){
      el.ioHint.textContent = '未识别到任何单词，请确认格式或选择 JSON 模式。';
      return;
    }
    // Post-process import: if no source info, mark as 导入 and set time
    const nowTs = Date.now();
    if(Array.isArray(payload.words)){
      for(const w of payload.words){
        if(!w) continue;
        if(!w.createdAt) w.createdAt = nowTs;
        if(!w.updatedAt) w.updatedAt = w.createdAt;
        if(!w.sourceUrl && !w.sourceLabel){
          w.sourceLabel = '导入';
        }
      }
    }
    if(Array.isArray(payload.sentences)){
      for(const s of payload.sentences){
        if(!s) continue;
        if(!s.createdAt) s.createdAt = nowTs;
        if(!s.url && !s.sourceLabel){
          s.sourceLabel = '导入';
        }
      }
    }
    try{
      const chunkSize = ioTarget === 'sentences' ? 200 : 200;
      const items = ioTarget === 'sentences'
        ? (payload.sentences || [])
        : (payload.words || []);
      const total = items.length;
      const chunks = [];
      for(let i=0;i<items.length;i+=chunkSize){
        chunks.push(items.slice(i, i+chunkSize));
      }
      let done = 0;
      for(const chunk of chunks){
        const partial = ioTarget === 'sentences'
          ? {words: [], sentences: chunk}
          : {words: chunk, sentences: []};
        const res = await sendMessage({type:'OP_UPSERT_BULK', payload: partial});
        if(!res || res.ok === false){
          const detail = res?.error || res?.message || 'unknown_error';
          throw new Error(detail);
        }
        done += chunk.length;
        el.ioHint.textContent = ioTarget === 'sentences'
          ? `正在导入金句 ${done}/${total}...`
          : `正在导入单词 ${done}/${total}...`;
      }
      await refresh();
      el.ioHint.textContent = ioTarget === 'sentences'
        ? `已导入金句 ${sentCount} 条`
        : `已导入单词 ${wordCount} 条`;
      clearImportError();
      setTimeout(()=>{ try{ closeModal(); }catch(e){} }, 600);
    }catch(e){
      const errMsg = e && e.message ? e.message : '请重试';
      const tip = buildImportErrorTip(errMsg);
      el.ioHint.textContent = `导入失败：${errMsg}`;
      if(el.ioError){
        el.ioError.textContent = tip ? `错误详情：${errMsg}（${tip}）` : `错误详情：${errMsg}`;
        el.ioError.style.display = 'block';
      }
    }
    });

  // init
  try{
    const man = chrome.runtime.getManifest();
    if(el.ver) el.ver.textContent = `v${man.version}`;
    if(el.realTimeStat) el.realTimeStat.textContent = '';
    if(el.limitInfo) el.limitInfo.textContent = 'OWN YOUR WORDS';
  }catch(e){}
  await refresh();
  setTab(state.tab === 'sentences' ? 'sentences' : 'words');
})();


// === 2.50.6 Flexible JSON parser for import ===
function parseFlexibleJSON(raw){
  const text = (raw || "").replace(/^\uFEFF/, "").trim();
  if(!text) return null;

  // 1) direct JSON parse
  try { return JSON.parse(text); } catch(e){}

  // 1.5) try extracting the first JSON object/array from surrounding text
  // (e.g. user pasted with extra prefix/suffix, or editor added decorations)
  const firstObj = text.indexOf('{');
  const lastObj  = text.lastIndexOf('}');
  const firstArr = text.indexOf('[');
  const lastArr  = text.lastIndexOf(']');
  const objCandidate = (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj)
    ? text.slice(firstObj, lastObj + 1)
    : null;
  const arrCandidate = (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr)
    ? text.slice(firstArr, lastArr + 1)
    : null;
  for(const candidate of [objCandidate, arrCandidate]){
    if(!candidate) continue;
    try { return JSON.parse(candidate); } catch(e){}
  }

  // 2) If user pasted multiple root objects without surrounding []
  // e.g. {..}\n{..} OR {..},{..}
  let t = text;

  // If it starts with '"text"' or '"word"', wrap with braces
  if(/^"(\w+)"\s*:/.test(t)){
    t = "{" + t + "}";
  }

  // If there are multiple objects back-to-back, normalize separators
  // replace }\s*{ -> },{
  t = t.replace(/\}\s*,?\s*\{/g, "},{");

  // tolerate trailing commas (common in some editors)
  t = t.replace(/,\s*([\}\]])/g, '$1');

  // If looks like multiple objects but not wrapped, wrap into []
  const startsArr = t.startsWith("[");
  const startsObj = t.startsWith("{");
  if(!startsArr && startsObj && t.includes("},{")){
    t = "[" + t + "]";
  }

  // 3) Last attempt
  try { return JSON.parse(t); } catch(e){}

  // 4) JSON Lines (one object per line)
  try{
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if(lines.length>1){
      const objs = [];
      for(const line of lines){
        if(!line) continue;
        objs.push(JSON.parse(line));
      }
      return objs;
    }
  }catch(e){}

  return null;
}



// === 2.50.6 Export both words + sentences ===
async function exportAllJSON(){
  // Export from the same local DB used by the Manager UI (source of truth).
  // This avoids mismatch with background "state" objects that may omit words.
  const payload = buildExportPayload();
  payload.dbVersion = (state.db && state.db.dbVersion) ? state.db.dbVersion : (state.dbVersion || null);

  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vocab_${state.version}_${tsForFilename()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 200);
}



document.addEventListener('click', (e)=>{
  const el = e.target.closest('[data-act]');
  if(!el) return;
  const act = el.getAttribute('data-act');
  if(act === 'export' || act === 'export-json' || act === 'exportAll'){
    e.preventDefault();
    exportAllJSON();
  }
});


// --- Review mini stats (today / week / month) based on lastReviewAt ---
try{
  const rs = computeReviewStats(words, vocabMeta);
  if(el.reviewMini){
    el.reviewMini.innerHTML = renderReviewMini(rs);
  }
}catch(e){
  if(el.reviewMini) el.reviewMini.innerHTML = '';
}


// ===================== Review mini stats helpers =====================
function startOfDay(ts){
  const d = new Date(ts);
  d.setHours(0,0,0,0);
  return d.getTime();
}
function startOfWeek(ts){
  const d = new Date(ts);
  // Monday as start of week
  const day = (d.getDay()+6)%7; // 0=Mon ... 6=Sun
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()-day);
  return d.getTime();
}
function startOfMonth(ts){
  const d = new Date(ts);
  d.setHours(0,0,0,0);
  d.setDate(1);
  return d.getTime();
}
function countLastReviewBetween(words, vocabMeta, fromTs, toTs){
  let n=0;
  for(const w of words){
    const key = (typeof w === 'string') ? w : (w && typeof w === 'object' ? (w.word || w.text || '') : '');
    if(!key) continue;
    const m = (vocabMeta && (vocabMeta[key] || vocabMeta[key.toLowerCase()] || vocabMeta[key.toUpperCase()])) || null;
    const t = m && m.lastReviewAt;
    if(typeof t === 'number' && t >= fromTs && t < toTs) n++;
  }
  return n;
}
function computeReviewStats(words, vocabMeta){
  const now = Date.now();
  const sod = startOfDay(now);
  const sod_y = startOfDay(now - 24*3600*1000);
  const sow = startOfWeek(now);
  const sow_prev = startOfWeek(now - 7*24*3600*1000);
  const som = startOfMonth(now);
  // prev month start
  const dPrev = new Date(now);
  dPrev.setDate(1); dPrev.setHours(0,0,0,0);
  dPrev.setMonth(dPrev.getMonth()-1);
  const som_prev = dPrev.getTime();
  const som_next_prev = som; // end of prev month is start of current month

  return {
    today: {
      cur: countLastReviewBetween(words, vocabMeta, sod, now+1),
      prev: countLastReviewBetween(words, vocabMeta, sod_y, sod)
    },
    week: {
      cur: countLastReviewBetween(words, vocabMeta, sow, now+1),
      prev: countLastReviewBetween(words, vocabMeta, sow_prev, sow)
    },
    month: {
      cur: countLastReviewBetween(words, vocabMeta, som, now+1),
      prev: countLastReviewBetween(words, vocabMeta, som_prev, som_next_prev)
    }
  };
}
function barPair(cur, prev){
  const max = Math.max(cur, prev, 1);
  const hCur = Math.round((cur/max)*28);
  const hPrev = Math.round((prev/max)*28);
  return `<div class="miniBars" aria-hidden="true">
    <div class="miniBar prev" style="height:${hPrev}px"></div>
    <div class="miniBar cur" style="height:${hCur}px"></div>
  </div>`;
}
function renderReviewMini(rs){
  return `
    <div class="reviewMiniRow">
      <div class="reviewMiniItem">
        <div class="reviewMiniLabel">本日复习</div>
        <div class="reviewMiniValue">${rs.today.cur}</div>
        <div class="reviewMiniCompare">昨日 ${rs.today.prev}</div>
        ${barPair(rs.today.cur, rs.today.prev)}
      </div>
      <div class="reviewMiniItem">
        <div class="reviewMiniLabel">本周复习</div>
        <div class="reviewMiniValue">${rs.week.cur}</div>
        <div class="reviewMiniCompare">上周 ${rs.week.prev}</div>
        ${barPair(rs.week.cur, rs.week.prev)}
      </div>
      <div class="reviewMiniItem">
        <div class="reviewMiniLabel">本月复习</div>
        <div class="reviewMiniValue">${rs.month.cur}</div>
        <div class="reviewMiniCompare">上月 ${rs.month.prev}</div>
        ${barPair(rs.month.cur, rs.month.prev)}
      </div>
    </div>
  `;
}
