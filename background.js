// === DB schema versioning ===
const DB_VERSION = 1;

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

/**
 * Minimal background service worker.
 * Goal: keep extension stable, and provide a single place to upsert vocab/sentences.
 * (Translation providers can be added back later.)
 */

const LIMIT_FREE = 999999; // dev: unlimited

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

function isPro(db){
  const code = (db.licenseCode || '').trim();
  return code.length > 0;
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
  // Unofficial but widely used endpoint; if blocked, we gracefully degrade.
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=' + encodeURIComponent(text);
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

async function getSettings(){
  // Keys are stored at root for simplicity.
  const keys = ['azureKey','azureRegion','tencentId','tencentKey','aliyunId','aliyunKey','caiyunToken'];
  return await new Promise(r=>chrome.storage.local.get(keys, r));
}

async function translateAzure(text, settings){
  const key = (settings.azureKey||'').trim();
  const region = (settings.azureRegion||'').trim();
  if(!key || !region) return {ok:false, error:'azure_missing_key_or_region'};
  const url = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=zh-Hans';
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

async function translateCaiyun(text, settings){
  const token = (settings.caiyunToken||'').trim();
  if(!token) return {ok:false, error:'caiyun_missing_token'};
  const url = 'https://api.interpreter.caiyunai.com/v1/translator';
  try{
    const res = await fetchWithTimeout(url, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Authorization': 'token ' + token,
      },
      body: JSON.stringify({
        source: String(text||''),
        trans_type: 'auto2zh',
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

async function translateTencent(text, settings){
  const secretId = (settings.tencentId||'').trim();
  const secretKey = (settings.tencentKey||'').trim();
  if(!secretId || !secretKey) return {ok:false, error:'tencent_missing_key'};

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
    Target: 'zh',
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

async function translateAliyun(text, settings){
  const accessKeyId = (settings.aliyunId||'').trim();
  const accessKeySecret = (settings.aliyunKey||'').trim();
  if(!accessKeyId || !accessKeySecret) return {ok:false, error:'aliyun_missing_key'};

  // Alibaba Cloud Machine Translation (MT) RPC API
  const endpoint = 'https://mt.cn-hangzhou.aliyuncs.com/';
  const query = {
    Action: 'TranslateGeneral',
    Version: '2018-10-12',
    Format: 'JSON',
    RegionId: 'cn-hangzhou',
    AccessKeyId: accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: String(Date.now()) + String(Math.random()).slice(2),
    Timestamp: new Date().toISOString(),
    SourceLanguage: 'auto',
    TargetLanguage: 'zh',
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

async function translatePipeline(text){
  const settings = await getSettings();
  const providers = [
    ()=>translateAzure(text, settings),
    ()=>translateTencent(text, settings),
    ()=>translateAliyun(text, settings),
    ()=>translateCaiyun(text, settings),
    ()=>safeTranslateZh(text, 9000).then(r=> r.ok ? ({ok:true, text:r.text, provider:'fallback_google'}) : ({ok:false, error:r.error || 'fallback_failed'}))
  ];
  const errors = [];
  const results = [];
  const seen = new Set();
  for(const fn of providers){
    const r = await fn();
    if(r && r.ok && r.text){
      const t = String(r.text||'').trim();
      if(t && !seen.has(t)){
        seen.add(t);
        results.push({text:t, provider:r.provider || 'unknown'});
      }
      if(results.length >= 2) break;
    }else if(r && !r.ok){
      errors.push({provider:r.provider||'unknown', error:r.error, detail:r.detail});
    }
  }
  if(results.length){
    return {ok:true, text: results[0].text, provider: results[0].provider, results};
  }
  return {ok:false, error:'all_providers_failed', errors};
}

const KEY_DB = 'vocab_builder_db';

async function getDB(){
  // Read both packed DB and legacy root keys, then MERGE (never overwrite user data with smaller snapshots).
  const keys = [KEY_DB,
    'vocabList','vocabDict','vocabNotes','vocabMeta','vocabEn','vocabPhonetics','vocabAudio','yellowList','greenList',
    'collectedSentences','sentenceDict','sentenceNotes','sentenceMeta','difficultList','config','licenseCode','licenseKey','isPro'
  ];
  const res = await new Promise(r=>chrome.storage.local.get(keys, r));
  const packed = res && res[KEY_DB] ? res[KEY_DB] : null;

  // Build a legacy/root snapshot (may already be mirrored by setDB, but can also contain "more" data after an update mismatch).
  const rootHasAny = !!(res.vocabList?.length || (res.vocabDict && Object.keys(res.vocabDict).length) || (res.collectedSentences && res.collectedSentences.length));
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
  } : null;

  // If only packed exists and no root data, return packed.
  if(packed && !root){ return packed; }

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
    };
    try{ await setDB(empty); }catch(_){}
    return empty;
  }

  // If only root exists, migrate into packed.
  if(!packed && root){
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

  return merged;
}

async function setDB(db){
  // Write-through compatibility layer:
  // - Newer builds may read a single packed KEY_DB
  // - Existing pages/content scripts in this project read legacy root keys
  // To avoid "added but not visible" issues, always mirror to root keys.
  const flat = {
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
    config: db.config || {},
    // keep these if present
    licenseCode: db.licenseCode || db.licenseKey || '',
    isPro: !!db.isPro,
  };
  return await new Promise(res=>chrome.storage.local.set({[KEY_DB]: db, ...flat}, res));
}

async function upsertWord(payload){
  const word = String(payload.word||'').trim().toLowerCase();
  if(!word) return {ok:false, error:'empty word'};

  const db = await getDB();
  normalizeVocabKeys(db);
  const pro = isPro(db);

  db.vocabList = uniqLower(db.vocabList||[]);
  if(!db.vocabList.includes(word)) db.vocabList.push(word);

  if(!pro && db.vocabList.length > LIMIT_FREE){
    // rollback add
    db.vocabList = db.vocabList.filter(w=>w!==word);
    return {ok:false, error:`FREE_LIMIT_${LIMIT_FREE}`};
  }

  db.vocabDict = db.vocabDict || {};
  db.vocabNotes = db.vocabNotes || {};
  db.vocabMeta = db.vocabMeta || {};
  db.vocabEn = db.vocabEn || {};
  db.vocabPhonetics = db.vocabPhonetics || {};
  db.vocabAudio = db.vocabAudio || {};
  db.yellowList = uniqLower(db.yellowList||[]);
  db.greenList = uniqLower(db.greenList||[]);

  if(payload.meaning !== undefined){
    const m = String(payload.meaning||'').trim();
    if(m) db.vocabDict[word] = m;
  }
  if(payload.note !== undefined){
    const n = String(payload.note||'').trim();
    if(n) db.vocabNotes[word] = n;
  }
  if(Array.isArray(payload.englishMeaning) && payload.englishMeaning.length){
    db.vocabEn[word] = payload.englishMeaning.slice(0, 6);
  }
  if(payload.status){
    const st = String(payload.status).toLowerCase();
    db.yellowList = db.yellowList.filter(x=>x!==word);
    db.greenList = db.greenList.filter(x=>x!==word);
    if(st === 'yellow') db.yellowList.push(word);
    if(st === 'green') db.greenList.push(word);
  }
  if(payload.phonetics){
    db.vocabPhonetics[word] = db.vocabPhonetics[word] || {};
    if(payload.phonetics.us) db.vocabPhonetics[word].us = payload.phonetics.us;
    if(payload.phonetics.uk) db.vocabPhonetics[word].uk = payload.phonetics.uk;
  }
  if(payload.audio){
    db.vocabAudio[word] = db.vocabAudio[word] || {};
    if(payload.audio.us) db.vocabAudio[word].us = payload.audio.us;
    if(payload.audio.uk) db.vocabAudio[word].uk = payload.audio.uk;
  }

  db.vocabMeta[word] = db.vocabMeta[word] || { createdAt: nowTs(), updatedAt: nowTs(), reviewCount: 0, lastReviewAt: 0 };
  db.vocabMeta[word].updatedAt = nowTs();

  await setDB(db);
  return {ok:true};
}

async function addSentence(payload){
  const text = String(payload.text||'').trim();
  if(!text) return {ok:false, error:'empty sentence'};
  const db = await getDB();
  db.collectedSentences = db.collectedSentences || [];
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
  if(ex && typeof ex === 'object'){
    // merge non-empty fields
    if(!ex.translation && translation) ex.translation = translation;
    if(!ex.url && url) ex.url = url;
    if(!ex.title && title) ex.title = title;
    if(!ex.note && note) ex.note = note;
    await setDB(db);
  }else if(!ex){
    db.collectedSentences.push({text, translation, url, title, note, createdAt: nowTs()});
    await setDB(db);
  }
  return {ok:true};
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async ()=>{
    try{
      if(!msg || !msg.type) return sendResponse({ok:false, error:'no type'});

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
        return sendResponse({ok:true, db});
      }

      if(msg.type === 'OP_DELETE_WORDS'){
        const words = (msg.words || msg.payload?.words || []).map(w=>String(w||'').trim().toLowerCase()).filter(Boolean);
        const db = await getDB();
        if(words.length){
          const set = new Set(words);
          db.vocabList = (db.vocabList||[]).filter(w=>!set.has(w));
          for(const w of words){
            if(db.vocabDict) delete db.vocabDict[w];
            if(db.vocabNotes) delete db.vocabNotes[w];
            if(db.vocabMeta) delete db.vocabMeta[w];
            if(db.vocabEn) delete db.vocabEn[w];
            if(db.vocabPhonetics) delete db.vocabPhonetics[w];
            if(db.vocabAudio) delete db.vocabAudio[w];
          }
          db.yellowList = (db.yellowList||[]).filter(w=>!set.has(w));
          db.greenList  = (db.greenList||[]).filter(w=>!set.has(w));
          await setDB(db);
        }
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_CLEAR_ALL_WORDS'){
        const db = await getDB();
        db.vocabList = [];
        db.vocabDict = {};
        db.vocabNotes = {};
        db.vocabMeta = {};
        db.vocabEn = {};
        db.vocabPhonetics = {};
        db.vocabAudio = {};
        db.yellowList = [];
        db.greenList = [];
        await setDB(db);
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_SET_WORD_NOTE'){
        const db = await getDB();
        const payload = msg.payload || msg;
        const word = String(payload.word||'').trim().toLowerCase();
        if(!word) return sendResponse({ok:false, error:'empty_word'});
        const noteRaw = payload.note ?? '';
        const note = String(noteRaw).trim();
        db.vocabNotes = db.vocabNotes || {};
        if(note){
          db.vocabNotes[word] = note;
        }else{
          delete db.vocabNotes[word];
        }
        await setDB(db);
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_SET_WORD_STATUS'){
        const db = await getDB();
        const words = (msg.words || msg.payload?.words || (msg.word?[msg.word]:[]) || []).map(w=>String(w||'').trim()).filter(Boolean);
        let status = msg.status ?? msg.payload?.status ?? msg.newStatus ?? msg.payload?.newStatus ?? '';
        status = String(status||'').toLowerCase();
        if(!words.length) return sendResponse({ok:false, error:'no words'});
        // normalize
        if(status === '陌生' || status === 'red') status = 'red';
        if(['new','unknown'].includes(status)) status = 'red';
        const set = new Set(words);
        db.yellowList = (db.yellowList||[]).filter(w=>!set.has(w));
        db.greenList  = (db.greenList||[]).filter(w=>!set.has(w));
        if(status === 'yellow'){
          db.yellowList = Array.from(new Set([...(db.yellowList||[]), ...words]));
        }else if(status === 'green'){
          db.greenList = Array.from(new Set([...(db.greenList||[]), ...words]));
        }else{
          // red/clear => only remove highlights; for clear use delete op separately
        }
        // meta status
        db.vocabMeta = db.vocabMeta || {};
        const now = Date.now();
        for(const w of words){
          db.vocabMeta[w] = db.vocabMeta[w] || {};
          db.vocabMeta[w].status = status;
          db.vocabMeta[w].updatedAt = now;
        }
        await setDB(db);
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_DELETE_SENTENCES'){
        const ids = (msg.ids || msg.payload?.ids || []).map(x=>Number(x)).filter(x=>Number.isFinite(x));
        const db = await getDB();
        if(ids.length){
          const set = new Set(ids);
          db.collectedSentences = (db.collectedSentences||[]).filter(s=>!set.has(Number(s.createdAt||s.id)));
          if(db.sentenceDict){
            for(const k of Object.keys(db.sentenceDict)){
              const s = db.sentenceDict[k];
              const sid = Number(s?.createdAt||s?.id);
              if(set.has(sid)) delete db.sentenceDict[k];
            }
          }
          if(db.sentenceNotes){
            for(const k of Object.keys(db.sentenceNotes)){
              if(set.has(Number(k))) delete db.sentenceNotes[k];
            }
          }
          if(db.sentenceMeta){
            for(const k of Object.keys(db.sentenceMeta)){
              if(set.has(Number(k))) delete db.sentenceMeta[k];
            }
          }
          await setDB(db);
        }
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_UPDATE_SENTENCE'){
        const p = msg.payload || msg;
        const id = Number(p.id || p.createdAt || p.sentenceId);
        if(!Number.isFinite(id)) return sendResponse({ok:false, error:'bad_id'});
        const db = await getDB();
        const arr = db.collectedSentences || [];
        const item = arr.find(s=>Number(s.createdAt||s.id) === id);
        if(!item) return sendResponse({ok:false, error:'not_found'});
        if(p.translation !== undefined){
          const t = String(p.translation||'').trim();
          if(t) item.translation = t;
        }
        if(p.url !== undefined){
          const u = String(p.url||'').trim();
          if(u) item.url = u;
        }
        if(p.title !== undefined){
          const tt = String(p.title||'').trim();
          if(tt) item.title = tt;
        }
        if(p.note !== undefined){
          const n = String(p.note||'').trim();
          item.note = n; // allow clearing
        }
        await setDB(db);
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_UPSERT_BULK'){
        const payload = msg.payload || {};
        const words = payload.words || [];
        const sentences = payload.sentences || [];
        const db = await getDB();
        normalizeVocabKeys(db);
        // words
        db.vocabList = db.vocabList || [];
        db.vocabDict = db.vocabDict || {};
        db.vocabNotes = db.vocabNotes || {};
        db.vocabMeta = db.vocabMeta || {};
        db.vocabPhonetics = db.vocabPhonetics || {};
        db.vocabAudio = db.vocabAudio || {};
        db.vocabEn = db.vocabEn || {};
        const listSet = new Set(db.vocabList);
        const now = Date.now();
        for(const w of words){
          const word = String(w.word||'').trim().toLowerCase();
          if(!word) continue;
          if(!listSet.has(word)){ db.vocabList.push(word); listSet.add(word); }
          if(w.meaning!=null){
            const m = String(w.meaning||'').trim();
            if(m) db.vocabDict[word] = m; // avoid overwriting existing meaning with blank
          }
          if(w.note!=null){
            const n = String(w.note||'').trim();
            if(n) db.vocabNotes[word] = n; // avoid overwriting existing note with blank
          }
          db.vocabMeta[word] = Object.assign(db.vocabMeta[word]||{}, {
            status: (w.status||db.vocabMeta[word]?.status||'').toLowerCase() || 'red',
            reviewCount: w.reviewCount ?? db.vocabMeta[word]?.reviewCount ?? 0,
            createdAt: w.createdAt ?? db.vocabMeta[word]?.createdAt ?? now,
            updatedAt: w.updatedAt ?? now,
            sourceUrl: w.sourceUrl ?? db.vocabMeta[word]?.sourceUrl ?? '',
            sourceLabel: w.sourceLabel ?? db.vocabMeta[word]?.sourceLabel ?? ''
          });
          if(w.englishMeaning != null){
            const em = Array.isArray(w.englishMeaning)
              ? w.englishMeaning
              : String(w.englishMeaning||'').split(/\s*\|\s*|\s*;\s*|\s*\n\s*/).filter(Boolean);
            if(em.length) db.vocabEn[word] = em.slice(0, 6);
          }
          if(w.phoneticUS || w.phoneticUK){
            db.vocabPhonetics[word] = {us:w.phoneticUS||'', uk:w.phoneticUK||''};
          }
          if(w.audioUS || w.audioUK){
            db.vocabAudio[word] = {us:w.audioUS||'', uk:w.audioUK||''};
          }
        }
        // sentences (dedupe by id and text; do not overwrite existing translation with blank)
        db.collectedSentences = db.collectedSentences || [];
        const existingSentIds = new Set(db.collectedSentences.map(s=>Number(s.createdAt||s.id)));
        const existingSentText = new Map(db.collectedSentences.map(s=>[String(s.text||'').trim().toLowerCase(), s]));
        for(const s of sentences){
          const text = String(s.text||s.sentence||'').trim();
          if(!text) continue;
          const key = text.toLowerCase();
          const id = Number(s.createdAt||s.id||Date.now()+Math.floor(Math.random()*1000));
          const t = String(s.translation||s.trans||'').trim();
          const ex = existingSentText.get(key);
          if(ex){
            if(!ex.translation && t) ex.translation = t;
            if(!ex.note && s.note) ex.note = s.note;
            if(!ex.url && s.url) ex.url = s.url;
            if(!ex.title && s.title) ex.title = s.title;
            if(!ex.sourceLabel && s.sourceLabel) ex.sourceLabel = s.sourceLabel;
            continue;
          }
          if(existingSentIds.has(id)) continue;
          const item = {
            text,
            translation: t,
            note: String(s.note||'').trim(),
            url: String(s.url||'').trim(),
            title: String(s.title||'').trim(),
            sourceLabel: String(s.sourceLabel||'').trim(),
            createdAt: id
          };
          db.collectedSentences.push(item);
          existingSentIds.add(id);
          existingSentText.set(key, item);
        }
        await setDB(db);
        return sendResponse({ok:true});
      }
      if(msg.type === 'OP_SET_REVIEW_CONFIG'){
        const cfg = msg.payload || msg;
        const db = await getDB();
        db.config = db.config || {};
        const display = (cfg.display && typeof cfg.display === 'object') ? {
          cn: cfg.display.cn !== false,
          en: cfg.display.en === true,
          note: cfg.display.note === true
        } : null;
        const displayMode =
          display ? (display.note ? 'note' : display.en ? 'en' : 'cn') :
          (cfg.displayMode || db.config.reviewConfig?.displayMode || 'cn');
        db.config.reviewConfig = {
          limit: Number(cfg.limit) || 20,
          includeRed: cfg.includeRed !== false,
          includeYellow: cfg.includeYellow !== false,
          displayMode,
          display: display || db.config.reviewConfig?.display || {cn:true,en:false,note:false}
        };
        await setDB(db);
        return sendResponse({ok:true});
      }

      if(msg.type === 'OP_RATE_WORD'){
        const {word, quality} = msg.payload || {};
        const w = String(word||'').trim().toLowerCase();
        if(!w) return sendResponse({ok:false, error:'empty_word'});
        const q = Number(quality);
        const db = await getDB();
        db.vocabMeta = db.vocabMeta || {};
        const meta = db.vocabMeta[w] || {};
        const now = Date.now();
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
        await setDB(db);
        return sendResponse({ok:true, meta});
      }


      if(msg.type === 'GET_TRANSLATIONS'){
        const text = (msg.text || '').trim();
        const mode = msg.mode || 'auto'; // 'word' | 'translate' | 'auto'
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
        const tr = await translatePipeline(q);
        if(!tr.ok){
          return sendResponse({ ok:false, mode:'translate', error: tr.error || 'translate_failed', errors: tr.errors || [] });
        }
        return sendResponse({ ok:true, mode:'translate', translation: tr.text, provider: tr.provider, translations: tr.results || [] });
      }
      if(msg.type === 'TEST_TRANSLATE_PROVIDER'){
        const provider = String(msg.provider||'').trim();
        const text = (msg.text || 'Hello world.').trim();
        const settings = await getSettings();
        const map = {
          tencent: ()=>translateTencent(text, settings),
          aliyun: ()=>translateAliyun(text, settings),
          azure: ()=>translateAzure(text, settings),
          caiyun: ()=>translateCaiyun(text, settings),
          fallback_google: ()=>safeTranslateZh(text, 9000).then(r=> r.ok ? ({ok:true, text:r.text, provider:'fallback_google'}) : ({ok:false, error:r.error || 'fallback_failed'}))
        };
        const fn = map[provider];
        if(!fn) return sendResponse({ok:false, error:'unknown_provider'});
        try{
          const r = await fn();
          if(r && r.ok && r.text){
            return sendResponse({ok:true, result:{ok:true, text:r.text}});
          }
          return sendResponse({ok:true, result:{ok:false, error:r?.error || 'failed'}});
        }catch(e){
          return sendResponse({ok:true, result:{ok:false, error:String(e?.message||e)}});
        }
      }
      return sendResponse({ok:false, error:'unknown_type'});
    }catch(e){
      return sendResponse({ok:false, error: e && e.message ? e.message : String(e)});
    }
  })();
  return true;
});
