const SHEETS_API='https://script.google.com/macros/s/AKfycbzYmGVENi6m5HjwcUfiu7sQTXPrLEStNowA_CqK0hujD6q9oUXnvQk661m4sE6cnTsq/exec';
// Acceso sin inicio de sesión solicitado por el propietario. No hay claves en el cliente.
let syncing=false,writeRequested=false,retryTimer;
const SERVER_READY='bolsillo-github-public-ready-v7';
const basePersist=persist;
function diffOperations(before,after){
 const ops=[],oldIds=new Set(before.entries.map(e=>e.id)),newIds=new Set(after.entries.map(e=>e.id));
 for(const e of after.entries)if(!oldIds.has(e.id))ops.push({id:crypto.randomUUID(),type:'add',payload:e});
 for(const e of before.entries)if(!newIds.has(e.id))ops.push({id:crypto.randomUUID(),type:'delete',payload:{id:e.id}});
 for(const [month,b] of Object.entries(after.budgets))if(JSON.stringify(before.budgets[month])!==JSON.stringify(b))ops.push({id:crypto.randomUUID(),type:'budget',payload:{month,...b}});
 return ops;
}
function overlayOperations(snapshot,ops){const result=structuredClone(snapshot);for(const op of ops){const p=op.payload;if(op.type==='add'&&!result.entries.some(e=>e.id===p.id))result.entries.push(p);else if(op.type==='delete')result.entries=result.entries.filter(e=>e.id!==p.id);else if(op.type==='budget')result.budgets[p.month]={super:p.super,ocio:p.ocio}}return result}
persist=function(next){next._pending=[...(data._pending||[]),...diffOperations(data,next)];const ok=basePersist(next);if(ok){statusText();synchronize(true)}return ok};
function statusText(text){const n=(data._pending||[]).length;$('cloudState').textContent=text||(n?`${n} cambio(s) guardado(s) en este dispositivo · pendiente de sincronizar`:'Conectando con tu hoja…')}
async function synchronize(send){
 if(syncing){writeRequested=writeRequested||send;return}
 clearTimeout(retryTimer);syncing=true;$('syncNow').disabled=true;statusText('Sincronizando con tu hoja…');
 const batch=send?(data._pending||[]).slice(0,200):[];
 try{
  const response=await fetch(SHEETS_API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({operations:batch}),credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Google no devolvió una confirmación válida.');
  const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'No se pudo confirmar con Google Sheets.');
  if(!validData(result.data)||!Array.isArray(result.ack)||batch.some(op=>!result.ack.includes(op.id)))throw Error('Sheets no confirmó todos los cambios.');
  const acknowledged=new Set(result.ack),pending=(data._pending||[]).filter(op=>!acknowledged.has(op.id)),merged=overlayOperations(result.data,pending);merged._pending=pending;
  if(!basePersist(merged))throw Error('No se pudo guardar la copia local.');
  render();statusText(pending.length?`${pending.length} cambio(s) pendiente(s) · sincronizando…`:`Conectado a Google Sheets · actualizado ${new Date().toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}`);
  if(pending.length&&send)writeRequested=true;
 }catch(error){statusText(`Sin confirmar con Sheets. ${error.message} Tus gastos siguen guardados en este dispositivo.`);if(navigator.onLine!==false)retryTimer=setTimeout(()=>synchronize(true),30000)}
 finally{syncing=false;$('syncNow').disabled=false;if(writeRequested){writeRequested=false;setTimeout(()=>synchronize(true),0)}}
}
function initializeServerSync(){
 try{
  if(!localStorage.getItem(SERVER_READY)){
   const next=structuredClone(data);
   next._pending=[...(data._pending||[]),...diffOperations({entries:[],budgets:{}},data)];
   if(!basePersist(next))return;
   localStorage.setItem(SERVER_READY,'1');
  }
 }catch{statusText('No se pudo guardar la copia local. Revisa el permiso de almacenamiento del navegador.');return}
 synchronize(true);
}
$('syncNow').onclick=()=>synchronize(true);
window.addEventListener('online',()=>synchronize(true));
window.addEventListener('focus',()=>synchronize(true));
$('import').hidden=true;
$('import').onclick=()=>alert('Usa Exportar respaldo para conservar una copia de tu historial.');
if(typeof location!=='undefined'&&location.hash.includes('conectar='))history.replaceState(null,'',location.pathname+location.search);
initializeServerSync();
