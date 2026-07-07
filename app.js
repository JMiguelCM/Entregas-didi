const KEY='entregas_carros_v1';
const DIAS=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// Nombres de los dos carros. Se guardan tal cual en los datos.
const AUTO_BLANCO='Kia Picanto';   // el blanco
const AUTO_ROJO='Chevrolet Sail';  // el rojo
// ¿Es el carro rojo? Acepta también los nombres antiguos para migrar datos ya guardados.
function esRojo(c){return c===AUTO_ROJO||c==='Carro Rojo';}
let data=load();
let chartBlanco=null,chartRojo=null,mChart=null;
let mCursor=new Date(); mCursor.setDate(1);

/* Normaliza un registro venga de donde venga (localStorage, nube o respaldo):
   asegura tipos correctos (monto numérico, textos como texto) para que no
   fallen las sumas ni los filtros con datos que Google Sheets devuelve como texto. */
function normalize(d){
  d=(d&&typeof d==='object')?d:{};
  return {
    id:String(d.id||uid()),
    fecha:String(d.fecha||'').slice(0,10),
    carro:esRojo(d.carro)?AUTO_ROJO:AUTO_BLANCO,
    cliente:String(d.cliente||''),
    monto:Number(d.monto)||0,
    estado:d.estado==='Pendiente'?'Pendiente':'Pagado',
    notas:String(d.notas||''),
    updatedAt:Number(d.updatedAt)||0
  };
}
function load(){
  try{const d=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(d))return d.map(normalize);}catch(e){}
  // La app arranca vacía (sin datos de ejemplo)
  return [];
}
function save(){localStorage.setItem(KEY,JSON.stringify(data));}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function money(n){return '$ '+(n||0).toLocaleString('es-CO');}
function diaDe(f){const d=new Date(f+'T00:00:00');return isNaN(d)?'':DIAS[d.getDay()];}
// Fecha local AAAA-MM-DD (toISOString usa UTC y en Colombia daba el día siguiente después de las 7 pm)
function hoy(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

/* NAV */
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.getElementById(b.dataset.view).classList.add('active');
  if(b.dataset.view==='mensual')renderMensual();
  if(b.dataset.view==='panel')renderPanel();
});

/* POPUP DE CONFIRMACIÓN (reemplaza al confirm() gris del navegador) */
let _confirmCb=null;
function confirmPop(msg,onYes,okText){
  document.getElementById('confirmMsg').textContent=msg;
  document.getElementById('confirmOk').textContent=okText||'Borrar';
  _confirmCb=onYes;
  document.getElementById('confirmBg').classList.add('show');
}
function closeConfirm(){document.getElementById('confirmBg').classList.remove('show');_confirmCb=null;}
document.getElementById('confirmOk').onclick=()=>{const cb=_confirmCb;closeConfirm();if(cb)cb();};
document.getElementById('confirmBg').onclick=e=>{if(e.target.id==='confirmBg')closeConfirm();};

