const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers.cjs');

async function visit(h) {
  await h.send('start',{tabId:1});
  await h.send('transition',{from:'scan',phase:'profile',current:{handle:'example',scrollY:800}},true);
  await h.send('transition',{from:'profile',phase:'about',handle:'example'},true);
  await h.send('record',{record:{handle:'example',connectedVia:'United States App Store',status:'checked',followStatus:'eligible'}},true);
  await h.send('transition',{from:'about',phase:'follow',handle:'example'},true);
}
test('fresh install is stopped; active US App Store follows are the default',async()=>{
  const h=harness(); const result=await h.send('status');
  assert.equal(result.run.enabled,false); assert.equal(result.settings.rule,'appstore');
  assert.equal(result.settings.autoFollow,true);
});
test('requires Home to start and disallows content scripts changing settings',async()=>{
  const h=harness();h.tab.url='https://x.com/example';
  assert.equal((await h.send('start',{tabId:1})).ok,false);
  assert.equal((await h.send('settings',{settings:{}},true)).ok,false);
});
test('inactive tabs and unfocused windows cannot scan or mutate records',async()=>{
  const h=harness();await visit(h);h.tab.active=false;
  assert.equal((await h.send('tick',{},true)).allowed,false);
  assert.equal((await h.send('followPermit',{handle:'example'},true)).allowed,false);
  h.tab.active=true;h.win.focused=false;
  assert.equal((await h.send('tick',{},true)).allowed,false);
  assert.equal(h.data['profile:example'].followStatus,'eligible');
});
test('follow intent persists before click and survives worker restart without duplicate permission',async()=>{
  const h=harness();await visit(h);
  assert.equal((await h.send('followPermit',{handle:'example'},true)).allowed,true);
  assert.equal(h.data['profile:example'].followStatus,'pending');
  const restarted=harness(h.data);
  assert.equal((await restarted.send('followPermit',{handle:'example'},true)).allowed,false);
  assert.equal(restarted.data.run.follows,1);
});
test('stale transitions and post-stop work are rejected',async()=>{
  const h=harness();await visit(h);
  assert.equal((await h.send('transition',{from:'about',phase:'return',handle:'example'},true)).allowed,false);
  await h.send('stop');
  assert.equal((await h.send('followPermit',{handle:'example'},true)).allowed,false);
  assert.equal(h.data.run.phase,'follow');
});
test('follow limit defers the profile without stopping collection',async()=>{
  const h=harness();await visit(h);h.data.run.follows=20;
  const result=await h.send('followPermit',{handle:'example'},true);
  assert.equal(result.allowed,false);assert.equal(result.deferred,true);
  assert.equal(h.data.run.enabled,true);assert.equal(h.data.run.follows,20);
  assert.equal(h.data['profile:example'].followStatus,'deferred');
  await h.send('transition',{from:'follow',phase:'return',handle:'example'},true);
  await h.send('transition',{from:'return',phase:'scan',handle:'example'},true);
  assert.equal((await h.send('tick',{},true)).allowed,true);
});

test('known profiles are skipped and records API returns an array',async()=>{
  const h=harness();await visit(h);
  const result=await h.send('known',{handles:['example','newuser']},true);
  assert.deepEqual([...result.known],['example']);
  assert.equal((await h.send('all')).records.length,1);
});
test('import is stopped-only, merges by check time and retry preserves uncertain follows',async()=>{
  const h=harness();await visit(h);
  assert.equal((await h.send('import',{data:{version:1,records:[]}})).ok,false);
  await h.send('stop');
  const records=[{handle:'other',status:'unavailable',checkedAt:'2026-01-01',followStatus:'uncertain'},{handle:'retryme',status:'unavailable',checkedAt:'2026-01-01',followStatus:'skipped'}];
  assert.equal((await h.send('import',{data:{version:1,records}})).imported,2);
  assert.equal((await h.send('retry')).count,1);
  assert.ok(h.data['profile:other']);assert.equal(h.data['profile:retryme'],undefined);
  assert.equal((await h.send('import',{data:{version:1,records:[{...records[0],checkedAt:'2025-01-01'}]}})).imported,0);
});
test('nonmatching record cannot acquire follow permission',async()=>{
  const h=harness();await visit(h);h.data['profile:example'].connectedVia='Canada App Store';
  assert.equal((await h.send('followPermit',{handle:'example'},true)).allowed,false);
});

