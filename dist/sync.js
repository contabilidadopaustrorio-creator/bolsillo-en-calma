// La URL y la clave se guardan solo en el navegador, nunca en el repositorio.
const CLOUD_KEY='bolsillo-cloud-v1';
let cloud=null,busy=false;
try { cloud=JSON.parse(localStorage.getItem(CLOUD_KEY)||'null'); } catch {}
const originalPersist=persist;
function operationsBetween(before,after){
  const ops=[],id=()=>crypto.randomUUID(),old=new Map(before.entries.map(e=>[e.id,e])),next=new Map(after.entries.map(e=>[e.id,e]));
  for(const entry of after.entries)if(!old.has(entry.id))ops.push({id:id(),type:'add',payload:entry});
  for(const entry of before.entries)if(!next.has(entry.id))ops.push({id:id(),type:'delete',payload:{id:entry.id}});
  for(const [month,b] of Object.entries(after.budgets))if(JSON.stringify(before.budgets[month])!==JSON.stringify(b))ops.push({id:id(),type:'budget',payload:{month,...b}});
  return ops;
}
persist=function(next){
  if(cloud){next._pending=[...(data._pending||[]),...operationsBetween(data,next)];}
  const ok=originalPersist(next);if(ok&&cloud){cloudStatus();syncCloud(true);}return ok;
};
function cloudStatus(message){const n=(data._pending||[]).length;$('cloudState').textContent=message||(cloud?(n?`${n} cambio(s) pendiente(s) de enviar`:'Conectado · copia local disponible'):'Solo en este dispositivo · Sheets sin conectar');$('syncNow').hidden=!cloud;}
function applyOps(state,ops){const next=structuredClone(state);for(const op of ops){if(op.type==='add'&&!next.entries.some(e=>e.id===op.payload.id))next.entries.push(op.payload);else if(op.type==='delete')next.entries=next.entries.filter(e=>e.id!==op.payload.id);else if(op.type==='budget'){const {month,...b}=op.payload;next.budgets[month]=b}}return next}
async function syncCloud(send){
  if(!cloud||busy)return;busy=true;$('syncNow').disabled=true;cloudStatus('Conectando con tu hoja…');
  const batch=send?(data._pending||[]).slice(0,200):[];
  try{
    const response=await fetch(cloud.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({key:cloud.key,operations:batch}),redirect:'follow',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('Google no respondió correctamente. Revisa la implementación.');
    const result=await response.json();if(!result.ok)throw Error(result.error||'Google no confirmó la operación.');
    if(!validData(result.data)||!Array.isArray(result.ack)||batch.some(op=>!result.ack.includes(op.id)))throw Error('Respuesta de Sheets incompleta.');
    const ack=new Set(result.ack),remaining=(data._pending||[]).filter(op=>!ack.has(op.id));
    const merged=applyOps(result.data,remaining);merged._pending=remaining;
    if(!originalPersist(merged))throw Error('No se pudo guardar la copia local.');
    render();cloudStatus(remaining.length?`${remaining.length} cambio(s) pendiente(s). Pulsa Sincronizar.`:`Actualizado con Sheets · ${new Date().toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}`);
  }catch(error){cloudStatus(`Sin confirmar en Sheets. ${error.message} Tus gastos siguen en este dispositivo; pulsa Sincronizar para reintentar.`);}
  finally{busy=false;$('syncNow').disabled=false;}
}
$('syncNow').onclick=()=>syncCloud(true);
$('cloudSettings').onclick=()=>{$('cloudUrl').value=cloud?.url||'';$('cloudKey').value=cloud?.key||'';$('cloudDialog').showModal()};
$('cloudForm').onsubmit=async e=>{
  e.preventDefault();if(busy)return;
  let url;try{url=new URL($('cloudUrl').value.trim());if(url.origin!=='https://script.google.com'||!/^\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url.pathname)||url.search||url.hash)throw Error()}catch{alert('Pega la URL de Apps Script terminada en /exec.');return}
  const key=$('cloudKey').value.trim();if(key.length<24){alert('Usa la clave generada en las propiedades de Apps Script.');return}
  if(cloud&&(cloud.url!==url.href||cloud.key!==key)){alert('Primero desconecta la hoja actual.');return}
  if(!cloud&&!confirm('Se enviarán los gastos y límites locales a esta hoja. Se combinarán con los que ya tenga. ¿Conectar y sincronizar?'))return;
  try{if(!cloud){const next=structuredClone(data);next._pending=operationsBetween({entries:[],budgets:{}},data);if(!originalPersist(next))return;}const config={url:url.href,key};localStorage.setItem(CLOUD_KEY,JSON.stringify(config));cloud=config;$('cloudDialog').close();await syncCloud(true);}catch{alert('No se pudo guardar la conexión en este navegador.');}
};
$('disconnectCloud').onclick=()=>{if(busy)return;if((data._pending||[]).length){alert('Hay cambios pendientes. Sincroniza o exporta un respaldo antes de desconectar.');return}if(confirm('¿Desconectar Sheets de este dispositivo? La copia local se conservará.')){localStorage.removeItem(CLOUD_KEY);cloud=null;$('cloudDialog').close();cloudStatus()}};
const originalImportClick=$('import').onclick;$('import').onclick=()=>{if(cloud){alert('Para restaurar un respaldo, primero sincroniza y desconecta Sheets.');return}originalImportClick()};
// El respaldo excluye la clave de conexión y conserva las operaciones pendientes.
$('export').onclick=()=>{const snapshot=structuredClone(data);const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`bolsillo-respaldo-${localDate()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
window.addEventListener('storage',e=>{if(e.key===CLOUD_KEY){try{cloud=JSON.parse(e.newValue||'null')}catch{cloud=null}cloudStatus()}});
function connectionFromLink(hash){
  const raw=new URLSearchParams(hash.replace(/^#/,'' )).get('conectar');
  if(!raw)return null;
  if(raw.length>2000)throw Error('Enlace de conexión inválido.');
  const config=JSON.parse(atob(raw.replace(/-/g,'+').replace(/_/g,'/')));
  const url=new URL(config.url);
  if(url.origin!=='https://script.google.com'||!/^\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url.pathname)||url.search||url.hash||typeof config.key!=='string'||config.key.length<24||config.key.length>200)throw Error('Enlace de conexión inválido.');
  return {url:url.href,key:config.key};
}
function activateConnectionLink(){
  if(typeof location==='undefined'||!new URLSearchParams(location.hash.replace(/^#/,'' )).has('conectar'))return;
  const hash=location.hash;
  // El secreto se retira de la barra y del historial de esta página antes de conectar.
  history.replaceState(null,'',location.pathname+location.search);
  try{
    const config=connectionFromLink(hash);
    if(cloud&&(cloud.url!==config.url||cloud.key!==config.key))throw Error('Este navegador ya tiene otra conexión. Desconéctala antes de usar este enlace.');
    if(!cloud){
      const next=structuredClone(data);
      next._pending=operationsBetween({entries:[],budgets:{}},data);
      if(!originalPersist(next))return;
      localStorage.setItem(CLOUD_KEY,JSON.stringify(config));cloud=config;
    }
  }catch(error){return error.message;}
}
const connectionError=activateConnectionLink();cloudStatus(connectionError);if(cloud)syncCloud(false);

// Este enlace se crea en el navegador; nunca se guarda en el código publicado.
const pairingButton=document.createElement('button');
pairingButton.type='button';pairingButton.className='textbtn';pairingButton.textContent='Copiar enlace privado para otro dispositivo';
$('cloudForm').append(pairingButton);
const pairingLink=document.createElement('a');
pairingLink.className='textbtn';pairingLink.textContent='Abrir con conexión automática';pairingLink.hidden=true;
pairingLink.style.display='none';$('cloudForm').append(pairingLink);
pairingButton.onclick=async()=>{
  if(!cloud){alert('Este navegador todavía no tiene una conexión guardada.');return}
  const encoded=btoa(JSON.stringify(cloud)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const url=location.origin+location.pathname+'#conectar='+encoded;
  pairingLink.href=url;pairingLink.hidden=false;pairingLink.style.display='block';
  try{await navigator.clipboard.writeText(url);pairingButton.textContent='Enlace copiado · úsalo solo en tus dispositivos';}
  catch{prompt('Enlace privado: quien lo tenga podrá acceder a tus gastos. Cópialo solo para tus dispositivos.',url);}
};
