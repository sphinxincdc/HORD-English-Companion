'use strict';
const $ = (id)=>document.getElementById(id);

async function load(){
  // MV3: storage.get 不接受 null；获取全部必须省略参数
  const db = await new Promise(res=>chrome.storage.local.get(res));
  $('licenseCode').value = db.licenseCode || '';

  // existing
  $('aliyunId').value = db.aliyunId || '';
  $('aliyunKey').value = db.aliyunKey || '';
  $('tencentId').value = db.tencentId || '';
  $('tencentKey').value = db.tencentKey || '';

  // new (BYOK)
  $('azureKey').value = db.azureKey || '';
  $('azureRegion').value = db.azureRegion || '';
  $('caiyunToken').value = db.caiyunToken || '';
  $('youdaoAppKey').value = db.youdaoAppKey || '';
  $('youdaoAppSecret').value = db.youdaoAppSecret || '';
}

async function save(){
  const patch = {
    licenseCode: $('licenseCode').value.trim(),

    aliyunId: $('aliyunId').value.trim(),
    aliyunKey: $('aliyunKey').value.trim(),
    tencentId: $('tencentId').value.trim(),
    tencentKey: $('tencentKey').value.trim(),

    azureKey: $('azureKey').value.trim(),
    azureRegion: $('azureRegion').value.trim(),
    caiyunToken: $('caiyunToken').value.trim(),
    youdaoAppKey: $('youdaoAppKey').value.trim(),
    youdaoAppSecret: $('youdaoAppSecret').value.trim(),
  };
  await new Promise(res=>chrome.storage.local.set(patch, res));
  $('status').textContent = '已保存 ✅';
  setTimeout(()=>$('status').textContent='', 1500);
}

function openPage(path){
  chrome.tabs.create({url: chrome.runtime.getURL(path)});
}

document.addEventListener('DOMContentLoaded', ()=>{
  load();
  $('save').addEventListener('click', save);
  $('openManager').addEventListener('click', ()=>openPage('manager.html'));
  $('openReview').addEventListener('click', ()=>openPage('test.html'));
  document.querySelectorAll('[data-test-provider]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const provider = btn.getAttribute('data-test-provider');
      if(!provider) return;
      btn.disabled = true;
      const old = btn.textContent;
      btn.textContent = '测试中...';
      try{
        const r = await new Promise(res=>chrome.runtime.sendMessage({
          type:'TEST_TRANSLATE_PROVIDER',
          provider,
          text:'Hello world. This is a test.'
        }, res));
        if(!r || !r.ok){
          btn.textContent = '失败';
        }else{
          btn.textContent = r.result && r.result.ok ? '✅' : '❌';
        }
      }catch(e){
        btn.textContent = '失败';
      }finally{
        setTimeout(()=>{ btn.textContent = old; btn.disabled = false; }, 1200);
      }
    });
  });
});
