const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {harness}=require('./helpers.cjs');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
const sender={id:'scout-test',url:'https://x.com/home',tab:{id:1}};
const saved=text=>({id:'one',text,createdAt:'2026-01-01T00:00:00.000Z'});
async function setup({enabled=true,records={},text='Thanks for sharing this.',quote=false}={}) {
  const h=harness({settings:{snippetsEnabled:enabled},...records});
  const dom=new JSDOM(`<main><form><div data-testid="tweetTextarea_0" contenteditable="true" role="textbox"></div>${quote?'<article>Someone else’s quoted words</article>':''}<button type="button" data-testid="tweetButton">${quote?'Post':'Reply'}</button></form><input id="plain" type="text"><input id="password" type="password"></main>`,{url:'https://x.com/home',runScripts:'outside-only'});
  const w=dom.window,handlers=new Set();
  w.HTMLElement.prototype.getClientRects=()=>[1];
  const originalSet=h.chrome.storage.local.set;
  h.chrome.storage.local.set=async values=>{await originalSet(values);for(const fn of handlers)fn(Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{newValue:value}])),'local');};
  w.chrome={runtime:{getManifest:()=>({version:'test'}),onMessage:{addListener(){},removeListener(){}},sendMessage:msg=>h.send(msg.type,msg,sender)},storage:{local:h.chrome.storage.local,onChanged:{addListener:fn=>handlers.add(fn),removeListener:fn=>handlers.delete(fn)}}};
  const editor=w.document.querySelector('[contenteditable]');editor.textContent=text;
  w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/core.js'),'utf8'));w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/snippets.js'),'utf8'));await flush();
  const prompt=()=>w.document.getElementById('scout-save-text')?.shadowRoot;
  const picker=()=>w.document.getElementById('scout-text-picker')?.shadowRoot;
  const clickSend=async()=>{w.document.querySelector('[data-testid="tweetButton"]').click();await flush();};
  const toast=async(message='Your post was sent.')=>{const n=w.document.createElement('div');n.dataset.testid='toast';n.textContent=message;w.document.body.append(n);await flush();return n;};
  const finish=async()=>{editor.textContent='';await toast();};
  return {h,dom,w,editor,prompt,picker,clickSend,toast,finish};
}
test('reply save is offered only after success plus editor clearing and requires explicit Save',async()=>{
  const t=await setup();await t.clickSend();assert.equal(t.prompt(),undefined);
  await t.toast();assert.equal(t.prompt(),undefined);
  t.editor.textContent='';await flush();assert.ok(t.prompt());
  assert.equal((await t.h.send('snippetList')).snippets.length,0);
  [...t.prompt().querySelectorAll('button')].find(b=>b.textContent==='Save text').click();await flush();
  assert.equal((await t.h.send('snippetList')).snippets[0].text,'Thanks for sharing this.');
  t.w.__scoutSnippets.stop();t.dom.window.close();
});
test('quote capture saves only the typed comment and Not now writes nothing',async()=>{
  const t=await setup({quote:true,text:'My quote comment'});await t.clickSend();await t.finish();
  assert.match(t.prompt().textContent,/My quote comment/);assert.doesNotMatch(t.prompt().textContent,/Someone else/);
  [...t.prompt().querySelectorAll('button')].find(b=>b.textContent==='Not now').click();await flush();
  assert.equal((await t.h.send('snippetList')).snippets.length,0);assert.equal(t.prompt(),undefined);t.w.__scoutSnippets.stop();t.dom.window.close();
});
test('already-saved text does not prompt again',async()=>{
  const t=await setup({records:{'snippet:one':saved('Thanks for sharing this.')}});await t.clickSend();await t.finish();assert.equal(t.prompt(),undefined);t.w.__scoutSnippets.stop();t.dom.window.close();
});
test('failed posts and cancelled composers do not produce save prompts',async()=>{
  const t=await setup();await t.clickSend();await t.toast('Your post was not sent. Try again.');t.editor.textContent='';await t.toast();assert.equal(t.prompt(),undefined);t.w.__scoutSnippets.stop();t.dom.window.close();
  const u=await setup();await u.clickSend();u.editor.remove();await flush();assert.equal(u.prompt(),undefined);u.w.__scoutSnippets.stop();u.dom.window.close();
});
test('an existing success toast is not evidence that the new submission succeeded',async()=>{
  const t=await setup();await t.toast();await t.clickSend();t.editor.textContent='';await flush();assert.equal(t.prompt(),undefined);t.w.__scoutSnippets.stop();t.dom.window.close();
});
test('keyboard send shortcut captures text before a confirmed send',async()=>{
  const t=await setup();t.editor.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true}));await t.finish();assert.ok(t.prompt());t.w.__scoutSnippets.stop();t.dom.window.close();
});
test('disabled setting neither captures posts nor shows the textbox picker',async()=>{
  const t=await setup({enabled:false});await t.clickSend();await t.finish();t.w.document.getElementById('plain').focus();await flush();assert.equal(t.prompt(),undefined);assert.equal(t.picker(),undefined);t.w.__scoutSnippets.stop();t.dom.window.close();
});
test('toggle off dismisses prompts immediately and does not delete saved text',async()=>{
  const t=await setup();await t.clickSend();await t.finish();assert.ok(t.prompt());
  await t.h.send('snippetsSetting',{enabled:false});await flush();assert.equal(t.prompt(),undefined);t.w.__scoutSnippets.stop();t.dom.window.close();
});
test('saved text inserts at the selection and emits input without posting or overwriting the draft',async()=>{
  const t=await setup({records:{'snippet:one':saved('Hello')}});
  const input=t.w.document.getElementById('plain');input.value='Before after';input.focus();input.setSelectionRange(7,7);input.dispatchEvent(new t.w.Event('pointerup',{bubbles:true}));
  await flush();t.picker().querySelector('button').click();
  let events=0;input.addEventListener('input',()=>events++);
  t.picker().querySelector('button.item').click();await flush();
  assert.equal(input.value,'Before Helloafter');assert.equal(events,1);assert.equal(t.prompt(),undefined);t.w.__scoutSnippets.stop();t.dom.window.close();
});
test('rich editor fallback preserves its draft and password fields have no picker',async()=>{
  const t=await setup({records:{'snippet:one':saved('Hello')}});t.editor.focus();await flush();t.picker().querySelector('button').click();t.picker().querySelector('button.item').click();
  assert.equal(t.editor.textContent,'Thanks for sharing this.');assert.match(t.picker().textContent,/Use Copy/);
  t.w.document.getElementById('password').focus();await flush();assert.equal(t.picker(),undefined);t.w.__scoutSnippets.stop();t.dom.window.close();
});
test('native rich-editor insertion is invoked only after selecting a saved text',async()=>{
  const t=await setup({records:{'snippet:one':saved('Hello')}});let calls=[];
  t.w.document.execCommand=(...args)=>{calls.push(args);return true;};t.editor.focus();await flush();assert.equal(calls.length,0);
  t.picker().querySelector('button').click();t.picker().querySelector('button.item').click();
  assert.deepEqual(calls,[['insertText',false,'Hello']]);t.w.__scoutSnippets.stop();t.dom.window.close();
});
test('snippet saves are deduplicated across simultaneous tabs and survive profile reset',async()=>{
  const h=harness({settings:{snippetsEnabled:true}});
  const results=await Promise.all([h.send('snippetSave',{text:' Hello\r\nworld '},sender),h.send('snippetSave',{text:'Hello\nworld'},sender)]);
  assert.equal(results.filter(r=>r.duplicate).length,1);
  await h.send('reset');const list=(await h.send('snippetList')).snippets;assert.equal(list.length,1);
  const restored=harness(h.data);assert.equal((await restored.send('snippetList')).snippets[0].text,'Hello\nworld');
});
test('snippet data access is gated for X pages and library can delete while feature is off',async()=>{
  const h=harness();assert.equal((await h.send('snippetSave',{text:'hello'},sender)).ok,false);
  const entry=await h.send('snippetSave',{text:'hello'});
  const librarySender={id:'scout-test',url:'chrome-extension://scout-test/library.html',tab:{id:5}};
  assert.equal((await h.send('snippetList',{},librarySender)).snippets.length,1);
  assert.equal((await h.send('snippetDelete',{id:entry.snippet.id},librarySender)).deleted,true);
  assert.equal((await h.send('snippetSave',{text:'   '})).ok,false);
});

