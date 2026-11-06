// Activación independiente del dashboard y de sus versiones guardadas sin conexión.
(function(){
  const message=document.getElementById('message');
  try{
    const raw=new URLSearchParams(location.hash.slice(1)).get('conectar');
    history.replaceState(null,'',location.pathname);
    if(!raw||raw.length>2000)throw Error('Este acceso necesita el enlace privado completo. Abre el enlace de activación que recibiste en el chat.');
    const config=JSON.parse(atob(raw.replace(/-/g,'+').replace(/_/g,'/'))),url=new URL(config.url);
    if(url.origin!=='https://script.google.com'||!/^\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url.pathname)||url.search||url.hash||typeof config.key!=='string'||config.key.length<24||config.key.length>200)throw Error('El enlace privado no es válido.');
    const old=JSON.parse(localStorage.getItem('bolsillo-cloud-v1')||'null');
    if(old&&(old.url!==url.href||old.key!==config.key))throw Error('Este navegador ya tiene otra hoja conectada. Conservamos esa conexión.');
    if(!old){
      const data=JSON.parse(localStorage.getItem('bolsillo-calma-v1')||'{"version":1,"entries":[],"budgets":{}}');
      if(data.version!==1||!Array.isArray(data.entries)||!data.budgets)throw Error('No se pudo leer la copia local. Tus registros se conservaron.');
      data._pending=[...(data._pending||[])];
      data.entries.forEach(entry=>data._pending.push({id:crypto.randomUUID(),type:'add',payload:entry}));
      Object.entries(data.budgets).forEach(([month,b])=>data._pending.push({id:crypto.randomUUID(),type:'budget',payload:{month,...b}}));
      localStorage.setItem('bolsillo-calma-v1',JSON.stringify(data));
      localStorage.setItem('bolsillo-cloud-v1',JSON.stringify({url:url.href,key:config.key}));
    }
    message.textContent='Conexión guardada. Abriendo tu dashboard…';
    // El fragmento fuerza también el envío de cualquier cambio local pendiente.
    location.replace('./?inicio=conectado&v=4#conectar='+raw);
  }catch(error){message.textContent=error.message+' No necesitas llenar los campos manualmente.';}
})();
