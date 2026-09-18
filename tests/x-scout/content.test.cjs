const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

async function scenario({country='United States',store='United States App Store',confirm=true,autoFollow=true,homePath='/home',markup='standard',nested=false,filters={},staleMarker=false,restart=false,limitReached=false,xFollowLimit=false}={}) {
  const dom = new JSDOM('<html lang="en"><body></body></html>', {url:'https://x.com'+homePath,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, data={settings:{rule:'appstore',autoFollow,delaySeconds:5,maxFollows:20,...filters}};
  let listener,contentListener,tick,injections=0,intervalId=0;
  const intervals=new Map();
  let clock=100000,followClicks=0,profileClicks=0,backClicks=0,scrolls=0;
  const chrome={
    storage:{local:{get:async keys=>structuredClone(keys===null?data:Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,data[k]]))),set:async v=>Object.assign(data,structuredClone(v)),remove:async()=>{}}},
    tabs:{get:async()=>({id:1,active:true,windowId:1,url:w.location.href}),sendMessage:async(id,msg)=>{if(!contentListener)throw Error('No receiver');return new Promise(resolve=>contentListener(msg,{},resolve));},onRemoved:{addListener(){}}},
    scripting:{executeScript:async()=>{injections++;w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/core.js'),'utf8'));w.eval(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/content.js'),'utf8'));}},
    windows:{get:async()=>({focused:true})},
    runtime:{getManifest:()=>({version:'test'}),onMessage:{addListener:fn=>listener=fn}}
  };
  const bg=vm.createContext({chrome,URL,Date,Set,console,importScripts(){}});
  vm.runInContext(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/core.js'),'utf8'),bg);
  vm.runInContext(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/background.js'),'utf8'),bg);
  const send=(type,payload={},fromPage=false)=>new Promise(resolve=>listener({type,...payload},fromPage?{tab:{id:1}}:{},resolve));
  w.chrome={runtime:{getManifest:()=>({version:'test'}),onMessage:{addListener:fn=>contentListener=fn,removeListener:fn=>{if(contentListener===fn)contentListener=null;}},sendMessage:msg=>send(msg.type,msg,true)}};
  w.Date.now=()=>clock;
  w.setInterval=fn=>{tick=fn;intervals.set(++intervalId,fn);return intervalId;};
  w.clearInterval=id=>intervals.delete(id);
  w.HTMLElement.prototype.getClientRects=function(){return [1];};
  w.scrollBy=()=>{scrolls++;};w.scrollTo=()=>{};
  function renderProfile() {
    w.document.body.innerHTML='<main data-testid="primaryColumn"><div data-testid="UserName">Example</div><button data-testid="123-follow">Follow</button><button data-testid="UserJoinDate">Joined March 2020</button></main>';
    w.document.querySelector('[data-testid="UserJoinDate"]').onclick=()=>{
      w.history.pushState({},'', '/example/about');
      w.document.body.innerHTML='<main data-testid="primaryColumn"></main>';
      w.document.querySelector('main').textContent=`About this account\nAccount based in\n${country}\nConnected via\n${store}\nDate joined\nMarch 2020`;
    };
    w.document.querySelector('[data-testid="123-follow"]').onclick=event=>{
      followClicks++;
      if(confirm){event.currentTarget.dataset.testid='123-unfollow';event.currentTarget.textContent='Following';}
    };
  }
  function renderHome() {
    w.document.body.innerHTML='<main data-testid="primaryColumn"><article><div data-testid="User-Name"><a href="/example">Example</a></div></article></main>';
    if(markup==='fallback') w.document.querySelector('[data-testid="User-Name"]').removeAttribute('data-testid');
    if(nested) {
      const feed=w.document.querySelector('main');feed.style.overflowY='auto';
      Object.defineProperties(feed,{scrollHeight:{value:5000},clientHeight:{value:500}});
      feed.scrollBy=()=>{scrolls++;};feed.scrollTo=()=>{};
      w.scrollBy=()=>{throw new Error('Must scroll feed container');};
    }
    w.document.querySelector('a').onclick=event=>{event.preventDefault();profileClicks++;w.history.pushState({},'', '/example');renderProfile();};
  }
  w.history.back=()=>{backClicks++;if(w.location.pathname.endsWith('/about')){w.history.replaceState({},'','/example');renderProfile();}else{w.history.replaceState({},'',homePath);renderHome();}};
  if(staleMarker)w.__scoutLoaded=true;
  renderHome();await send('start',{tabId:1});
  if(limitReached)data.run.follows=data.settings.maxFollows;
  if(xFollowLimit){const toast=w.document.createElement('div');toast.dataset.testid='toast';toast.textContent='You have reached your following limit';w.document.body.append(toast);}
  const flush=async()=>{for(let n=0;n<4;n++)await new Promise(resolve=>setImmediate(resolve));};
  await flush();
  if(restart){await send('stop');await send('start',{tabId:1});await flush();}
  for(let i=0;i<65;i++){clock+=1100;await tick();await flush();if(data.run.phase==='scan'&&data['profile:example']?.followStatus!=='unexamined'&&backClicks>=2&&scrolls>0)break;}
  dom.window.close();
  return {data,followClicks,profileClicks,backClicks,scrolls,injections,activeIntervals:intervals.size};
}
test('timeline → profile → joined date → US details → follow → back → skip saved profile',async()=>{
  const r=await scenario();
  assert.equal(r.data['profile:example'].connectedVia,'United States App Store');
  assert.equal(r.data['profile:example'].accountBasedIn,'United States');
  assert.equal(r.data['profile:example'].followStatus,'followed');
  assert.equal(r.followClicks,1);assert.equal(r.profileClicks,1);
  assert.ok(r.backClicks>=2);assert.ok(r.scrolls>0);
});
test('foreign app store does not follow, even when account location is US',async()=>{
  const r=await scenario({store:'Canada App Store'});
  assert.equal(r.followClicks,0);assert.equal(r.data['profile:example'].followStatus,'skipped');assert.ok(r.scrolls>0);
});
test('unconfirmed follow is saved as uncertain and never clicked twice',async()=>{
  const r=await scenario({confirm:false});
  assert.equal(r.followClicks,1);assert.equal(r.data['profile:example'].followStatus,'uncertain');assert.ok(r.scrolls>0);
});
test('scan-only setting records a US match without following',async()=>{
  const r=await scenario({autoFollow:false});
  assert.equal(r.followClicks,0);assert.equal(r.data['profile:example'].status,'checked');assert.ok(r.scrolls>0);
});

test('root and trailing-slash Home timelines traverse and scroll',async()=>{
  for(const homePath of ['/','/home/','/home?feed=following']){
    const r=await scenario({homePath});
    assert.equal(r.profileClicks,1);assert.ok(r.scrolls>0);
  }
});
test('alternate author markup still finds profiles',async()=>{
  const r=await scenario({markup:'fallback'});
  assert.equal(r.profileClicks,1);assert.equal(r.followClicks,1);assert.ok(r.scrolls>0);
});
test('Home timeline scrolls its overflow container when window is not the scroller',async()=>{
  const r=await scenario({nested:true});
  assert.equal(r.profileClicks,1);assert.ok(r.scrolls>0);
});

test('Start injects into the existing Home document despite a stale legacy marker',async()=>{
  const r=await scenario({staleMarker:true});
  assert.equal(r.injections,1);assert.equal(r.profileClicks,1);assert.equal(r.followClicks,1);
});
test('Start replaces a running scanner without refreshing or leaving duplicate loops',async()=>{
  const r=await scenario({restart:true});
  assert.equal(r.injections,2);assert.equal(r.activeIntervals,1);
  assert.equal(r.profileClicks,1);assert.equal(r.followClicks,1);
});
test('custom country and Android source drive actual follow flow',async()=>{
  const r=await scenario({country:'Japan',store:'Canada Android App',filters:{rule:'custom',countries:['Canada','United Kingdom'],countryField:'connection',sources:['android']}});
  assert.equal(r.followClicks,1);assert.equal(r.data['profile:example'].connectedVia,'Canada Android App');
});
test('Web source can qualify using account country without inventing a connection country',async()=>{
  const r=await scenario({country:'Canada',store:'Web',filters:{rule:'custom',countries:['Canada'],countryField:'account',sources:['web']}});
  assert.equal(r.followClicks,1);
});

test('after allowance is used, matching profile is collected and scrolling continues without follow',async()=>{
  const r=await scenario({limitReached:true});
  assert.equal(r.followClicks,0);assert.equal(r.data['profile:example'].followStatus,'deferred');
  assert.equal(r.data['profile:example'].accountBasedIn,'United States');
  assert.ok(r.scrolls>0);assert.equal(r.data.run.enabled,true);
});
test('X follow-limit notice switches to collection and saves future matches',async()=>{
  const r=await scenario({xFollowLimit:true});
  assert.equal(r.followClicks,0);assert.equal(r.data.run.followBlocked,true);
  assert.equal(r.data['profile:example'].followStatus,'deferred');assert.ok(r.scrolls>0);
});
