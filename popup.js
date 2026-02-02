'use strict';

const $ = (id)=>document.getElementById(id);
let activeUrl = '';
let activeTitle = '';

function openPage(path){
  chrome.tabs.create({url: chrome.runtime.getURL(path)});
}

function uniq(arr){
  return Array.from(new Set(arr));
}

function norm(s){
  return String(s||'').trim();
}

async function getActiveTab(){
  const tabs = await chrome.tabs.query({active:true, currentWindow:true});
  return tabs && tabs[0] ? tabs[0] : null;
}

function pageKey(url){
  try{ return String(url||'').split('#')[0]; }catch(e){ return ''; }
}

function domainKey(url){
  try{ return new URL(url).hostname; }catch(e){ return ''; }
}

async function getDB(keys){
  return await new Promise(res=>{
    if(!keys) chrome.storage.local.get(r=>res(r));
    else chrome.storage.local.get(keys, r=>res(r));
  });
}

async function setDB(patch){
  return await new Promise(res=>chrome.storage.local.set(patch, res));
}

async function sendMsg(msg){
  return await new Promise(res=>chrome.runtime.sendMessage(msg, r=>res(r)));
}

function setError(text){
  $('err').style.display = text ? 'block' : 'none';
  $('err').textContent = text || '';
}

function setOut(text){
  $('out').style.display = text ? 'block' : 'none';
  $('out').textContent = text || '';
}

function isLikelyWord(text){
  // single token (allow apostrophe, hyphen)
  const t = norm(text);
  if(!t) return false;
  if(t.length > 48) return false;
  if(/[\s\n\r\t]/.test(t)) return false;
  return true;
}

async function doTranslate(text){
  const t = norm(text);
  if(!t) return null;
  const r = await sendMsg({type:'GET_TRANSLATIONS', text: t, mode:'translate'});
  if(r && r.ok){
    return {text: r.translation || '', translations: Array.isArray(r.translations) ? r.translations : []};
  }
  return {text:'', translations:[]};
}


async function addWordOrSentence(text, translation){
  const t = norm(text);
  if(!t) return {ok:false, error:'empty'};
  if(isLikelyWord(t)){
    return await sendMsg({
      type:'UPSERT_WORD',
      word: t,
      meaning: translation || '',
      status:'yellow'
    });
  }else{
    return await sendMsg({
      type:'ADD_SENTENCE', forceUrl: (typeof location!=='undefined'?location.href:''),
      text: t,
      translation: translation || '',
      url: activeUrl,
      title: activeTitle
    });
  }
}

(async function init(){
  try{
    const m = chrome.runtime.getManifest();
    $('ver').textContent = 'Version ' + m.version;
  }catch(e){}

  $('openManager').addEventListener('click', ()=>openPage('manager.html'));
  $('openReview').addEventListener('click', ()=>openPage('test.html'));
  $('openOptions').addEventListener('click', ()=>openPage('options.html'));

  const tab = await getActiveTab();
  activeUrl = tab && tab.url ? tab.url : '';
  activeTitle = tab && tab.title ? tab.title : '';
  const url = activeUrl;
  const title = activeTitle;
  const dKey = (domainKey(url)||'').toLowerCase();
  const pKey = (pageKey(url)||'').toLowerCase();
  $('domainLabel').textContent = dKey || '当前域名';
  $('pageLabel').textContent = pKey ? (pKey.length>44 ? pKey.slice(0,44)+'…' : pKey) : '当前页';

  const db = await getDB(['blacklist_domain','blacklist_page','global_disable']);
  const blDomain = Array.isArray(db.blacklist_domain) ? db.blacklist_domain.map(x=>String(x||'').toLowerCase()) : [];
  const blPage = Array.isArray(db.blacklist_page) ? db.blacklist_page.map(x=>String(x||'').toLowerCase()) : [];
  const gOff = !!db.global_disable;

  // IMPORTANT: switches represent "disabled"
  $('swGlobal').checked = gOff;
  $('swDomain').checked = dKey ? blDomain.includes(dKey) : false;
  $('swPage').checked = pKey ? blPage.includes(pKey) : false;

  function paintToggleRows(){
    const setOn = (rowId, on)=>{ const el = $(rowId); if(el) el.dataset.on = on ? '1' : '0'; };
    setOn('rowGlobal', $('swGlobal').checked);
    setOn('rowDomain', $('swDomain').checked);
    setOn('rowPage', $('swPage').checked);
  }
  paintToggleRows();

  async function syncSwitches(){
    const nextGlobal = $('swGlobal').checked;
    const nextDomainOff = $('swDomain').checked;
    const nextPageOff = $('swPage').checked;

    let nextBlDomain = blDomain.slice();
    let nextBlPage = blPage.slice();

    if(dKey){
      if(nextDomainOff && !nextBlDomain.includes(dKey)) nextBlDomain.push(dKey);
      if(!nextDomainOff) nextBlDomain = nextBlDomain.filter(x=>x!==dKey);
    }
    if(pKey){
      if(nextPageOff && !nextBlPage.includes(pKey)) nextBlPage.push(pKey);
      if(!nextPageOff) nextBlPage = nextBlPage.filter(x=>x!==pKey);
    }

    await setDB({
      global_disable: nextGlobal,
      blacklist_domain: uniq(nextBlDomain),
      blacklist_page: uniq(nextBlPage)
    });

    // Update local mirrors so additional toggles are consistent
    blDomain.length = 0; blDomain.push(...uniq(nextBlDomain));
    blPage.length = 0; blPage.push(...uniq(nextBlPage));

    paintToggleRows();
  }

  $('swGlobal').addEventListener('change', syncSwitches);
  $('swDomain').addEventListener('change', syncSwitches);
  $('swPage').addEventListener('change', syncSwitches);

  async function runTranslate(){
    setError('');
    setOut('');
    const q = norm($('q').value);
    if(!q) return;
    $('btnTranslate').disabled = true;
    try{
      const res = await doTranslate(q);
      const t = res && res.text ? res.text : '';
      if(res && Array.isArray(res.translations) && res.translations.length >= 2){
        const lines = res.translations.slice(0,2).map((it, idx)=>{
          const label = it.provider ? `翻译 ${idx+1}（${it.provider}）` : `翻译 ${idx+1}`;
          return `${label}: ${it.text || ''}`;
        });
        setOut(lines.join('\n'));
      }else if(t){
        setOut(t);
      }
      else setOut('（无结果）');
    }catch(e){
      setError(String(e && e.message ? e.message : e));
    }finally{
      $('btnTranslate').disabled = false;
    }
  }

  async function runAdd(){
    setError('');
    const q = norm($('q').value);
    if(!q) return;
    $('btnAdd').disabled = true;
    try{
      const res = await doTranslate(q);
      const t = res && res.text ? res.text : '';
      const r = await addWordOrSentence(q, t);
      if(r && r.ok){
        setOut(isLikelyWord(q) ? '已添加到单词本 ✅' : '已收藏句子 ✅');
      }else{
        setError((r && r.error) ? String(r.error) : '添加失败');
      }
    }catch(e){
      setError(String(e && e.message ? e.message : e));
    }finally{
      $('btnAdd').disabled = false;
    }
  }

  $('btnTranslate').addEventListener('click', runTranslate);
  $('btnAdd').addEventListener('click', runAdd);
  $('q').addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      runTranslate();
    }
  });
})();
