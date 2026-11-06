// Pegar en Extensiones > Apps Script de la hoja indicada en README.md.
const SHEET_ID = 'PEGA_AQUI_EL_ID_DE_TU_HOJA';
const LOG_NAME = 'Bolsillo_Eventos';

function configurarBolsillo() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('BOLSILLO_CLAVE')) props.setProperty('BOLSILLO_CLAVE', Utilities.getUuid() + Utilities.getUuid());
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const log = ss.getSheetByName(LOG_NAME) || ss.insertSheet(LOG_NAME);
  if (!log.getLastRow()) log.appendRow(['ID operación', 'Acción', 'Datos JSON', 'Registrado UTC']);
  log.setFrozenRows(1);
  log.getRange('A1:D1').setBackground('#193e35').setFontColor('#ffffff').setFontWeight('bold');
  log.setColumnWidths(1, 2, 180); log.setColumnWidth(3, 420); log.setColumnWidth(4, 200);
  actualizarVistas_(ss, estado_(log));
}

function doGet() { return respuesta_({ok:false,error:'Usa el dashboard para conectar esta hoja.'}); }

function doPost(e) {
  let lock;
  try {
    const body = JSON.parse(e.postData.contents);
    const clave = PropertiesService.getScriptProperties().getProperty('BOLSILLO_CLAVE');
    if (!clave || typeof body.key !== 'string' || body.key !== clave) throw Error('Clave de conexión incorrecta.');
    if (!Array.isArray(body.operations) || body.operations.length > 200) throw Error('Lote inválido. Máximo 200 operaciones.');
    body.operations.forEach(validarOperacion_);
    lock = LockService.getScriptLock(); lock.waitLock(20000);
    const ss = SpreadsheetApp.openById(SHEET_ID), log = ss.getSheetByName(LOG_NAME);
    if (!log) throw Error('Ejecuta configurarBolsillo primero.');
    const rows = log.getLastRow() > 1 ? log.getRange(2,1,log.getLastRow()-1,4).getValues() : [];
    const ids = new Set(rows.map(r=>r[0])), newRows = [];
    body.operations.forEach(op=>{if(!ids.has(op.id)){newRows.push([op.id,op.type,JSON.stringify(op.payload),new Date().toISOString()]);ids.add(op.id)}});
    if(newRows.length) log.getRange(log.getLastRow()+1,1,newRows.length,4).setValues(newRows);
    const state = estado_(log);
    actualizarVistas_(ss,state);
    return respuesta_({ok:true,data:state,ack:body.operations.map(op=>op.id)});
  } catch(error) { return respuesta_({ok:false,error:String(error.message || error)}); }
  finally {if(lock && lock.hasLock()) lock.releaseLock();}
}
function respuesta_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON)}
function monto_(v){return Number.isSafeInteger(v)&&v>0&&v<=10000000}
function mes_(m){return typeof m==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(m)}
function validarOperacion_(op){
  if(!op || !/^[a-zA-Z0-9-]{1,100}$/.test(op.id)) throw Error('ID inválido.');
  const p=op.payload;
  if(op.type==='add'){
    if(!p||!/^[a-zA-Z0-9-]{1,100}$/.test(p.id)||!['super','ocio'].includes(p.category)||!monto_(p.amount)||typeof p.note!=='string'||p.note.length>100||typeof p.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||isNaN(new Date(p.date+'T12:00:00Z').valueOf())||new Date(p.date+'T12:00:00Z').toISOString().slice(0,10)!==p.date)throw Error('Gasto inválido.');
  } else if(op.type==='delete') {if(!p||!/^[a-zA-Z0-9-]{1,100}$/.test(p.id))throw Error('Gasto inválido.');}
  else if(op.type==='budget'){if(!p||!mes_(p.month)||!monto_(p.super)||!monto_(p.ocio))throw Error('Presupuesto inválido.');}
  else throw Error('Acción inválida.');
}
function estado_(log){
  const entries={},deleted=new Set(),budgets={};
  const rows=log.getLastRow()>1?log.getRange(2,1,log.getLastRow()-1,4).getValues():[];
  rows.forEach(r=>{const p=JSON.parse(r[2]);if(r[1]==='add'&&!deleted.has(p.id))entries[p.id]=p;else if(r[1]==='delete'){delete entries[p.id];deleted.add(p.id)}else if(r[1]==='budget')budgets[p.month]={super:p.super,ocio:p.ocio}});
  return {version:1,entries:Object.values(entries),budgets};
}
function texto_(s){return /^[=+@\-]/.test(s)?"'"+s:s}
function actualizarVistas_(ss,state){
  const gastos=ss.getSheetByName('Bolsillo_Gastos')||ss.insertSheet('Bolsillo_Gastos');
  const presup=ss.getSheetByName('Bolsillo_Presupuestos')||ss.insertSheet('Bolsillo_Presupuestos');
  const resumen=ss.getSheetByName('Bolsillo_Resumen')||ss.insertSheet('Bolsillo_Resumen');
  // Vistas derivadas: editar desde el dashboard. Nunca se tocan otras pestañas.
  gastos.clearContents();gastos.getRange(1,1,1,6).setValues([['ID','Fecha','Mes','Categoría','Monto USD','Detalle']]);
  const entries=state.entries.slice().sort((a,b)=>a.date.localeCompare(b.date));
  if(entries.length){gastos.getRange(2,1,entries.length,6).setValues(entries.map(e=>[e.id,e.date,e.date.slice(0,7),e.category==='super'?'Súper / mercado':'Distracciones',e.amount/100,texto_(e.note)]));gastos.getRange(2,5,entries.length,1).setNumberFormat('$0.00');}
  const months=Array.from(new Set([Utilities.formatDate(new Date(),'America/Guayaquil','yyyy-MM'),...entries.map(e=>e.date.slice(0,7)),...Object.keys(state.budgets)])).sort();
  presup.clearContents();presup.getRange(1,1,1,3).setValues([['Mes','Súper USD','Distracciones USD']]);
  presup.getRange(2,1,months.length,3).setValues(months.map(m=>{const b=state.budgets[m]||{super:13000,ocio:8000};return [m,b.super/100,b.ocio/100]}));presup.getRange(2,2,months.length,2).setNumberFormat('$0.00');
  resumen.clearContents();resumen.getRange(1,1,1,7).setValues([['Mes','Presupuesto USD','Súper gastado','Distracciones gastado','Total gastado','Disponible USD','Estado de salidas']]);
  const output=months.map((m,i)=>{const row=i+2;return [m,`=SUM(Bolsillo_Presupuestos!B${row}:C${row})`,`=SUMIFS(Bolsillo_Gastos!E:E,Bolsillo_Gastos!C:C,A${row},Bolsillo_Gastos!D:D,"Súper / mercado")`,`=SUMIFS(Bolsillo_Gastos!E:E,Bolsillo_Gastos!C:C,A${row},Bolsillo_Gastos!D:D,"Distracciones")`,`=C${row}+D${row}`,`=B${row}-E${row}`,`=IF(D${row}>=Bolsillo_Presupuestos!C${row},"PAUSA LAS SALIDAS",IF(D${row}>=Bolsillo_Presupuestos!C${row}*0.8,"CERCA DEL LÍMITE","CON MARGEN"))`]});
  resumen.getRange(2,1,output.length,7).setValues(output);resumen.getRange(2,2,output.length,5).setNumberFormat('$0.00');
  [gastos,presup,resumen].forEach(s=>{s.setFrozenRows(1);s.getRange(1,1,1,s.getLastColumn()).setBackground('#193e35').setFontColor('#ffffff').setFontWeight('bold');s.autoResizeColumns(1,s.getLastColumn());});
  resumen.setColumnWidth(7,220);gastos.setColumnWidth(6,280);
  SpreadsheetApp.flush();
}