/* MODAL */
function openModal(entry){
  document.getElementById('modalTitle').textContent=entry?'Editar entrega':'Nueva entrega';
  document.getElementById('mId').value=entry?entry.id:'';
  document.getElementById('mFecha').value=entry?entry.fecha:hoy();
  document.getElementById('mCarro').value=entry?entry.carro:AUTO_BLANCO;
  document.getElementById('mCliente').value=entry?entry.cliente:'';
  document.getElementById('mMonto').value=entry?entry.monto:'';
  document.getElementById('mEstado').value=entry?entry.estado:'Pagado';
  document.getElementById('mNotas').value=entry?entry.notas:'';
  document.getElementById('modalBg').classList.add('show');
  setTimeout(()=>document.getElementById('mCliente').focus(),60);
}
function closeModal(){document.getElementById('modalBg').classList.remove('show');}
document.getElementById('modalBg').onclick=e=>{if(e.target.id==='modalBg')closeModal();};
// Atajos: Escape cierra, Enter guarda la entrega (salvo en Notas o sobre un botón)
document.addEventListener('keydown',e=>{
  const confirmOpen=document.getElementById('confirmBg').classList.contains('show');
  if(e.key==='Escape'){closeModal();closeConfig();closeConfirm();}
  else if(e.key==='Enter'&&confirmOpen){document.getElementById('confirmOk').click();}
  else if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'&&e.target.tagName!=='BUTTON'
    &&document.getElementById('modalBg').classList.contains('show'))saveEntry();
});
function saveEntry(){
  const fecha=document.getElementById('mFecha').value;
  const cliente=document.getElementById('mCliente').value.trim();
  if(!fecha){alert('Ingresa la fecha');return;}
  const entry={
    id:document.getElementById('mId').value||uid(),
    fecha,
    carro:document.getElementById('mCarro').value,
    cliente:cliente,
    monto:parseFloat(document.getElementById('mMonto').value)||0,
    estado:document.getElementById('mEstado').value,
    notas:document.getElementById('mNotas').value.trim(),
    updatedAt:Date.now()   // marca de tiempo para que este cambio gane al sincronizar
  };
  // aviso de posible registro duplicado (mismo carro y mismo día)
  const dup=data.find(d=>d.id!==entry.id&&d.fecha===entry.fecha&&d.carro===entry.carro);
  if(dup&&!confirm('Ya hay una entrega de '+entry.carro+' el '+fmtDate(entry.fecha)+(dup.cliente?' ('+dup.cliente+')':'')+'.\n¿Guardar otra para el mismo día?'))return;
  const i=data.findIndex(d=>d.id===entry.id);
  if(i>=0)data[i]=entry;else data.push(entry);
  save();fbSet(entry);closeModal();renderAll();
}
function editEntry(id){openModal(data.find(d=>d.id===id));}
function delEntry(id){
  const d=data.find(x=>x.id===id);
  const quien=d?(d.carro+(d.cliente?' · '+d.cliente:'')+' · '+fmtDate(d.fecha)):'';
  confirmPop('¿Eliminar esta entrega?'+(quien?'\n'+quien:''),()=>{
    data=data.filter(x=>x.id!==id);save();fbDelete(id);renderAll();
  },'Eliminar');
}
// Cambia Pagado <-> Pendiente con un clic desde la tabla
function toggleEstado(id){
  const d=data.find(x=>x.id===id);if(!d)return;
  d.estado=d.estado==='Pagado'?'Pendiente':'Pagado';
  d.updatedAt=Date.now();
  save();fbSet(d);renderAll();
}

/* ===== SINCRONIZACIÓN CON FIREBASE (FIRESTORE) ===== */
// 👉 Pega aquí la configuración de TU proyecto Firebase:
//    Consola Firebase → ⚙ Configuración del proyecto → "Tus apps" → app web → SDK/Configuración.
const FIREBASE_CONFIG={
  apiKey:"AIzaSyD6BUAjrxpgH1N_jEZsZkkB6hQv-B7nZR8",
  authDomain:"entregas-9e7f1.firebaseapp.com",
  projectId:"entregas-9e7f1",
  storageBucket:"entregas-9e7f1.firebasestorage.app",
  messagingSenderId:"569006631101",
  appId:"1:569006631101:web:7801cc2e918b1a4bf6efd4",
  measurementId:"G-56SJXLS2GW"
};
const FB_ON=!/PON_AQUI/.test(JSON.stringify(FIREBASE_CONFIG));  // ¿ya pegaste tu config?
let db=null,fbReady=false;

function setStatus(cls,txt){const s=document.getElementById('syncStatus');s.className='sync '+cls;s.textContent='● '+txt;}
function refreshStatus(){
  if(!FB_ON){setStatus('off','Local');return;}
  setStatus(fbReady?'ok':'saving',fbReady?'En la nube':'Conectando');
}

