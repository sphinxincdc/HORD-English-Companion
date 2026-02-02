'use strict';

function $(id){ return document.getElementById(id); }

function send(type, payload){
  return new Promise((resolve)=> chrome.runtime.sendMessage({type, payload}, resolve));
}

function normalizeWord(w){ return String(w||'').toLowerCase().trim(); }
function escapeHtml(str){
  return (str ?? '').toString()
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function getStatus(word, db){
  if((db.greenList||[]).includes(word)) return 'green';
  if((db.yellowList||[]).includes(word)) return 'yellow';
  return 'red';
}

function nextIntervalMs(reviewCount){
  const mins = 60*1000, hrs = 60*mins, days = 24*hrs;
  const table = [5*mins, 30*mins, 12*hrs, 1*days, 2*days, 4*days, 7*days, 15*days];
  const i = Math.max(0, Math.min(table.length-1, (reviewCount||0)));
  return table[i];
}

function getNextReviewAt(meta){
  const next = Number(meta?.nextReviewAt)||0;
  if(next) return next;
  const last = Number(meta?.lastReviewAt)||0;
  const c = Number(meta?.reviewCount)||0;
  if(!last) return 0;
  return last + nextIntervalMs(c);
}

function getQueueParams(){
  const sp = new URLSearchParams(location.search || '');
  const mode = sp.get('mode') || '';
  // mode presets from manager cards
  if(mode === 'due_week') return { queue:'due', range:'week', status:'', notes:false };
  if(mode === 'difficult') return { queue:'difficult', range:'', status:'', notes:false };
  if(mode === 'status_red') return { queue:'due', range:'', status:'red', notes:false };
  if(mode === 'status_yellow') return { queue:'due', range:'', status:'yellow', notes:false };
  if(mode === 'status_green') return { queue:'all', range:'', status:'green', notes:false };
  if(mode === 'notes') return { queue:'all', range:'', status:'', notes:true };

  return {
    queue: sp.get('queue') || '',
    range: sp.get('range') || '',
    status: sp.get('status') || '',
    notes: sp.get('notes') === '1'
  };
}

function getReviewConfig(db){
  const cfg = db?.config?.reviewConfig || {};
  const displayRaw = cfg.display || null;
  const displayMode = cfg.displayMode || '';
  const display = displayRaw && typeof displayRaw === 'object'
    ? {
        cn: displayRaw.cn !== false,
        en: displayRaw.en === true,
        note: displayRaw.note === true
      }
    : (displayMode
        ? {
            cn: displayMode === 'cn',
            en: displayMode === 'en',
            note: displayMode === 'note'
          }
        : {cn:true, en:true, note:true});
  return {
    limit: Number(cfg.limit)||20,
    includeRed: cfg.includeRed !== false,
    includeYellow: cfg.includeYellow !== false,
    display
  };
}

function buildQueue(db){
  const now = Date.now();
  const cfg = getReviewConfig(db);
  const qp = getQueueParams();

  const words = Array.isArray(db.vocabList) && db.vocabList.length ? db.vocabList : Object.keys(db.vocabDict||{});
  const out = [];
  const set = new Set();

  // time windows
  const start = new Date(); start.setHours(0,0,0,0);
  const endOfToday = start.getTime() + 24*60*60*1000 - 1;
  const endOfWeek = start.getTime() + 7*24*60*60*1000 - 1;

  if(qp.queue === 'difficult'){
    const list = Array.isArray(db.difficultList) ? db.difficultList : [];
    for(const w0 of list){
      const w = normalizeWord(w0);
      if(!w || set.has(w)) continue;
      const st = getStatus(w, db);
      if(st === 'green') continue;
      set.add(w);
      out.push(w);
      if(out.length >= cfg.limit) break;
    }
    return out;
  }

  for(const w0 of words){
    const w = normalizeWord(w0);
    if(!w || set.has(w)) continue;
    set.add(w);

    const st = getStatus(w, db);
    // status filter from URL
    if(qp.status){
      if(st !== qp.status) continue;
    }else{
      // default behavior: don't review mastered words
      if(st === 'green') continue;
    }
    if(st === 'red' && !cfg.includeRed) continue;
    if(st === 'yellow' && !cfg.includeYellow) continue;
    if(qp.notes){
      const note = (db.vocabNotes||{})[w] || '';
      if(!String(note).trim()) continue;
    }

    const meta = (db.vocabMeta||{})[w] || {};
    const next = getNextReviewAt(meta);
    const isNew = (Number(meta.reviewCount)||0) === 0;
    const isDue = isNew || next === 0 || next <= now;
    if(qp.queue !== 'all'){
      if(!isDue) continue;
    }

    if(qp.queue === 'due' && qp.range){
      if(qp.range === 'today'){
        const dueToday = isNew || next === 0 || next <= endOfToday;
        if(!dueToday) continue;
      }else if(qp.range === 'week'){
        const dueWeek = isNew || next === 0 || next <= endOfWeek;
        if(!dueWeek) continue;
      }
    }

    out.push(w);
  }

  out.sort(()=>Math.random()-0.5);
  return out.slice(0, cfg.limit);
}

let dbCache = null;
let queue = [];
let idx = 0;
let revealed = false;
let sessionStats = {total:0, sum:0, c0:0, c3:0, c5:0};
let reviewPrefs = {display:{cn:true, en:true, note:true}};

function resetSessionStats(){
  sessionStats = {total:0, sum:0, c0:0, c3:0, c5:0};
}

function updateFinishStats(){
  const scoreEl = $('test-score');
  const summaryEl = $('test-summary');
  const encourageEl = $('test-encourage');
  const total = sessionStats.total || 0;
  const score = total ? Math.round((sessionStats.sum / (total * 5)) * 100) : 0;

  if(scoreEl) scoreEl.textContent = `${score} 分`;
  if(summaryEl) summaryEl.textContent = `秒杀 ${sessionStats.c5} · 模糊 ${sessionStats.c3} · 忘了 ${sessionStats.c0}`;

  let msg = '继续加油！';
  if(score >= 90) msg = '太棒了！保持这个势头！';
  else if(score >= 75) msg = '很不错！再刷一轮更稳！';
  else if(score >= 60) msg = '进步明显！再巩固一下！';
  else if(total === 0) msg = '开始复习吧，下一次会更好！';
  if(encourageEl) encourageEl.textContent = msg;
}

function setCardFlipped(on){
  const card = $('test-card-inner');
  if(!card) return;
  card.style.transform = on ? 'rotateY(180deg)' : 'rotateY(0deg)';
}

function updateTopBar(){
  const total = queue.length || 0;
  const cur = Math.min(idx+1, total);
  const idxEl = $('test-idx');
  if(idxEl) idxEl.textContent = total ? `${cur} / ${total}` : `0 / 0`;
  const fill = $('test-progress-fill');
  if(fill) fill.style.width = total ? `${Math.round((cur-1)/total*100)}%` : '0%';
}

function render(){
  const finish = $('test-finish-overlay');
  const card = $('test-card-inner');
  const controls = $('test-srs-controls');

  if(!queue.length || idx >= queue.length){
    if(controls) controls.style.display = 'none';
    if(card) card.style.pointerEvents = 'none';
    if(finish) finish.style.display = 'flex';
    updateFinishStats();
    updateTopBar();
    return;
  }

  if(finish) finish.style.display = 'none';
  if(card) card.style.pointerEvents = 'auto';

  const w = queue[idx];
  const meaning = (dbCache.vocabDict||{})[w] || '';
  const enRaw = (dbCache.vocabEn||{})[w] || [];
  const enList = Array.isArray(enRaw) ? enRaw : String(enRaw||'').split(/\s*\|\s*|\s*;\s*|\s*\n\s*/).filter(Boolean);
  const enMeaning = enList.join('；');
  const note = (dbCache.vocabNotes||{})[w] || '';
  const ph = (dbCache.vocabPhonetics||{})[w] || {};
  const meta = (dbCache.vocabMeta||{})[w] || {};
  const st = getStatus(w, dbCache);

  // front
  $('test-q-word').textContent = w;
  const cloze = $('test-cloze-container');
  if(cloze){
    cloze.textContent = st === 'red' ? '请回忆这个单词的释义 / 用法' : '请回忆释义，并尝试造句';
  }

  // back
  $('test-ans-word').textContent = w;
  const phEl = $('test-ans-ph');
  if(phEl){
    const us = ph.us || '';
    const uk = ph.uk || '';
    phEl.innerHTML = (us || uk)
      ? `<span class="flag flag-us" aria-hidden="true"></span> ${escapeHtml(us||'-')}&nbsp;&nbsp;<span class="flag flag-uk" aria-hidden="true"></span> ${escapeHtml(uk||'-')}`
      : '';
  }
  const defEl = $('test-ans-def');
  if(defEl){
    const parts = [];
    if(reviewPrefs.display.cn){
      parts.push(`<div style="margin-bottom:10px;"><div style="font-weight:700;color:#333;margin-bottom:6px;">中文释义</div><div>${escapeHtml(meaning || '（暂无释义，建议回到网页弹窗补全一次）')}</div></div>`);
    }
    if(reviewPrefs.display.en){
      parts.push(`<div style="margin-bottom:10px;"><div style="font-weight:700;color:#333;margin-bottom:6px;">英文释义</div><div>${escapeHtml(enMeaning || '（暂无英文释义，建议补全一次）')}</div></div>`);
    }
    defEl.innerHTML = parts.length ? parts.join('') : '';
  }
  const noteEl = $('test-ans-note');
  if(noteEl){
    if(reviewPrefs.display.note){
      noteEl.style.display = 'block';
      noteEl.textContent = `💜 批注：${note || '（暂无批注）'}`;
    }else{
      noteEl.style.display = 'none';
      noteEl.textContent = '';
    }
  }

  // controls hidden until reveal
  revealed = false;
  setCardFlipped(false);
  if(controls) controls.style.display = 'none';

  // update progress
  updateTopBar();

  // subtle hint on mastery
  try{
    const m = Math.round(Number(meta.mastery)||0);
    document.title = `复习：${w}（掌握度 ${m}）`;
  }catch(_){}
}

async function applyConfigAndStart(){
  const limit = Number($('cfg-limit')?.value||20) || 20;
  const includeRed = !!$('cfg-red')?.checked;
  const includeYellow = !!$('cfg-yellow')?.checked;
  const display = {
    cn: !!$('cfg-display-cn')?.checked,
    en: !!$('cfg-display-en')?.checked,
    note: !!$('cfg-display-note')?.checked
  };
  if(!display.cn && !display.en && !display.note){
    display.cn = true;
  }

  await send('OP_SET_REVIEW_CONFIG', {limit, includeRed, includeYellow, display});
  reviewPrefs = {display};

  const res = await send('OP_GET_STATE');
  dbCache = res?.db || {};
  queue = buildQueue(dbCache);
  idx = 0;
  resetSessionStats();
  render();
}

function reveal(){
  if(revealed) return;
  revealed = true;
  setCardFlipped(true);
  const controls = $('test-srs-controls');
  if(controls) controls.style.display = 'flex';
  const fill = $('test-progress-fill');
  if(fill && queue.length){
    fill.style.width = `${Math.round((idx)/queue.length*100)}%`;
  }
}

async function rate(quality){
  if(!queue.length || idx >= queue.length) return;
  const w = queue[idx];
  const q = Number(quality||0);
  sessionStats.total += 1;
  sessionStats.sum += q;
  if(q >= 5) sessionStats.c5 += 1;
  else if(q >= 3) sessionStats.c3 += 1;
  else sessionStats.c0 += 1;
  const res = await send('OP_RATE_WORD', {word:w, quality});
  // refresh cache quickly
  if(res?.ok && res.meta){
    dbCache.vocabMeta = dbCache.vocabMeta || {};
    dbCache.vocabMeta[w] = res.meta;
  }
  idx += 1;
  render();
}

function wire(){
  const closeBtn = $('test-close');
  if(closeBtn) closeBtn.addEventListener('click', ()=> window.close());

  const backMgr = $('test-back-mgr');
  if(backMgr) backMgr.addEventListener('click', ()=>{
    chrome.tabs?.create ? chrome.tabs.create({url: chrome.runtime.getURL('manager.html')}) : (location.href = chrome.runtime.getURL('manager.html'));
  });

  const applyBtn = $('cfg-apply');
  if(applyBtn){
    applyBtn.addEventListener('click', async ()=>{
      applyBtn.disabled = true;
      applyBtn.style.opacity = '0.75';
      try{ await applyConfigAndStart(); } finally{
        applyBtn.disabled = false;
        applyBtn.style.opacity = '1';
      }
    });
  }

  const card = $('test-card-inner');
  if(card){
    card.addEventListener('click', ()=> reveal());
  }

  // rate buttons
  document.querySelectorAll('.test-rate-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const q = Number(btn.getAttribute('data-q')||0);
      rate(q);
    });
  });

  // keyboard
  window.addEventListener('keydown', (e)=>{
    if(e.code === 'Space'){
      e.preventDefault();
      if(!revealed) reveal();
    }
    if(revealed){
      if(e.key === '1') rate(0);
      if(e.key === '2') rate(3);
      if(e.key === '3') rate(5);
    }
  });
}

async function start(){
  wire();
  const res = await send('OP_GET_STATE');
  dbCache = res?.db || {};
  // init UI from config
  const cfg = getReviewConfig(dbCache);
  if($('cfg-limit')) $('cfg-limit').value = String(cfg.limit||20);
  if($('cfg-red')) $('cfg-red').checked = !!cfg.includeRed;
  if($('cfg-yellow')) $('cfg-yellow').checked = !!cfg.includeYellow;
  if($('cfg-display-cn')) $('cfg-display-cn').checked = cfg.display.cn !== false;
  if($('cfg-display-en')) $('cfg-display-en').checked = cfg.display.en === true;
  if($('cfg-display-note')) $('cfg-display-note').checked = cfg.display.note === true;
  reviewPrefs = {display: cfg.display};

  queue = buildQueue(dbCache);
  idx = 0;
  resetSessionStats();
  render();
}

start();
