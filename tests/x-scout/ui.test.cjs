const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
test('popup loads persisted settings and starts selected tab with chosen rule',async()=>{
  const dom=new JSDOM(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/popup.html'),'utf8'),{runScripts:'outside-only',url:'https://extension.test'});
  const w=dom.window,calls=[];
  w.chrome={runtime:{sendMessage:async msg=>{
    calls.push(msg);
    if(msg.type==='status')return {ok:true,settings:{rule:'appstore',autoFollow:true,delaySeconds:12,maxFollows:20},run:{enabled:false,follows:0,message:'Ready'}};
    return {ok:true};
  }},tabs:{query:async()=>[{id:7}]},storage:{onChanged:{addListener(){}}}};
  let closed=false;w.close=()=>{closed=true;};
  w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/core.js'),'utf8'));
  w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/popup.js'),'utf8'));await flush();
  assert.equal(w.document.getElementById('rule').value,'connection');
  w.document.getElementById('rule').value='account';
  w.document.getElementById('settings').dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();
  assert.equal(calls.find(c=>c.type==='settings').settings.countryField,'account');
  assert.equal(calls.find(c=>c.type==='start').tabId,7);
  assert.equal(calls.find(c=>c.type==='settings').settings.rule,'custom');
  assert.equal(closed,true);
  dom.window.close();
});
test('records UI renders imported text safely and filters the table',async()=>{
  const dom=new JSDOM(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/records.html'),'utf8'),{runScripts:'outside-only',url:'https://extension.test'});
  const w=dom.window;
  w.chrome={runtime:{sendMessage:async msg=>msg.type==='all'?{ok:true,records:[{handle:'example',connectedVia:'US App Store',accountBasedIn:'United States',followStatus:'followed',checkedAt:'2026-01-01',note:'<img src=x onerror=alert(1)>'}]}:{ok:true,settings:{rule:'appstore'}}},storage:{onChanged:{addListener(){}}}};
  w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/core.js'),'utf8'));w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/records.js'),'utf8'));await flush();
  assert.equal(w.document.getElementById('total').textContent,'1');
  assert.equal(w.document.getElementById('matches').textContent,'1');
  assert.equal(w.document.querySelectorAll('#rows tr').length,1);
  assert.equal(w.document.querySelector('#rows img'),null);
  const search=w.document.getElementById('search');search.value='canada';search.dispatchEvent(new w.Event('input'));
  assert.equal(w.document.querySelectorAll('#rows tr').length,0);
  dom.window.close();
});

test('real records-tab messages render and export the persisted log through the background',async()=>{
  const {harness}=require('./helpers.cjs');
  const record={handle:'saveduser',connectedVia:'US App Store',accountBasedIn:'United States',followStatus:'followed',status:'checked',checkedAt:'2026-01-01',note:'Saved before follow'};
  const h=harness({'profile:saveduser':record});h.tab.active=false;
  const dom=new JSDOM(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/records.html'),'utf8'),{runScripts:'outside-only',url:'chrome-extension://scout-test/records.html'});
  const w=dom.window,downloads=[],blobs=[];
  const sender={id:'scout-test',url:w.location.href,tab:{id:2}};
  w.chrome={runtime:{sendMessage:msg=>h.send(msg.type,msg,sender)},storage:{onChanged:{addListener(){}}}};
  w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:scout-export';};
  w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
  w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/core.js'),'utf8'));w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/records.js'),'utf8'));await flush();
  assert.equal(w.document.querySelector('#rows a').textContent,'@saveduser');
  assert.equal(w.document.getElementById('followed').textContent,'1');
  w.document.getElementById('json').click();await flush();
  w.document.getElementById('csv').click();await flush();
  assert.equal(downloads.length,2);assert.match(downloads[0],/\.json$/);assert.match(downloads[1],/\.csv$/);
  const read=blob=>new Promise(resolve=>{const reader=new w.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});
  assert.equal(JSON.parse(await read(blobs[0])).records[0].handle,'saveduser');
  assert.match(await read(blobs[1]),/saveduser/);
  assert.equal(h.data['profile:saveduser'].followStatus,'followed');
  dom.window.close();
});

test('saved-text library tab can add, deduplicate, display and delete reusable text',async()=>{
  const {harness}=require('./helpers.cjs');const h=harness();
  const dom=new JSDOM(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/library.html'),'utf8'),{runScripts:'outside-only',url:'chrome-extension://scout-test/library.html'});
  const w=dom.window,sender={id:'scout-test',url:w.location.href,tab:{id:2}};
  w.chrome={runtime:{sendMessage:msg=>h.send(msg.type,msg,sender)},storage:{onChanged:{addListener(){}}}};
  w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/library.js'),'utf8'));await flush();
  for(let i=0;i<2;i++){
    w.document.getElementById('text').value='Reusable reply';
    w.document.getElementById('add').dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();
  }
  assert.equal(w.document.getElementById('count').textContent,'1 saved');
  assert.equal(w.document.querySelector('#items textarea').value,'Reusable reply');
  assert.match(w.document.getElementById('notice').textContent,/already saved/);
  [...w.document.querySelectorAll('#items button')].find(b=>b.textContent==='Delete').click();await flush();
  assert.equal(w.document.getElementById('count').textContent,'0 saved');dom.window.close();
});