// Modal ☁ Nube: ahora solo muestra estado y respaldos (la conexión es automática con tu config)
function openConfig(){
  const m=document.getElementById('cfgMsg');
  m.style.color='#6b7891';
  m.textContent=!FB_ON
    ?'Aún sin configurar Firebase: los datos se guardan solo en este navegador. Pega tu configuración en app.js (FIREBASE_CONFIG) y vuelve a desplegar.'
    :(fbReady?'✔ Conectado a Firebase. Los datos se sincronizan solos en todos tus dispositivos.':'Conectando con Firebase...');
  document.getElementById('configBg').classList.add('show');
}
function closeConfig(){document.getElementById('configBg').classList.remove('show');}
document.getElementById('configBg').onclick=e=>{if(e.target.id==='configBg')closeConfig();};

// Arranca Firestore y escucha cambios EN TIEMPO REAL (se actualiza solo entre dispositivos)
function initFirebase(){
  if(!FB_ON||typeof firebase==='undefined'){refreshStatus();return;}
  try{
    firebase.initializeApp(FIREBASE_CONFIG);
    db=firebase.firestore();
    db.enablePersistence({synchronizeTabs:true}).catch(()=>{});  // caché offline
    setStatus('saving','Conectando');
    db.collection('entregas').onSnapshot(snap=>{
      const cloud=snap.docs.map(doc=>normalize(doc.data()));
      if(!fbReady){
        // primera vez: sube las entregas locales que aún no estén en la nube (migración inicial)
        const ids=new Set(cloud.map(d=>d.id));
        const localOnly=data.filter(d=>!ids.has(d.id));
        localOnly.forEach(fbSet);
        data=cloud.concat(localOnly);
        fbReady=true;
      }else{
        data=cloud;
      }
      save();renderAll();setStatus('ok','En la nube');
    },()=>setStatus('err','Sin conexión'));
  }catch(e){setStatus('err','Error Firebase');}
}
// Escrituras a Firestore (el id del documento = el id de la entrega)
function fbSet(entry){if(db)db.collection('entregas').doc(entry.id).set(entry).catch(()=>setStatus('err','Sin conexión'));}
function fbDelete(id){if(db)db.collection('entregas').doc(id).delete().catch(()=>{});}
function fbSetAll(rows){if(!db)return;const b=db.batch();rows.forEach(r=>b.set(db.collection('entregas').doc(r.id),r));b.commit().catch(()=>{});}

