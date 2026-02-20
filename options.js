'use strict';
const $ = (id)=>document.getElementById(id);

const PRODUCT_ID = 'hord.vocabmaster.chrome';
const INSTALL_SECRET_KEY = 'auth_install_secret';
const DEFAULT_TRANSLATE_TEST_TEXT = 'The real work happens long before anyone notices.';
const DEFAULT_SERVICE_BASE = 'https://hord-license-service.freestylekobe1.workers.dev';
const OPTIONS_COMPACT_KEY = 'options_compact_view_v1';
const TRANSLATE_PROVIDER_CATALOG = [
  { id: 'relay', label: 'HORD Relay (Recommended)' },
  { id: 'tencent', label: 'Tencent' },
  { id: 'aliyun', label: 'Aliyun' },
  { id: 'hunyuan', label: 'Tencent Hunyuan' },
  { id: 'google_gemini', label: 'Google Gemini' },
  { id: 'fallback_google', label: 'Google Fallback' },
  { id: 'azure', label: 'Azure Translator' },
  { id: 'caiyun', label: 'Caiyun' },
  { id: 'youdao', label: 'Youdao API' },
  { id: 'youdao_web', label: 'Youdao Web' },
  { id: 'baidu_web', label: 'Baidu Web' }
];
const DEFAULT_PROVIDER_ORDER = [
  'tencent',
  'aliyun',
  'hunyuan',
  'google_gemini',
  'relay',
  'fallback_google',
  'azure',
  'caiyun',
  'youdao',
  'youdao_web',
  'baidu_web'
];
let providerOrderState = DEFAULT_PROVIDER_ORDER.slice();
let providerSelectionState = new Set(DEFAULT_PROVIDER_ORDER);
const providerResultState = new Map();
const providerDetailOpenState = new Set();
let providerFilterConfiguredOnly = false;
let providerFilterRecommendedOnly = false;
let providerFilterFailedOnly = false;
let providerFilterErrorCategory = 'all';
let providerFilterFailFirst = false;
let providerUiMode = 'simple'; // simple: hide optional group, expert: show all groups
const providerDragState = { draggingId: '', overId: '', before: true };
let providerRenderTimer = 0;
let compactView = true;

function applyCompactView(){
  try{
    document.body.classList.toggle('options-compact', !!compactView);
  }catch(_){
    // ignore
  }
  const btn = $('toggleCompactView');
  if(btn){
    btn.textContent = compactView ? '🧩 完整视图' : '⚡ 简版视图';
    btn.title = compactView ? '显示完整配置（包含 Step 1 / Step 2）' : '只显示高频区（Step 3）';
  }
}

function loadCompactView(){
  try{
    const raw = localStorage.getItem(OPTIONS_COMPACT_KEY);
    if(raw == null){
      compactView = true;
      return;
    }
    compactView = raw === '1';
  }catch(_){
    compactView = true;
  }
}

function persistCompactView(){
  try{
    localStorage.setItem(OPTIONS_COMPACT_KEY, compactView ? '1' : '0');
  }catch(_){
    // ignore
  }
}

function normalizeProviderUiMode(v){
  return v === 'expert' ? 'expert' : 'simple';
}

function paintProviderUiMode(){
  const simpleBtn = $('providerUiSimple');
  const expertBtn = $('providerUiExpert');
  if(simpleBtn){
    const on = providerUiMode === 'simple';
    simpleBtn.dataset.active = on ? '1' : '0';
    simpleBtn.setAttribute('aria-selected', on ? 'true' : 'false');
  }
  if(expertBtn){
    const on = providerUiMode === 'expert';
    expertBtn.dataset.active = on ? '1' : '0';
    expertBtn.setAttribute('aria-selected', on ? 'true' : 'false');
  }
}

async function persistProviderUiMode(){
  try{
    await new Promise(res=>chrome.storage.local.set({ providerUiMode }, res));
  }catch(_){
    // ignore
  }
}

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

function applyTheme(db){
  const mode = resolveThemeMode(db || {});
  const dark = mode === 'dark' || (mode === 'auto' && systemDark());
  const forceLight = mode === 'light';
  document.documentElement.classList.toggle('vb-dark', dark);
  document.documentElement.classList.toggle('vb-light', forceLight);
  document.body.classList.toggle('vb-force-dark', dark);
  document.body.classList.toggle('vb-force-light', forceLight);
}

function setStatus(text){
  const node = $('status');
  if(node) node.textContent = text || '';
}

function setNodeText(selector, text){
  const node = document.querySelector(selector);
  if(node) node.textContent = text;
}

function setInputLabel(inputId, text){
  const input = $(inputId);
  const label = input?.closest?.('label');
  if(!label) return;
  const clone = input.cloneNode(true);
  label.textContent = '';
  label.appendChild(clone);
  label.appendChild(document.createTextNode(` ${text}`));
}

function applyCopyFixups(){
  document.title = '霍德英语学习管家 - 激活与授权中心';
  setNodeText('.hdMain h1', '激活与授权中心（BYOK 可选）');
  const desc = document.querySelector('.hdMain p');
  if(desc){
    desc.innerHTML = '先完成授权激活，再按需配置翻译 Key。<b>Key 可留空</b>：会使用免 Key 兜底（如有道/百度网页源、Google fallback）。<br/>接口失败会静默降级，不阻断划词与单词本流程。';
  }
  setNodeText('#hdFactPrimary', '主推接口：待检测');
  setNodeText('#hdFactConfigured', '已配置：0');
  setNodeText('#hdFactOrder', '优先级：待加载');
  setNodeText('#hdFactReady', '可用源：0');
  setNodeText('#hdFactSuccess', '成功率：--');
  setNodeText('#hdLicenseBadge', '授权状态：未检查');
  setNodeText('#hdLicenseMeta', '方案：free');

  setNodeText('.stepAuth .sectionTitle', 'STEP 1');
  setNodeText('.stepAuth h2', '授权与中转（低频）');
  setNodeText('label[for="licenseCode"]', 'License Key');
  setNodeText('.authAdvanced summary', '高级安全设置（低频）');
  setNodeText('label[for="authApiBase"]', '授权 API 地址');
  setNodeText('label[for="authPublicKeyJwk"]', '授权公钥 JWK（Ed25519）');
  setInputLabel('authAllowUnsignedCert', '开发模式：允许未签名证书（仅本地联调）');
  setNodeText('#activateLicense', '激活授权');
  setNodeText('#refreshAuth', '刷新状态');
  setNodeText('.authMoreOps summary', '更多授权操作（低频）');
  setNodeText('#deactivateLicense', '解绑本机');
  setNodeText('#validatePublicKey', '校验公钥');
  setNodeText('#clearAuthLocal', '清除本地授权');
  setNodeText('#authState', '授权状态：未检查');
  setNodeText('.stepAuth .note', '免费版限制：单词最多 200、批注最多 10；专业版解锁导入导出、批量操作、高级复习与高级导图模板。');

  setNodeText('.stepConfig .sectionTitle', 'STEP 2');
  setNodeText('.stepConfig h2', '翻译源配置（可选，低频）');
  const primaryGroup = document.querySelector('.configGroupPrimary');
  if(primaryGroup) primaryGroup.open = true;
  setNodeText('.stepConfig .priorityBanner', '主推翻译源固定优先：腾讯 #1 / 阿里 #2 / 混元 #3；Google Gemini 作为可选增强。');
  const configNote = document.querySelector('.stepConfig .note');
  if(configNote) configNote.textContent = '先配置凭证；接口测试与优先级排序统一在 Step 3 操作。';
  const configSummarySpans = document.querySelectorAll('.stepConfig .configGroup summary span');
  if(configSummarySpans.length >= 4){
    configSummarySpans[0].textContent = '推荐接口（建议优先配置）';
    configSummarySpans[1].textContent = '腾讯 + 阿里';
    configSummarySpans[2].textContent = '其他接口（按需配置）';
    configSummarySpans[3].textContent = 'Azure / 彩云 / 有道';
  }
  const panelTitles = document.querySelectorAll('.stepConfig .providerPanel h3');
  const panelTexts = [
    '腾讯翻译（主推荐）',
    '阿里云翻译（主推荐）',
    '腾讯混元（第三选择）',
    'Google Gemini（可选增强）',
    'Azure Translator（可选）',
    '彩云小译（可选）',
    '有道 API（可选）'
  ];
  panelTitles.forEach((n, i)=>{ if(panelTexts[i]) n.textContent = panelTexts[i]; });

  setNodeText('.stepTest .sectionTitle', 'STEP 3');
  setNodeText('.stepTest h2', '翻译接口测试与优先级（高频）');
  setNodeText('label[for="translateRelayBase"]', '中转服务地址（可选，留空则使用授权 API 地址）');
  setNodeText('label[for="translateRelayToken"]', '中转访问令牌（可选）');
  setNodeText('label[for="translateTestText"]', '测试句子（英文）');
  setNodeText('label[for="translateResultCount"]', '网页弹窗显示翻译结果数（按优先级）');
  setNodeText('#fillRelayDefault', '使用默认中转');
  setNodeText('#testSelectedProviders', '测试选中接口');
  setNodeText('#testAllProviders', '一键测试全部');
  setNodeText('#selectAllProviders', '全选');
  setNodeText('#unselectAllProviders', '清空');
  setInputLabel('filterConfiguredOnly', '仅显示已配置');
  setInputLabel('filterRecommendedOnly', '仅显示推荐');
  setInputLabel('filterFailedOnly', '仅看失败');
  setInputLabel('filterFailFirst', '失败优先显示');
  const catLabel = $('filterErrorCategory')?.closest?.('label');
  if(catLabel){
    const sel = $('filterErrorCategory');
    catLabel.textContent = '失败分类 ';
    catLabel.appendChild(sel);
  }
  const cat = $('filterErrorCategory');
  if(cat){
    const map = { all:'全部', config:'配置问题', network:'网络/服务', source:'源限制', unknown:'未知' };
    Array.from(cat.options).forEach((op)=>{ op.textContent = map[op.value] || op.value; });
  }
  const testNote = document.querySelector('.stepTest .note');
  if(testNote) testNote.textContent = '勾选用于批量测试；上下可调整实际翻译优先级顺序。';

  setNodeText('#save', '保存');
  setNodeText('#resetOptions', '重置本页');
  setNodeText('#resetPopupConfig', '修复弹窗配置');
  setNodeText('#openManagerTop', '📚 管理单词本');
  setNodeText('#openQuotesTop', '✨ 收藏金句库');
  setNodeText('#openReviewTop', '🧠 艾宾浩斯复习');
}

