// === DB schema versioning ===
const DB_VERSION = 2;

async function ensureDbVersion(){
  const { dbVersion } = await chrome.storage.local.get(['dbVersion']);
  if(typeof dbVersion !== 'number'){
    await chrome.storage.local.set({ dbVersion: DB_VERSION });
    return;
  }
  if(dbVersion === DB_VERSION) return;

  // Future: migrate data safely here
  // await migrateDb(dbVersion, DB_VERSION);

  await chrome.storage.local.set({ dbVersion: DB_VERSION });
}
ensureDbVersion();
// === end DB schema versioning ===

'use strict';
importScripts('data-layer.js', 'license-manager.js', 'sync-log.js');

/**
 * Minimal background service worker.
 * Goal: keep extension stable, and provide a single place to upsert vocab/sentences.
 * (Translation providers can be added back later.)
 */

const LIMIT_FREE = 200;
const LIMIT_FREE_NOTES = 10;
const AUTH_SCHEMA_VERSION = 1;
const AUTH_PRODUCT_ID = 'hord.vocabmaster.chrome';
const GEMINI_COOLDOWN_MS = 15 * 60 * 1000;
let geminiCooldownUntil = 0;

const FREE_ENTITLEMENTS = Object.freeze({
  word_limit: LIMIT_FREE,
  note_limit: LIMIT_FREE_NOTES,
  import_export: false,
  bulk_edit: false,
  review_mode: 'basic',
  quote_export_enabled: true,
  quote_templates: ['light'],
  quote_advanced_settings: false,
});

const PRO_ENTITLEMENTS = Object.freeze({
  word_limit: -1,
  note_limit: -1,
  import_export: true,
  bulk_edit: true,
  review_mode: 'advanced',
  quote_export_enabled: true,
  quote_templates: ['light', 'dark', 'hordSignature', 'editorial', 'gradientSoft', 'boldImpact'],
  quote_advanced_settings: true,
});

function uniqLower(arr){
  const s = new Set();
  (arr||[]).forEach(w=>{
    if(!w) return;
    const k = String(w).trim().toLowerCase();
    if(k) s.add(k);
  });
  return Array.from(s);
}
function isPlainObject(v){
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function mergePreferNonEmpty(a, b){
  if(a == null) return b;
  if(b == null) return a;
  if(isPlainObject(a) && isPlainObject(b)){
    const out = { ...a };
    for(const [k, v] of Object.entries(b)){
      const av = out[k];
      if(isPlainObject(av) && isPlainObject(v)){
        out[k] = mergePreferNonEmpty(av, v);
      }else if(typeof av === 'string' && typeof v === 'string'){
        out[k] = av.trim() ? av : v;
      }else if(av == null || av === '' ){
        out[k] = v;
      }
    }
    return out;
  }
  if(typeof a === 'string' && typeof b === 'string'){
    return a.trim().length >= b.trim().length ? a : b;
  }
  if(isPlainObject(a) && typeof b === 'string'){
    const out = { ...a };
    if(!out.meaning) out.meaning = b;
    return out;
  }
  if(isPlainObject(b) && typeof a === 'string'){
    const out = { ...b };
    if(!out.meaning) out.meaning = a;
    return out;
  }
  return a ?? b;
}
function normalizeKeyedMap(map, mergeFn){
  const out = {};
  const src = map && typeof map === 'object' ? map : {};
  for(const [k, v] of Object.entries(src)){
    const key = String(k).trim().toLowerCase();
    if(!key) continue;
    if(out[key] === undefined) out[key] = v;
    else out[key] = mergeFn(out[key], v);
  }
  return out;
}
function normalizeVocabKeys(db){
  if(!db || typeof db !== 'object') return;
  const listFromMaps = [
    ...Object.keys(db.vocabDict || {}),
    ...Object.keys(db.vocabNotes || {}),
    ...Object.keys(db.vocabMeta || {}),
    ...Object.keys(db.vocabEn || {}),
    ...Object.keys(db.vocabPhonetics || {}),
    ...Object.keys(db.vocabAudio || {})
  ];
  db.vocabList = uniqLower([...(db.vocabList || []), ...listFromMaps]);
  db.yellowList = uniqLower(db.yellowList || []);
  db.greenList = uniqLower(db.greenList || []);
  db.difficultList = uniqLower(db.difficultList || []);
  db.vocabDict = normalizeKeyedMap(db.vocabDict, mergePreferNonEmpty);
  db.vocabNotes = normalizeKeyedMap(db.vocabNotes, mergePreferNonEmpty);
  db.vocabMeta = normalizeKeyedMap(db.vocabMeta, mergePreferNonEmpty);
  db.vocabEn = normalizeKeyedMap(db.vocabEn, (a, b)=>{
    const arrA = Array.isArray(a) ? a.filter(Boolean) : (a ? [String(a)] : []);
    const arrB = Array.isArray(b) ? b.filter(Boolean) : (b ? [String(b)] : []);
    if(arrA.length >= arrB.length) return arrA.slice(0, 6);
    return arrB.slice(0, 6);
  });
  db.vocabPhonetics = normalizeKeyedMap(db.vocabPhonetics, mergePreferNonEmpty);
  db.vocabAudio = normalizeKeyedMap(db.vocabAudio, mergePreferNonEmpty);
}

function cloneEntitlements(src){
  const out = { ...FREE_ENTITLEMENTS };
  if(!src || typeof src !== 'object') return out;
  for(const k of Object.keys(out)){
    if(src[k] !== undefined) out[k] = src[k];
  }
  return out;
}

function normalizeLimit(value, fallback){
  const n = Number(value);
  if(!Number.isFinite(n)) return fallback;
  if(n < 0) return -1;
  return Math.max(0, Math.floor(n));
}

function normalizeEntitlements(src){
  const base = cloneEntitlements(src);
  base.word_limit = normalizeLimit(base.word_limit, LIMIT_FREE);
  base.note_limit = normalizeLimit(base.note_limit, LIMIT_FREE_NOTES);
  base.import_export = !!base.import_export;
  base.bulk_edit = !!base.bulk_edit;
  base.review_mode = String(base.review_mode || 'basic') === 'advanced' ? 'advanced' : 'basic';
  base.quote_export_enabled = base.quote_export_enabled !== false;
  base.quote_advanced_settings = !!base.quote_advanced_settings;
  const templates = Array.isArray(base.quote_templates) ? base.quote_templates : [];
  base.quote_templates = Array.from(new Set(templates.map(x=>String(x||'').trim()).filter(Boolean)));
  if(!base.quote_templates.length){
    base.quote_templates = base.quote_advanced_settings ? PRO_ENTITLEMENTS.quote_templates.slice() : FREE_ENTITLEMENTS.quote_templates.slice();
  }
  return base;
}

function getDefaultAuthState(){
  return {
    schemaVersion: AUTH_SCHEMA_VERSION,
    source: 'free',
    status: 'inactive',
    plan: 'free',
    productId: AUTH_PRODUCT_ID,
    expiresAt: 0,
    cert: null,
    entitlements: normalizeEntitlements(FREE_ENTITLEMENTS),
    lastValidatedAt: 0,
  };
}

function normalizeAuthState(auth){
  const base = getDefaultAuthState();
  if(!auth || typeof auth !== 'object') return base;
  const out = { ...base, ...auth };
  out.schemaVersion = AUTH_SCHEMA_VERSION;
  out.productId = String(out.productId || AUTH_PRODUCT_ID);
  out.source = String(out.source || 'free');
  out.status = String(out.status || 'inactive');
  out.plan = String(out.plan || (out.status === 'active' ? 'pro_annual' : 'free'));
  out.expiresAt = Number(out.expiresAt) || 0;
  out.lastValidatedAt = Number(out.lastValidatedAt) || 0;
  out.entitlements = normalizeEntitlements(out.entitlements);
  if(!out.cert || typeof out.cert !== 'object') out.cert = null;
  return out;
}

function getFeatureStatus(db){
  const auth = normalizeAuthState(db?.auth);
  const now = Date.now();
  if(auth.status === 'active' && auth.expiresAt > now){
    return {
      auth,
      entitlements: normalizeEntitlements(auth.entitlements),
      isPro: auth.plan !== 'free',
      source: auth.source || 'certificate',
    };
  }
  const legacyCode = String(db?.licenseCode || db?.licenseKey || '').trim();
  if(legacyCode){
    return {
      auth: {
        ...auth,
        source: 'legacy_license_code',
        status: 'active',
        plan: 'pro_annual',
        expiresAt: 0,
      },
      entitlements: normalizeEntitlements(PRO_ENTITLEMENTS),
      isPro: true,
      source: 'legacy_license_code',
    };
  }
  return {
    auth: {
      ...auth,
      source: 'free',
      status: 'inactive',
      plan: 'free',
      expiresAt: 0,
      entitlements: normalizeEntitlements(FREE_ENTITLEMENTS),
    },
    entitlements: normalizeEntitlements(FREE_ENTITLEMENTS),
    isPro: false,
    source: 'free',
  };
}

function getLicenseStatus(db){
  try{
    if(globalThis.HordLicenseManager?.getLicenseStatus){
      return HordLicenseManager.getLicenseStatus(db);
    }
  }catch(_){}
  return 'FREE';
}

function isProUser(db){
  try{
    if(globalThis.HordLicenseManager?.isProUser){
      return !!HordLicenseManager.isProUser(db);
    }
  }catch(_){}
  return false;
}

function getCapabilities(db, entitlements){
  try{
    if(globalThis.HordLicenseManager?.buildCapabilities){
      return HordLicenseManager.buildCapabilities(db, entitlements);
    }
  }catch(_){}
  return {assetMode:false, laserMode:false, advancedTemplates:false};
}

function isUnlimited(limit){
  return Number(limit) < 0;
}

function getWordLimit(entitlements){
  return normalizeLimit(entitlements?.word_limit, LIMIT_FREE);
}

function getNoteLimit(entitlements){
  return normalizeLimit(entitlements?.note_limit, LIMIT_FREE_NOTES);
}

function countWordNotes(db){
  const notes = db?.vocabNotes && typeof db.vocabNotes === 'object' ? db.vocabNotes : {};
  const meta = db?.vocabMeta && typeof db.vocabMeta === 'object' ? db.vocabMeta : {};
  let count = 0;
  for(const [k, v] of Object.entries(notes)){
    const word = String(k||'').trim().toLowerCase();
    if(!word) continue;
    if(meta?.[word]?.isDeleted === true) continue;
    if(String(v || '').trim()) count += 1;
  }
  return count;
}

function countSentenceNotes(db){
  const list = Array.isArray(db?.collectedSentences) ? db.collectedSentences : [];
  const meta = db?.sentenceMeta && typeof db.sentenceMeta === 'object' ? db.sentenceMeta : {};
  let count = 0;
  for(const item of list){
    if(item?.isDeleted === true) continue;
    const sid = Number(item?.createdAt||item?.id||0);
    if(sid && meta?.[String(sid)]?.isDeleted === true) continue;
    if(String(item?.note || '').trim()) count += 1;
  }
  return count;
}

function countAllNotes(db){
  return countWordNotes(db) + countSentenceNotes(db);
}

function countActiveWords(db){
  if(globalThis.HordDataLayer?.buildFlatView){
    try{ return HordDataLayer.buildFlatView(db).vocabList.length; }catch(_){}
  }
  const list = Array.isArray(db?.vocabList) ? db.vocabList : [];
  const meta = db?.vocabMeta && typeof db.vocabMeta === 'object' ? db.vocabMeta : {};
  let c = 0;
  for(const w0 of list){
    const w = String(w0||'').trim().toLowerCase();
    if(!w) continue;
    if(meta?.[w]?.isDeleted === true) continue;
    c++;
  }
  return c;
}

function canAddWords(db, entitlements, incomingCount){
  const limit = getWordLimit(entitlements);
  if(isUnlimited(limit)) return {ok:true};
  const current = countActiveWords(db);
  const remaining = Math.max(0, limit - current);
  return {ok: incomingCount <= remaining, limit, remaining, current};
}

function canAddNotes(db, entitlements, incomingCount){
  const limit = getNoteLimit(entitlements);
  if(isUnlimited(limit)) return {ok:true};
  const current = countAllNotes(db);
  const remaining = Math.max(0, limit - current);
  return {ok: incomingCount <= remaining, limit, remaining, current};
}

function buildAuthFromCertificate(rawCert){
  const cert = rawCert && typeof rawCert === 'object' ? rawCert : null;
  if(!cert) return null;
  const productId = String(cert.product_id || cert.productId || '').trim();
  if(productId && productId !== AUTH_PRODUCT_ID) return null;
  const expiresAt = Number(cert.expires_at || cert.expiresAt || 0);
  if(!Number.isFinite(expiresAt) || expiresAt <= 0) return null;
  const now = Date.now();
  return normalizeAuthState({
    source: 'certificate',
    status: expiresAt > now ? 'active' : 'expired',
    plan: String(cert.plan || 'pro_annual'),
    productId: AUTH_PRODUCT_ID,
    expiresAt,
    cert,
    entitlements: normalizeEntitlements(cert.entitlements || PRO_ENTITLEMENTS),
    lastValidatedAt: now,
  });
}

function toSortedObject(value){
  if(Array.isArray(value)) return value.map(toSortedObject);
  if(value && typeof value === 'object'){
    const out = {};
    for(const key of Object.keys(value).sort()){
      out[key] = toSortedObject(value[key]);
    }
    return out;
  }
  return value;
}

function stableStringify(value){
  return JSON.stringify(toSortedObject(value));
}

function base64ToBytes(input){
  const raw = String(input || '').trim();
  if(!raw) return new Uint8Array();
  const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const bin = atob(normalized + pad);
  const out = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out;
}

function certPayloadForVerify(cert){
  const out = {};
  for(const [k, v] of Object.entries(cert || {})){
    if(k === 'sig' || k === 'signature') continue;
    out[k] = v;
  }
  return out;
}

async function verifyCertificateSignature(cert){
  const cfg = await new Promise(res=>chrome.storage.local.get(['authPublicKeyJwk', 'authAllowUnsignedCert'], res));
  if(cfg.authAllowUnsignedCert) return {ok:true, bypassed:true};
  const sigRaw = cert?.sig || cert?.signature || '';
  if(!sigRaw) return {ok:false, error:'CERT_SIGNATURE_MISSING'};
  const jwkRaw = String(cfg.authPublicKeyJwk || '').trim();
  if(!jwkRaw){
    return {ok:false, error:'AUTH_PUBLIC_KEY_MISSING'};
  }
  let jwk;
  try{
    jwk = JSON.parse(jwkRaw);
  }catch(_){
    return {ok:false, error:'AUTH_PUBLIC_KEY_INVALID_JSON'};
  }
  try{
    const key = await crypto.subtle.importKey('jwk', jwk, {name:'Ed25519'}, false, ['verify']);
    const payload = certPayloadForVerify(cert);
    const body = new TextEncoder().encode(stableStringify(payload));
    const sig = base64ToBytes(sigRaw);
    const ok = await crypto.subtle.verify({name:'Ed25519'}, key, sig, body);
    return ok ? {ok:true} : {ok:false, error:'CERT_SIGNATURE_INVALID'};
  }catch(_e){
    return {ok:false, error:'CERT_VERIFY_FAILED'};
  }
}

function nowTs(){ return Date.now(); }



// ---- crypto helpers (WebCrypto) ----
function toUint8(str){ return new TextEncoder().encode(str); }
async function sha256Hex(str){
  const buf = await crypto.subtle.digest('SHA-256', toUint8(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function hmacSha256(keyBytes, msg){
  const key = await crypto.subtle.importKey('raw', keyBytes, {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, toUint8(msg));
  return new Uint8Array(sig);
}
function hex(bytes){ return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join(''); }
function formEncode(params){
  return Object.keys(params).map((k)=>`${encodeURIComponent(k)}=${encodeURIComponent(params[k] ?? '')}`).join('&');
}
function youdaoInput(text){
  const q = String(text || '');
  const len = q.length;
  if(len <= 20) return q;
  return q.slice(0, 10) + len + q.slice(len - 10);
}
function fetchWithTimeout(url, options = {}, timeoutMs = 9000){
  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(()=>clearTimeout(id));
}

async function safeFetchText(url, timeoutMs = 9000){
  try{
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      // Use a browser-like UA to reduce 403s for some dictionary sites.
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow'
    }, timeoutMs);
    if(!res.ok) return { ok:false, status: res.status };
    const text = await res.text();
    return { ok:true, text };
  }catch(e){
    return { ok:false, error: String(e && e.message ? e.message : e) };
  }
}

async function safeTranslateZh(text, timeoutMs = 9000){
  return await safeTranslate(text, 'zh', timeoutMs);
}

function normalizeTargetLang(raw){
  const v = String(raw || '').trim().toLowerCase();
  if(v === 'en' || v === 'eng' || v === 'english') return 'en';
  return 'zh';
}

async function safeTranslate(text, targetLang, timeoutMs = 9000){
  const tl = normalizeTargetLang(targetLang) === 'en' ? 'en' : 'zh-CN';
  // Unofficial but widely used endpoint; if blocked, we gracefully degrade.
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + tl + '&dt=t&q=' + encodeURIComponent(text);
  try{
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      credentials: 'omit',
      cache: 'no-store',
    }, timeoutMs);
    if(!res.ok) return { ok:false, status: res.status };
    const data = await res.json();
    const pieces = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
    const out = pieces.map(p=>Array.isArray(p)?p[0]:'').filter(Boolean).join('');
    return out ? { ok:true, text: out } : { ok:false, error:'empty_translation' };
  }catch(e){
    return { ok:false, error: String(e && e.message ? e.message : e) };
  }
}

const DEFAULT_TRANSLATE_PROVIDER_ORDER = [
  'relay',
  'tencent',
  'aliyun',
  'hunyuan',
  'google_gemini',
  'azure',
  'caiyun',
  'youdao',
  'youdao_web',
  'baidu_web',
  'fallback_google'
];

function normalizeTranslateProviderOrder(order){
  const arr = Array.isArray(order) ? order.map((x)=>String(x || '').trim()).filter(Boolean) : [];
  const seen = new Set();
  const out = [];
  for(const id of arr){
    if(!DEFAULT_TRANSLATE_PROVIDER_ORDER.includes(id)) continue;
    if(seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  if(!seen.has('relay')){
    seen.add('relay');
    out.unshift('relay');
  }
  for(const id of DEFAULT_TRANSLATE_PROVIDER_ORDER){
    if(!seen.has(id)) out.push(id);
  }
  return out;
}

function normalizeTranslateResultCount(v){
  const n = Number(v);
  if(!Number.isFinite(n)) return 2;
  return Math.max(1, Math.min(4, Math.floor(n)));
}

function normalizeTranslateProviderEnabled(selected, ordered){
  const baseOrder = Array.isArray(ordered) ? ordered : DEFAULT_TRANSLATE_PROVIDER_ORDER;
  const arr = Array.isArray(selected) ? selected.map((x)=>String(x || '').trim()).filter(Boolean) : [];
  if(!arr.length){
    const out = baseOrder.slice();
    if(!out.includes('fallback_google')) out.push('fallback_google');
    return out;
  }
  const allow = new Set(arr.filter((id)=>DEFAULT_TRANSLATE_PROVIDER_ORDER.includes(id)));
  const out = baseOrder.filter((id)=>allow.has(id));
  const normalized = out.length ? out : baseOrder.slice();
  if(!normalized.includes('fallback_google')){
    normalized.push('fallback_google');
  }
  return normalized;
}

async function getSettings(){
  // Keys are stored at root for simplicity.
  const keys = [
    'azureKey','azureRegion',
    'tencentId','tencentKey','aliyunId','aliyunKey',
    'hunyuanId','hunyuanKey','hunyuanRegion','hunyuanModel',
    'googleGeminiKey','googleGeminiModel',
    'caiyunToken','youdaoAppKey','youdaoAppSecret',
    'translateProviderOrder','translateTestSelected','translateResultCount','translateRelayBase','translateRelayToken','authApiBase'
  ];
  return await new Promise(r=>chrome.storage.local.get(keys, r));
}

function normalizeRelayBase(raw){
  return String(raw || '').trim().replace(/\/+$/, '');
}

async function translateRelay(text, settings, targetLang = 'zh'){
  const relayBase = normalizeRelayBase(settings.translateRelayBase || settings.authApiBase);
  if(!relayBase) return {ok:false, error:'relay_missing_base'};
  const target = normalizeTargetLang(targetLang);
  try{
    const headers = {'Content-Type':'application/json'};
    const relayToken = String(settings.translateRelayToken || '').trim();
    if(relayToken) headers['X-Relay-Token'] = relayToken;
    const res = await fetchWithTimeout(`${relayBase}/v1/translate`, {
      method:'POST',
      headers,
      body: JSON.stringify({
        text: String(text || ''),
        source: 'auto',
        target,
        max_candidates: 2
      }),
      cache:'no-store',
      credentials:'omit'
    }, 10000);
    const raw = await res.text().catch(()=> '');
    let data = null;
    try{ data = JSON.parse(raw); }catch(_e){ /* ignore */ }
    if(!res.ok || !data || data.ok === false){
      const err = data?.error || `relay_http_${res.status}`;
      const detail = data?.message || raw.slice(0, 180);
      return {ok:false, error:String(err), detail:String(detail || '')};
    }
    const out = String(data.translation || data.text || '').trim();
    const translations = Array.isArray(data.translations) ? data.translations : [];
    if(!out && !translations.length){
      return {ok:false, error:'relay_empty'};
    }
    return {
      ok:true,
      text: out || String(translations[0]?.text || '').trim(),
      provider: String(data.provider || 'relay'),
      results: translations
        .map((x)=>({text:String(x?.text || '').trim(), provider:String(x?.provider || 'relay')}))
        .filter((x)=>x.text)
    };
  }catch(e){
    return {ok:false, error:'relay_exception', detail:String(e?.message || e)};
  }
}

async function translateAzure(text, settings, targetLang = 'zh'){
  const key = (settings.azureKey||'').trim();
  const region = (settings.azureRegion||'').trim();
  if(!key || !region) return {ok:false, error:'azure_missing_key_or_region'};
  const tl = normalizeTargetLang(targetLang) === 'en' ? 'en' : 'zh-Hans';
  const url = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=' + encodeURIComponent(tl);
  try{
    const res = await fetchWithTimeout(url, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': region,
      },
      body: JSON.stringify([{Text: String(text||'')}]),
      cache:'no-store',
      credentials:'omit',
    }, 9000);
    if(!res.ok){
      const t = await res.text().catch(()=> '');
      return {ok:false, error:'azure_http_'+res.status, detail:t.slice(0,120)};
    }
    const data = await res.json();
    const out = data?.[0]?.translations?.[0]?.text || '';
    return out ? {ok:true, text: out, provider:'azure'} : {ok:false, error:'azure_empty'};
  }catch(e){
    return {ok:false, error:'azure_exception', detail:String(e?.message||e)};
  }
}

async function translateCaiyun(text, settings, targetLang = 'zh'){
  const token = (settings.caiyunToken||'').trim();
  if(!token) return {ok:false, error:'caiyun_missing_token'};
  const url = 'https://api.interpreter.caiyunai.com/v1/translator';
  const transType = normalizeTargetLang(targetLang) === 'en' ? 'auto2en' : 'auto2zh';
  try{
    const res = await fetchWithTimeout(url, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Authorization': 'token ' + token,
      },
      body: JSON.stringify({
        source: String(text||''),
        trans_type: transType,
        request_id: String(Date.now()),
        detect: true
      }),
      cache:'no-store',
      credentials:'omit',
    }, 9000);
    if(!res.ok){
      const t = await res.text().catch(()=> '');
      return {ok:false, error:'caiyun_http_'+res.status, detail:t.slice(0,120)};
    }
    const data = await res.json();
    const out = (data?.target && Array.isArray(data.target)) ? data.target.join('') : (data?.target || '');
    return out ? {ok:true, text: out, provider:'caiyun'} : {ok:false, error:'caiyun_empty'};
  }catch(e){
    return {ok:false, error:'caiyun_exception', detail:String(e?.message||e)};
  }
}