/* TABLE */
function filtered(){
  const car=document.getElementById('fCar').value;
  const est=document.getElementById('fEstado').value;
  const mo=document.getElementById('fMonth').value;
  const q=document.getElementById('fSearch').value.toLowerCase();
  return data.filter(d=>
    (!car||d.carro===car)&&(!est||d.estado===est)&&
    (!mo||d.fecha.slice(0,7)===mo)&&
    (!q||d.cliente.toLowerCase().includes(q)||d.notas.toLowerCase().includes(q))
  ).sort((a,b)=>b.fecha.localeCompare(a.fecha));
}
function clearFilters(){
  ['fCar','fEstado','fMonth','fSearch'].forEach(id=>document.getElementById(id).value='');
  renderTable();
}
// Borra las entregas que se están mostrando (respeta los filtros activos)
function clearRecords(){
  const rows=filtered();
  if(!rows.length){alert('No hay entregas para borrar.');return;}
  const hayFiltro=['fCar','fEstado','fMonth','fSearch'].some(id=>document.getElementById(id).value);
  const msg='Se eliminarán '+rows.length+' entrega'+(rows.length!==1?'s':'')
    +(hayFiltro?' (solo las que se están mostrando con el filtro actual)':' (TODAS las entregas)')
    +'.\nEsta acción no se puede deshacer. ¿Continuar?';
  confirmPop(msg,()=>{
    const ids=new Set(rows.map(d=>d.id));
    data=data.filter(d=>!ids.has(d.id));
    save();ids.forEach(id=>fbDelete(id));renderAll();
  },'Borrar '+rows.length);
}
function tagHTML(d){
  const otro=d.estado==='Pagado'?'Pendiente':'Pagado';
  return `<span class="tag ${d.estado} tgl" title="Clic para marcar como ${otro}" onclick="toggleEstado('${d.id}')">${d.estado}</span>`;
}
function renderTable(){
  const rows=filtered();
  const tb=document.getElementById('tbody');
  tb.innerHTML=rows.map(d=>`<tr>
    <td>${fmtDate(d.fecha)}</td><td>${diaDe(d.fecha)}</td>
    <td><span class="pill ${esRojo(d.carro)?'rojo':'blanco'}">${esc(d.carro)}</span></td>
    <td>${esc(d.cliente)||'<span style="color:#aab">—</span>'}</td>
    <td style="text-align:right" class="money">${money(d.monto)}</td>
    <td>${tagHTML(d)}</td>
    <td style="color:#6b7891;font-size:13px">${esc(d.notas)}</td>
    <td><div class="row-actions">
      <button class="icon-btn" title="Editar" onclick="editEntry('${d.id}')">✎</button>
      <button class="icon-btn del" title="Eliminar" onclick="delEntry('${d.id}')">🗑</button>
    </div></td></tr>`).join('');
  document.getElementById('emptyTable').style.display=rows.length?'none':'block';
  // totales de lo filtrado
  const cob=rows.filter(d=>d.estado==='Pagado').reduce((s,d)=>s+d.monto,0);
  const pen=rows.filter(d=>d.estado==='Pendiente').reduce((s,d)=>s+d.monto,0);
  const sm=document.getElementById('tSummary');
  sm.style.display=rows.length?'flex':'none';
  sm.innerHTML=`<span>${rows.length} entrega${rows.length!==1?'s':''}</span>
    <span>Cobrado <b class="ok">${money(cob)}</b></span>
    <span>Pendiente <b class="pe">${money(pen)}</b></span>`;
}

