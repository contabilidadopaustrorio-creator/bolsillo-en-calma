const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
const els={},el=id=>els[id]??={value:'',textContent:'',innerHTML:'',style:{},addEventListener(){},showModal(){},close(){}};
el('filter').value='all';el('category').value='super';
const memory=new Map(),calls=[],serverState={version:1,entries:[],budgets:{}};
const ctx={document:{getElementById:el,querySelectorAll:()=>[]},window:{addEventListener(){}},navigator:{onLine:true},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},Intl,Date,Math,Number,JSON,console,structuredClone,crypto:require('node:crypto').webcrypto,AbortSignal,setTimeout,clearTimeout,alert(){},confirm:()=>true,fetch:async(url,options)=>{
 calls.push({url,options});const body=JSON.parse(options.body);
 for(const op of body.operations){const p=op.payload;if(op.type==='add'&&!serverState.entries.some(e=>e.id===p.id))serverState.entries.push(p);if(op.type==='delete')serverState.entries=serverState.entries.filter(e=>e.id!==p.id);if(op.type==='budget')serverState.budgets[p.month]={super:p.super,ocio:p.ocio}}
 return Response.json({ok:true,data:structuredClone(serverState),ack:body.operations.map(op=>op.id)});
}};
vm.createContext(ctx);for(const file of ['app.js','sync.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),ctx);
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
(async()=>{
 await tick();assert.ok(el('cloudState').textContent.includes('Conectado a Google Sheets'));
 assert.ok(calls[0].url.startsWith('https://script.google.com/macros/s/'));
 assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.headers['Content-Type'],'text/plain;charset=utf-8');assert.equal('key' in JSON.parse(calls[0].options.body),false);
 vm.runInContext(`$('amount').value='65';$('category').value='ocio';$('note').value='Prueba';$('expenseForm').onsubmit({preventDefault(){}});`,ctx);await tick();
 assert.equal(serverState.entries.length,1);assert.equal(serverState.entries[0].amount,6500);assert.ok(el('status').innerHTML.includes('cerca del límite'));
 vm.runInContext(`$('amount').value='15';$('expenseForm').onsubmit({preventDefault(){}});`,ctx);await tick();assert.ok(el('status').innerHTML.includes('pausa las salidas'));
 vm.runInContext(`const next=structuredClone(data);next.entries=[];persist(next);render();`,ctx);await tick();assert.equal(serverState.entries.length,0);
 for(const page of ['index.html','app.html','conectar.html','local.html']){const html=fs.readFileSync('dist/'+page,'utf8');assert.equal(html.includes('Conectar Sheets'),false,page);assert.equal(html.includes('chatgpt.site'),false,page);assert.ok(html.includes('sync.js?v=7'));}
 // Exercise the actual Apps Script handler with public access and idempotent operations.
 let rows=[['ID','Acción','JSON','UTC']],locked=false;
 const log={getLastRow:()=>rows.length,getRange:(start,col,count,width)=>({getValues:()=>rows.slice(start-1,start-1+count).map(r=>r.slice(col-1,col-1+width)),setValues:values=>values.forEach((r,i)=>rows[start-1+i]=r)})};
 const api={PropertiesService:{getScriptProperties:()=>({getProperty:()=>null})},LockService:{getScriptLock:()=>({waitLock(){locked=true},hasLock:()=>locked,releaseLock(){locked=false}})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>log})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>text})},Utilities:{},console};
 vm.createContext(api);vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8'),api);vm.runInContext('actualizarVistas_=function(){}',api);
 const post=operations=>JSON.parse(api.doPost({postData:{contents:JSON.stringify({operations})}}));
 assert.equal(post([]).ok,true,'no credentials required');
 const add={id:'public-test-op',type:'add',payload:{id:'public-test-entry',amount:100,category:'super',date:'2026-11-05',note:'test'}};
 assert.equal(post([add]).data.entries.length,1);assert.equal(post([add]).data.entries.length,1);assert.equal(rows.length,2);
 assert.equal(post([{id:'public-test-del',type:'delete',payload:{id:'public-test-entry'}}]).data.entries.length,0);
 assert.equal(post([{...add,id:'invalid',payload:{...add.payload,amount:-10}}]).ok,false);
 assert.equal(locked,false);
 console.log('PASS: direct GitHub UI, automatic credential-free sync, save/delete, budget alerts, public API validation and retry deduplication.');
})().catch(error=>{console.error(error);process.exitCode=1});