function setAuthStateStructured(rows, level){
  const node = $('authState');
  if(!node) return;
  const safeRows = Array.isArray(rows) ? rows : [];
  const html = safeRows.map((item)=>{
    const k = escapeHtml(item?.k || '-');
    const v = escapeHtml(item?.v || '-');
    return `<div class="authStateKey">${k}</div><div class="authStateValue">${v}</div>`;
  }).join('');
  node.innerHTML = `<div class="authStateGrid">${html}</div>`;
  node.classList.remove('ok', 'warn', 'err');
  if(level) node.classList.add(level);
}

function providerLabel(id){
  const hit = TRANSLATE_PROVIDER_CATALOG.find((x)=>x.id === id);
  return hit ? hit.label : id;
}

function getProviderMeta(id){
  const meta = {
    keyRequired: true,
    recommended: false,
    experimental: false
  };
  if(id === 'relay'){
    meta.keyRequired = false;
    meta.recommended = true;
    return meta;
  }
  if(id === 'fallback_google'){
    meta.keyRequired = false;
    meta.recommended = true;
    return meta;
  }
  if(id === 'youdao_web' || id === 'baidu_web'){
    meta.keyRequired = false;
    meta.experimental = true;
    return meta;
  }
  if(id === 'tencent' || id === 'aliyun' || id === 'hunyuan' || id === 'google_gemini'){
    meta.recommended = true;
  }
  return meta;
}