/* PANEL */
function statsFor(car){
  const rows=data.filter(d=>!car||d.carro===car);
  const cobrado=rows.filter(d=>d.estado==='Pagado').reduce((s,d)=>s+d.monto,0);
  const pend=rows.filter(d=>d.estado==='Pendiente').reduce((s,d)=>s+d.monto,0);
  return {n:rows.length,cobrado,pend};
}
function renderPanel(){
  const b=statsFor(AUTO_BLANCO),r=statsFor(AUTO_ROJO),t=statsFor('');
  document.getElementById('cards').innerHTML=
    cardHTML('blanco',AUTO_BLANCO,b,AUTO_BLANCO,'')+
    cardHTML('rojo',AUTO_ROJO,r,AUTO_ROJO,'')+
    cardHTML('total','Total',t,'','');
  renderChart();
}
function cardHTML(cls,name,s,car,month){
  const pl=s.pend>0
    ?`<a class="pendlink" title="Ver estas entregas pendientes" onclick="goPendientes('${car}','${month}')">${money(s.pend)}</a>`
    :`<b>${money(s.pend)}</b>`;
  return `<div class="card ${cls}">
    <div class="lbl">${name}</div>
    <div class="big">${money(s.cobrado)}</div>
    <div class="sub">${s.n} entrega${s.n!==1?'s':''} · pendiente ${pl}</div>
  </div>`;
}
// Salta a la pestaña Entregas ya filtrada en lo pendiente de ese carro / mes
function goPendientes(car,month){
  document.getElementById('fCar').value=car||'';
  document.getElementById('fEstado').value='Pendiente';
  document.getElementById('fMonth').value=month||'';
  document.getElementById('fSearch').value='';
  document.querySelector('nav button[data-view="entregas"]').click();
  renderTable();
}
// Fecha AAAA-MM-DD a partir de un objeto Date (hora local)
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
// Clave de agrupación de una fecha según el período elegido
function chartKey(fecha,gran){
  if(gran==='dia')return fecha;                 // AAAA-MM-DD
  if(gran==='semana'){                          // lunes de esa semana
    const d=new Date(fecha+'T00:00:00');
    d.setDate(d.getDate()-((d.getDay()+6)%7));
    return ymd(d);
  }
  return fecha.slice(0,7);                       // AAAA-MM
}
// Rango lunes–sábado a partir del lunes (clave de la semana). El domingo queda
// como día extra dentro de esta misma semana (si hay entrega cuenta, si no, nada).
function semanaRango(mondayKey){
  const mon=new Date(mondayKey+'T00:00:00');
  const sat=new Date(mon);sat.setDate(sat.getDate()+5);
  const f=x=>String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0');
  return {ini:f(mon),fin:f(sat)};
}
// Etiqueta legible de una clave según el período
function chartLabel(k,gran){
  if(gran==='mes'){const[y,m]=k.split('-');return MESES[+m-1].slice(0,3)+' '+y.slice(2);}
  if(gran==='semana'){const r=semanaRango(k);return r.ini+'–'+r.fin;}
  // Día: abreviatura del día encima de la fecha (Chart.js pinta el array en 2 líneas)
  const[,m,d]=k.split('-');
  return [DIAS[new Date(k+'T00:00:00').getDay()].slice(0,3),d+'/'+m];
}
// Genera claves continuas (rellena huecos) entre la primera y la última
function chartKeysRange(keys,gran){
  if(keys.length<2)return keys.slice();
  const first=keys[0],last=keys[keys.length-1];
  if(gran==='mes'){
    const[y1,m1]=first.split('-').map(Number),[y2,m2]=last.split('-').map(Number);
    const span=(y2-y1)*12+(m2-m1);
    if(span<0||span>36)return keys.slice();
    const out=[];let y=y1,m=m1;
    for(let i=0;i<=span;i++){out.push(y+'-'+String(m).padStart(2,'0'));m++;if(m>12){m=1;y++;}}
    return out;
  }
  const step=gran==='semana'?7:1,out=[];
  let d=new Date(first+'T00:00:00');const end=new Date(last+'T00:00:00');
  for(let i=0;d<=end&&i<1000;i++){out.push(ymd(d));d.setDate(d.getDate()+step);}
  return out;
}
function renderChart(){
  const box=document.getElementById('chartBox');
  if(typeof Chart==='undefined'){
    box.innerHTML='<div class="empty">No se pudo cargar la gráfica (falta el archivo chart.umd.min.js o conexión a internet). El resto de la app funciona normal.</div>';
    return;
  }
  const gran=document.getElementById('chartPeriod').value;
  const nombre={dia:'por día',semana:'por semana',mes:'por mes'}[gran];
  document.getElementById('chartTitleBlanco').textContent='Cobros '+nombre+' · '+AUTO_BLANCO;
  document.getElementById('chartTitleRojo').textContent='Cobros '+nombre+' · '+AUTO_ROJO;
  const map={};
  data.forEach(d=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha))return;
    const k=chartKey(d.fecha,gran);
    if(!map[k])map[k]={blanco:0,rojo:0};
    if(d.estado==='Pagado')map[k][esRojo(d.carro)?'rojo':'blanco']+=d.monto;
  });
  let keys=chartKeysRange(Object.keys(map).sort(),gran);
  // muestra los últimos períodos para no saturar la gráfica
  keys=keys.slice(-({dia:14,semana:10,mes:6}[gran]));
  keys.forEach(k=>{if(!map[k])map[k]={blanco:0,rojo:0};});
  const labels=keys.map(k=>chartLabel(k,gran));
  // Escala Y común para que las dos gráficas sean comparables a simple vista
  const maxVal=Math.max(1,...keys.map(k=>Math.max(map[k].blanco,map[k].rojo)));
  const opts={responsive:true,maintainAspectRatio:false,
    scales:{y:{beginAtZero:true,suggestedMax:maxVal,ticks:{callback:v=>'$'+(v/1000)+'k'}}},
    plugins:{legend:{position:'bottom'}}};
  if(chartBlanco)chartBlanco.destroy();
  chartBlanco=new Chart(document.getElementById('chartBlanco'),{type:'bar',
    data:{labels,datasets:[{label:AUTO_BLANCO,data:keys.map(k=>map[k].blanco),backgroundColor:'#3b6fb0'}]},
    options:opts});
  if(chartRojo)chartRojo.destroy();
  chartRojo=new Chart(document.getElementById('chartRojo'),{type:'bar',
    data:{labels,datasets:[{label:AUTO_ROJO,data:keys.map(k=>map[k].rojo),backgroundColor:'#c00000'}]},
    options:opts});
}

