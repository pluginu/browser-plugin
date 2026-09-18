const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
async function setup(records={},overrides={}) {
  const dom=new JSDOM('<main><article id="post"><div data-testid="User-Name"><a href="/example">Example</a></div><div id="post-text">Post body</div></article><article id="second"><div data-testid="User-Name"><a href="/other">Other</a></div></article></main>',{url:'https://x.com/home',runScripts:'outside-only'});
  const w=dom.window,data={settings:{hoverEnabled:true,rule:'custom',countries:['United States'],sources:['appstore'],countryField:'account',...overrides},...records};
  let handler,reads=0;
  w.chrome={storage:{local:{get:async key=>{reads++;return {[key]:data[key]};}},onChanged:{addListener:fn=>handler=fn,removeListener:fn=>{if(handler===fn)handler=null;}}}};
  w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/core.js'),'utf8'));w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/hover.js'),'utf8'));await flush();
  const move=async(selector='#post-text')=>{w.document.querySelector(selector).dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:100,clientY:100}));await flush();};
  const panel=()=>w.document.getElementById('scout-profile-hover')?.shadowRoot.querySelector('[role="tooltip"]');
  return {dom,w,data,move,panel,reads:()=>reads,change:async changes=>{handler(changes,'local');await flush();}};
}
test('hover shows saved country and green country match while explaining source mismatch',async()=>{
  const h=await setup({'profile:example':{accountBasedIn:'United States',connectedVia:'Web',status:'checked'}});
  await h.move();assert.equal(h.panel().classList.contains('match'),true);
  assert.match(h.panel().textContent,/Account based in: United States/);
  assert.match(h.panel().textContent,/Does not match all follow filters/);
  h.dom.window.close();
});
test('unknown profile and unavailable country have distinct hover messages',async()=>{
  const h=await setup();await h.move();assert.match(h.panel().textContent,/not checked yet/);
  h.data['profile:example']={status:'unavailable',connectedVia:'Web'};
  await h.change({'profile:example':{newValue:h.data['profile:example']}});
  assert.match(h.panel().textContent,/No country saved/);assert.equal(h.panel().classList.contains('match'),false);
  h.dom.window.close();
});
test('foreign country does not highlight and unsafe page text is never rendered as markup',async()=>{
  const h=await setup({'profile:example':{accountBasedIn:'Canada',connectedVia:'<img src=x onerror=alert(1)>'}});
  await h.move();assert.equal(h.panel().classList.contains('match'),false);
  assert.equal(h.panel().querySelector('img'),null);assert.match(h.panel().textContent,/Canada/);
  h.dom.window.close();
});
test('disabled hover performs no profile lookups and disabling removes existing popup immediately',async()=>{
  const h=await setup({}, {hoverEnabled:false});const before=h.reads();await h.move();assert.equal(h.panel(),undefined);assert.equal(h.reads(),before);
  h.data.settings.hoverEnabled=true;await h.change({settings:{newValue:h.data.settings}});await h.move();assert.ok(h.panel());
  h.data.settings.hoverEnabled=false;await h.change({settings:{newValue:h.data.settings}});assert.equal(h.panel(),undefined);
  h.dom.window.close();
});
test('late lookup from a previous post cannot replace the current author popup',async()=>{
  const h=await setup();let resolveFirst;
  const original=h.w.chrome.storage.local.get;
  h.w.chrome.storage.local.get=key=>key==='profile:example'?new Promise(resolve=>resolveFirst=resolve):original(key);
  await h.move();await h.move('#second');assert.match(h.panel().textContent,/@other/);
  resolveFirst({'profile:example':{accountBasedIn:'United States'}});await flush();assert.match(h.panel().textContent,/@other/);
  h.dom.window.close();
});
test('hover removes stale popup when X recycles a post for another author',async()=>{
  const h=await setup();await h.move();assert.ok(h.panel());
  h.w.document.querySelector('#post a').href='/different';await flush();assert.equal(h.panel(),undefined);
  h.dom.window.close();
});
test('quoted profile does not replace the main post author',async()=>{
  const h=await setup();h.w.document.querySelector('#post').insertAdjacentHTML('beforeend','<div data-testid="quoteTweet"><div data-testid="User-Name"><a href="/quoted">Quoted</a></div></div>');
  await h.move('[data-testid="quoteTweet"]');assert.match(h.panel().textContent,/@example/);h.dom.window.close();
});
test('reinjecting hover replaces its listeners and does not duplicate data lookups',async()=>{
  const h=await setup();h.w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/hover.js'),'utf8'));await flush();
  const before=h.reads();await h.move();assert.equal(h.reads()-before,1);assert.ok(h.panel());h.dom.window.close();
});
