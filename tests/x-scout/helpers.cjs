const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto').webcrypto;
function harness(initial = {}) {
  const data = structuredClone(initial);
  let listener;
  const tab = {id:1,active:true,windowId:1,url:'https://x.com/home'};
  const win = {focused:true};
  const chrome = {
    storage:{local:{
      get:async keys => structuredClone(keys === null ? data : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(k=>k in data).map(k=>[k,data[k]]))),
      set:async values => Object.assign(data,structuredClone(values)),
      remove:async keys => (Array.isArray(keys) ? keys : [keys]).forEach(k=>delete data[k])
    }},
    tabs:{query:async()=>[],get:async()=>tab,sendMessage:async()=>({ready:true,version:'test'}),onRemoved:{addListener(){}}},
    scripting:{executeScript:async()=>{}},
    windows:{get:async()=>win},
    runtime:{getManifest:()=>({version:'test'}),id:'scout-test',getURL:path=>'chrome-extension://scout-test/'+path,onMessage:{addListener:fn=>{listener=fn;}}}
  };
  const context = vm.createContext({crypto,chrome,console,URL,Date,Set,importScripts:()=>{}});
  vm.runInContext(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/core.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(require('node:path').resolve(__dirname, '../../skills/x-com/scripts/background.js'),'utf8'),context);
  const send = (type,payload={},page=false) => new Promise(resolve=>listener({type,...payload},typeof page === 'object' ? page : page ? {tab:{id:1}} : {}, resolve));
  return {data,send,tab,win,chrome};
}
module.exports = { harness };