async function translateTencent(text, settings, targetLang = 'zh'){
  const secretId = (settings.tencentId||'').trim();
  const secretKey = (settings.tencentKey||'').trim();
  if(!secretId || !secretKey) return {ok:false, error:'tencent_missing_key'};
  const target = normalizeTargetLang(targetLang);

  const host = 'tmt.tencentcloudapi.com';
  const service = 'tmt';
  const action = 'TextTranslate';
  const version = '2018-03-21';
  const region = (settings.tencentRegion||'').trim() || 'ap-guangzhou';
  const timestamp = Math.floor(Date.now()/1000);
  const date = new Date(timestamp*1000).toISOString().slice(0,10);

  const payload = {
    SourceText: String(text||''),
    Source: 'auto',
    Target: target,
    ProjectId: 0
  };
  const payloadStr = JSON.stringify(payload);

  const canonicalHeaders =
    'content-type:application/json; charset=utf-8\n' +
    `host:${host}\n` +
    `x-tc-action:${action.toLowerCase()}\n` +
    `x-tc-region:${region}\n` +
    `x-tc-timestamp:${timestamp}\n` +
    `x-tc-version:${version}\n`;
  const signedHeaders = 'content-type;host;x-tc-action;x-tc-region;x-tc-timestamp;x-tc-version';

  const hashedPayload = await sha256Hex(payloadStr);
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    hashedPayload
  ].join('\n');

  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = [
    'TC3-HMAC-SHA256',
    String(timestamp),
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join('\n');

  // Derive signing key
  const kDate = await hmacSha256(toUint8('TC3'+secretKey), date);
  const kService = await hmacSha256(kDate, service);
  const kSigning = await hmacSha256(kService, 'tc3_request');
  const signature = hex(await hmacSha256(kSigning, stringToSign));

  const authorization =
    `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try{
    const res = await fetchWithTimeout('https://' + host + '/', {
      method:'POST',
      headers:{
        'Content-Type':'application/json; charset=utf-8',
        'Host': host,
        'X-TC-Action': action,
        'X-TC-Version': version,
        'X-TC-Region': region,
        'X-TC-Timestamp': String(timestamp),
        'Authorization': authorization
      },
      body: payloadStr,
      cache:'no-store',
      credentials:'omit'
    }, 9000);

    const data = await res.json().catch(()=>null);
    if(!res.ok){
      const code = data?.Response?.Error?.Code || ('http_'+res.status);
      const msg = data?.Response?.Error?.Message || '';
      return {ok:false, error:'tencent_'+code, detail: String(msg).slice(0,120)};
    }
    const out = data?.Response?.TargetText || '';
    return out ? {ok:true, text: out, provider:'tencent'} : {ok:false, error:'tencent_empty'};
  }catch(e){
    return {ok:false, error:'tencent_exception', detail:String(e?.message||e)};
  }
}

async function translateHunyuan(text, settings, targetLang = 'zh'){
  const secretId = (settings.hunyuanId || settings.tencentId || '').trim();
  const secretKey = (settings.hunyuanKey || settings.tencentKey || '').trim();
  if(!secretId || !secretKey) return {ok:false, error:'hunyuan_missing_key'};
  const target = normalizeTargetLang(targetLang);

  const host = 'hunyuan.tencentcloudapi.com';
  const service = 'hunyuan';
  const action = 'ChatCompletions';
  const version = '2023-09-01';
  const region = (settings.hunyuanRegion || settings.tencentRegion || '').trim() || 'ap-guangzhou';
  const model = (settings.hunyuanModel || '').trim() || 'hunyuan-lite';
  const timestamp = Math.floor(Date.now()/1000);
  const date = new Date(timestamp*1000).toISOString().slice(0,10);

  const targetLabel = target === 'en' ? 'English' : '简体中文';
  const systemPrompt = target === 'en'
    ? 'You are a translation engine. Translate the user text to natural English. Keep meaning accurate, concise, no extra explanation.'
    : '你是翻译引擎。请把用户文本翻译成自然、准确、简洁的简体中文，不要额外解释。';
  const userPrompt = `Translate to ${targetLabel}:\n${String(text || '')}`;

  const payload = {
    Model: model,
    Messages: [
      { Role: 'system', Content: systemPrompt },
      { Role: 'user', Content: userPrompt }
    ],
    Stream: false,
    Temperature: 0.2,
    TopP: 0.8
  };
  const payloadStr = JSON.stringify(payload);

  const canonicalHeaders =
    'content-type:application/json; charset=utf-8\n' +
    `host:${host}\n` +
    `x-tc-action:${action.toLowerCase()}\n` +
    `x-tc-region:${region}\n` +
    `x-tc-timestamp:${timestamp}\n` +
    `x-tc-version:${version}\n`;
  const signedHeaders = 'content-type;host;x-tc-action;x-tc-region;x-tc-timestamp;x-tc-version';
  const hashedPayload = await sha256Hex(payloadStr);
  const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, hashedPayload].join('\n');
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = ['TC3-HMAC-SHA256', String(timestamp), credentialScope, await sha256Hex(canonicalRequest)].join('\n');

  const kDate = await hmacSha256(toUint8('TC3'+secretKey), date);
  const kService = await hmacSha256(kDate, service);
  const kSigning = await hmacSha256(kService, 'tc3_request');
  const signature = hex(await hmacSha256(kSigning, stringToSign));
  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try{
    const res = await fetchWithTimeout('https://' + host + '/', {
      method:'POST',
      headers:{
        'Content-Type':'application/json; charset=utf-8',
        'Host': host,
        'X-TC-Action': action,
        'X-TC-Version': version,
        'X-TC-Region': region,
        'X-TC-Timestamp': String(timestamp),
        'Authorization': authorization
      },
      body: payloadStr,
      cache:'no-store',
      credentials:'omit'
    }, 10000);
    const data = await res.json().catch(()=>null);
    if(!res.ok){
      const code = data?.Response?.Error?.Code || ('http_'+res.status);
      const msg = data?.Response?.Error?.Message || '';
      return {ok:false, error:'hunyuan_'+code, detail: String(msg).slice(0,160)};
    }
    const out = String(
      data?.Response?.Choices?.[0]?.Message?.Content ||
      data?.Response?.Choices?.[0]?.Delta?.Content ||
      ''
    ).trim();
    return out ? {ok:true, text: out, provider:'hunyuan'} : {ok:false, error:'hunyuan_empty'};
  }catch(e){
    return {ok:false, error:'hunyuan_exception', detail:String(e?.message||e)};
  }
}

async function translateGoogleGemini(text, settings, targetLang = 'zh'){
  if(Date.now() < geminiCooldownUntil){
    return {ok:false, error:'google_gemini_cooldown', detail:'gemini cooldown active'};
  }
  const key = (settings.googleGeminiKey || '').trim();
  if(!key) return {ok:false, error:'google_gemini_missing_key'};
  const model = (settings.googleGeminiModel || '').trim() || 'gemini-2.0-flash-lite';
  const target = normalizeTargetLang(targetLang);
  const prompt = target === 'en'
    ? `Translate the following text to natural English. Keep concise and faithful, no explanation:\n${String(text || '')}`
    : `请将下面文本翻译为自然、准确、简洁的简体中文，不要解释：\n${String(text || '')}`;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  try{
    const res = await fetchWithTimeout(endpoint, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        contents:[{ parts:[{ text: prompt }] }],
        generationConfig:{ temperature: 0.2, topP: 0.8, maxOutputTokens: 1024 }
      }),
      cache:'no-store',
      credentials:'omit'
    }, 10000);
    const data = await res.json().catch(()=>null);
    if(!res.ok){
      const msg = data?.error?.message || ('http_'+res.status);
      if(res.status === 429 || res.status === 403){
        geminiCooldownUntil = Date.now() + GEMINI_COOLDOWN_MS;
      }
      return {ok:false, error:'google_gemini_http_'+res.status, detail:String(msg).slice(0,180)};
    }
    const parts = Array.isArray(data?.candidates?.[0]?.content?.parts)
      ? data.candidates[0].content.parts
      : [];
    const out = parts.map((p)=>String(p?.text || '').trim()).filter(Boolean).join('\n').trim();
    return out ? {ok:true, text: out, provider:'google_gemini'} : {ok:false, error:'google_gemini_empty'};
  }catch(e){
    return {ok:false, error:'google_gemini_exception', detail:String(e?.message||e)};
  }
}

function aliPercentEncode(str){
  return encodeURIComponent(str)
    .replace(/\!/g, '%21')
    .replace(/\'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}
async function aliSign(query, accessKeySecret){
  // SignatureMethod=HMAC-SHA1
  const sortedKeys = Object.keys(query).sort();
  const canonicalized = sortedKeys.map(k=>`${aliPercentEncode(k)}=${aliPercentEncode(query[k])}`).join('&');
  const stringToSign = 'GET&%2F&' + aliPercentEncode(canonicalized);
  // HMAC-SHA1 via subtle (importKey supports SHA-1 in HMAC)
  const keyBytes = toUint8(accessKeySecret + '&');
  const key = await crypto.subtle.importKey('raw', keyBytes, {name:'HMAC', hash:'SHA-1'}, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, toUint8(stringToSign));
  // base64
  const b = String.fromCharCode(...new Uint8Array(sigBuf));
  return btoa(b);
}

async function translateAliyun(text, settings, targetLang = 'zh'){
  const accessKeyId = (settings.aliyunId||'').trim();
  const accessKeySecret = (settings.aliyunKey||'').trim();
  if(!accessKeyId || !accessKeySecret) return {ok:false, error:'aliyun_missing_key'};
  const target = normalizeTargetLang(targetLang);

  // Alibaba Cloud Machine Translation (MT) RPC API
  const endpoint = 'https://mt.cn-hangzhou.aliyuncs.com/';
  const query = {
    Action: 'TranslateGeneral',
    Version: '2018-10-12',
    Format: 'JSON',
    FormatType: 'text',
    RegionId: 'cn-hangzhou',
    AccessKeyId: accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: String(Date.now()) + String(Math.random()).slice(2),
    Timestamp: new Date().toISOString(),
    SourceLanguage: 'auto',
    TargetLanguage: target,
    SourceText: String(text||''),
    Scene: 'general'
  };
  try{
    query.Signature = await aliSign(query, accessKeySecret);
    const qs = Object.keys(query).sort().map(k=>`${aliPercentEncode(k)}=${aliPercentEncode(query[k])}`).join('&');
    const url = endpoint + '?' + qs;

    const res = await fetchWithTimeout(url, {
      method:'GET',
      headers:{'Accept':'application/json'},
      cache:'no-store',
      credentials:'omit'
    }, 9000);

    const data = await res.json().catch(()=>null);
    if(!res.ok){
      const msg = data?.Message || data?.Code || ('http_'+res.status);
      return {ok:false, error:'aliyun_'+String(msg).slice(0,40), detail: JSON.stringify(data||{}).slice(0,120)};
    }
    const out = data?.Data?.Translated || data?.Translated || '';
    return out ? {ok:true, text: out, provider:'aliyun'} : {ok:false, error:'aliyun_empty'};
  }catch(e){
    return {ok:false, error:'aliyun_exception', detail:String(e?.message||e)};
  }
}

async function translateYoudaoApi(text, settings, targetLang = 'zh'){
  const appKey = (settings.youdaoAppKey || '').trim();
  const appSecret = (settings.youdaoAppSecret || '').trim();
  if(!appKey || !appSecret) return {ok:false, error:'youdao_missing_key'};
  const q = String(text || '').trim();
  if(!q) return {ok:false, error:'youdao_empty_input'};
  const to = normalizeTargetLang(targetLang) === 'en' ? 'en' : 'zh-CHS';
  const salt = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
  const curtime = String(Math.floor(Date.now()/1000));
  const sign = await sha256Hex(appKey + youdaoInput(q) + salt + curtime + appSecret);
  const body = formEncode({
    q,
    from: 'auto',
    to,
    appKey,
    salt,
    sign,
    signType: 'v3',
    curtime
  });
  try{
    const res = await fetchWithTimeout('https://openapi.youdao.com/api', {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body,
      cache:'no-store',
      credentials:'omit'
    }, 9000);
    const raw = await res.text().catch(()=> '');
    if(!res.ok){
      return {ok:false, error:'youdao_http_'+res.status, detail: raw.slice(0,120)};
    }
    let data = null;
    try{ data = JSON.parse(raw); }catch(_e){ /* ignore */ }
    const code = String(data?.errorCode ?? '');
    if(code && code !== '0'){
      return {ok:false, error:'youdao_'+code, detail: raw.slice(0,120)};
    }
    const out = Array.isArray(data?.translation) ? data.translation.join('') : (data?.translation || '');
    return out ? {ok:true, text: out, provider:'youdao'} : {ok:false, error:'youdao_empty'};
  }catch(e){
    return {ok:false, error:'youdao_exception', detail:String(e?.message||e)};
  }
}

async function translateYoudaoWeb(text){
  const q = String(text || '').trim();
  if(!q) return {ok:false, error:'youdao_web_empty_input'};
  const url = 'https://fanyi.youdao.com/translate?doctype=json&type=AUTO';
  const body = formEncode({ i: q, doctype: 'json', type: 'AUTO' });
  try{
    const res = await fetchWithTimeout(url, {
      method:'POST',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept':'application/json,text/plain,*/*'
      },
      body,
      cache:'no-store',
      credentials:'omit',
      referrer:'https://fanyi.youdao.com/'
    }, 9000);
    const raw = await res.text().catch(()=> '');
    if(!res.ok){
      return {ok:false, error:'youdao_web_http_'+res.status, detail: raw.slice(0,120)};
    }
    let data = null;
    try{ data = JSON.parse(raw); }catch(_e){ /* ignore */ }
    const rows = Array.isArray(data?.translateResult) ? data.translateResult : [];
    const parts = [];
    for(const row of rows){
      if(!Array.isArray(row)) continue;
      for(const cell of row){
        if(cell && cell.tgt) parts.push(cell.tgt);
      }
    }
    const out = parts.join('');
    return out ? {ok:true, text: out, provider:'youdao_web'} : {ok:false, error:'youdao_web_empty', detail: raw.slice(0,120)};
  }catch(e){
    return {ok:false, error:'youdao_web_exception', detail:String(e?.message||e)};
  }
}

async function translateBaiduWeb(text, targetLang = 'zh'){
  const q = String(text || '').trim();
  if(!q) return {ok:false, error:'baidu_web_empty_input'};
  const to = normalizeTargetLang(targetLang);
  const parseBaidu = (data)=>{
    const buckets = [];
    if(Array.isArray(data?.data)) buckets.push(data.data);
    if(Array.isArray(data?.trans_result?.data)) buckets.push(data.trans_result.data);
    if(Array.isArray(data?.trans_result?.trans_result)) buckets.push(data.trans_result.trans_result);
    if(Array.isArray(data?.result?.data)) buckets.push(data.result.data);
    for(const arr of buckets){
      const parts = arr.map((x)=>x?.dst || x?.v || x?.tgt || x?.text || '').filter(Boolean);
      if(parts.length) return parts.join('');
    }
    return '';
  };

  let lastErr = null;
  try{
    const res = await fetchWithTimeout('https://fanyi.baidu.com/transapi', {
      method:'POST',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept':'application/json,text/plain,*/*'
      },
      body: formEncode({ from: 'auto', to, query: q }),
      cache:'no-store',
      credentials:'omit',
      referrer:'https://fanyi.baidu.com/'
    }, 9000);
    const raw = await res.text().catch(()=> '');
    if(res.ok){
      let data = null;
      try{ data = JSON.parse(raw); }catch(_e){ /* ignore */ }
      const out = parseBaidu(data);
      if(out) return {ok:true, text: out, provider:'baidu_web'};
      lastErr = {ok:false, error:'baidu_web_empty', detail: raw.slice(0,120)};
    }else{
      lastErr = {ok:false, error:'baidu_web_http_'+res.status, detail: raw.slice(0,120)};
    }
  }catch(e){
    lastErr = {ok:false, error:'baidu_web_exception', detail:String(e?.message||e)};
  }

  try{
    const res2 = await fetchWithTimeout('https://fanyi.baidu.com/sug', {
      method:'POST',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept':'application/json,text/plain,*/*'
      },
      body: formEncode({ kw: q }),
      cache:'no-store',
      credentials:'omit',
      referrer:'https://fanyi.baidu.com/'
    }, 9000);
    const raw2 = await res2.text().catch(()=> '');
    if(!res2.ok){
      return {ok:false, error:'baidu_web_http_'+res2.status, detail: raw2.slice(0,120)};
    }
    let data2 = null;
    try{ data2 = JSON.parse(raw2); }catch(_e){ /* ignore */ }
    const out2 = data2?.data?.[0]?.v || '';
    if(out2) return {ok:true, text: out2, provider:'baidu_web'};
    if(lastErr) return lastErr;
    return {ok:false, error:'baidu_web_empty', detail: raw2.slice(0,120)};
  }catch(e){
    if(lastErr) return lastErr;
    return {ok:false, error:'baidu_web_exception', detail:String(e?.message||e)};
  }
}

async function translatePipeline(text, opts){
  const settings = await getSettings();
  const targetLang = normalizeTargetLang(opts?.targetLang);
  const resultLimit = normalizeTranslateResultCount(settings.translateResultCount || 2);
  const srcText = String(text || '').trim();
  const containsCjk = (s)=>/[\u4E00-\u9FFF]/.test(String(s||''));
  const containsLatin = (s)=>/[A-Za-z]/.test(String(s||''));
  const isGoodCandidate = (cand)=>{
    const t = String(cand || '').trim();
    if(!t) return false;
    if(srcText && t === srcText) return false;
    // For zh->en, drop obvious failures (echo Chinese or non-English output).
    if(targetLang === 'en'){
      if(containsCjk(t)) return false;
      if(!containsLatin(t)) return false;
    }
    return true;
  };
  const providerOrderAll = normalizeTranslateProviderOrder(settings.translateProviderOrder);
  const providerOrder = normalizeTranslateProviderEnabled(settings.translateTestSelected, providerOrderAll);
  const providerMap = {
    relay: ()=>translateRelay(text, settings, targetLang),
    azure: ()=>translateAzure(text, settings, targetLang),
    tencent: ()=>translateTencent(text, settings, targetLang),
    aliyun: ()=>translateAliyun(text, settings, targetLang),
    hunyuan: ()=>translateHunyuan(text, settings, targetLang),
    google_gemini: ()=>translateGoogleGemini(text, settings, targetLang),
    caiyun: ()=>translateCaiyun(text, settings, targetLang),
    youdao: ()=>translateYoudaoApi(text, settings, targetLang),
    youdao_web: ()=>translateYoudaoWeb(text),
    baidu_web: ()=>translateBaiduWeb(text, targetLang),
    fallback_google: ()=>safeTranslate(text, targetLang, 9000).then(r=> r.ok ? ({ok:true, text:r.text, provider:'fallback_google'}) : ({ok:false, error:r.error || 'fallback_failed'}))
  };
  const errors = [];
  const results = [];
  const seen = new Set();
  for(const providerId of providerOrder){
    const fn = providerMap[providerId];
    if(!fn) continue;
    const r = await fn();
    if(r && r.ok && r.text){
      if(Array.isArray(r.results) && r.results.length){
        for(const item of r.results){
          const t2 = String(item?.text || '').trim();
          if(!t2 || seen.has(t2) || !isGoodCandidate(t2)) continue;
          seen.add(t2);
          results.push({text:t2, provider:item?.provider || r.provider || 'unknown'});
          if(results.length >= resultLimit) break;
        }
        if(results.length >= resultLimit) break;
      }
      const t = String(r.text||'').trim();
      if(t && !seen.has(t) && isGoodCandidate(t)){
        seen.add(t);
        results.push({text:t, provider:r.provider || 'unknown'});
      }
      if(results.length >= resultLimit) break;
    }else if(r && !r.ok){
      errors.push({provider:r.provider||'unknown', error:r.error, detail:r.detail});
    }
  }
  if(results.length){
    return {ok:true, text: results[0].text, provider: results[0].provider, results, resultLimit};
  }
  // Final safety net: avoid empty popup when all configured providers fail.
  try{
    const emergency = await safeTranslate(text, targetLang, 9000);
    if(emergency?.ok && emergency.text){
      return {
        ok:true,
        text: String(emergency.text || '').trim(),
        provider: 'fallback_google',
        results: [{ text: String(emergency.text || '').trim(), provider: 'fallback_google' }],
        resultLimit
      };
    }
  }catch(_){
    // ignore and keep original failure payload
  }
  return {ok:false, error:'all_providers_failed', errors};
}

const KEY_DB = 'vocab_builder_db';

async function getDB(){
  // Read both packed DB and legacy root keys, then MERGE (never overwrite user data with smaller snapshots).
  const keys = [KEY_DB,
    'vocabList','vocabDict','vocabNotes','vocabMeta','vocabEn','vocabPhonetics','vocabAudio','yellowList','greenList',
    'collectedSentences','sentenceDict','sentenceNotes','sentenceMeta','difficultList','config','licenseCode','licenseKey','isPro','auth'
    ,'assetMetaV2'
  ];
  const res = await new Promise(r=>chrome.storage.local.get(keys, r));
  const packed = res && res[KEY_DB] ? res[KEY_DB] : null;

  // Build a legacy/root snapshot (may already be mirrored by setDB, but can also contain "more" data after an update mismatch).
  const rootHasAny = !!(res.vocabList?.length || (res.vocabDict && Object.keys(res.vocabDict).length) || (res.collectedSentences && res.collectedSentences.length) || res.assetMetaV2);
  const root = rootHasAny ? {
    vocabList: res.vocabList || [],
    vocabDict: res.vocabDict || {},
    vocabNotes: res.vocabNotes || {},
    vocabMeta: res.vocabMeta || {},
    vocabEn: res.vocabEn || {},
    vocabPhonetics: res.vocabPhonetics || {},
    vocabAudio: res.vocabAudio || {},
    yellowList: res.yellowList || [],
    greenList: res.greenList || [],
    collectedSentences: res.collectedSentences || [],
    sentenceDict: res.sentenceDict || {},
    sentenceNotes: res.sentenceNotes || {},
    sentenceMeta: res.sentenceMeta || {},
    difficultList: res.difficultList || [],
    config: res.config || {},
    licenseCode: res.licenseCode || res.licenseKey || '',
    isPro: !!res.isPro,
    auth: normalizeAuthState(res.auth),
    assetMetaV2: res.assetMetaV2 || null,
  } : null;

  // If only packed exists and no root data, return packed.
  if(packed && !root){
    packed.auth = normalizeAuthState(packed.auth);
    return packed;
  }

  // Merge helper
  const mergeDb = (a, b) => {
    const out = {};
    const arr = (x)=>Array.isArray(x)?x:[];
    const obj = (x)=> (x && typeof x==='object') ? x : {};
    out.vocabList = uniqLower([...(arr(a?.vocabList)), ...(arr(b?.vocabList)), ...Object.keys(obj(a?.vocabDict)), ...Object.keys(obj(b?.vocabDict))]);
    out.yellowList = uniqLower([...(arr(a?.yellowList)), ...(arr(b?.yellowList))]);
    out.greenList = uniqLower([...(arr(a?.greenList)), ...(arr(b?.greenList))]);

    const mergeObjPreferA = (oa, ob) => {
      const A = obj(oa), B = obj(ob);
      const outo = {...B, ...A}; // A overrides
      // If A has empty string but B has value, keep B.
      for(const k of Object.keys(outo)){
        const va = A[k];
        const vb = B[k];
        if(typeof va === 'string' && va.trim()==='' && typeof vb === 'string' && vb.trim()!==''){
          outo[k] = vb;
        }
      }
      return outo;
    };

    out.vocabDict = mergeObjPreferA(obj(a?.vocabDict), obj(b?.vocabDict));
    out.vocabNotes = mergeObjPreferA(obj(a?.vocabNotes), obj(b?.vocabNotes));
    out.vocabMeta = {...obj(b?.vocabMeta), ...obj(a?.vocabMeta)};
    out.vocabEn = mergeObjPreferA(obj(a?.vocabEn), obj(b?.vocabEn));
    out.vocabPhonetics = {...obj(b?.vocabPhonetics), ...obj(a?.vocabPhonetics)};
    out.vocabAudio = {...obj(b?.vocabAudio), ...obj(a?.vocabAudio)};

    // Sentences: merge by text
    const toSent = (x)=>{
      if(!x) return null;
      if(typeof x === 'string') return {text:x, createdAt:0, translation:'', note:'', url:'', title:'', sourceLabel:''};
      if(typeof x === 'object' && x.text) return {
        text:String(x.text),
        createdAt:Number(x.createdAt)||0,
        translation:x.translation||'',
        note:x.note||'',
        url:x.url||'',
        title:x.title||'',
        sourceLabel:x.sourceLabel||'',
      };
      return null;
    };
    const allS = [...arr(a?.collectedSentences).map(toSent), ...arr(b?.collectedSentences).map(toSent)].filter(Boolean);
    const seen = new Map();
    out.collectedSentences = [];
    for(const s of allS){
      const t = (s.text||'').trim();
      if(!t) continue;
      const ex = seen.get(t);
      if(ex){
        if(!ex.translation && s.translation) ex.translation = s.translation;
        if(!ex.note && s.note) ex.note = s.note;
        if(!ex.url && s.url) ex.url = s.url;
        if(!ex.title && s.title) ex.title = s.title;
        if(!ex.sourceLabel && s.sourceLabel) ex.sourceLabel = s.sourceLabel;
        if(!ex.createdAt && s.createdAt) ex.createdAt = s.createdAt;
        continue;
      }
      seen.set(t, s);
      out.collectedSentences.push(s);
    }
    out.sentenceDict = mergeObjPreferA(obj(a?.sentenceDict), obj(b?.sentenceDict));
    out.sentenceNotes = mergeObjPreferA(obj(a?.sentenceNotes), obj(b?.sentenceNotes));
    out.sentenceMeta = {...obj(b?.sentenceMeta), ...obj(a?.sentenceMeta)};

    out.difficultList = uniqLower([...(arr(a?.difficultList)), ...(arr(b?.difficultList))]);
    out.config = {...obj(b?.config), ...obj(a?.config)};

    out.licenseCode = (a?.licenseCode || a?.licenseKey || b?.licenseCode || b?.licenseKey || '').trim();
    out.isPro = !!(a?.isPro || b?.isPro);
    const authA = normalizeAuthState(a?.auth);
    const authB = normalizeAuthState(b?.auth);
    const pickA = (authA.status === 'active' && authA.expiresAt > authB.expiresAt) || (authA.lastValidatedAt >= authB.lastValidatedAt);
    out.auth = pickA ? authA : authB;

    // Asset metadata (Phase 1): prefer higher revision, then updatedAt.
    const ma = a?.assetMetaV2 && typeof a.assetMetaV2 === 'object' ? a.assetMetaV2 : null;
    const mb = b?.assetMetaV2 && typeof b.assetMetaV2 === 'object' ? b.assetMetaV2 : null;
    const ra = Number(ma?.revision) || 0;
    const rb = Number(mb?.revision) || 0;
    if(ra !== rb) out.assetMetaV2 = ra > rb ? ma : mb;
    else{
      const ua = Number(ma?.updatedAt) || 0;
      const ub = Number(mb?.updatedAt) || 0;
      out.assetMetaV2 = ua >= ub ? (ma || mb) : (mb || ma);
    }

    return out;
  };

  // If neither exists, create empty.
  if(!packed && !root){
    const empty = {
      vocabList: [], vocabDict:{}, vocabNotes:{}, vocabMeta:{}, vocabEn:{}, vocabPhonetics:{}, vocabAudio:{},
      yellowList: [], greenList: [],
      collectedSentences: [], sentenceDict:{}, sentenceNotes:{}, sentenceMeta:{},
      difficultList: [], config:{},
      licenseCode:'', isPro:false,
      auth: normalizeAuthState(null),
      assetMetaV2: null,
    };
    try{ await setDB(empty); }catch(_){}
    empty.auth = normalizeAuthState(empty.auth);
    return empty;
  }

  // If only root exists, migrate into packed.
  if(!packed && root){
    root.auth = normalizeAuthState(root.auth);
    try{ await setDB(root); }catch(_){}
    return root;
  }

  // Both exist: merge (prefer packed for newer fields, but keep any extra root data).
  const merged = mergeDb(packed, root);

  // If merged is larger than packed/root, persist once + keep a small backup.
  try{
    const pLen = Array.isArray(packed?.vocabList)?packed.vocabList.length:0;
    const rLen = Array.isArray(root?.vocabList)?root.vocabList.length:0;
    const mLen = Array.isArray(merged.vocabList)?merged.vocabList.length:0;
    const needWrite = mLen !== pLen || mLen !== rLen;
    if(needWrite){
      // backup current snapshots (best-effort)
      const backupKey = 'vb_backup_' + Date.now();
      await new Promise(res2=>chrome.storage.local.set({[backupKey]: {packed, root}}, res2));
      await setDB(merged);
    }
  }catch(_){}

  // Ensure asset meta exists (best-effort). This is metadata-only; should not change vocab content.
  try{
    const appVersion = chrome.runtime.getManifest()?.version || '';
    const ensured = globalThis.HordDataLayer?.ensureAssetMetaV2 ? HordDataLayer.ensureAssetMetaV2(merged, appVersion) : {changed:false};
    if(ensured && ensured.changed){
      await setDB(merged);
    }
  }catch(_){}

  merged.auth = normalizeAuthState(merged.auth);
  return merged;
}

async function setDB(db){
  // Write-through compatibility layer:
  // - Newer builds may read a single packed KEY_DB
  // - Existing pages/content scripts in this project read legacy root keys
  // To avoid "added but not visible" issues, always mirror to root keys.
  const flatCore = globalThis.HordDataLayer?.buildFlatView ? HordDataLayer.buildFlatView(db) : {
    vocabList: db.vocabList || [],
    vocabDict: db.vocabDict || {},
    vocabNotes: db.vocabNotes || {},
    vocabMeta: db.vocabMeta || {},
    vocabEn: db.vocabEn || {},
    vocabPhonetics: db.vocabPhonetics || {},
    vocabAudio: db.vocabAudio || {},
    yellowList: db.yellowList || [],
    greenList: db.greenList || [],
    collectedSentences: db.collectedSentences || [],
    sentenceDict: db.sentenceDict || {},
    sentenceNotes: db.sentenceNotes || {},
    sentenceMeta: db.sentenceMeta || {},
    difficultList: db.difficultList || [],
  };
  const flat = {
    ...flatCore,
    config: db.config || {},
    // keep these if present
    licenseCode: db.licenseCode || db.licenseKey || '',
    isPro: !!db.isPro,
    auth: normalizeAuthState(db.auth),
    assetMetaV2: db.assetMetaV2 || null,
  };
  db.auth = normalizeAuthState(db.auth);
  return await new Promise(res=>chrome.storage.local.set({[KEY_DB]: db, ...flat}, res));
}

function getAppVersion(){
  return chrome.runtime.getManifest()?.version || '';
}

function ensureAssetMeta(db){
  try{
    if(globalThis.HordDataLayer?.ensureAssetMetaV2){
      HordDataLayer.ensureAssetMetaV2(db, getAppVersion());
    }
  }catch(_){}
}

function recomputeAssetMeta(db){
  try{
    if(globalThis.HordDataLayer?.recomputeAssetMetaV2FromDb){
      HordDataLayer.recomputeAssetMetaV2FromDb(db, getAppVersion());
    }
  }catch(_){}
}

function commitAssetMutation(db, now){
  ensureAssetMeta(db);
  if(!db.assetMetaV2 || typeof db.assetMetaV2 !== 'object') db.assetMetaV2 = {schemaVersion:2};
  const m = db.assetMetaV2;
  const prev = Number(m.revision) || 0;
  m.revision = prev + 1;
  m.updatedAt = Number(now) || Date.now();
  m.dirty = true;
  m.appVersion = getAppVersion();
  recomputeAssetMeta(db);
}

function markWordsSoftDeleted(db, words, now){
  ensureAssetMeta(db);
  const deviceId = String(db.assetMetaV2?.deviceId || '');
  db.vocabMeta = db.vocabMeta || {};
  db.yellowList = Array.isArray(db.yellowList) ? db.yellowList : [];
  db.greenList = Array.isArray(db.greenList) ? db.greenList : [];
  db.difficultList = Array.isArray(db.difficultList) ? db.difficultList : [];
  const delSet = new Set(words);
  let mutated = false;
  for(const w of delSet){
    if(!w) continue;
    const meta = db.vocabMeta[w] = db.vocabMeta[w] || { createdAt: nowTs(), updatedAt: 0, reviewCount: 0, lastReviewAt: 0 };
    if(meta.isDeleted !== true){
      meta.isDeleted = true;
      meta.updatedAt = Number(now) || Date.now();
      if(deviceId) meta.deviceId = deviceId;
      mutated = true;
    }
  }
  // Keep tombstones in packed DB, but keep legacy lists clean.
  if(mutated){
    db.yellowList = db.yellowList.filter(x=>!delSet.has(String(x||'').toLowerCase()));
    db.greenList = db.greenList.filter(x=>!delSet.has(String(x||'').toLowerCase()));
    db.difficultList = db.difficultList.filter(x=>!delSet.has(String(x||'').toLowerCase()));
  }
  return mutated;
}

function hardDeleteWords(db, words){
  const delSet = new Set((words || []).map(w=>String(w || '').trim().toLowerCase()).filter(Boolean));
  if(!delSet.size) return false;
  db.vocabList = Array.isArray(db.vocabList) ? db.vocabList : [];
  db.vocabDict = db.vocabDict || {};
  db.vocabNotes = db.vocabNotes || {};
  db.vocabMeta = db.vocabMeta || {};
  db.vocabEn = db.vocabEn || {};
  db.vocabPhonetics = db.vocabPhonetics || {};
  db.vocabAudio = db.vocabAudio || {};
  db.yellowList = Array.isArray(db.yellowList) ? db.yellowList : [];
  db.greenList = Array.isArray(db.greenList) ? db.greenList : [];
  db.difficultList = Array.isArray(db.difficultList) ? db.difficultList : [];

  const before = db.vocabList.length;
  db.vocabList = db.vocabList.filter((w)=>!delSet.has(String(w || '').toLowerCase()));
  db.yellowList = db.yellowList.filter((w)=>!delSet.has(String(w || '').toLowerCase()));
  db.greenList = db.greenList.filter((w)=>!delSet.has(String(w || '').toLowerCase()));
  db.difficultList = db.difficultList.filter((w)=>!delSet.has(String(w || '').toLowerCase()));

  for(const w of delSet){
    delete db.vocabDict[w];
    delete db.vocabNotes[w];
    delete db.vocabMeta[w];
    delete db.vocabEn[w];
    delete db.vocabPhonetics[w];
    delete db.vocabAudio[w];
  }
  return before !== db.vocabList.length;
}

function markSentencesSoftDeleted(db, ids, now){
  ensureAssetMeta(db);
  const deviceId = String(db.assetMetaV2?.deviceId || '');
  db.sentenceMeta = db.sentenceMeta || {};
  db.collectedSentences = Array.isArray(db.collectedSentences) ? db.collectedSentences : [];
  const set = new Set(ids.map(x=>Number(x)).filter(x=>Number.isFinite(x) && x > 0));
  if(!set.size) return false;
  let mutated = false;
  for(const s of db.collectedSentences){
    const sid = Number(s?.createdAt||s?.id);
    if(!set.has(sid)) continue;
    if(s && typeof s === 'object' && s.isDeleted !== true){
      s.isDeleted = true;
      s.updatedAt = Number(now) || Date.now();
      mutated = true;
    }
    const key = String(sid);
    db.sentenceMeta[key] = db.sentenceMeta[key] || {};
    if(db.sentenceMeta[key].isDeleted !== true){
      db.sentenceMeta[key].isDeleted = true;
      db.sentenceMeta[key].updatedAt = Number(now) || Date.now();
      if(deviceId) db.sentenceMeta[key].deviceId = deviceId;
      mutated = true;
    }
  }
  return mutated;
}

function applyMergedAssetToDb(db, asset){
  // Apply merged words/quotes into the internal DB format (tombstone-safe).
  if(!asset || Number(asset.schemaVersion) !== 2) return {ok:false, error:'bad_asset'};
  db.vocabList = Array.isArray(db.vocabList) ? db.vocabList : [];
  db.vocabDict = db.vocabDict || {};
  db.vocabNotes = db.vocabNotes || {};
  db.vocabEn = db.vocabEn || {};
  db.vocabMeta = db.vocabMeta || {};
  db.vocabPhonetics = db.vocabPhonetics || {};
  db.vocabAudio = db.vocabAudio || {};
  db.yellowList = Array.isArray(db.yellowList) ? db.yellowList : [];
  db.greenList = Array.isArray(db.greenList) ? db.greenList : [];

  const listSet = new Set(db.vocabList.map(x=>String(x||'').toLowerCase()).filter(Boolean));
  const ySet = new Set(db.yellowList.map(x=>String(x||'').toLowerCase()).filter(Boolean));
  const gSet = new Set(db.greenList.map(x=>String(x||'').toLowerCase()).filter(Boolean));

  for(const w0 of (asset.words || [])){
    const id = String(w0?.id||'').trim().toLowerCase();
    if(!id) continue;
    if(!listSet.has(id)){
      db.vocabList.push(id);
      listSet.add(id);
    }
    const meta = db.vocabMeta[id] = db.vocabMeta[id] || {};
    if(w0.deviceId != null) meta.deviceId = String(w0.deviceId||'');
    if(w0.createdAt != null) meta.createdAt = Number(w0.createdAt) || meta.createdAt || 0;
    if(w0.updatedAt != null) meta.updatedAt = Number(w0.updatedAt) || meta.updatedAt || 0;
    if(w0.reviewCount != null) meta.reviewCount = Number(w0.reviewCount) || 0;
    if(w0.lastReviewedAt != null) meta.lastReviewAt = Number(w0.lastReviewedAt) || 0;
    if(w0.nextReviewAt != null) meta.nextReviewAt = Number(w0.nextReviewAt) || 0;
    if(w0.mastery != null) meta.mastery = Number(w0.mastery) || 0;
    if(w0.learnCount != null) meta.learnCount = Number(w0.learnCount) || 0;
    if(w0.isFavorite != null) meta.isFavorite = !!w0.isFavorite;
    if(w0.tags != null && Array.isArray(w0.tags)) meta.tags = w0.tags.slice();
    if(w0.sourceUrl != null) meta.sourceUrl = String(w0.sourceUrl||'');
    if(w0.sourceLabel != null) meta.sourceLabel = String(w0.sourceLabel||'');

    const isDel = w0.isDeleted === true;
    meta.isDeleted = isDel;

    if(!isDel){
      if(w0.meaning != null){
        const m = String(w0.meaning||'').trim();
        if(m) db.vocabDict[id] = m;
      }
      if(w0.annotation != null){
        const n = String(w0.annotation||'').trim();
        if(n) db.vocabNotes[id] = n;
        else delete db.vocabNotes[id];
      }
      if(Array.isArray(w0.englishMeaning) && w0.englishMeaning.length){
        db.vocabEn[id] = w0.englishMeaning.slice(0, 6).map(x=>String(x||'').trim()).filter(Boolean);
      }
      if(w0.phonetics && typeof w0.phonetics === 'object'){
        db.vocabPhonetics[id] = {us:String(w0.phonetics.us||''), uk:String(w0.phonetics.uk||'')};
      }
      if(w0.audio && typeof w0.audio === 'object'){
        db.vocabAudio[id] = {us:String(w0.audio.us||''), uk:String(w0.audio.uk||'')};
      }
      const st = String(w0.status||'').toLowerCase();
      meta.status = st || meta.status || 'red';
      ySet.delete(id);
      gSet.delete(id);
      if(st === 'yellow') ySet.add(id);
      if(st === 'green') gSet.add(id);
    }else{
      ySet.delete(id);
      gSet.delete(id);
    }
  }
  db.yellowList = Array.from(ySet);
  db.greenList = Array.from(gSet);

  // Quotes
  db.collectedSentences = Array.isArray(db.collectedSentences) ? db.collectedSentences : [];
  db.sentenceMeta = db.sentenceMeta || {};
  const byId = new Map(db.collectedSentences.map(s=>[Number(s?.createdAt||s?.id||0), s]));
  for(const q0 of (asset.quotes || [])){
    const idNum = Number(q0?.id);
    const sid = Number.isFinite(idNum) && idNum > 0 ? idNum : Number(q0?.createdAt||0);
    if(!sid) continue;
    let item = byId.get(sid);
    if(!item){
      item = {text:'', translation:'', note:'', url:'', title:'', sourceLabel:'', createdAt: sid};
      db.collectedSentences.push(item);
      byId.set(sid, item);
    }
    if(q0.text != null) item.text = String(q0.text||'').trim() || item.text;
    if(q0.translation != null) item.translation = String(q0.translation||'').trim();
    if(q0.annotation != null) item.note = String(q0.annotation||'').trim();
    if(q0.url != null) item.url = String(q0.url||'').trim();
    if(q0.title != null) item.title = String(q0.title||'').trim();
    if(q0.sourceLabel != null) item.sourceLabel = String(q0.sourceLabel||'').trim();
    if(q0.updatedAt != null) item.updatedAt = Number(q0.updatedAt) || item.updatedAt || 0;
    const isDel = q0.isDeleted === true;
    item.isDeleted = isDel;
    const mk = String(sid);
    db.sentenceMeta[mk] = db.sentenceMeta[mk] || {};
    if(q0.deviceId != null) db.sentenceMeta[mk].deviceId = String(q0.deviceId||'');
    if(q0.reviewCount != null) db.sentenceMeta[mk].reviewCount = Number(q0.reviewCount)||0;
    if(q0.lastReviewedAt != null) db.sentenceMeta[mk].lastReviewedAt = Number(q0.lastReviewedAt)||0;
    if(q0.nextReviewAt != null) db.sentenceMeta[mk].nextReviewAt = Number(q0.nextReviewAt)||0;
    if(q0.tags != null && Array.isArray(q0.tags)) db.sentenceMeta[mk].tags = q0.tags.slice();
    if(q0.isFavorite != null) db.sentenceMeta[mk].isFavorite = !!q0.isFavorite;
    if(q0.updatedAt != null) db.sentenceMeta[mk].updatedAt = Number(q0.updatedAt)||db.sentenceMeta[mk].updatedAt||0;
    db.sentenceMeta[mk].isDeleted = isDel;
  }
  return {ok:true};
}

async function upsertWord(payload){
  const word = String(payload.word||'').trim().toLowerCase();
  if(!word) return {ok:false, error:'empty word'};

  const db = await getDB();
  normalizeVocabKeys(db);
  const feature = getFeatureStatus(db);
  const entitlements = feature.entitlements;
  ensureAssetMeta(db);
  const deviceId = String(db.assetMetaV2?.deviceId || '');

  db.vocabList = uniqLower(db.vocabList||[]);
  const hasWord = db.vocabList.includes(word);
  let mutated = false;
  const now = nowTs();

  // Ensure meta exists early (but do not touch updatedAt unless mutated).
  db.vocabMeta = db.vocabMeta || {};
  const meta = db.vocabMeta[word] = db.vocabMeta[word] || { createdAt: now, updatedAt: 0, reviewCount: 0, lastReviewAt: 0 };

  // Revive tombstone on write.
  if(meta.isDeleted === true){
    meta.isDeleted = false;
    mutated = true;
  }

  if(!hasWord){
    const room = canAddWords(db, entitlements, 1);
    if(!room.ok){
      return {ok:false, error:`FREE_LIMIT_${room.limit}`};
    }
    db.vocabList.push(word);
    mutated = true;
  }

  db.vocabDict = db.vocabDict || {};
  db.vocabNotes = db.vocabNotes || {};
  db.vocabEn = db.vocabEn || {};
  db.vocabPhonetics = db.vocabPhonetics || {};
  db.vocabAudio = db.vocabAudio || {};
  db.yellowList = uniqLower(db.yellowList||[]);
  db.greenList = uniqLower(db.greenList||[]);

  if(payload.meaning !== undefined){
    const m = String(payload.meaning||'').trim();
    const prev = String(db.vocabDict[word] || '').trim();
    if(m && m !== prev){
      db.vocabDict[word] = m;
      mutated = true;
    }
  }
  if(payload.note !== undefined){
    const n = String(payload.note||'').trim();
    const hadNote = !!String(db.vocabNotes[word] || '').trim();
    if(n && !hadNote){
      const noteRoom = canAddNotes(db, entitlements, 1);
      if(!noteRoom.ok){
        return {ok:false, error:`NOTE_LIMIT_${noteRoom.limit}`};
      }
    }
    const prev = String(db.vocabNotes[word] || '').trim();
    if(n){
      if(n !== prev){
        db.vocabNotes[word] = n;
        mutated = true;
      }
    }else{
      if(prev){
        delete db.vocabNotes[word];
        mutated = true;
      }
    }
  }
  if(Array.isArray(payload.englishMeaning) && payload.englishMeaning.length){
    const next = payload.englishMeaning.slice(0, 6).map(x=>String(x||'').trim()).filter(Boolean);
    const prev = Array.isArray(db.vocabEn[word]) ? db.vocabEn[word].map(x=>String(x||'').trim()).filter(Boolean) : [];
    if(JSON.stringify(next) !== JSON.stringify(prev)){
      db.vocabEn[word] = next;
      mutated = true;
    }
  }
  if(payload.status){
    const st = String(payload.status).toLowerCase();
    const prevSt = String(meta.status || '').toLowerCase() || 'red';
    if(st !== prevSt){
      meta.status = st;
      mutated = true;
    }
    const yHad = db.yellowList.includes(word);
    const gHad = db.greenList.includes(word);
    // normalize highlight lists from status
    if(yHad) db.yellowList = db.yellowList.filter(x=>x!==word);
    if(gHad) db.greenList = db.greenList.filter(x=>x!==word);
    if(st === 'yellow'){ db.yellowList.push(word); }
    if(st === 'green'){ db.greenList.push(word); }
    const yNow = st === 'yellow';
    const gNow = st === 'green';
    if(yHad !== yNow || gHad !== gNow) mutated = true;
  }
  if(payload.phonetics){
    db.vocabPhonetics[word] = db.vocabPhonetics[word] || {};
    const prev = db.vocabPhonetics[word] || {};
    const nextUs = payload.phonetics.us ? String(payload.phonetics.us) : '';
    const nextUk = payload.phonetics.uk ? String(payload.phonetics.uk) : '';
    if(nextUs && nextUs !== String(prev.us||'')){ db.vocabPhonetics[word].us = nextUs; mutated = true; }
    if(nextUk && nextUk !== String(prev.uk||'')){ db.vocabPhonetics[word].uk = nextUk; mutated = true; }
  }
  if(payload.audio){
    db.vocabAudio[word] = db.vocabAudio[word] || {};
    const prev = db.vocabAudio[word] || {};
    const nextUs = payload.audio.us ? String(payload.audio.us) : '';
    const nextUk = payload.audio.uk ? String(payload.audio.uk) : '';
    if(nextUs && nextUs !== String(prev.us||'')){ db.vocabAudio[word].us = nextUs; mutated = true; }
    if(nextUk && nextUk !== String(prev.uk||'')){ db.vocabAudio[word].uk = nextUk; mutated = true; }
  }

  if(mutated){
    meta.updatedAt = now;
    if(deviceId) meta.deviceId = deviceId;
    commitAssetMutation(db, now);
    await setDB(db);
  }

  return {ok:true};
}

async function addSentence(payload){
  const text = String(payload.text||'').trim();
  if(!text) return {ok:false, error:'empty sentence'};
  const db = await getDB();
  const feature = getFeatureStatus(db);
  const entitlements = feature.entitlements;
  ensureAssetMeta(db);
  const deviceId = String(db.assetMetaV2?.deviceId || '');
  db.collectedSentences = db.collectedSentences || [];
  db.sentenceMeta = db.sentenceMeta || {};
  const key = text.toLowerCase();
  const existingByText = new Map(db.collectedSentences.map(x=>{
    const t = typeof x==='string' ? x : (x.text||'');
    return [String(t).trim().toLowerCase(), x];
  }));
  const ex = existingByText.get(key);
  const translation = String(payload.translation||payload.trans||'').trim();
  const url = String(payload.url||'').trim();
  const title = String(payload.title||'').trim();
  const note = String(payload.note||'').trim();
  const now = nowTs();
  let mutated = false;
  if(ex && typeof ex === 'object'){
    // merge non-empty fields
    if(!ex.translation && translation){ ex.translation = translation; mutated = true; }
    if(!ex.url && url){ ex.url = url; mutated = true; }
    if(!ex.title && title){ ex.title = title; mutated = true; }
    if(!ex.note && note){
      const noteRoom = canAddNotes(db, entitlements, 1);
      if(!noteRoom.ok){
        return {ok:false, error:`NOTE_LIMIT_${noteRoom.limit}`};
      }
      ex.note = note;
      mutated = true;
    }
    if(mutated){
      ex.updatedAt = now;
      const sid = Number(ex.createdAt||ex.id||0);
      if(Number.isFinite(sid) && sid > 0){
        db.sentenceMeta[String(sid)] = db.sentenceMeta[String(sid)] || {};
        db.sentenceMeta[String(sid)].updatedAt = now;
        if(deviceId) db.sentenceMeta[String(sid)].deviceId = deviceId;
      }
      commitAssetMutation(db, now);
      await setDB(db);
    }
  }else if(!ex){
    if(note){
      const noteRoom = canAddNotes(db, entitlements, 1);
      if(!noteRoom.ok){
        return {ok:false, error:`NOTE_LIMIT_${noteRoom.limit}`};
      }
    }
    const createdAt = now;
    db.collectedSentences.push({text, translation, url, title, note, createdAt, updatedAt: createdAt});
    db.sentenceMeta[String(createdAt)] = db.sentenceMeta[String(createdAt)] || {updatedAt: createdAt};
    if(deviceId) db.sentenceMeta[String(createdAt)].deviceId = deviceId;
    mutated = true;
    commitAssetMutation(db, now);
    await setDB(db);
  }
  return {ok:true};
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async ()=>{
    try{
      if(!msg || !msg.type) return sendResponse({ok:false, error:'no type'});

      if(msg.type === 'OP_OPEN_MANAGER_EXPORT'){
        const payload = msg.payload || msg;
        const quoteId = Number(payload.quoteId || 0);
        const url = new URL(chrome.runtime.getURL('manager.html'));
        url.searchParams.set('tab', 'sentences');
        url.searchParams.set('quoteExport', '1');
        if(Number.isFinite(quoteId) && quoteId > 0){
          url.searchParams.set('quoteId', String(quoteId));
        }
        await chrome.tabs.create({ url: url.toString() });
        return sendResponse({ok:true});
      }

      if(msg.type === 'UPSERT_WORD'){
        return sendResponse(await upsertWord(msg));
      }
      if(msg.type === 'ADD_SENTENCE'){
        const safeUrl = String(msg.url||msg.forceUrl||sender?.tab?.url||'').trim();
        const safeTitle = String(msg.title||sender?.tab?.title||'').trim();
        return sendResponse(await addSentence({...msg, url: safeUrl, title: safeTitle}));
      }
      if(msg.type === 'OP_GET_STATE'){
        const db = await getDB();
        const feature = getFeatureStatus(db);
        const publicDb = globalThis.HordDataLayer?.buildPublicDbView ? HordDataLayer.buildPublicDbView(db) : db;
        const licenseStatus = getLicenseStatus(db);
        const caps = getCapabilities(db, feature.entitlements);
        publicDb.auth = {
          ...normalizeAuthState(db.auth),
          source: feature.source,
          entitlements: feature.entitlements,
        };
        publicDb.licenseStatus = licenseStatus;
        publicDb.capabilities = caps;
        return sendResponse({ok:true, db: publicDb, entitlements: feature.entitlements, licenseStatus, capabilities: caps});
      }

      if(msg.type === 'OP_EXPORT_ASSET_V2'){
        const db = await getDB();
        const feature = getFeatureStatus(db);
        if(!isProUser(db)) return sendResponse({ok:false, error: getLicenseStatus(db)});
        if(!getCapabilities(db, feature.entitlements).assetMode) return sendResponse({ok:false, error:'CAPABILITY_ASSET_MODE_DISABLED'});
        if(!globalThis.HordDataLayer?.exportAssetV2FromDb){
          return sendResponse({ok:false, error:'DATA_LAYER_MISSING'});
        }
        const asset = HordDataLayer.exportAssetV2FromDb(db, getAppVersion());
        return sendResponse({ok:true, asset});
      }

      if(msg.type === 'OP_IMPORT_ASSET_V2'){
        const db = await getDB();
        const feature = getFeatureStatus(db);
        if(!isProUser(db)) return sendResponse({ok:false, error: getLicenseStatus(db)});
        if(!getCapabilities(db, feature.entitlements).assetMode) return sendResponse({ok:false, error:'CAPABILITY_ASSET_MODE_DISABLED'});
        const external = msg.asset || msg.payload?.asset || msg.payload || null;
        if(!external) return sendResponse({ok:false, error:'NO_ASSET'});
        if(!globalThis.HordDataLayer?.exportAssetV2FromDb || !globalThis.HordDataLayer?.mergeAsset){
          return sendResponse({ok:false, error:'DATA_LAYER_MISSING'});
        }
        const localAsset = HordDataLayer.exportAssetV2FromDb(db, getAppVersion());
        const mr = HordDataLayer.mergeAsset(localAsset, external);
        if(!mr.ok) return sendResponse({ok:false, error: mr.error || 'MERGE_FAILED'});
        if(!mr.changed){
          return sendResponse({ok:true, changed:false, revision: Number(db.assetMetaV2?.revision)||0});
        }
        const applied = applyMergedAssetToDb(db, mr.merged);
        if(!applied.ok) return sendResponse({ok:false, error: applied.error || 'APPLY_FAILED'});
        ensureAssetMeta(db);
        // Merge rule: final revision = max(local, external) + 1
        const maxRev = Math.max(Number(localAsset.revision)||0, Number(external.revision)||0);
        db.assetMetaV2.revision = maxRev;
        const now = nowTs();
        commitAssetMutation(db, now);
        await setDB(db);
        return sendResponse({ok:true, changed:true, revision: Number(db.assetMetaV2?.revision)||0, contentHash: String(db.assetMetaV2?.contentHash||'')});
      }

      if(msg.type === 'OP_MARK_ASSET_WRITTEN'){
        const db = await getDB();
        const feature = getFeatureStatus(db);
        if(!isProUser(db)) return sendResponse({ok:false, error: getLicenseStatus(db)});
        if(!getCapabilities(db, feature.entitlements).assetMode) return sendResponse({ok:false, error:'CAPABILITY_ASSET_MODE_DISABLED'});
        ensureAssetMeta(db);
        const payload = msg.payload || msg;
        const h = String(payload.contentHash || '').trim();
        if(!db.assetMetaV2 || typeof db.assetMetaV2 !== 'object'){
          return sendResponse({ok:false, error:'ASSET_META_MISSING'});
        }
        if(db.assetMetaV2.dirty !== true){
          return sendResponse({ok:true, cleared:false});
        }
        if(h && String(db.assetMetaV2.contentHash || '') !== h){
          return sendResponse({ok:false, error:'HASH_MISMATCH'});
        }
        db.assetMetaV2.dirty = false;
        // Do not change revision/updatedAt here (metadata acknowledgement only).
        await setDB(db);
        return sendResponse({ok:true, cleared:true});
      }
      if(msg.type === 'OP_SET_AUTH_CERT'){
        const db = await getDB();
        const payload = msg.payload || msg;
        const cert = payload.cert || payload.certificate;
        const verify = await verifyCertificateSignature(cert);
        if(!verify.ok) return sendResponse({ok:false, error: verify.error || 'CERT_VERIFY_FAILED'});
        const auth = buildAuthFromCertificate(cert);
        if(!auth) return sendResponse({ok:false, error:'INVALID_CERT'});
        if(verify.bypassed){
          auth.source = 'certificate_unsigned_dev';
        }
        db.auth = auth;
        if(payload.licenseCode !== undefined){
          db.licenseCode = String(payload.licenseCode || '').trim();
        }
        await setDB(db);
        const feature = getFeatureStatus(db);
        return sendResponse({ok:true, entitlements: feature.entitlements, auth: db.auth});
      }
      if(msg.type === 'OP_CLEAR_AUTH'){
        const db = await getDB();
        db.auth = normalizeAuthState(null);
        db.licenseCode = '';
        db.isPro = false;
        await setDB(db);
        return sendResponse({ok:true});
      }
      if(msg.type === 'OP_GET_AUTH'){
        const db = await getDB();
        const feature = getFeatureStatus(db);
        const licenseStatus = getLicenseStatus(db);
        const caps = getCapabilities(db, feature.entitlements);
        return sendResponse({ok:true, auth: normalizeAuthState(db.auth), entitlements: feature.entitlements, source: feature.source, licenseStatus, capabilities: caps});
      }

      if(msg.type === 'OP_DELETE_WORDS'){
        const words = (msg.words || msg.payload?.words || []).map(w=>String(w||'').trim().toLowerCase()).filter(Boolean);
        const db = await getDB();
        if(words.length){
          const now = nowTs();
          const mutated = markWordsSoftDeleted(db, words, now);
          if(mutated){
            commitAssetMutation(db, now);
            await setDB(db);
          }
        }
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_HARD_DELETE_WORDS'){
        const words = (msg.words || msg.payload?.words || []).map(w=>String(w||'').trim().toLowerCase()).filter(Boolean);
        const db = await getDB();
        if(words.length){
          const now = nowTs();
          const mutated = hardDeleteWords(db, words);
          if(mutated){
            commitAssetMutation(db, now);
            await setDB(db);
          }
        }
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_CLEAR_ALL_WORDS'){
        const db = await getDB();
        const now = nowTs();
        const all = (db.vocabList || []).map(w=>String(w||'').trim().toLowerCase()).filter(Boolean);
        const mutated = markWordsSoftDeleted(db, all, now);
        if(mutated){
          commitAssetMutation(db, now);
          await setDB(db);
        }
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_SET_WORD_NOTE'){
        const db = await getDB();
        const feature = getFeatureStatus(db);
        ensureAssetMeta(db);
        const deviceId = String(db.assetMetaV2?.deviceId || '');
        const payload = msg.payload || msg;
        const word = String(payload.word||'').trim().toLowerCase();
        if(!word) return sendResponse({ok:false, error:'empty_word'});
        const noteRaw = payload.note ?? '';
        const note = String(noteRaw).trim();
        db.vocabNotes = db.vocabNotes || {};
        db.vocabMeta = db.vocabMeta || {};
        const meta = db.vocabMeta[word] = db.vocabMeta[word] || { createdAt: nowTs(), updatedAt: 0, reviewCount: 0, lastReviewAt: 0 };
        const hadNote = !!String(db.vocabNotes[word] || '').trim();
        if(note && !hadNote){
          const room = canAddNotes(db, feature.entitlements, 1);
          if(!room.ok) return sendResponse({ok:false, error:`NOTE_LIMIT_${room.limit}`});
        }
        const prev = String(db.vocabNotes[word] || '').trim();
        let mutated = false;
        if(note){
          if(note !== prev){
            db.vocabNotes[word] = note;
            mutated = true;
          }
          if(meta.isDeleted === true){
            meta.isDeleted = false;
            mutated = true;
          }
        }else{
          if(prev){
            delete db.vocabNotes[word];
            mutated = true;
          }
        }
        if(mutated){
          const now = nowTs();
          meta.updatedAt = now;
          if(deviceId) meta.deviceId = deviceId;
          commitAssetMutation(db, now);
          await setDB(db);
        }
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_SET_WORD_STATUS'){
        const db = await getDB();
        ensureAssetMeta(db);
        const deviceId = String(db.assetMetaV2?.deviceId || '');
        const words = (msg.words || msg.payload?.words || (msg.word?[msg.word]:[]) || []).map(w=>String(w||'').trim()).filter(Boolean);
        let status = msg.status ?? msg.payload?.status ?? msg.newStatus ?? msg.payload?.newStatus ?? '';
        status = String(status||'').toLowerCase();
        if(!words.length) return sendResponse({ok:false, error:'no words'});
        // normalize
        if(status === '陌生' || status === 'red') status = 'red';
        if(['new','unknown'].includes(status)) status = 'red';
        const normWords = words.map(w=>String(w||'').trim().toLowerCase()).filter(Boolean);
        const set = new Set(normWords);
        db.yellowList = (db.yellowList||[]).map(w=>String(w||'').trim().toLowerCase()).filter(Boolean);
        db.greenList  = (db.greenList||[]).map(w=>String(w||'').trim().toLowerCase()).filter(Boolean);
        const prevY = new Set(db.yellowList);
        const prevG = new Set(db.greenList);
        db.yellowList = db.yellowList.filter(w=>!set.has(w));
        db.greenList  = db.greenList.filter(w=>!set.has(w));
        if(status === 'yellow'){
          db.yellowList = Array.from(new Set([...(db.yellowList||[]), ...normWords]));
        }else if(status === 'green'){
          db.greenList = Array.from(new Set([...(db.greenList||[]), ...normWords]));
        }else{
          // red/clear => only remove highlights; for clear use delete op separately
        }
        // meta status
        db.vocabMeta = db.vocabMeta || {};
        const now = nowTs();
        let mutated = false;
        for(const w of normWords){
          db.vocabMeta[w] = db.vocabMeta[w] || {};
          let wordMut = false;
          if(db.vocabMeta[w].isDeleted === true){
            db.vocabMeta[w].isDeleted = false;
            wordMut = true;
          }
          const prevSt = String(db.vocabMeta[w].status||'').toLowerCase() || 'red';
          if(prevSt !== status){
            db.vocabMeta[w].status = status;
            wordMut = true;
          }
          if(wordMut){
            db.vocabMeta[w].updatedAt = now;
            if(deviceId) db.vocabMeta[w].deviceId = deviceId;
            mutated = true;
          }
        }
        const yChanged = (()=>{
          const next = new Set(db.yellowList);
          if(prevY.size !== next.size) return true;
          for(const k of prevY) if(!next.has(k)) return true;
          return false;
        })();
        const gChanged = (()=>{
          const next = new Set(db.greenList);
          if(prevG.size !== next.size) return true;
          for(const k of prevG) if(!next.has(k)) return true;
          return false;
        })();
        if(yChanged || gChanged) mutated = true;
        if(mutated){
          commitAssetMutation(db, now);
          await setDB(db);
        }
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_DELETE_SENTENCES'){
        const ids = (msg.ids || msg.payload?.ids || []).map(x=>Number(x)).filter(x=>Number.isFinite(x));
        const db = await getDB();
        if(ids.length){
          const now = nowTs();
          const mutated = markSentencesSoftDeleted(db, ids, now);
          if(mutated){
            commitAssetMutation(db, now);
            await setDB(db);
          }
        }
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_UPDATE_SENTENCE'){
        const p = msg.payload || msg;
        const id = Number(p.id || p.createdAt || p.sentenceId);
        if(!Number.isFinite(id)) return sendResponse({ok:false, error:'bad_id'});
        const db = await getDB();
        const feature = getFeatureStatus(db);
        ensureAssetMeta(db);
        const deviceId = String(db.assetMetaV2?.deviceId || '');
        db.sentenceMeta = db.sentenceMeta || {};
        const arr = db.collectedSentences || [];
        const item = arr.find(s=>Number(s.createdAt||s.id) === id);
        if(!item) return sendResponse({ok:false, error:'not_found'});
        let mutated = false;
        if(p.translation !== undefined){
          const t = String(p.translation||'').trim();
          const prev = String(item.translation||'').trim();
          if(t !== prev){
            item.translation = t;
            mutated = true;
          }
        }
        if(p.url !== undefined){
          const u = String(p.url||'').trim();
          const prev = String(item.url||'').trim();
          if(u !== prev){
            item.url = u;
            mutated = true;
          }
        }
        if(p.title !== undefined){
          const tt = String(p.title||'').trim();
          const prev = String(item.title||'').trim();
          if(tt !== prev){
            item.title = tt;
            mutated = true;
          }
        }
        if(p.note !== undefined){
          const n = String(p.note||'').trim();
          const hadNote = !!String(item.note || '').trim();
          if(n && !hadNote){
            const room = canAddNotes(db, feature.entitlements, 1);
            if(!room.ok) return sendResponse({ok:false, error:`NOTE_LIMIT_${room.limit}`});
          }
          const prev = String(item.note||'').trim();
          if(n !== prev){
            item.note = n; // allow clearing
            mutated = true;
          }
        }
        if(item.isDeleted === true){
          item.isDeleted = false;
          mutated = true;
        }
        if(mutated){
          const now = nowTs();
          item.updatedAt = now;
          db.sentenceMeta[String(id)] = db.sentenceMeta[String(id)] || {};
          db.sentenceMeta[String(id)].updatedAt = now;
          db.sentenceMeta[String(id)].isDeleted = false;
          if(deviceId) db.sentenceMeta[String(id)].deviceId = deviceId;
          commitAssetMutation(db, now);
          await setDB(db);
        }
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_UPSERT_BULK'){
        const payload = msg.payload || {};
        const words = payload.words || [];
        const sentences = payload.sentences || [];
        const db = await getDB();
        const feature = getFeatureStatus(db);
        const entitlements = feature.entitlements;
        ensureAssetMeta(db);
        const deviceId = String(db.assetMetaV2?.deviceId || '');
        if(!entitlements.import_export){
          return sendResponse({ok:false, error:'FEATURE_LOCKED_IMPORT_EXPORT'});
        }
        normalizeVocabKeys(db);
        const wordLimit = getWordLimit(entitlements);
        const noteLimit = getNoteLimit(entitlements);
        let noteCount = countAllNotes(db);
        const stats = {
          imported_words: 0,
          imported_sentences: 0,
          skipped_words_limit: 0,
          skipped_notes_limit: 0,
        };
        // words
        db.vocabList = db.vocabList || [];
        db.vocabDict = db.vocabDict || {};
        db.vocabNotes = db.vocabNotes || {};
        db.vocabMeta = db.vocabMeta || {};
        db.vocabPhonetics = db.vocabPhonetics || {};
        db.vocabAudio = db.vocabAudio || {};
        db.vocabEn = db.vocabEn || {};
        db.vocabList = (db.vocabList||[]).map(w=>String(w||'').trim().toLowerCase()).filter(Boolean);
        const listSet = new Set(db.vocabList);
        let activeWordCount = countActiveWords(db);
        const now = nowTs();
        let mutated = false;
        for(const w of words){
          const word = String(w.word||'').trim().toLowerCase();
          if(!word) continue;
          const meta0 = db.vocabMeta[word] || {};
          const wasDeleted = meta0.isDeleted === true;
          if(wasDeleted && !isUnlimited(wordLimit) && activeWordCount >= wordLimit){
            stats.skipped_words_limit += 1;
            continue;
          }
          if(!listSet.has(word)){
            if(!isUnlimited(wordLimit) && activeWordCount >= wordLimit){
              stats.skipped_words_limit += 1;
              continue;
            }
            db.vocabList.push(word);
            listSet.add(word);
            stats.imported_words += 1;
            mutated = true;
            activeWordCount += 1;
          }
          if(w.meaning!=null){
            const m = String(w.meaning||'').trim();
            const prev = String(db.vocabDict[word] || '').trim();
            if(m && m !== prev){ db.vocabDict[word] = m; mutated = true; } // avoid overwriting existing meaning with blank
          }
          if(w.note!=null){
            const n = String(w.note||'').trim();
            const hasNote = !!String(db.vocabNotes[word] || '').trim();
            if(n && !hasNote){
              if(!isUnlimited(noteLimit) && noteCount >= noteLimit){
                stats.skipped_notes_limit += 1;
              }else{
                const prev = String(db.vocabNotes[word] || '').trim();
                if(n && n !== prev){
                  db.vocabNotes[word] = n; // avoid overwriting existing note with blank
                  noteCount += 1;
                  mutated = true;
                }
              }
            }else if(n){
              const prev = String(db.vocabNotes[word] || '').trim();
              if(n !== prev){ db.vocabNotes[word] = n; mutated = true; }
            }
          }
          // meta (do not touch updatedAt unless actual changes happen)
          const meta = db.vocabMeta[word] = db.vocabMeta[word] || {};
          let wordMut = false;
          if(meta.isDeleted === true){
            meta.isDeleted = false;
            wordMut = true;
            activeWordCount += 1;
          }
          const nextStatus = String((w.status ?? meta.status ?? 'red') || 'red').toLowerCase();
          if(String(meta.status||'').toLowerCase() !== nextStatus){ meta.status = nextStatus; wordMut = true; }
          const nextRc = (w.reviewCount ?? meta.reviewCount ?? 0);
          if(Number(meta.reviewCount||0) !== Number(nextRc||0)){ meta.reviewCount = Number(nextRc)||0; wordMut = true; }
          const nextCreated = (w.createdAt ?? meta.createdAt ?? now);
          if(Number(meta.createdAt||0) !== Number(nextCreated||0)){ meta.createdAt = Number(nextCreated)||0; wordMut = true; }
          const nextSourceUrl = (w.sourceUrl ?? meta.sourceUrl ?? '');
          if(String(meta.sourceUrl||'') !== String(nextSourceUrl||'')){ meta.sourceUrl = String(nextSourceUrl||''); wordMut = true; }
          const nextSourceLabel = (w.sourceLabel ?? meta.sourceLabel ?? '');
          if(String(meta.sourceLabel||'') !== String(nextSourceLabel||'')){ meta.sourceLabel = String(nextSourceLabel||''); wordMut = true; }
          if(wordMut){
            const cand = Number(w.updatedAt) || 0;
            meta.updatedAt = Math.max(Number(meta.updatedAt)||0, cand || now);
            if(deviceId) meta.deviceId = deviceId;
            mutated = true;
          }
          if(w.englishMeaning != null){
            const em = Array.isArray(w.englishMeaning)
              ? w.englishMeaning
              : String(w.englishMeaning||'').split(/\s*\|\s*|\s*;\s*|\s*\n\s*/).filter(Boolean);
            if(em.length){
              const next = em.slice(0, 6).map(x=>String(x||'').trim()).filter(Boolean);
              const prev = Array.isArray(db.vocabEn[word]) ? db.vocabEn[word].map(x=>String(x||'').trim()).filter(Boolean) : [];
              if(JSON.stringify(next) !== JSON.stringify(prev)){ db.vocabEn[word] = next; mutated = true; }
            }
          }
          if(w.phoneticUS || w.phoneticUK){
            const prev = db.vocabPhonetics[word] || {};
            const next = {us:String(w.phoneticUS||''), uk:String(w.phoneticUK||'')};
            if(String(prev.us||'') !== next.us || String(prev.uk||'') !== next.uk){
              db.vocabPhonetics[word] = next;
              mutated = true;
            }
          }
          if(w.audioUS || w.audioUK){
            const prev = db.vocabAudio[word] || {};
            const next = {us:String(w.audioUS||''), uk:String(w.audioUK||'')};
            if(String(prev.us||'') !== next.us || String(prev.uk||'') !== next.uk){
              db.vocabAudio[word] = next;
              mutated = true;
            }
          }
        }
        // sentences (dedupe by id and text; do not overwrite existing translation with blank)
        db.collectedSentences = db.collectedSentences || [];
        db.sentenceMeta = db.sentenceMeta || {};
        const existingSentIds = new Set(db.collectedSentences.map(s=>Number(s.createdAt||s.id)));
        const existingSentText = new Map(db.collectedSentences.map(s=>[String(s.text||'').trim().toLowerCase(), s]));
        for(let i = 0; i < sentences.length; i++){
          const s = sentences[i];
          const text = String(s.text||s.sentence||'').trim();
          if(!text) continue;
          const key = text.toLowerCase();
          const id = Number(s.createdAt||s.id|| (now + i + 1));
          const t = String(s.translation||s.trans||'').trim();
          const ex = existingSentText.get(key);
          if(ex){
            let exMut = false;
            if(ex.isDeleted === true){ ex.isDeleted = false; exMut = true; }
            if(!ex.translation && t){ ex.translation = t; exMut = true; }
            if(!ex.note && s.note){
              if(!isUnlimited(noteLimit) && noteCount >= noteLimit){
                stats.skipped_notes_limit += 1;
              }else{
                ex.note = s.note;
                noteCount += 1;
                exMut = true;
              }
            }
            if(!ex.url && s.url){ ex.url = s.url; exMut = true; }
            if(!ex.title && s.title){ ex.title = s.title; exMut = true; }
            if(!ex.sourceLabel && s.sourceLabel){ ex.sourceLabel = s.sourceLabel; exMut = true; }
            if(exMut){
              ex.updatedAt = now;
              const sid = Number(ex.createdAt||ex.id||0);
              if(Number.isFinite(sid) && sid > 0){
                db.sentenceMeta[String(sid)] = db.sentenceMeta[String(sid)] || {};
                db.sentenceMeta[String(sid)].updatedAt = now;
                db.sentenceMeta[String(sid)].isDeleted = false;
                if(deviceId) db.sentenceMeta[String(sid)].deviceId = deviceId;
              }
              mutated = true;
            }
            continue;
          }
          if(existingSentIds.has(id)) continue;
          const item = {
            text,
            translation: t,
            note: '',
            url: String(s.url||'').trim(),
            title: String(s.title||'').trim(),
            sourceLabel: String(s.sourceLabel||'').trim(),
            createdAt: id,
            updatedAt: id
          };
          const nextNote = String(s.note||'').trim();
          if(nextNote){
            if(!isUnlimited(noteLimit) && noteCount >= noteLimit){
              stats.skipped_notes_limit += 1;
            }else{
              item.note = nextNote;
              noteCount += 1;
            }
          }
          db.collectedSentences.push(item);
          existingSentIds.add(id);
          existingSentText.set(key, item);
          stats.imported_sentences += 1;
          db.sentenceMeta[String(id)] = db.sentenceMeta[String(id)] || {updatedAt: id};
          db.sentenceMeta[String(id)].isDeleted = false;
          if(deviceId) db.sentenceMeta[String(id)].deviceId = deviceId;
          mutated = true;
        }
        if(mutated){
          commitAssetMutation(db, now);
          await setDB(db);
        }
        return sendResponse({ok:true, stats});
      }
      if(msg.type === 'OP_SET_REVIEW_CONFIG'){
        const cfg = msg.payload || msg;
        const db = await getDB();
        const feature = getFeatureStatus(db);
        db.config = db.config || {};
        let display = (cfg.display && typeof cfg.display === 'object') ? {
          cn: cfg.display.cn !== false,
          en: cfg.display.en === true,
          note: cfg.display.note === true
        } : null;
        let displayMode =
          display ? (display.note ? 'note' : display.en ? 'en' : 'cn') :
          (cfg.displayMode || db.config.reviewConfig?.displayMode || 'cn');
        let limit = Number(cfg.limit) || 20;
        let includeRed = cfg.includeRed !== false;
        let includeYellow = cfg.includeYellow !== false;
        if(feature.entitlements.review_mode !== 'advanced'){
          limit = 20;
          includeRed = true;
          includeYellow = true;
          display = {cn:true, en:false, note:false};
          displayMode = 'cn';
        }
        db.config.reviewConfig = {
          limit,
          includeRed,
          includeYellow,
          displayMode,
          display: display || db.config.reviewConfig?.display || {cn:true,en:false,note:false}
        };
        await setDB(db);
        return sendResponse({ok:true, downgraded: feature.entitlements.review_mode !== 'advanced'});
      }

      if(msg.type === 'OP_RATE_WORD'){
        const {word, quality} = msg.payload || {};
        const w = String(word||'').trim().toLowerCase();
        if(!w) return sendResponse({ok:false, error:'empty_word'});
        const q = Number(quality);
        const db = await getDB();
        ensureAssetMeta(db);
        const deviceId = String(db.assetMetaV2?.deviceId || '');
        db.vocabMeta = db.vocabMeta || {};
        const meta = db.vocabMeta[w] = db.vocabMeta[w] || {};
        const now = nowTs();
        if(meta.isDeleted === true) meta.isDeleted = false;
        if(deviceId) meta.deviceId = deviceId;
        const prevCount = Number(meta.reviewCount)||0;
        const nextCount = prevCount + 1;
        meta.reviewCount = nextCount;
        meta.lastReviewAt = now;
        meta.updatedAt = now;

        // Next review schedule (Ebbinghaus-ish)
        const mins = 60*1000, hrs = 60*mins, days = 24*hrs;
        const table = [5*mins, 30*mins, 12*hrs, 1*days, 2*days, 4*days, 7*days, 15*days];
        const i = Math.max(0, Math.min(table.length-1, prevCount));
        meta.nextReviewAt = now + table[i];

        // Mastery score (0~100) + difficult tracking
        // quality: expected 0~5 (lower = harder)
        const q01 = isFinite(q) ? Math.max(0, Math.min(5, q)) / 5 : 0;
        const prevMastery = Number(meta.mastery)||0;
        const target = Math.round(q01 * 100);
        // Smooth update: recent performance matters more
        meta.mastery = Math.max(0, Math.min(100, Math.round(prevMastery * 0.82 + target * 0.18)));

        // Low-quality streak => difficult word
        const isLow = isFinite(q) ? q <= 2 : false;
        meta.lowStreak = isLow ? (Number(meta.lowStreak)||0) + 1 : 0;
        if(meta.lowStreak >= 2){
          db.difficultList = Array.isArray(db.difficultList) ? db.difficultList : [];
          if(!db.difficultList.includes(w)) db.difficultList.unshift(w);
          // cap
          if(db.difficultList.length > 500) db.difficultList = db.difficultList.slice(0,500);
          meta.isDifficult = true;
        }

        db.vocabMeta[w] = meta;
        commitAssetMutation(db, now);
        await setDB(db);
        return sendResponse({ok:true, meta});
      }


      if(msg.type === 'GET_TRANSLATIONS'){
        const text = (msg.text || '').trim();
        const mode = msg.mode || 'auto'; // 'word' | 'translate' | 'auto'
        const targetLang = normalizeTargetLang(msg.targetLang);
        if(!text) return sendResponse({ok:false, error:'empty_text'});

        // 1) Word lookup (Youdao first, Bing second)
        if(mode === 'word'){
          const q = text;
          const youdaoUrl = `https://dict.youdao.com/result?word=${encodeURIComponent(q)}&lang=en`;
          const bingUrl = `https://www.bing.com/dict/search?q=${encodeURIComponent(q)}`;

          const [youdao, bing] = await Promise.all([
            safeFetchText(youdaoUrl, 9000),
            safeFetchText(bingUrl, 9000)
          ]);

          return sendResponse({
            ok: true,
            mode: 'word',
            youdaoHtml: youdao.ok ? youdao.text : '',
            bingHtml: bing.ok ? bing.text : '',
            youdaoOk: youdao.ok,
            bingOk: bing.ok
          });
        }

        // 2) Sentence translation (BYOK provider pipeline with graceful fallback)
        const q = text;
        const tr = await translatePipeline(q, { targetLang });
        if(!tr.ok){
          return sendResponse({ ok:false, mode:'translate', error: tr.error || 'translate_failed', errors: tr.errors || [] });
        }
        return sendResponse({ ok:true, mode:'translate', translation: tr.text, provider: tr.provider, translations: tr.results || [], resultLimit: tr.resultLimit || 2 });
      }
      if(msg.type === 'TEST_TRANSLATE_PROVIDER'){
        const provider = String(msg.provider||'').trim();
        const text = (msg.text || 'Hello world.').trim();
        const settings = await getSettings();
        const map = {
          relay: ()=>translateRelay(text, settings),
          tencent: ()=>translateTencent(text, settings),
          aliyun: ()=>translateAliyun(text, settings),
          hunyuan: ()=>translateHunyuan(text, settings),
          google_gemini: ()=>translateGoogleGemini(text, settings),
          azure: ()=>translateAzure(text, settings),
          caiyun: ()=>translateCaiyun(text, settings),
          youdao: ()=>translateYoudaoApi(text, settings),
          youdao_web: ()=>translateYoudaoWeb(text),
          baidu_web: ()=>translateBaiduWeb(text),
          fallback_google: ()=>safeTranslateZh(text, 9000).then(r=> r.ok ? ({ok:true, text:r.text, provider:'fallback_google'}) : ({ok:false, error:r.error || 'fallback_failed'}))
        };
        const fn = map[provider];
        if(!fn) return sendResponse({ok:false, error:'unknown_provider'});
        try{
          const r = await fn();
          if(r && r.ok && r.text){
            return sendResponse({ok:true, result:{ok:true, text:r.text}});
          }
          return sendResponse({ok:true, result:{ok:false, error:r?.error || 'failed', detail:r?.detail || ''}});
        }catch(e){
          return sendResponse({ok:true, result:{ok:false, error:String(e?.message||e), detail:''}});
        }
      }
      return sendResponse({ok:false, error:'unknown_type'});
    }catch(e){
      return sendResponse({ok:false, error: e && e.message ? e.message : String(e)});
    }
  })();
  return true;
});