test('Home URL variants start a timeline scan', async () => {
  for (const url of ['https://x.com/', 'https://x.com/home/', 'https://x.com/home?feed=following']) {
    const h=harness();h.tab.url=url;
    assert.equal((await h.send('start',{tabId:1})).ok,true);
    assert.equal(h.data.run.phase,'scan');
  }
});
test('starting from Home abandons a stale visit while keeping saved records', async () => {
  const h=harness();await visit(h);await h.send('stop');
  await h.send('start',{tabId:1});
  assert.equal(h.data.run.phase,'scan');assert.equal(h.data.run.current,null);
  assert.ok(h.data['profile:example']);
});
test('Start attaches scanner to an already-open tab before enabling', async () => {
  const h=harness();let injected=false;
  h.chrome.tabs.sendMessage=async()=>{if(!injected)throw Error('No receiver');return {ready:true,version:'test'};};
  h.chrome.scripting={executeScript:async options=>{assert.deepEqual([...options.files],['core.js','content.js','hover.js','snippets.js']);injected=true;}};
  assert.equal((await h.send('start',{tabId:1})).ok,true);
  assert.equal(injected,true);assert.equal(h.data.run.enabled,true);
});
test('failed injection reports an actionable error and does not enable scanning', async () => {
  const h=harness();h.chrome.tabs.sendMessage=async()=>{throw Error('No receiver');};
  h.chrome.scripting={executeScript:async()=>{throw Error('Access denied');}};
  const result=await h.send('start',{tabId:1});
  assert.equal(result.ok,false);assert.match(result.error,/Allow this extension access/);
  assert.equal(h.data.run,undefined);
});

test('records opened as an extension tab can read saved data while X is inactive',async()=>{
  const h=harness();await visit(h);h.tab.active=false;
  const sender={id:'scout-test',url:'chrome-extension://scout-test/records.html',tab:{id:2}};
  const result=await h.send('all',{},sender);
  assert.equal(result.ok,true);
  assert.equal(result.records[0].handle,'example');
  assert.equal(result.records[0].connectedVia,'United States App Store');
});
test('X content scripts cannot claim extension-tab privileges',async()=>{
  const h=harness();
  for(const sender of [
    {id:'scout-test',url:'https://x.com/home',tab:{id:1}},
    {id:'other-extension',url:'chrome-extension://scout-test/records.html',tab:{id:2}},
    {id:'scout-test',url:'chrome-extension://scout-test/records.html.evil',tab:{id:2}}
  ]) assert.equal((await h.send('all',{},sender)).ok,false);
});

test('extension reload reattaches enabled scanner without resetting any persistent state',async()=>{
  const original=harness();await visit(original);
  await original.send('followPermit',{handle:'example'},true);
  original.data.run.timelineScrollY=2400;
  const saved=structuredClone(original.data);
  const reloaded=harness(saved);
  let pings=0;reloaded.chrome.tabs.sendMessage=async()=>{pings++;return {ready:true,version:'test'};};
  await reloaded.send('status'); // Wait for queued startup recovery.
  assert.equal(pings,1);
  assert.deepEqual(reloaded.data,saved);
  assert.equal((await reloaded.send('followPermit',{handle:'example'},true)).allowed,false);
});
test('reload preserves scan checkpoint, settings and known profiles',async()=>{
  const original=harness();await original.send('start',{tabId:1});
  await original.send('checkpoint',{scrollY:3200},true);
  original.data.settings={rule:'account',autoFollow:false,delaySeconds:1,maxFollows:9};
  original.data['profile:knownuser']={handle:'knownuser',status:'checked'};
  const reloaded=harness(original.data);const status=await reloaded.send('status');
  assert.equal(status.run.timelineScrollY,3200);assert.equal(status.run.phase,'scan');
  assert.equal(status.settings.delaySeconds,1);assert.equal(status.settings.autoFollow,false);
  assert.deepEqual([...(await reloaded.send('known',{handles:['knownuser']},true)).known],['knownuser']);
});
test('reload leaves a stopped scan stopped',async()=>{
  const original=harness();await visit(original);await original.send('stop');
  const saved=structuredClone(original.data), reloaded=harness(saved);
  let pings=0;reloaded.chrome.tabs.sendMessage=async()=>{pings++;return {ready:true,version:'test'};};
  await reloaded.send('status');assert.equal(pings,0);assert.deepEqual(reloaded.data,saved);
});
test('failed reload reconnection pauses while retaining records and in-flight progress',async()=>{
  const original=harness();await visit(original);
  const reloaded=harness(original.data);
  reloaded.chrome.tabs.sendMessage=async()=>{throw Error('Missing receiver');};
  reloaded.chrome.scripting={executeScript:async()=>{throw Error('Access denied');}};
  await reloaded.send('status');
  assert.equal(reloaded.data.run.enabled,false);assert.equal(reloaded.data.run.phase,'follow');
  assert.equal(reloaded.data.run.current.handle,'example');
  assert.deepEqual(reloaded.data['profile:example'],original.data['profile:example']);
});

