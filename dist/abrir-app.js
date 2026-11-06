(function(){
const target='https://bolsillo-en-calma-bp.supportiveweaver1.chatgpt.site/';
history.replaceState(null,'',location.pathname+location.search);
let hasRecords=false;
try{const data=JSON.parse(localStorage.getItem('bolsillo-calma-v1')||'null');hasRecords=!!data&&((data.entries||[]).length>0||(data._pending||[]).some(op=>op.type==='add'||op.type==='delete'))}catch{}
if(hasRecords){document.getElementById('recovery').hidden=false;document.getElementById('message').textContent='Tu app ya tiene Sheets configurado en el servidor. Abre la app para continuar.'}
else location.replace(target);
})();