function escapeHtml(text){
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeProviderOrder(value){
  const arr = Array.isArray(value) ? value.map((x)=>String(x || '').trim()).filter(Boolean) : [];
  const seen = new Set();
  let out = [];
  for(const id of arr){
    if(!DEFAULT_PROVIDER_ORDER.includes(id)) continue;
    if(seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for(const id of DEFAULT_PROVIDER_ORDER){
    if(!seen.has(id)){
      seen.add(id);
      out.push(id);
    }
  }
  const pinAfterRelay = ['tencent', 'aliyun'];
  out = out.filter((id)=>!pinAfterRelay.includes(id));
  out = out.filter((id)=>id !== 'relay');
  out.unshift('relay');
  out.splice(1, 0, ...pinAfterRelay);
  const dedup = [];
  const dedupSeen = new Set();
  for(const id of out){
    if(dedupSeen.has(id)) continue;
    dedupSeen.add(id);
    dedup.push(id);
  }
  out = dedup;
  return out;
}

function normalizeProviderSelection(value){
  if(!Array.isArray(value)){
    return new Set(DEFAULT_PROVIDER_ORDER);
  }
  const arr = value.map((x)=>String(x || '').trim()).filter(Boolean);
  return new Set(arr.filter((id)=>DEFAULT_PROVIDER_ORDER.includes(id)));
}

function setAuthState(text, level){
  const node = $('authState');
  if(!node) return;
  node.textContent = text || '授权状态：未检查';
  node.classList.remove('ok', 'warn', 'err');
  if(level) node.classList.add(level);
}

function setAuthHeaderBadge(auth){
  const node = $('hdLicenseBadge');
  const meta = $('hdLicenseMeta');
  const brandCard = document.querySelector('.hdBrandCard');
  const officialDot = $('hdOfficialDot');
  if(!node) return;
  const status = String(auth?.status || 'inactive');
  const plan = String(auth?.plan || 'free');
  const expires = Number(auth?.expiresAt || 0);
  const until = expires ? formatTs(expires).split(' ')[0] : '-';
  if(brandCard) brandCard.classList.remove('active', 'warn', 'free');
  node.classList.remove('active', 'warn', 'free');
  if(officialDot) officialDot.classList.remove('warn', 'free');
  if(status === 'active'){
    if(brandCard) brandCard.classList.add('active');
    node.classList.add('active');
    node.textContent = `已激活 · ${plan}`;
    if(meta) meta.textContent = `方案：${plan} · 到期：${until}`;
    return;
  }
  if(status === 'expired'){
    if(brandCard) brandCard.classList.add('warn');
    node.classList.add('warn');
    if(officialDot) officialDot.classList.add('warn');
    node.textContent = '授权已过期';
    if(meta) meta.textContent = `方案：${plan} · 到期：${until}`;
    return;
  }
  if(brandCard) brandCard.classList.add('free');
  node.classList.add('free');
  if(officialDot) officialDot.classList.add('free');
  node.textContent = '免费版（未激活）';
  if(meta) meta.textContent = '方案：free · 可升级专业版';
}

function formatTs(ts){
  const n = Number(ts || 0);
  if(!n) return '-';
  try{ return new Date(n).toLocaleString(); }catch(_){ return '-'; }
}

function normalizeApiBase(raw){
  return String(raw || '').trim().replace(/\/+$/, '');
}

function sanitizeApiBase(raw){
  const base = normalizeApiBase(raw);
  if(!base) return '';
  const lower = base.toLowerCase();
  if(lower.includes('example.workers.dev')) return '';
  if(lower.includes('license.your-domain.com')) return '';
  if(lower.includes('your-host/v1')) return '';
  return base;
}

function shortHost(raw){
  try{
    const u = new URL(raw);
    return u.host;
  }catch(_){
    return raw;
  }
}

function getEffectiveAuthBase(){
  return sanitizeApiBase($('authApiBase')?.value || '') || DEFAULT_SERVICE_BASE;
}

function getEffectiveRelayBase(){
  const relay = sanitizeApiBase($('translateRelayBase')?.value || '');
  if(relay) return relay;
  return getEffectiveAuthBase();
}

function getProviderConfigStatus(id){
  const has = (v)=>String(v || '').trim().length > 0;
  const keyState = {
    azure: has($('azureKey')?.value) && has($('azureRegion')?.value),
    tencent: has($('tencentId')?.value) && has($('tencentKey')?.value),
    aliyun: has($('aliyunId')?.value) && has($('aliyunKey')?.value),
    hunyuan: (has($('hunyuanId')?.value) && has($('hunyuanKey')?.value)) || (has($('tencentId')?.value) && has($('tencentKey')?.value)),
    google_gemini: has($('googleGeminiKey')?.value),
    caiyun: has($('caiyunToken')?.value),
    youdao: has($('youdaoAppKey')?.value) && has($('youdaoAppSecret')?.value),
  };
  if(id === 'relay'){
    const base = getEffectiveRelayBase();
    return {
      ok: !!base,
      text: base ? `中转地址: ${shortHost(base)}` : '未配置中转地址'
    };
  }
  if(id === 'fallback_google') return { ok: true, text: '免Key兜底' };
  if(id === 'youdao_web') return { ok: true, text: '网页源（可能受反爬限制）' };
  if(id === 'baidu_web') return { ok: true, text: '网页源（可能受反爬限制）' };
  if(keyState[id]) return { ok: true, text: 'Key已配置' };
  return { ok: false, text: '缺少Key配置' };
}

function updateHeaderFacts(){
  const primary = $('hdFactPrimary');
  const configured = $('hdFactConfigured');
  const order = $('hdFactOrder');
  const ready = $('hdFactReady');
  const success = $('hdFactSuccess');
  if(!primary || !configured || !order) return;
  const tencentOk = getProviderConfigStatus('tencent').ok;
  const aliyunOk = getProviderConfigStatus('aliyun').ok;
  const hunyuanOk = getProviderConfigStatus('hunyuan').ok;
  const geminiOk = getProviderConfigStatus('google_gemini').ok;
  const primaryText = `主推接口：腾讯 ${tencentOk ? '已就绪' : '未配'} / 阿里 ${aliyunOk ? '已就绪' : '未配'} / 混元 ${hunyuanOk ? '已就绪' : '未配'} / Gemini ${geminiOk ? '已就绪' : '未配'}`;
  const configuredCount = providerOrderState.filter((id)=>{
    const meta = getProviderMeta(id);
    if(meta.experimental) return false;
    return getProviderConfigStatus(id).ok;
  }).length;
  const orderTop = providerOrderState.slice(0, 3).map((id)=>providerLabel(id)).join(' > ');
  primary.textContent = primaryText;
  configured.textContent = `已配置：${configuredCount}/${providerOrderState.length}`;
  order.textContent = `优先级：${orderTop || '待加载'}`;
  if(ready){
    ready.textContent = `可用源：${configuredCount}`;
    ready.classList.toggle('ok', configuredCount >= 2);
    ready.classList.toggle('warn', configuredCount < 2);
  }
  if(success){
    let tested = 0;
    let okCount = 0;
    providerOrderState.forEach((id)=>{
      const lv = providerResultState.get(id)?.level || '';
      if(lv === 'ok' || lv === 'err'){
        tested += 1;
      }
      if(lv === 'ok'){
        okCount += 1;
      }
    });
    const rate = tested ? `${Math.round(okCount * 100 / tested)}%` : '--';
    success.textContent = `成功率：${rate}`;
    success.classList.toggle('ok', tested > 0 && okCount / tested >= 0.6);
    success.classList.toggle('warn', tested > 0 && okCount / tested < 0.6);
  }
}

async function sendMessage(msg){
  return await new Promise(res=>chrome.runtime.sendMessage(msg, res));
}

async function sendMessageWithTimeout(msg, timeoutMs = 12000){
  return await new Promise(res=>{
    let done = false;
    const id = setTimeout(()=>{
      if(done) return;
      done = true;
      res({ __timeout: true });
    }, timeoutMs);
    try{
      chrome.runtime.sendMessage(msg, (resp)=>{
        if(done) return;
        done = true;
        clearTimeout(id);
        const err = chrome.runtime.lastError;
        if(err) return res({ __runtimeError: String(err.message || err) });
        res(resp);
      });
    }catch(e){
      if(done) return;
      done = true;
      clearTimeout(id);
      res({ __runtimeError: String(e?.message || e) });
    }
  });
}

function timeoutFetch(url, options, timeoutMs){
  const ctrl = new AbortController();
  const id = setTimeout(()=>ctrl.abort(), timeoutMs);
  return fetch(url, { ...(options || {}), signal: ctrl.signal }).finally(()=>clearTimeout(id));
}

function bytesToHex(bytes){
  return Array.from(bytes).map(b=>b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text){
  const data = new TextEncoder().encode(String(text || ''));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(buf));
}

async function validatePublicKeyConfig(){
  const raw = String($('authPublicKeyJwk').value || '').trim();
  if(!raw){
    setAuthState('公钥为空：请先粘贴 Ed25519 JWK', 'warn');
    return false;
  }
  try{
    const jwk = JSON.parse(raw);
    await crypto.subtle.importKey('jwk', jwk, {name:'Ed25519'}, false, ['verify']);
    setAuthState('公钥格式校验通过，可用于证书验签。', 'ok');
    return true;
  }catch(e){
    setAuthState(`公钥格式无效：${e?.message || e}`, 'err');
    return false;
  }
}

async function getInstallSecret(){
  const db = await new Promise(res=>chrome.storage.local.get([INSTALL_SECRET_KEY], res));
  const old = String(db[INSTALL_SECRET_KEY] || '').trim();
  if(old) return old;
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const next = bytesToHex(bytes);
  await new Promise(res=>chrome.storage.local.set({ [INSTALL_SECRET_KEY]: next }, res));
  return next;
}

async function buildDeviceHash(){
  const secret = await getInstallSecret();
  return await sha256Hex(`${secret}|${PRODUCT_ID}|v1`);
}

async function callAuthApi(path, payload, method){
  const base = normalizeApiBase($('authApiBase')?.value || '');
  if(!base) throw new Error('请先填写授权 API 地址');
  const url = `${base}${path}`;
  const res = await timeoutFetch(url, {
    method: method || 'POST',
    headers: {'Content-Type':'application/json'},
    body: payload ? JSON.stringify(payload) : undefined,
  }, 12000);
  const data = await res.json().catch(()=>null);
  if(!res.ok || !data || data.ok === false){
    const msg = data?.error || data?.message || `HTTP_${res.status}`;
    throw new Error(String(msg));
  }
  return data;
}

function summarizeEntitlements(ent){
  const e = ent && typeof ent === 'object' ? ent : {};
  const wl = Number(e.word_limit);
  const nl = Number(e.note_limit);
  const wv = wl < 0 ? '无限' : (Number.isFinite(wl) ? String(wl) : '-');
  const nv = nl < 0 ? '无限' : (Number.isFinite(nl) ? String(nl) : '-');
  return `词数上限: ${wv} · 批注上限: ${nv} · 导入导出: ${e.import_export ? '开' : '关'} · 批量: ${e.bulk_edit ? '开' : '关'} · 复习: ${e.review_mode || 'basic'}`;
}

async function refreshAuthState(opts){
  const withServer = !!opts?.withServer;
  const local = await sendMessage({type:'OP_GET_AUTH'});
  if(!local || !local.ok){
    setAuthState('授权状态读取失败', 'err');
    return;
  }

  const auth = local.auth || {};
  const ent = local.entitlements || auth.entitlements || {};
  const licenseStatus = local.licenseStatus || 'FREE';
  const caps = (local.capabilities && typeof local.capabilities === 'object') ? local.capabilities : null;
  setAuthHeaderBadge(auth);
  const rows = [
    { k: 'License 状态', v: licenseStatus },
    { k: '授权状态', v: auth.status || 'inactive' },
    { k: '方案', v: auth.plan || 'free' },
    { k: '来源', v: local.source || auth.source || 'free' },
    { k: '到期时间', v: formatTs(auth.expiresAt) },
    { k: '权益摘要', v: summarizeEntitlements(ent) },
  ];
  if(caps){
    rows.push({ k: 'Capabilities', v: `assetMode=${caps.assetMode ? 'true' : 'false'} · laserMode=${caps.laserMode ? 'true' : 'false'} · advancedTemplates=${caps.advancedTemplates ? 'true' : 'false'}` });
  }

  if(withServer){
    try{
      const key = String($('licenseCode')?.value || '').trim();
      const base = normalizeApiBase($('authApiBase')?.value || '');
      if(key && base){
        const query = new URLSearchParams({license_key: key, product_id: PRODUCT_ID});
        const data = await callAuthApi(`/v1/licenses/status?${query.toString()}`, null, 'GET');
        rows.push({ k: '设备占用', v: `${data.active_devices ?? '-'} / ${data.max_devices ?? '-'}` });
      }
    }catch(e){
      rows.push({ k: '服务器状态', v: `查询失败: ${e.message || e}` });
    }
  }

  const level = auth.status === 'active' ? 'ok' : (auth.status === 'expired' ? 'warn' : 'warn');
  setAuthStateStructured(rows, level);
}

function getTranslateTestText(){
  const node = $('translateTestText');
  const text = String(node?.value || '').trim();
  return text || DEFAULT_TRANSLATE_TEST_TEXT;
}

function getTranslateResultCount(){
  const raw = Number($('translateResultCount')?.value || 2);
  if(!Number.isFinite(raw)) return 2;
  return Math.max(1, Math.min(4, Math.floor(raw)));
}

function updateProviderResult(id, text, level, title, opts){
  const detail = title || text || '';
  const category = String(opts?.category || providerResultState.get(id)?.category || '');
  const code = String(opts?.code || providerResultState.get(id)?.code || '');
  providerResultState.set(id, { text: text || '', level: level || '', title: detail, category, code });
  const row = document.querySelector(`.providerRow[data-provider-id="${id}"]`);
  if(!row) return;
  const result = row.querySelector('.providerResult');
  const resultText = row.querySelector('.providerResultText') || result;
  const resultBadge = row.querySelector('.providerResultBadge');
  const resultMeta = row.querySelector('.providerResultMeta');
  const detailNode = row.querySelector('.providerDetail');
  const detailBtn = row.querySelector('[data-role="detail"]');
  if(!result || !resultText) return;
  result.classList.remove('ok', 'err', 'testing');
  resultText.textContent = text || '';
  result.title = detail;
  row.dataset.resultLevel = level || 'idle';
  row.dataset.resultDetail = detail;
  if(detailNode) detailNode.textContent = detail || '暂无详情';
  if(detailBtn){
    detailBtn.disabled = !detail;
    detailBtn.textContent = providerDetailOpenState.has(id) ? '收起' : '详情';
  }
  if(resultBadge){
    if(level === 'ok') resultBadge.textContent = 'OK';
    else if(level === 'err') resultBadge.textContent = 'FAIL';
    else if(level === 'testing') resultBadge.textContent = 'TEST';
    else resultBadge.textContent = 'WAIT';
  }
  if(resultMeta){
    let catLabel = '';
    let catClass = '';
    if(category === 'config'){ catLabel = '配置问题'; catClass = 'cat-config'; }
    else if(category === 'network'){ catLabel = '网络/服务'; catClass = 'cat-network'; }
    else if(category === 'source'){ catLabel = '源限制'; catClass = 'cat-source'; }
    else if(category === 'unknown'){ catLabel = '未知'; catClass = 'cat-unknown'; }
    const metaText = catLabel ? `${catLabel}${code ? ` · ${code}` : ''}` : (code || '未分类');
    resultMeta.textContent = metaText;
    resultMeta.className = `providerResultMeta ${catClass}`.trim();
  }
  row.classList.remove('state-ok', 'state-err', 'state-testing');
  if(level === 'ok') row.classList.add('state-ok');
  if(level === 'err') row.classList.add('state-err');
  if(level === 'testing') row.classList.add('state-testing');
  if(level === 'ok') result.classList.add('ok');
  if(level === 'err') result.classList.add('err');
  if(level === 'testing') result.classList.add('testing');
  if(!opts || !opts.skipStats){
    updateProviderStats();
  }
}

function normalizeTestError(provider, error, detail){
  const e = String(error || 'failed').trim();
  const d = String(detail || '').trim();
  const dShort = d ? d.slice(0, 160) : '';

  if(e === 'no_response') return { text: '扩展后台无响应（请刷新扩展页重试）', full: `${e}${d ? `: ${d}` : ''}`, category: 'network', code: e };
  if(e === 'timeout') return { text: '请求超时（网络慢或接口无响应）', full: `${e}${d ? `: ${d}` : ''}`, category: 'network', code: e };
  if(e.startsWith('runtime_error')) return { text: '扩展通信错误（请重载插件）', full: `${e}${d ? `: ${d}` : ''}`, category: 'network', code: e };
  if(e === 'relay_missing_base') return { text: '未配置中转地址', full: e, category: 'config', code: e };
  if(e.startsWith('relay_http_')) return { text: `中转服务返回错误（${e.replace('relay_http_', 'HTTP ')})`, full: `${e}${dShort ? `: ${dShort}` : ''}`, category: 'network', code: e };
  if(e === 'relay_exception') return { text: `中转请求异常（${dShort || '请检查地址与网络'}）`, full: `${e}${d ? `: ${d}` : ''}`, category: 'network', code: e };
  if(e === 'azure_missing_key_or_region') return { text: 'Azure 缺少 Key 或 Region', full: e, category: 'config', code: e };
  if(e === 'tencent_missing_key') return { text: '腾讯翻译缺少 SecretId/SecretKey', full: e, category: 'config', code: e };
  if(e === 'aliyun_missing_key') return { text: '阿里云翻译缺少 AccessKey', full: e, category: 'config', code: e };
  if(e === 'hunyuan_missing_key') return { text: '腾讯混元缺少 SecretId/SecretKey', full: e, category: 'config', code: e };
  if(e === 'google_gemini_missing_key') return { text: 'Google Gemini 缺少 API Key', full: e, category: 'config', code: e };
  if(e === 'google_gemini_http_429') return { text: 'Google Gemini 配额/速率受限（429）', full: `${e}${dShort ? `: ${dShort}` : ''}`, category: 'source', code: e };
  if(e === 'google_gemini_cooldown') return { text: 'Google Gemini 冷却中（自动跳过约15分钟）', full: `${e}${dShort ? `: ${dShort}` : ''}`, category: 'source', code: e };
  if(e === 'google_gemini_http_403') return { text: 'Google Gemini 权限不足或 Key 无效（403）', full: `${e}${dShort ? `: ${dShort}` : ''}`, category: 'config', code: e };
  if(e === 'google_gemini_http_400') return { text: 'Google Gemini 请求参数无效（400，检查模型名）', full: `${e}${dShort ? `: ${dShort}` : ''}`, category: 'config', code: e };
  if(e === 'caiyun_missing_token') return { text: '彩云小译缺少 Token', full: e, category: 'config', code: e };
  if(e === 'youdao_missing_key') return { text: '有道 API 缺少 AppKey/AppSecret', full: e, category: 'config', code: e };
  if(e === 'youdao_web_empty') return { text: '有道网页源无可用结果（可能被反爬）', full: `${e}${dShort ? `: ${dShort}` : ''}`, category: 'source', code: e };
  if(e === 'baidu_web_empty') return { text: '百度网页源无可用结果（可能被反爬）', full: `${e}${dShort ? `: ${dShort}` : ''}`, category: 'source', code: e };
  if(e === 'all_providers_failed') return { text: '全部接口失败', full: `${e}${dShort ? `: ${dShort}` : ''}`, category: 'unknown', code: e };

  const providerName = providerLabel(provider);
  return { text: `${providerName} 测试失败：${e}`, full: `${e}${d ? `: ${d}` : ''}`, category: 'unknown', code: e };
}

function formatSuccessPreview(text){
  const t = String(text || '').trim();
  if(!t) return 'OK';
  return t.length > 56 ? `OK: ${t.slice(0, 56)}...` : `OK: ${t}`;
}

async function runSingleProviderTest(provider, text){
  let last = null;
  for(let i=0; i<2; i += 1){
    const r = await sendMessageWithTimeout({
      type:'TEST_TRANSLATE_PROVIDER',
      provider,
      text
    }, 12000);
    if(r && r.__runtimeError){
      last = { ok:false, error:'runtime_error', detail:String(r.__runtimeError || '') };
      continue;
    }
    if(r && r.__timeout){
      last = { ok:false, error:'timeout', detail:'' };
      continue;
    }
    if(!r){
      last = { ok:false, error:'no_response', detail:'' };
      continue;
    }
    if(r.ok === false){
      return { ok:false, error: String(r.error || 'request_failed'), detail:'' };
    }
    if(r.result?.ok){
      return { ok:true, text:String(r.result.text || '').trim(), detail:'' };
    }
    return {
      ok:false,
      error: String(r.result?.error || 'failed'),
      detail: String(r.result?.detail || '')
    };
  }
  return last || { ok:false, error:'no_response', detail:'' };
}

async function persistProviderPrefsSilent(){
  await new Promise((res)=>chrome.storage.local.set({
    translateProviderOrder: providerOrderState.slice(),
    translateTestSelected: Array.from(providerSelectionState),
  }, res));
}

function updateProviderStats(){
  const stats = $('providerStats');
  if(!stats) return;
  const total = providerOrderState.length;
  const selected = providerOrderState.filter((id)=>providerSelectionState.has(id)).length;
  const configured = providerOrderState.filter((id)=>{
    const meta = getProviderMeta(id);
    if(meta.experimental) return false;
    return getProviderConfigStatus(id).ok;
  }).length;
  // Match on-screen visible rows (also respects UI mode like hiding whole groups).
  const visible = document.querySelectorAll('#providerOrderList .providerRow').length;
  let okCount = 0;
  let failCount = 0;
  let testingCount = 0;
  providerOrderState.forEach((id)=>{
    const s = providerResultState.get(id)?.level || '';
    if(s === 'ok') okCount += 1;
    else if(s === 'err') failCount += 1;
    else if(s === 'testing') testingCount += 1;
  });
  stats.innerHTML = `
    <span class="statsChip">已选 ${selected}/${total}</span>
    <span class="statsChip">已配置 ${configured}/${total}</span>
    <span class="statsChip">显示 ${visible}</span>
    <span class="statsChip ok">成功 ${okCount}</span>
    <span class="statsChip err">失败 ${failCount}</span>
    <span class="statsChip warn">测试中 ${testingCount}</span>
  `;
  updateHeaderFacts();
  renderPinnedProviderSummary();
}

function renderPinnedProviderSummary(){
  const wrap = $('providerPinnedSummary');
  if(!wrap) return;
  const pinnedIds = ['tencent', 'aliyun', 'hunyuan', 'relay'];
  wrap.innerHTML = pinnedIds.map((id)=>{
    const cfg = getProviderConfigStatus(id);
    const result = providerResultState.get(id) || {};
    const lv = String(result.level || '');
    const cls = cfg.ok ? 'ok' : 'warn';
    const stateText = lv === 'ok' ? '测试通过' : (lv === 'err' ? '测试失败' : (lv === 'testing' ? '测试中' : '未测试'));
    return `
      <div class="pinnedCard ${cls}">
        <div class="name">${escapeHtml(providerLabel(id))}</div>
        <div class="meta">优先级 ${escapeHtml(String(providerOrderState.indexOf(id) + 1))} · ${escapeHtml(cfg.ok ? '已配置' : '未配置')}</div>
        <div class="state">${escapeHtml(stateText)}</div>
      </div>
    `;
  }).join('');
}

function renderProviderOrderList(){
  const wrap = $('providerOrderList');
  if(!wrap) return;
  if(!Array.isArray(providerOrderState) || !providerOrderState.length){
    providerOrderState = DEFAULT_PROVIDER_ORDER.slice();
  }
  wrap.innerHTML = '';

  const buildRow = (id, index)=>{
    const cfg = getProviderConfigStatus(id);
    const meta = getProviderMeta(id);
    const resultLevel = providerResultState.get(id)?.level || '';
    if(providerFilterConfiguredOnly && (!cfg.ok || meta.experimental)) return;
    if(providerFilterRecommendedOnly && !meta.recommended) return;
    if(providerFilterErrorCategory !== 'all'){
      if(resultLevel !== 'err') return;
      const cat = providerResultState.get(id)?.category || '';
      if(cat !== providerFilterErrorCategory) return;
    }else if(providerFilterFailedOnly && resultLevel !== 'err'){
      return;
    }
    const badges = [];
    const pinned = id === 'relay' || id === 'tencent' || id === 'aliyun' || id === 'hunyuan';
    const topPriority = id === 'tencent' || id === 'aliyun' || id === 'hunyuan' || id === 'google_gemini';
    const primaryTop = topPriority;
    const relayFallback = id === 'relay';
    const prevId = providerOrderState[index - 1] || '';
    const prevPinned = prevId === 'relay' || prevId === 'tencent' || prevId === 'aliyun' || prevId === 'hunyuan';
    const afterPinned = !pinned && prevPinned;
    badges.push(meta.keyRequired ? '需Key' : '免Key');
    if(meta.recommended) badges.push('推荐');
    if(pinned) badges.push('固定优先');
    if(meta.experimental) badges.push('实验');
    const badgeHtml = badges.map((x)=>{
      const cls = (x === '推荐' || x === '固定优先') ? 'ok' : (x === '实验' ? 'warn' : '');
      return `<span class="providerBadge ${cls}">${escapeHtml(x)}</span>`;
    }).join('');
    const row = document.createElement('div');
    row.className = `providerRow${cfg.ok ? '' : ' providerMissing'}${pinned ? ' providerPinned' : ''}${primaryTop ? ' providerPrimaryTop' : ''}${relayFallback ? ' providerRelayFallback' : ''}${afterPinned ? ' providerAfterPinned' : ''}`;
    row.dataset.providerId = id;
    row.setAttribute('draggable', 'true');
    row.innerHTML = `
      <div class="providerMeta">
        <label class="providerTitle">
          <input class="providerSel" type="checkbox" data-role="select" ${providerSelectionState.has(id) ? 'checked' : ''} />
          <span>${providerLabel(id)}</span>
        </label>
        <div class="providerHint"><span class="providerRank">#${index + 1}</span> ${id}</div>
        <div class="providerBadges">${badgeHtml}</div>
        <div class="providerConfig ${cfg.ok ? 'ok' : 'warn'}">${cfg.text}</div>
      </div>
      <div class="providerActions">
        <button class="btn secondary mini miniIcon dragHandle" data-role="drag" title="拖拽排序" aria-label="拖拽排序">::</button>
        <button class="btn secondary mini miniAction" data-role="test" title="测试该接口">测试</button>
        <button class="btn secondary mini miniAction" data-role="detail" title="查看详情">详情</button>
        <button class="btn secondary mini miniIcon" data-role="up" title="上移">↑</button>
        <button class="btn secondary mini miniIcon" data-role="down" title="下移">↓</button>
      </div>
      <div class="providerResult"><span class="providerResultBadge">WAIT</span><span class="providerResultText">未测试</span><span class="providerResultMeta">未分类</span></div>
      <div class="providerDetail${providerDetailOpenState.has(id) ? ' show' : ''}">暂无详情</div>
    `;
    wrap.appendChild(row);
    const prev = providerResultState.get(id);
    if(prev){
      updateProviderResult(id, prev.text, prev.level, prev.title || prev.text, { skipStats: true });
    }else{
      updateProviderResult(id, '未测试', '', '未测试', { skipStats: true });
    }
    return row;
  };

  const groups = {
    top: [],
    fallback: [],
    standard: [],
    experimental: []
  };
  providerOrderState.forEach((id, index)=>{
    const meta = getProviderMeta(id);
    const row = buildRow(id, index);
    if(!row) return;
    const item = { id, row };
    if(id === 'tencent' || id === 'aliyun' || id === 'hunyuan' || id === 'google_gemini'){
      groups.top.push(item);
      return;
    }
    if(id === 'relay'){
      groups.fallback.push(item);
      return;
    }
    if(meta.experimental){
      groups.experimental.push(item);
      return;
    }
    groups.standard.push(item);
  });

  const levelRank = (id)=>{
    const lv = providerResultState.get(id)?.level || '';
    if(lv === 'err') return 0;
    if(lv === 'testing') return 1;
    if(lv === '') return 2;
    return 3;
  };
  const maybeSortFailFirst = (arr)=>{
    if(!providerFilterFailFirst) return arr;
    return arr.slice().sort((a, b)=>levelRank(a.id) - levelRank(b.id));
  };
  const sectionOpenKey = 'options_provider_section_open_v1';
  const readSectionOpenMap = ()=>{
    try{
      return JSON.parse(localStorage.getItem(sectionOpenKey) || '{}') || {};
    }catch(_){
      return {};
    }
  };
  const writeSectionOpenMap = (next)=>{
    try{ localStorage.setItem(sectionOpenKey, JSON.stringify(next || {})); }catch(_){/* ignore */}
  };
  const openMap = readSectionOpenMap();

  const createSection = (title, tag, items, cls, key, defaultOpen = true)=>{
    const rows = maybeSortFailFirst(items || []);
    if(!rows.length) return;
    const section = document.createElement('details');
    section.className = `providerSection ${cls}`;
    section.open = (openMap[key] != null) ? !!openMap[key] : defaultOpen;
    section.dataset.sectionKey = key;
    section.innerHTML = `
      <summary class="providerSectionHeader">
        <span>${escapeHtml(title)}</span>
        <span class="providerSectionTag">${escapeHtml(tag)}</span>
      </summary>
      <div class="providerSectionBody"></div>
    `;
    const body = section.querySelector('.providerSectionBody');
    rows.forEach((item)=>body.appendChild(item.row));
    section.addEventListener('toggle', ()=>{
      const next = readSectionOpenMap();
      next[key] = section.open;
      writeSectionOpenMap(next);
    });
    wrap.appendChild(section);
  };

  createSection('主推接口（国内默认）', `${groups.top.length} 项`, groups.top, 'providerSectionTop', 'top', true);
  createSection('免 Key 兜底', `${groups.fallback.length} 项`, groups.fallback, 'providerSectionFallback', 'fallback', true);
  if(providerUiMode === 'expert'){
    createSection('可选增强接口', `${groups.standard.length} 项`, groups.standard, 'providerSectionStandard', 'standard', true);
  }
  createSection('实验网页源', `${groups.experimental.length} 项`, groups.experimental, 'providerSectionExperimental', 'experimental', false);

  updateProviderStats();
}

function scheduleRenderProviderOrderList(delay = 90){
  try{
    if(providerRenderTimer) clearTimeout(providerRenderTimer);
  }catch(_){
    // ignore
  }
  providerRenderTimer = setTimeout(()=>{
    providerRenderTimer = 0;
    renderProviderOrderList();
  }, Math.max(0, Number(delay) || 0));
}

function clearProviderDropIndicators(){
  document.querySelectorAll('.providerRow.drop-before,.providerRow.drop-after').forEach((row)=>{
    row.classList.remove('drop-before', 'drop-after');
  });
  providerDragState.overId = '';
}

function reorderProvider(sourceId, targetId, before){
  if(!sourceId || !targetId || sourceId === targetId) return false;
  const sourceIdx = providerOrderState.indexOf(sourceId);
  const targetIdx = providerOrderState.indexOf(targetId);
  if(sourceIdx < 0 || targetIdx < 0) return false;
  const next = providerOrderState.filter((id)=>id !== sourceId);
  const insertIdx = next.indexOf(targetId);
  if(insertIdx < 0) return false;
  next.splice(before ? insertIdx : insertIdx + 1, 0, sourceId);
  providerOrderState = normalizeProviderOrder(next);
  return true;
}

async function load(){
  try{
    const db = await new Promise(res=>chrome.storage.local.get(res));
    $('licenseCode').value = db.licenseCode || '';
    $('authApiBase').value = sanitizeApiBase(db.authApiBase || '') || DEFAULT_SERVICE_BASE;
    $('authPublicKeyJwk').value = db.authPublicKeyJwk || '';
    $('authAllowUnsignedCert').checked = !!db.authAllowUnsignedCert;

    // existing
    $('aliyunId').value = db.aliyunId || '';
    $('aliyunKey').value = db.aliyunKey || '';
    $('tencentId').value = db.tencentId || '';
    $('tencentKey').value = db.tencentKey || '';
    if($('hunyuanId')) $('hunyuanId').value = db.hunyuanId || '';
    if($('hunyuanKey')) $('hunyuanKey').value = db.hunyuanKey || '';
    if($('hunyuanRegion')) $('hunyuanRegion').value = db.hunyuanRegion || 'ap-guangzhou';
    if($('hunyuanModel')) $('hunyuanModel').value = db.hunyuanModel || 'hunyuan-lite';
    if($('googleGeminiKey')) $('googleGeminiKey').value = db.googleGeminiKey || '';
    if($('googleGeminiModel')) $('googleGeminiModel').value = db.googleGeminiModel || 'gemini-2.0-flash-lite';

    // BYOK
    $('azureKey').value = db.azureKey || '';
  $('azureRegion').value = db.azureRegion || '';
  $('caiyunToken').value = db.caiyunToken || '';
  $('youdaoAppKey').value = db.youdaoAppKey || '';
  $('youdaoAppSecret').value = db.youdaoAppSecret || '';
  if($('translateRelayBase')){
    $('translateRelayBase').value = sanitizeApiBase(db.translateRelayBase || '') || $('authApiBase').value || DEFAULT_SERVICE_BASE;
  }
  if($('translateRelayToken')) $('translateRelayToken').value = db.translateRelayToken || '';
    if($('translateTestText')) $('translateTestText').value = db.translateTestText || DEFAULT_TRANSLATE_TEST_TEXT;
    if($('translateResultCount')) $('translateResultCount').value = String(Math.max(1, Math.min(4, Number(db.translateResultCount || 2))));
    providerOrderState = normalizeProviderOrder(db.translateProviderOrder);
    providerUiMode = normalizeProviderUiMode(db.providerUiMode);
    paintProviderUiMode();
    if(Array.isArray(db.translateTestSelected)){
      providerSelectionState = normalizeProviderSelection(db.translateTestSelected);
    }else{
      const autoSelected = providerOrderState.filter((id)=>{
        const meta = getProviderMeta(id);
        if(meta.experimental) return false;
        if(id === 'relay' || id === 'fallback_google') return true;
        return getProviderConfigStatus(id).ok;
      });
      providerSelectionState = new Set(autoSelected);
    }
    renderProviderOrderList();
    applyTheme(db);
    await refreshAuthState({withServer:false});
  }catch(e){
    providerOrderState = DEFAULT_PROVIDER_ORDER.slice();
    providerSelectionState = new Set(DEFAULT_PROVIDER_ORDER);
    renderProviderOrderList();
    setStatus(`加载设置失败：${e?.message || e}`);
  }
}

async function save(opts){
  const silent = !!opts?.silent;
  const authApiBase = sanitizeApiBase($('authApiBase').value) || DEFAULT_SERVICE_BASE;
  const relayBaseInput = $('translateRelayBase') ? sanitizeApiBase($('translateRelayBase').value) : '';
  const relayBase = relayBaseInput || authApiBase;
  const patch = {
    licenseCode: $('licenseCode').value.trim(),
    authApiBase,
    authPublicKeyJwk: String($('authPublicKeyJwk').value || '').trim(),
    authAllowUnsignedCert: !!$('authAllowUnsignedCert').checked,

    aliyunId: $('aliyunId').value.trim(),
    aliyunKey: $('aliyunKey').value.trim(),
    tencentId: $('tencentId').value.trim(),
    tencentKey: $('tencentKey').value.trim(),
    hunyuanId: $('hunyuanId') ? $('hunyuanId').value.trim() : '',
    hunyuanKey: $('hunyuanKey') ? $('hunyuanKey').value.trim() : '',
    hunyuanRegion: $('hunyuanRegion') ? $('hunyuanRegion').value.trim() : 'ap-guangzhou',
    hunyuanModel: $('hunyuanModel') ? $('hunyuanModel').value.trim() : 'hunyuan-lite',
    googleGeminiKey: $('googleGeminiKey') ? $('googleGeminiKey').value.trim() : '',
    googleGeminiModel: $('googleGeminiModel') ? $('googleGeminiModel').value.trim() : 'gemini-2.0-flash-lite',

    azureKey: $('azureKey').value.trim(),
    azureRegion: $('azureRegion').value.trim(),
    caiyunToken: $('caiyunToken').value.trim(),
    youdaoAppKey: $('youdaoAppKey').value.trim(),
    youdaoAppSecret: $('youdaoAppSecret').value.trim(),
    translateRelayBase: relayBase,
    translateRelayToken: $('translateRelayToken') ? $('translateRelayToken').value.trim() : '',
    translateTestText: getTranslateTestText(),
    translateResultCount: getTranslateResultCount(),
    translateProviderOrder: providerOrderState.slice(),
    translateTestSelected: Array.from(providerSelectionState),
    providerUiMode: normalizeProviderUiMode(providerUiMode),

  };
  await new Promise(res=>chrome.storage.local.set(patch, res));
  if(!silent){
    setStatus('已保存 ✅');
    setTimeout(()=>setStatus(''), 1500);
  }
}

async function activateLicense(){
  const key = String($('licenseCode').value || '').trim();
  if(!key){
    setAuthState('激活失败：请先填写 License Key', 'err');
    return;
  }
  await save();
  setStatus('激活中...');
  try{
    const deviceHash = await buildDeviceHash();
    const appVersion = chrome.runtime.getManifest()?.version || '';
    const data = await callAuthApi('/v1/licenses/activate', {
      license_key: key,
      device_hash: deviceHash,
      product_id: PRODUCT_ID,
      app_version: appVersion,
    }, 'POST');

    const cert = data.certificate || data.cert;
    if(!cert) throw new Error('服务端未返回证书');
    const applied = await sendMessage({
      type:'OP_SET_AUTH_CERT',
      payload:{
        certificate: cert,
        licenseCode: key,
      }
    });
    if(!applied || !applied.ok){
      const map = {
        AUTH_PUBLIC_KEY_MISSING: '缺少授权公钥，请先填写公钥 JWK',
        AUTH_PUBLIC_KEY_INVALID_JSON: '公钥 JWK 不是合法 JSON',
        CERT_SIGNATURE_MISSING: '证书缺少签名字段',
        CERT_SIGNATURE_INVALID: '证书签名校验失败',
        CERT_VERIFY_FAILED: '证书验签失败',
      };
      throw new Error(map[applied?.error] || applied?.error || '本地写入授权失败');
    }
    await refreshAuthState({withServer:true});
    setStatus('激活成功 ✅');
  }catch(e){
    setAuthState(`激活失败：${e?.message || e}`, 'err');
    setStatus('激活失败');
  }finally{
    setTimeout(()=>setStatus(''), 2000);
  }
}

async function deactivateLicense(){
  const key = String($('licenseCode').value || '').trim();
  const base = normalizeApiBase($('authApiBase').value);
  setStatus('解绑中...');
  try{
    if(key && base){
      const deviceHash = await buildDeviceHash();
      await callAuthApi('/v1/licenses/deactivate', {
        license_key: key,
        device_hash: deviceHash,
        product_id: PRODUCT_ID,
      }, 'POST');
    }
    await sendMessage({type:'OP_CLEAR_AUTH'});
    await refreshAuthState({withServer:false});
    setStatus('解绑完成 ✅');
  }catch(e){
    setAuthState(`解绑失败：${e?.message || e}`, 'err');
    setStatus('解绑失败');
  }finally{
    setTimeout(()=>setStatus(''), 2000);
  }
}

async function clearLocalAuth(){
  await sendMessage({type:'OP_CLEAR_AUTH'});
  await refreshAuthState({withServer:false});
  setStatus('已清除本地授权');
  setTimeout(()=>setStatus(''), 1500);
}

function openPage(path){
  chrome.tabs.create({url: chrome.runtime.getURL(path)});
}

async function resetOptionsView(){
  await load();
  setStatus('已重置为已保存配置');
  setTimeout(()=>setStatus(''), 1500);
}

async function resetPopupConfigNow(){
  try{
    await new Promise(res=>chrome.storage.local.set({
      global_disable: false,
      blacklist_domain: [],
      blacklist_page: []
    }, res));
    setStatus('已修复：弹窗总开关与黑名单已重置');
  }catch(e){
    setStatus(`修复失败：${e?.message || e}`);
  }finally{
    setTimeout(()=>setStatus(''), 2200);
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadCompactView();
  applyCompactView();
  load();
  try{
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onThemeChange = ()=>chrome.storage.local.get(['themeMode','theme_auto_mode','theme_dark_mode','popup_force_dark'], applyTheme);
    if(mq.addEventListener) mq.addEventListener('change', onThemeChange);
    else if(mq.addListener) mq.addListener(onThemeChange);
  }catch(_){/* ignore */}

  $('save').addEventListener('click', save);
  if($('resetOptions')) $('resetOptions').addEventListener('click', resetOptionsView);
  if($('resetPopupConfig')) $('resetPopupConfig').addEventListener('click', resetPopupConfigNow);
  const openManager = ()=>openPage('manager.html');
  const openQuotes = ()=>openPage('manager.html?tab=sentences');
  const openReview = ()=>openPage('test.html');
  if($('openManagerTop')) $('openManagerTop').addEventListener('click', openManager);
  if($('openQuotesTop')) $('openQuotesTop').addEventListener('click', openQuotes);
  if($('openReviewTop')) $('openReviewTop').addEventListener('click', openReview);
  if($('toggleCompactView')){
    $('toggleCompactView').addEventListener('click', ()=>{
      compactView = !compactView;
      applyCompactView();
      persistCompactView();
    });
  }
  $('activateLicense').addEventListener('click', activateLicense);
  $('deactivateLicense').addEventListener('click', deactivateLicense);
  $('refreshAuth').addEventListener('click', ()=>refreshAuthState({withServer:true}));
  $('validatePublicKey').addEventListener('click', validatePublicKeyConfig);
  $('clearAuthLocal').addEventListener('click', clearLocalAuth);

  document.querySelectorAll('[data-eye-target]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-eye-target');
      const input = id ? $(id) : null;
      if(!input) return;
      const nextType = input.type === 'password' ? 'text' : 'password';
      input.type = nextType;
      btn.textContent = nextType === 'password' ? '显' : '隐';
    });
  });

  ['licenseCode','azureKey','tencentId','tencentKey','aliyunId','aliyunKey','hunyuanId','hunyuanKey','googleGeminiKey','caiyunToken','youdaoAppKey','youdaoAppSecret','translateRelayToken'].forEach(id=>{
    const input = $(id);
    if(input) input.type = 'password';
  });

  try{
    chrome.storage.onChanged.addListener((changes, area)=>{
      if(area !== 'local') return;
      if(!changes.themeMode && !changes.theme_auto_mode && !changes.theme_dark_mode && !changes.popup_force_dark) return;
      chrome.storage.local.get(['themeMode','theme_auto_mode','theme_dark_mode','popup_force_dark'], applyTheme);
    });
    chrome.runtime.onMessage.addListener((msg)=>{
      if(msg && msg.type === 'THEME_UPDATED'){
        chrome.storage.local.get(['themeMode','theme_auto_mode','theme_dark_mode','popup_force_dark'], applyTheme);
      }
    });
  }catch(_){/* ignore */}

  const providerWrap = $('providerOrderList');
  if(providerWrap){
    providerWrap.addEventListener('click', (event)=>{
      const target = event.target;
      const row = target?.closest?.('.providerRow');
      if(!row) return;
      const id = row.dataset.providerId;
      if(!id) return;
      if(target.matches('[data-role="test"]')){
        (async ()=>{
          const text = getTranslateTestText();
          await save({ silent: true });
          updateProviderResult(id, 'Testing...', 'testing', 'Testing...', { category: 'network', code: 'testing' });
          const result = await runSingleProviderTest(id, text);
          if(result.ok){
            const preview = formatSuccessPreview(result.text);
            updateProviderResult(id, preview, 'ok', result.text, { category: 'source', code: 'ok' });
            setStatus(`测试成功：${id}`);
          }else{
            const normalized = normalizeTestError(id, result.error, result.detail);
            updateProviderResult(id, `FAIL: ${normalized.text}`, 'err', normalized.full, { category: normalized.category, code: normalized.code });
            setStatus(`测试失败：${id} => ${normalized.text}`);
          }
        })();
        return;
      }
      if(target.matches('[data-role="detail"]')){
        const detailNode = row.querySelector('.providerDetail');
        if(!detailNode) return;
        if(providerDetailOpenState.has(id)){
          providerDetailOpenState.delete(id);
          detailNode.classList.remove('show');
          target.textContent = '详情';
        }else{
          providerDetailOpenState.add(id);
          detailNode.classList.add('show');
          target.textContent = '收起';
        }
        return;
      }
      if(target.matches('[data-role="up"]')){
        const idx = providerOrderState.indexOf(id);
        if(idx > 0){
          [providerOrderState[idx - 1], providerOrderState[idx]] = [providerOrderState[idx], providerOrderState[idx - 1]];
          providerOrderState = normalizeProviderOrder(providerOrderState);
          renderProviderOrderList();
          persistProviderPrefsSilent();
        }
        return;
      }
      if(target.matches('[data-role="down"]')){
        const idx = providerOrderState.indexOf(id);
        if(idx >= 0 && idx < providerOrderState.length - 1){
          [providerOrderState[idx + 1], providerOrderState[idx]] = [providerOrderState[idx], providerOrderState[idx + 1]];
          providerOrderState = normalizeProviderOrder(providerOrderState);
          renderProviderOrderList();
          persistProviderPrefsSilent();
        }
      }
    });
    providerWrap.addEventListener('change', (event)=>{
      const target = event.target;
      if(!target.matches('[data-role="select"]')) return;
      const row = target.closest('.providerRow');
      const id = row?.dataset?.providerId;
      if(!id) return;
      if(target.checked) providerSelectionState.add(id);
      else providerSelectionState.delete(id);
      persistProviderPrefsSilent();
      updateProviderStats();
    });
    providerWrap.addEventListener('dragstart', (event)=>{
      const target = event.target;
      const handle = target?.closest?.('[data-role="drag"]');
      const row = target?.closest?.('.providerRow');
      if(!row || !handle){
        event.preventDefault();
        return;
      }
      const id = row.dataset.providerId;
      if(!id) return;
      providerDragState.draggingId = id;
      providerDragState.overId = '';
      row.classList.add('dragging');
      if(event.dataTransfer){
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
      }
    });
    providerWrap.addEventListener('dragover', (event)=>{
      if(!providerDragState.draggingId) return;
      const row = event.target?.closest?.('.providerRow');
      if(!row) return;
      const overId = row.dataset.providerId;
      if(!overId || overId === providerDragState.draggingId) return;
      event.preventDefault();
      const rect = row.getBoundingClientRect();
      const before = (event.clientY - rect.top) < (rect.height / 2);
      if(providerDragState.overId !== overId || providerDragState.before !== before){
        clearProviderDropIndicators();
        row.classList.add(before ? 'drop-before' : 'drop-after');
        providerDragState.overId = overId;
        providerDragState.before = before;
      }
      if(event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    });
    providerWrap.addEventListener('drop', (event)=>{
      if(!providerDragState.draggingId) return;
      event.preventDefault();
      const row = event.target?.closest?.('.providerRow');
      const fallbackOverId = row?.dataset?.providerId || '';
      const overId = providerDragState.overId || fallbackOverId;
      const before = providerDragState.before;
      const changed = reorderProvider(providerDragState.draggingId, overId, before);
      if(changed){
        renderProviderOrderList();
        persistProviderPrefsSilent();
      }
      clearProviderDropIndicators();
      providerDragState.draggingId = '';
      document.querySelectorAll('.providerRow.dragging').forEach((x)=>x.classList.remove('dragging'));
    });
    providerWrap.addEventListener('dragend', ()=>{
      clearProviderDropIndicators();
      providerDragState.draggingId = '';
      document.querySelectorAll('.providerRow.dragging').forEach((x)=>x.classList.remove('dragging'));
    });
  }

  async function runBatchProviders(ids){
    if(!ids.length){
      setStatus('请先选择至少一个接口');
      return;
    }
    await save({ silent: true });
    const text = getTranslateTestText();
    let okCount = 0;
    for(const id of ids){
      updateProviderResult(id, 'Testing...', 'testing', 'Testing...', { category: 'network', code: 'testing' });
      const result = await runSingleProviderTest(id, text);
      if(result.ok){
        okCount += 1;
        updateProviderResult(id, formatSuccessPreview(result.text), 'ok', result.text, { category: 'source', code: 'ok' });
      }else{
        const normalized = normalizeTestError(id, result.error, result.detail);
        updateProviderResult(id, `FAIL: ${normalized.text}`, 'err', normalized.full, { category: normalized.category, code: normalized.code });
      }
    }
    setStatus(`批量测试完成：${okCount}/${ids.length} 成功`);
  }

  const testSelectedBtn = $('testSelectedProviders');
  if(testSelectedBtn){
    testSelectedBtn.addEventListener('click', async ()=>{
      const ids = providerOrderState.filter((id)=>providerSelectionState.has(id));
      await runBatchProviders(ids);
    });
  }

  const testAllBtn = $('testAllProviders');
  if(testAllBtn){
    testAllBtn.addEventListener('click', async ()=>{
      await runBatchProviders(providerOrderState.slice());
    });
  }

  const selectAllBtn = $('selectAllProviders');
  if(selectAllBtn){
    selectAllBtn.addEventListener('click', ()=>{
      providerSelectionState = new Set(providerOrderState);
      renderProviderOrderList();
      persistProviderPrefsSilent();
    });
  }

  const unselectAllBtn = $('unselectAllProviders');
  if(unselectAllBtn){
    unselectAllBtn.addEventListener('click', ()=>{
      providerSelectionState = new Set();
      renderProviderOrderList();
      persistProviderPrefsSilent();
    });
  }

  const filterConfiguredOnlyEl = $('filterConfiguredOnly');
  if(filterConfiguredOnlyEl){
    filterConfiguredOnlyEl.checked = providerFilterConfiguredOnly;
    filterConfiguredOnlyEl.addEventListener('change', ()=>{
      providerFilterConfiguredOnly = !!filterConfiguredOnlyEl.checked;
      scheduleRenderProviderOrderList();
    });
  }

  const filterRecommendedOnlyEl = $('filterRecommendedOnly');
  if(filterRecommendedOnlyEl){
    filterRecommendedOnlyEl.checked = providerFilterRecommendedOnly;
    filterRecommendedOnlyEl.addEventListener('change', ()=>{
      providerFilterRecommendedOnly = !!filterRecommendedOnlyEl.checked;
      scheduleRenderProviderOrderList();
    });
  }

  const filterFailedOnlyEl = $('filterFailedOnly');
  if(filterFailedOnlyEl){
    filterFailedOnlyEl.checked = providerFilterFailedOnly;
    filterFailedOnlyEl.addEventListener('change', ()=>{
      providerFilterFailedOnly = !!filterFailedOnlyEl.checked;
      scheduleRenderProviderOrderList();
    });
  }
  const filterFailFirstEl = $('filterFailFirst');
  if(filterFailFirstEl){
    filterFailFirstEl.checked = providerFilterFailFirst;
    filterFailFirstEl.addEventListener('change', ()=>{
      providerFilterFailFirst = !!filterFailFirstEl.checked;
      scheduleRenderProviderOrderList();
    });
  }

  const filterErrorCategoryEl = $('filterErrorCategory');
  if(filterErrorCategoryEl){
    filterErrorCategoryEl.value = providerFilterErrorCategory;
    filterErrorCategoryEl.addEventListener('change', ()=>{
      providerFilterErrorCategory = String(filterErrorCategoryEl.value || 'all');
      scheduleRenderProviderOrderList();
    });
  }

  const configWatchIds = [
    'authApiBase', 'translateRelayBase', 'azureKey', 'azureRegion',
    'tencentId', 'tencentKey', 'aliyunId', 'aliyunKey',
    'hunyuanId', 'hunyuanKey', 'hunyuanRegion', 'hunyuanModel',
    'googleGeminiKey', 'googleGeminiModel',
    'caiyunToken', 'youdaoAppKey', 'youdaoAppSecret', 'translateResultCount'
  ];
  configWatchIds.forEach((id)=>{
    const el = $(id);
    if(!el) return;
    const evt = (el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(evt, ()=>scheduleRenderProviderOrderList(120));
  });

  const fillRelayBtn = $('fillRelayDefault');
  if(fillRelayBtn){
    fillRelayBtn.addEventListener('click', ()=>{
      const relayInput = $('translateRelayBase');
      if(relayInput) relayInput.value = DEFAULT_SERVICE_BASE;
      scheduleRenderProviderOrderList();
      setStatus(`已填入默认中转：${DEFAULT_SERVICE_BASE}`);
    });
  }

  const simpleBtn = $('providerUiSimple');
  const expertBtn = $('providerUiExpert');
  if(simpleBtn){
    simpleBtn.addEventListener('click', async ()=>{
      providerUiMode = 'simple';
      paintProviderUiMode();
      scheduleRenderProviderOrderList();
      await persistProviderUiMode();
    });
  }
  if(expertBtn){
    expertBtn.addEventListener('click', async ()=>{
      providerUiMode = 'expert';
      paintProviderUiMode();
      scheduleRenderProviderOrderList();
      await persistProviderUiMode();
    });
  }

});