/* MENSUAL */
function shiftMonth(n){mCursor.setMonth(mCursor.getMonth()+n);renderMensual();}
function monthKey(){return mCursor.getFullYear()+'-'+String(mCursor.getMonth()+1).padStart(2,'0');}
function monthRows(){return data.filter(d=>d.fecha.slice(0,7)===monthKey()).sort((a,b)=>a.fecha.localeCompare(b.fecha));}
function mRowHTML(d){return `<tr>
    <td>${fmtDate(d.fecha)}</td><td>${diaDe(d.fecha)}</td>
    <td><span class="pill ${esRojo(d.carro)?'rojo':'blanco'}">${esc(d.carro)}</span></td>
    <td>${esc(d.cliente)||'—'}</td>
    <td style="text-align:right" class="money">${money(d.monto)}</td>
    <td>${tagHTML(d)}</td></tr>`;}
function renderMensual(){
  const m=mCursor.getMonth();
  document.getElementById('mLabel').textContent=MESES[m]+' '+mCursor.getFullYear();
  const rows=monthRows();
  const bs=monthStats(rows,AUTO_BLANCO),rs=monthStats(rows,AUTO_ROJO),ts=monthStats(rows,'');
  document.getElementById('mCards').innerHTML=
    cardHTML('blanco',AUTO_BLANCO,bs,AUTO_BLANCO,monthKey())+
    cardHTML('rojo',AUTO_ROJO,rs,AUTO_ROJO,monthKey())+
    cardHTML('total','Total del mes',ts,'',monthKey());
  // agrupa por semana (lunes) para intercalar subtotales
  const weeks=[],idx={};
  rows.forEach(d=>{
    const wk=chartKey(d.fecha,'semana');
    if(!(wk in idx)){idx[wk]=weeks.length;weeks.push({wk,rows:[]});}
    weeks[idx[wk]].rows.push(d);
  });
  let html='';
  weeks.forEach(w=>{
    html+=w.rows.map(mRowHTML).join('');
    const cob=w.rows.filter(d=>d.estado==='Pagado').reduce((s,d)=>s+d.monto,0);
    const pen=w.rows.filter(d=>d.estado==='Pendiente').reduce((s,d)=>s+d.monto,0);
    const r=semanaRango(w.wk);
    html+=`<tr class="wk-sub">
      <td colspan="4">Semana ${r.ini} a ${r.fin} · ${w.rows.length} entrega${w.rows.length!==1?'s':''}</td>
      <td style="text-align:right" class="money">${money(cob)}</td>
      <td>${pen>0?'pend. '+money(pen):''}</td></tr>`;
  });
  document.getElementById('mBody').innerHTML=html;
  document.getElementById('mEmpty').style.display=rows.length?'none':'block';
  renderMonthChart(rows);
}
// Gráfica del mes: cobros por semana, un color por carro
function renderMonthChart(rows){
  const box=document.getElementById('mChartBox');
  if(typeof Chart==='undefined'){box.style.display='none';return;}
  box.style.display='';
  const map={};
  rows.forEach(d=>{
    if(d.estado!=='Pagado')return;
    const wk=chartKey(d.fecha,'semana');
    if(!map[wk])map[wk]={blanco:0,rojo:0};
    map[wk][esRojo(d.carro)?'rojo':'blanco']+=d.monto;
  });
  const keys=Object.keys(map).sort();
  const labels=keys.map(k=>{const r=semanaRango(k);return r.ini+'–'+r.fin;});
  if(mChart)mChart.destroy();
  mChart=new Chart(document.getElementById('mChart'),{type:'bar',data:{labels,datasets:[
    {label:AUTO_BLANCO,data:keys.map(k=>map[k].blanco),backgroundColor:'#3b6fb0'},
    {label:AUTO_ROJO,data:keys.map(k=>map[k].rojo),backgroundColor:'#c00000'}
  ]},options:{responsive:true,maintainAspectRatio:false,
    scales:{y:{beginAtZero:true,ticks:{callback:v=>'$'+(v/1000)+'k'}}},
    plugins:{legend:{position:'bottom'}}}});
}
// Descarga en CSV solo las entregas del mes que se está viendo
function exportMonthCSV(){
  const rows=monthRows();
  if(!rows.length){alert('No hay entregas en '+MESES[mCursor.getMonth()]+' '+mCursor.getFullYear());return;}
  const head=['Fecha','Dia','Carro','Cliente','Monto','Estado','Notas'];
  const lines=[head.join(';')].concat(rows.map(d=>
    [d.fecha,diaDe(d.fecha),d.carro,csvCell(d.cliente),d.monto,d.estado,csvCell(d.notas)].join(';')));
  const blob=new Blob([String.fromCharCode(0xFEFF)+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='entregas-'+monthKey()+'.csv';a.click();
}
function monthStats(rows,car){
  const r=rows.filter(d=>!car||d.carro===car);
  return {n:r.length,
    cobrado:r.filter(d=>d.estado==='Pagado').reduce((s,d)=>s+d.monto,0),
    pend:r.filter(d=>d.estado==='Pendiente').reduce((s,d)=>s+d.monto,0)};
}

/* EXPORT */
function csvCell(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"';}
function exportCSV(){
  const rows=filtered();
  const head=['Fecha','Dia','Carro','Cliente','Monto','Estado','Notas'];
  // separador ; = el que espera Excel en español (Colombia)
  const lines=[head.join(';')].concat(rows.map(d=>
    [d.fecha,diaDe(d.fecha),d.carro,csvCell(d.cliente),d.monto,d.estado,csvCell(d.notas)].join(';')));
  const blob=new Blob([String.fromCharCode(0xFEFF)+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='entregas-'+hoy()+'.csv';a.click();
}

/* RESPALDO */
function exportJSON(){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='respaldo-entregas-'+hoy()+'.json';a.click();
}
function importJSON(file){
  if(!file)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const arr=JSON.parse(r.result);
      if(!Array.isArray(arr)||!arr.length)throw new Error('formato');
      const rows=arr.map(normalize);
      if(!confirm('Se reemplazarán las '+data.length+' entregas actuales por las '+rows.length+' del respaldo. ¿Continuar?'))return;
      data=rows;save();fbSetAll(rows);renderAll();closeConfig();
      alert('Respaldo restaurado: '+rows.length+' entregas.');
    }catch(e){alert('El archivo no parece un respaldo válido (.json descargado desde esta app).');}
  };
  r.readAsText(file);
}

/* UTILS */
function fmtDate(f){
  if(!/^\d{4}-\d{2}-\d{2}/.test(f||''))return f||'—';
  const[y,m,d]=f.split('-');return d+'/'+m+'/'+y;
}
function esc(s){return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function renderAll(){renderPanel();renderTable();renderMensual();}
renderAll();
initFirebase();