test('fresh duplicate check suppresses prompt when another tab saved the text',async()=>{
  const t=await setup();t.h.data['snippet:other']=saved('Thanks for sharing this.');
  await t.clickSend();await t.finish();assert.equal(t.prompt(),undefined);t.w.__scoutSnippets.stop();t.dom.window.close();
});
test('one toggle attaches both save and reuse behavior without altering scan state',async()=>{
  const h=harness();await h.send('start',{tabId:1});const run=structuredClone(h.data.run);let injected;
  h.chrome.tabs.query=async()=>[{id:1}];h.chrome.scripting.executeScript=async args=>{injected=args.files;};
  assert.equal((await h.send('snippetsSetting',{enabled:true})).ok,true);
  assert.deepEqual([...injected],['core.js','snippets.js']);assert.deepEqual(h.data.run,run);
  await h.send('stop');await h.send('settings',{settings:{rule:'account',autoFollow:false,delaySeconds:1,maxFollows:10}});
  assert.equal(h.data.settings.snippetsEnabled,true);
});

test('worker restart does not replace a healthy saved-text controller with a pending prompt',async()=>{
  const h=harness({settings:{snippetsEnabled:true}});let injections=0;
  h.chrome.tabs.query=async()=>[{id:1}];
  h.chrome.tabs.sendMessage=async()=>({snippetsReady:true,version:'test'});
  h.chrome.scripting.executeScript=async()=>{injections++;};
  await h.send('status');assert.equal(injections,0);
});