test('custom filters persist across reload without changing saved records',async()=>{
  const h=harness({'profile:example':{handle:'example',status:'checked',followStatus:'followed'}});
  const response=await h.send('settings',{settings:{rule:'custom',countries:['Canada','Japan'],sources:['android','web'],countryField:'account',autoFollow:true,delaySeconds:1,maxFollows:9}});
  assert.equal(response.ok,true);
  const reloaded=harness(h.data);const status=await reloaded.send('status');
  assert.deepEqual([...status.settings.countries],['Canada','Japan']);
  assert.deepEqual([...status.settings.sources],['android','web']);
  assert.equal(reloaded.data['profile:example'].followStatus,'followed');
});
test('changed filters still skip every saved profile until a manual reset',async()=>{
  const settings={rule:'custom',countries:['Canada'],sources:['android'],countryField:'connection',autoFollow:true,delaySeconds:1,maxFollows:9};
  const data={settings};
  for(const [handle,followStatus] of [['newmatch','skipped'],['attempted','pending'],['done','followed'],['unsure','uncertain']])data['profile:'+handle]={handle,status:'checked',followStatus,connectedVia:'Canada Android App'};
  const h=harness(data);await h.send('start',{tabId:1});
  const result=await h.send('known',{handles:['newmatch','attempted','done','unsure']},true);
  assert.deepEqual([...result.known],['newmatch','attempted','done','unsure']);
  assert.equal((await h.send('transition',{from:'scan',phase:'profile',current:{handle:'newmatch',scrollY:0}},true)).allowed,false);
  assert.equal(h.data['profile:done'].followStatus,'followed');
});
test('explicit Start replaces even a responding scanner using the current scripts',async()=>{
  const h=harness();let injections=0;
  h.chrome.scripting.executeScript=async()=>{injections++;};
  await h.send('start',{tabId:1});
  assert.equal(injections,1);
});

test('visit reservation persists before any profile details or follow are collected',async()=>{
  const h=harness();await h.send('start',{tabId:1});
  await h.send('transition',{from:'scan',phase:'profile',current:{handle:'interrupted',scrollY:450}},true);
  assert.equal(h.data['profile:interrupted'].status,'visiting');
  const reloaded=harness(h.data);await reloaded.send('status');
  await reloaded.send('stop');await reloaded.send('start',{tabId:1});
  const result=await reloaded.send('known',{handles:['interrupted']},true);
  assert.deepEqual([...result.known],['interrupted']);
});
test('manual reset is stopped-only and retains settings',async()=>{
  const h=harness();await visit(h);
  assert.equal((await h.send('reset')).ok,false);
  await h.send('stop');h.data.settings={rule:'account',delaySeconds:1};
  assert.equal((await h.send('reset',{},true)).ok,false);
  const result=await h.send('reset');
  assert.equal(result.count,1);assert.equal(h.data['profile:example'],undefined);
  assert.equal(h.data.settings.delaySeconds,1);assert.equal(h.data.run.current,null);
  await h.send('start',{tabId:1});
  assert.deepEqual([...(await h.send('known',{handles:['example']},true)).known],[]);
});

test('hover toggle persists and attaches to open X tabs without enabling scanning',async()=>{
  const h=harness();const files=[];
  h.chrome.tabs.query=async()=>[{id:1},{id:2}];
  h.chrome.scripting.executeScript=async args=>files.push([...args.files]);
  const result=await h.send('hoverSetting',{enabled:true});
  assert.equal(result.ok,true);assert.equal(h.data.settings.hoverEnabled,true);
  assert.deepEqual(files,[['core.js','hover.js'],['core.js','hover.js']]);
  assert.equal((await h.send('status')).run.enabled,false);
  await h.send('settings',{settings:{rule:'account',autoFollow:false,delaySeconds:1,maxFollows:9}});
  assert.equal(h.data.settings.hoverEnabled,true);
  await h.send('hoverSetting',{enabled:false});assert.equal(h.data.settings.hoverEnabled,false);
});
test('hover toggle is available during scanning and does not change run state',async()=>{
  const h=harness();await visit(h);const saved=structuredClone(h.data.run);
  h.chrome.tabs.query=async()=>[{id:1}];
  assert.equal((await h.send('hoverSetting',{enabled:true})).ok,true);
  assert.deepEqual(h.data.run,saved);
  assert.equal((await h.send('hoverSetting',{enabled:false},true)).ok,false);
});

test('X follow restriction preserves uncertain attempts and allows further collection',async()=>{
  const h=harness();await visit(h);await h.send('followPermit',{handle:'example'},true);
  await h.send('followBlocked',{},true);
  assert.equal(h.data.run.enabled,true);assert.equal(h.data.run.followBlocked,true);
  assert.equal(h.data['profile:example'].followStatus,'uncertain');
  assert.equal((await h.send('tick',{},true)).allowed,true);
  const reloaded=harness(h.data);await reloaded.send('status');
  assert.equal(reloaded.data.run.followBlocked,true);
});

test('pause status distinguishes temporary inactivity from an explicit stop reason',async()=>{
  const h=harness();await h.send('start',{tabId:1});h.win.focused=false;
  const inactive=await h.send('tick',{},true);
  assert.equal(inactive.allowed,false);assert.match(inactive.pauseReason,/Resumes automatically/);
  h.win.focused=true;assert.equal((await h.send('tick',{},true)).allowed,true);
  await h.send('pause',{reason:'No more timeline posts loaded.'},true);
  assert.equal((await h.send('tick',{},true)).pauseReason,'No more timeline posts loaded.');
});
