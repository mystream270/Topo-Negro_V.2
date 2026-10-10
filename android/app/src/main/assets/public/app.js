var D=[100000,50000,10000,5000,1000,500,100,25,5,2.5];
var CH=[['#1c1c1c','#e0b84f'],['#7b3fa0','#fff'],['#c0392b','#fff'],['#d35400','#fff'],['#2471a3','#fff'],['#16a085','#fff'],['#ecf0f1','#222'],['#27ae60','#fff'],['#a93226','#fff'],['#f5b7b1','#222']];
var MES=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
var L='CDEFGHIJKLMNOP';
/* n=nombre, c=indice de fichas, p=columna de propina (hoja PROPINAS fila 13), a=acumulado: i=col informe (fila 27), j=col jackpot */
var M=[{n:'BJMD',c:0,p:'C'},{n:'BJ2',c:1,p:'D'},{n:'FB2',c:2,p:'E'},{n:'FREE BET',c:3,p:'F'},{n:'BJ1',c:4,p:'G'},{n:'DP1',c:5,p:'H',a:{i:'E',j:'M'}},
 {n:'DJW',c:6,p:'I',a:{i:'G',j:'U'}},{n:'UTH1',c:7,p:'J',a:{i:'C',j:'C'}},{n:'UTH2',c:8,p:'K',a:{i:'D',j:'H'}},{n:'MB1',c:9,p:'L'},{n:'MB2',c:10,p:'M'},
 {n:'RULETA',c:11,p:'N'},{n:'CRAPS',c:12,p:'O'},{n:'MB3',c:13},{n:'PRIV 1 (BJ4)',c:14,p:'P'},{n:'PRIV 2 (MB4)',c:15,p:'Q'}];
var KS=[['ban','Banco de fichas'],['jp','Jackpot'],['inf','Informe (propinas, acumulados e ingresos/retiros)']];
var KP=KS.concat([['rc','Rating Card (lista de clientes y rating)'],['dev','Devoluciones (libro de reembolsos, una hoja por mes)'],['pro','Propinas (hostess; el archivo del mes con las dos quincenas)'],['pre','Premios (rifas de 8 pm, 10:30 pm y 1 am; el archivo del mes, hoja con el nombre del mes y el ano)']]);
var CFG={pat:{ban:'',jp:'',inf:'',rc:''},nt:{mode:'',url:'https://ntfy.sh',room:'',name:'',since:0}},FE=null,V=[],P=[],A=[],BANK=null,USE=null,INF=null,JP=null;
var pend={},timer=null,busy=false,again=false,showEmpty=false,errs={};
var fso=new ActiveXObject("Scripting.FileSystemObject");
var TOT={ti:0,tr:0,ok:false};
function $(i){return document.getElementById(i)}
function f(n){return n.toLocaleString('es-MX',{maximumFractionDigits:1})}
function mny(n){return '$ '+f(n)}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function pad(n){return (n<10?'0':'')+n}
function fmtF(d){return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()}
function ser(d){return Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(1899,11,30))/86400000)}
function setStat(t){$('stat').innerHTML=t}

/* ---- fecha de operacion: de 00:00 a 6:00 am cuenta como el dia anterior ---- */
function fechaOp(){var d=new Date();if(d.getHours()<6)d.setDate(d.getDate()-1);return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function moveDay(k){closeAll();HIST=[];REDO=[];RS.hist=null;RS.hsel=null;RS.hqNext=0;FE=new Date(FE.getFullYear(),FE.getMonth(),FE.getDate()+k);BANK=INF=JP=null;TOT.ti=TOT.tr=0;initState();render();sync(true)}
function initState(){V=[];P=[];A=[];var c,r;for(c=0;c<16;c++){V.push([]);for(r=0;r<10;r++)V[c].push(0)}for(c=0;c<M.length;c++){P.push('');A.push('')}}

/* ---- configuracion ---- */
function base(){return window.base ? window.base() : (function(){var p=decodeURIComponent(location.pathname).replace(/\//g,"\\").replace(/^\\([A-Za-z]:)/,"$1");return p.substring(0,p.lastIndexOf("\\")+1)})()}
function cfgPath(){return base()+"cierre_config.json"}
function cfgLoad(){try{if(fso.FileExists(cfgPath())){var t=fso.OpenTextFile(cfgPath(),1,false,-1),s=t.ReadAll();t.Close();var o=JSON.parse(s);if(o&&o.pat){CFG=o}}}catch(e){}
  CFG.nt=CFG.nt||{};if(!CFG.nt.mode)CFG.nt.mode='';if(!CFG.nt.url)CFG.nt.url='https://ntfy.sh';if(!CFG.nt.name)CFG.nt.name='';if(!CFG.nt.since)CFG.nt.since=0;if(!CFG.nt.room)CFG.nt.room='';if(!CFG.nt.dir)CFG.nt.dir='';RG();mnApply()}
function cfgSave(){try{var t=fso.CreateTextFile(cfgPath(),true,true);t.Write(JSON.stringify(CFG));t.Close()}catch(e){setStat('No pude guardar la configuracion: '+e.message)}}
function resolve(p){return p.replace(/\{MES\}/g,MES[FE.getMonth()]).replace(/\{AAAA\}/g,FE.getFullYear()).replace(/\{DD\}/g,pad(FE.getDate()))}
function rp(k){return CFG.pat[k]?resolve(CFG.pat[k]):''}
function tok(p,k){
  if(k==='dev')return p;
  var i=p.lastIndexOf('\\'),d=p.substring(0,i+1),n=p.substring(i+1),m;
  for(m=0;m<12;m++)n=n.replace(new RegExp('(^|[^A-Za-z])'+MES[m]+'(?![A-Za-z])','i'),'$1{MES}');
  n=n.replace(/20\d\d/,'{AAAA}');
  if(k==='inf')n=n.replace(/_(\d\d)_\{MES\}/,'_{DD}_{MES}');
  return d+n;
}
function pick(k,v){if(!v)return;CFG.pat[k]=tok(v,k);cfgRows()}
function roleOpen(){$('cf').style.display='none';$('rl').style.display='flex'}
function setRole(m){
  CFG.nt.mode=m;
  if(m==='srv'&&!CFG.nt.room)CFG.nt.room='cierre-'+Math.random().toString(36).substring(2,8);
  if(m==='cli'&&!CFG.nt.name)CFG.nt.name='Caja '+(Math.floor(Math.random()*90)+10);
  cfgSave();$('rl').style.display='none';ntStop();$('net').innerHTML='';render();cfgOpen();
}
function needRole(){return CFG.nt.mode===''||(CFG.nt.mode==='off'&&!CFG.pat.ban&&!CFG.pat.jp&&!CFG.pat.inf)}
function cfgRows(){
  var h='',n=CFG.nt,rol=n.mode==='srv'?'Servidor':(n.mode==='cli'?'Cliente':'Solo este equipo');
  $('cftitle').innerHTML=n.mode==='cli'?'Conexion con el servidor':(n.mode==='srv'?'Conexion y archivos':'Archivos de Excel');
  h+='<div class="hint" style="margin:0 0 0.75rem">Rol de este equipo: <b>'+rol+'</b> &nbsp;<a class="l" onclick="roleOpen()">Cambiar rol</a></div>';
  if(n.mode==='srv'||n.mode==='cli'){
    h+='<div style="margin-bottom:0.875rem"><b>Conexion (ntfy)</b>'+
       '<div class="f"><input type="text" style="width:11.875rem" value="'+esc(n.room)+'" onchange="CFG.nt.room=this.value" placeholder="Codigo de sala">'+
       '<input type="text" style="width:8.75rem" value="'+esc(n.name)+'" onchange="CFG.nt.name=this.value" placeholder="Nombre del equipo">'+
       '<input type="text" style="width:15rem" value="'+esc(n.url)+'" onchange="CFG.nt.url=this.value" placeholder="Servidor ntfy (ej: http://192.168.1.10:8080)"></div>'+
       '<div class="f"><span class="b" onclick="ntTest()">Probar conexion</span><span id="nt_res" class="hint" style="margin-left:0.625rem"></span></div>'+
       '<div class="hint">'+(n.mode==='srv'?'Este codigo de sala es el que debes escribir en cada cliente.':'Escribe el codigo de sala que muestra el servidor.')+'</div></div>'}
  if(n.mode==='srv'){
    h+='<div style="margin-bottom:0.875rem"><b>Carpeta de ntfy.exe (servidor propio)</b>'+
       '<div class="f"><input id="nt_dir" type="text" style="flex:1" value="'+esc(n.dir||'')+'" onchange="CFG.nt.dir=this.value;cfgRows()" placeholder="Carpeta donde esta ntfy.exe">'+
       '<span class="b" onclick="ntDirPick()">Examinar</span></div>'+
       '<div class="hint">'+ntDirInfo()+'</div></div>'}
  if(n.mode!=='cli'){
    KP.forEach(function(k){var p=CFG.pat[k[0]]||'',r=p?resolve(p):'';
      h+='<div style="margin-bottom:0.75rem"><b>'+k[1]+'</b><div class="f"><input id="pt_'+k[0]+'" type="text" style="flex:1" value="'+esc(p)+'" onchange="CFG.pat.'+k[0]+'=this.value;cfgRows()">'+
         '<span class="b" onclick="$(\'pk_'+k[0]+'\').click()">Examinar</span><span class="b" onclick="abrirArchivo(\''+k[0]+'\')">Abrir</span><input id="pk_'+k[0]+'" type="file" accept=".xlsx,.xlsm" style="position:absolute;width:0;height:0;opacity:0" onchange="pick(\''+k[0]+'\',this.value)"></div>'+
         '<div class="hint">Para '+fmtF(FE)+': '+esc(r)+' &nbsp;'+(r?(fso.FileExists(r)?'<span class="up">encontrado</span>':'<span class="dn">no encontrado</span>'):'')+'</div></div>'})}
  $('cfrows').innerHTML=h;
}
function ntTest(){
  $('nt_res').innerHTML='Probando...';
  ntPub('test',{k:'t',n:CFG.nt.name},function(ok,st){$('nt_res').innerHTML=ok?'<span class="up">Conexion correcta: ntfy recibio el mensaje.</span>':'<span class="dn">No pude conectar (codigo '+(st||'sin respuesta')+'). Revisa el servidor o que la red permita ntfy.</span>'});
}
function cfgOpen(){cfgRows();$('cf').style.display='flex'}
function cfgClose(){
  if(cli()&&!String(CFG.nt.room).replace(/\s/g,'')){$('nt_res').innerHTML='<span class="dn">Escribe el codigo de sala para continuar.</span>';return}
  if(!CFG.nt.name)CFG.nt.name=cli()?'Caja '+(Math.floor(Math.random()*90)+10):'Servidor';
  titleSet();$('cf').style.display='none';cfgSave();if(ntSrvAuto())setTimeout(ntStart,2000);else ntStart();if(cli())clientFlush();else if(CFG.pat.ban||CFG.pat.jp||CFG.pat.inf)sync(true);regInit()}

/* ---- lectura / escritura de Excel ---- */
function rr(ws,a){
  var v=ws.Range(a).Value2,o=[],i,j,row,x;
  if(v===null||v===undefined)return [[null]];
  if(typeof v!=='unknown'&&typeof v!=='object')return [[v]];
  var z=new VBArray(v);
  for(i=z.lbound(1);i<=z.ubound(1);i++){row=[];for(j=z.lbound(2);j<=z.ubound(2);j++){x=z.getItem(i,j);row.push(x===undefined?null:x)}o.push(row)}
  return o;
}
function nm(x){return typeof x==='number'?x:0}
function lastRow(ws){var r,c,cs=[8,16,6,14],e;
  try{for(r=39;r<=110;r++)for(c=0;c<cs.length;c++)if(ws.Cells(r,cs[c]).HasFormula===true){e=r-1;return e>=41?e:102}}catch(x){}
  return 102}
function isJL(x){return nkey(x==null?'':String(x))==='JL'}
function totIR(ws,all){var e=lastRow(ws),a=rr(ws,'F39:F'+e),b=rr(ws,'N39:N'+e),h=all?null:rr(ws,'H39:H'+e),p=all?null:rr(ws,'P39:P'+e),ti=0,tr=0,i;
  for(i=0;i<a.length;i++)if(all||!isJL(h[i][0]))ti+=nm(a[i][0]);
  for(i=0;i<b.length;i++)if(all||!isJL(p[i][0]))tr+=nm(b[i][0]);
  return{ti:ti,tr:tr}}
function n1(ws,a){return nm(rr(ws,a)[0][0])}
function rd(ws,a){return rr(ws,a).map(function(r){return r.map(nm)})}
function dayBlocks(ws){return{a1:rd(ws,'C7:P16'),a2:rd(ws,'C24:D33'),c1:rd(ws,'C42:P51'),c2:rd(ws,'C59:D68')}}
function readBan(wb){
  var ws;try{ws=wb.Worksheets.Item('Dia '+pad(FE.getDate()))}catch(e){throw new Error('El banco no tiene la hoja "Dia '+pad(FE.getDate())+'"')}
  var b=dayBlocks(ws),ap=[],ci=[],c,r;
  for(c=0;c<16;c++){ap.push([]);ci.push([]);for(r=0;r<10;r++){
    ap[c].push(c<14?b.a1[r][c]:b.a2[r][c-14]);ci[c].push(c<14?b.c1[r][c]:b.c2[r][c-14])}}
  var pv=null,fb=[];
  if(FE.getDate()>1){try{var pw=wb.Worksheets.Item('Dia '+pad(FE.getDate()-1)),q=dayBlocks(pw);pv=[];
    for(c=0;c<16;c++){pv.push([]);for(r=0;r<10;r++)pv[c].push(c<14?q.c1[r][c]:q.c2[r][c-14])}}catch(e){pv=null}}
  for(c=0;c<16;c++){var sa=0,sp=0;for(r=0;r<10;r++){sa+=ap[c][r];if(pv)sp+=pv[c][r]}
    fb.push(false);if(sa===0&&sp>0){for(r=0;r<10;r++)ap[c][r]=pv[c][r];fb[c]=true}}
  BANK={ap:ap,ci:ci,fb:fb,rs:{R:n1(ws,'R54'),S:n1(ws,'S54'),T:n1(ws,'T54'),U:n1(ws,'U54'),W:n1(ws,'W54')},
    q:[n1(ws,'Q19'),n1(ws,'Q54'),n1(ws,'Q89')]};
  if(!USE){USE=[];for(c=0;c<16;c++){USE.push([]);for(r=0;r<10;r++)USE[c].push(false)}
    for(var i=1;i<=wb.Worksheets.Count;i++){var w=wb.Worksheets.Item(i);if(!/^Dia \d+/i.test(w.Name))continue;var q=dayBlocks(w);
      for(c=0;c<16;c++)for(r=0;r<10;r++){var x=c<14?q.a1[r][c]:q.a2[r][c-14],y=c<14?q.c1[r][c]:q.c2[r][c-14];if(x||y)USE[c][r]=true}}}
}
function readInf(wb){
  var ws=wb.Worksheets.Item('PROPINAS');
  var pr=rr(ws,'C13:Q13')[0],ac=rr(ws,'C27:G27')[0],fe=null;
  try{fe=wb.Worksheets.Item('INFORME').Range('B13').Value2}catch(e){}
  INF={p:pr,ac:ac,tot:n1(ws,'R13'),t27:n1(ws,'H27'),fe:fe};
  try{var wi=findSheet(wb,'INGRESOS Y RETIROS'),tt=totIR(wi);TOT.ti=tt.ti;TOT.tr=tt.tr;TOT.ok=true}catch(e){}
}
function jpSheet(wb){
  var n=MES[FE.getMonth()],i,w,v=null;
  try{return wb.Worksheets.Item(n)}catch(e){}
  for(i=1;i<=wb.Worksheets.Count;i++){w=wb.Worksheets.Item(i);if(w.Visible!==-1)continue;if(!v)v=w;if(w.Name.toUpperCase().indexOf(n)>=0)return w}
  if(v)return v;
  throw new Error('El archivo de jackpot no tiene ninguna hoja visible');
}
function jdate(x){
  var m;
  if(typeof x==='number')return Math.floor(x);
  if(typeof x==='string'&&(m=x.match(/^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/))){var y=parseInt(m[3],10);if(y<100)y+=2000;return ser(new Date(y,parseInt(m[2],10)-1,parseInt(m[1],10)))}
  return null;
}
function jpRow(ws){
  var v=rr(ws,'B15:B46'),i,x,t=ser(FE),any=false;
  for(i=0;i<v.length;i++){x=jdate(v[i][0]);if(x!==null){any=true;if(x===t)return 15+i}}
  if(!any)return 14+FE.getDate();
  throw new Error('No encontre la fecha '+fmtF(FE)+' en la columna B (B15:B46) del jackpot, hoja "'+ws.Name+'"');
}
function readJp(wb){
  var ws=jpSheet(wb);
  var raw=rr(ws,'AF15:AK65'),det=[],s=ser(FE),i;
  for(i=0;i<raw.length;i++){var x=raw[i];if(typeof x[0]==='number'&&Math.round(x[0])===s&&(x[1]||x[4]||x[5]))det.push(x.concat([15+i]))}
  JP={am15:n1(ws,'AM15'),am21:n1(ws,'AM21'),ao15:n1(ws,'AO15'),ao17:n1(ws,'AO17'),ao19:n1(ws,'AO19'),ao21:n1(ws,'AO21'),det:det};
}
function qW(k,sheet,addr,v,mt){pend[k+'|'+sheet+'|'+addr]={f:k,s:sheet,a:addr,v:v,m:mt};setStat('Cambios pendientes: se guardan al presionar Listo')}
function schedule(ms){clearTimeout(timer);timer=setTimeout(function(){sync(true)},ms);setStat('Guardando cambios...')}
function isLocked(p){try{var t=fso.OpenTextFile(p,8,false);t.Close();return false}catch(e){return true}}
function enableEdit(app,p){
  var ok=false,nm=String(fso.GetFileName(p)).toUpperCase(),i,w;
  try{var pv=app.ProtectedViewWindows;
    for(i=pv.Count;i>=1;i--){w=pv.Item(i);if(String(w.SourceName).toUpperCase()===nm){w.Edit();ok=true}}}catch(e){}
  return ok}
function killOrphans(){
  var n=0,t0;
  try{var sv=GetObject('winmgmts:\\\\.\\root\\cimv2'),en=new Enumerator(sv.ExecQuery("Select * from Win32_Process Where Name='EXCEL.EXE'")),pr,cl;
    for(;!en.atEnd();en.moveNext()){pr=en.item();cl=String(pr.CommandLine||'');
      if(/-Embedding|\/automation/i.test(cl)){try{pr.Terminate();n++}catch(e){}}}}catch(e){}
  if(n){t0=new Date().getTime();while(new Date().getTime()-t0<900){}}
  return n}
function openBook(xl,p,write){
  var wb=null,run=null;
  if(isLocked(p)){
    if(write){try{run=GetObject('','Excel.Application')}catch(e){run=null}if(run)enableEdit(run,p)}
    try{wb=GetObject(p)}catch(e){wb=null}
    if(wb&&write&&wb.ReadOnly&&enableEdit(wb.Application,p)){try{wb=GetObject(p)}catch(e){}}
    if(wb&&write&&wb.ReadOnly){try{var ap=wb.Application;if(!ap.Visible){wb.Close(false);if(ap.Workbooks.Count===0)ap.Quit();wb=null}}catch(e){}}
    if(wb)return{wb:wb,live:true,app:wb.Application}}
  return{wb:xl.Workbooks.Open(p,0,!write),live:false,app:xl};
}
function doFile(xl,k,w){
  var p=rp(k);
  if(!p)throw new Error('falta la ruta del archivo (boton "Conexion y archivos...")');
  if(!fso.FileExists(p))throw new Error('no encuentro '+p);
  var ob=openBook(xl,p,w.length>0),wb=ob.wb,i,wsj=null,row=0,chk=[];
  try{
    if(w.length&&wb.ReadOnly)throw new Error('"'+p.replace(/^.*\\/,'')+'" esta abierto en otro lado como solo lectura (cierralo en Excel)');
    if(k==='jp'&&w.length){wsj=jpSheet(wb);row=jpRow(wsj)}
    for(i=0;i<w.length;i++){var ws,a=w[i].a;
      if(k==='jp'){ws=wsj;a=a.replace(/\d+$/,row);chk.push([a,w[i].v===null?0:w[i].v])}else ws=wb.Worksheets.Item(w[i].s);
      if(w[i].v===null)ws.Range(a).ClearContents();else ws.Range(a).Value=w[i].v}
    if(wsj)wsj.Range('Q'+row).Value=0;
    if(w.length)ob.app.Calculate();
    if(k==='ban')readBan(wb);else if(k==='inf')readInf(wb);else readJp(wb);
    if(wsj){var bad=[];for(i=0;i<chk.length;i++)if(Math.abs(nm(wsj.Range(chk[i][0]).Value2)-nm(chk[i][1]))>0.001)bad.push(chk[i][0]);
      if(bad.length)throw new Error('no quedo escrito en '+bad.join(', ')+' (hoja "'+wsj.Name+'": protegida o celda con formula?)')}
    if(w.length)wb.Save();
  }finally{if(!ob.live){try{wb.Close(false)}catch(e){}}}
}
function sync(all){
  if(cli()){clientFlush();return}
  if(DUP)return;
  if(busy){again=true;return}
  clearTimeout(timer);busy=true;var work=pend;pend={};setStat('Sincronizando con Excel...');
  setTimeout(function(){
    var xl=null,fails=[];
    try{
      xl=new ActiveXObject("Excel.Application");xl.Visible=false;xl.DisplayAlerts=false;
      try{xl.EnableEvents=false;xl.AutomationSecurity=3}catch(e){}
      KS.forEach(function(k){
        var w=[],x;for(x in work)if(work[x].f===k[0])w.push(work[x]);
        try{doFile(xl,k[0],w);errs[k[0]]=''}catch(e){errs[k[0]]=k[1]+': '+e.message;for(var j=0;j<w.length;j++)pend[w[j].f+'|'+w[j].s+'|'+w[j].a]=w[j]}
      });
    }catch(e){errs.xl='No pude abrir Excel: '+e.message}
    finally{try{if(xl)xl.Quit()}catch(e){}}
    busy=false;applyRead();render();refreshWins();
    var m=[],k;for(k in errs)if(errs[k])m.push(errs[k]);
    if(INF&&INF.fe&&typeof INF.fe==='number'&&Math.round(INF.fe)!==ser(FE))m.push('El informe abierto es de otra fecha ('+fmtF(new Date(Date.UTC(1899,11,30)+INF.fe*86400000))+')');
    var h=new Date();
    setStat(m.length?'<span class="dn">'+esc(m.join(' | '))+'</span>':'Sincronizado '+pad(h.getHours())+':'+pad(h.getMinutes())+':'+pad(h.getSeconds()));
    if(srv()&&BANK){pubSnap(NT.snapReq);NT.snapReq=false}
    if(again){again=false;sync(true)}else jobNext();
  },40);
}
function nSum(a){var t=0,i;for(i=0;i<a.length;i++)if(typeof a[i]==='number')t+=a[i];return t}
function localT27(){var t=INF?nm(INF.ac[3]):0,i;for(i=0;i<M.length;i++)if(M[i].a&&typeof A[i]==='number')t+=A[i];return t}
function hasPend(){for(var k in pend)return true;return false}
function applyRead(){
  var c,r,i;
  if(BANK)for(c=0;c<16;c++)for(r=0;r<10;r++)V[c][r]=BANK.ci[c][r];
  if(INF)for(i=0;i<M.length;i++){
    if(M[i].p){var x=INF.p[M[i].p.charCodeAt(0)-67];P[i]=typeof x==='number'?x:''}
    if(M[i].a){var y=INF.ac[M[i].a.i.charCodeAt(0)-67];A[i]=typeof y==='number'?y:''}}
  reapply();regRender();
}

/* ---- sincronizacion entre equipos con ntfy ---- */
var NT={ws:null,tm:null,since:0,fails:0,poll:null,lastSnap:'',snapReq:false},SEEN={},ASM={},LASTS=0,INFL=[];
var SID=String(new Date().getTime())+'-'+Math.floor(Math.random()*100000),DUP=false;
function tmpDir(){return window.tmpDir ? window.tmpDir() : (function(){try{return fso.GetSpecialFolder(2).Path+'\\'}catch(e){return base()}})()}
function keyName(){return String(CFG.nt.room||rp('inf')||'x').replace(/[^A-Za-z0-9_-]/g,'_').substring(0,60)}
function lockFile(){return tmpDir()+'cierre_srv_'+keyName()+'.lock'}
function ledgerFile(){return tmpDir()+'cierre_tx_'+keyName()+'.log'}
function lockRead(){try{var f=lockFile();if(!fso.FileExists(f))return null;var t=fso.OpenTextFile(f,1,false,0),x=t.ReadAll();t.Close();var a=x.split('|');return{sid:a[0],t:parseInt(a[1],10)||0}}catch(e){return null}}
function lockWrite(){try{var t=fso.CreateTextFile(lockFile(),true,false);t.Write(SID+'|'+new Date().getTime());t.Close()}catch(e){}}
function otherServer(){var l=lockRead();return !!(l&&l.sid!==SID&&new Date().getTime()-l.t<12000)}
function lockFree(){try{var l=lockRead();if(l&&l.sid===SID)fso.DeleteFile(lockFile())}catch(e){}}
function dupStop(){
  if(DUP)return;DUP=true;ntStop();
  try{netSet('SERVIDOR DUPLICADO: cierra esta ventana',false);regMsg('YA HAY OTRO SERVIDOR abierto con este codigo de sala. Esta ventana NO procesa registros: cierrala.','dn');setStat('<span class="dn">Servidor duplicado: cierra esta ventana</span>')}catch(e){}
  alert('YA HAY OTRO SERVIDOR ABIERTO (mismo codigo de sala).\n\nEsta ventana dejo de recibir registros para no duplicarlos: cierrala.\nSi no ves el otro servidor, finaliza todos los "Host de aplicacion HTML de Microsoft" en el Administrador de tareas y abre solo uno.')}
function ledFind(id){var f=ledgerFile(),t,x,a,i,k=id+'|';if(!fso.FileExists(f))return '';t=fso.OpenTextFile(f,1,false,0);x=t.ReadAll();t.Close();a=x.split(/\r?\n/);for(i=0;i<a.length;i++)if(a[i].indexOf(k)===0)return a[i];return ''}
function claimTx(id){try{if(ledFind(id))return false;var t=fso.OpenTextFile(ledgerFile(),8,true,0);t.WriteLine(id+'|'+SID);t.Close();return ledFind(id)===id+'|'+SID}catch(e){return true}}
function ledTrim(){try{var f=ledgerFile();if(!fso.FileExists(f)||fso.GetFile(f).Size<200000)return;var t=fso.OpenTextFile(f,1,false,0),x=t.ReadAll(),a;t.Close();a=x.split(/\r?\n/);a=a.slice(Math.max(0,a.length-1000));t=fso.CreateTextFile(f,true,false);t.Write(a.join('\r\n'));t.Close()}catch(e){}}
setInterval(function(){if(!srv()||DUP)return;if(otherServer())dupStop();else lockWrite()},4000);
window.onunload=function(){lockFree()};
function cli(){return CFG.nt.mode==='cli'}
function srv(){return CFG.nt.mode==='srv'}
var NTFY_DIR='C:\\Users\\MONITORES\\Desktop\\Luis\\ntfy_2.29.0_windows_amd64\\ntfy_2.29.0_windows_amd64';
function ntDirFind(){
  var dirs=[(CFG.nt&&CFG.nt.dir)||'',NTFY_DIR,base().replace(/\\$/,''),base()+'ntfy'],i,x;
  for(i=0;i<dirs.length;i++){x=String(dirs[i]).replace(/\\+$/,'');if(x&&fso.FileExists(x+'\\ntfy.exe'))return x}
  return null
}
function ntDirPick(){
  try{var sa=new ActiveXObject('Shell.Application'),f=sa.BrowseForFolder(0,'Elige la carpeta donde esta ntfy.exe',0x41,0);
    if(f){CFG.nt.dir=f.Self.Path;cfgRows()}}
  catch(e){alert('No pude abrir el selector de carpetas: '+e.message)}
}
function ntDirInfo(){
  var x=String((CFG.nt&&CFG.nt.dir)||'').replace(/\\+$/,'');
  if(x)return fso.FileExists(x+'\\ntfy.exe')?'<span class="up">ntfy.exe encontrado</span>':'<span class="dn">no encuentro ntfy.exe en esa carpeta</span>';
  var d=ntDirFind();
  return d?'Sin carpeta elegida; se usa: '+esc(d)+' <span class="up">encontrado</span>':'<span class="dn">no encuentro ntfy.exe; elige la carpeta</span>'
}
function ntSrvAuto(){
  try{
    if(!srv())return false;
    var u=String(CFG.nt.url||'');if(!u||/ntfy\.sh/i.test(u))return false;
    var d=ntDirFind();
    if(!d)return false;
    try{var run=GetObject('winmgmts:').ExecQuery("select Name from Win32_Process where Name='ntfy.exe'");if(run.Count>0)return false}catch(e0){}
    var yml=d+'\\server.yml';
    if(!fso.FileExists(yml)){var t=fso.CreateTextFile(yml,true);t.WriteLine('listen-http: ":8080"');t.WriteLine('cache-file: "cache.db"');t.Close()}
    var wsh=new ActiveXObject('WScript.Shell');
    wsh.CurrentDirectory=d;
    wsh.Run('"'+d+'\\ntfy.exe" serve --config "'+yml+'"',0,false);
    return true
  }catch(e){try{setStat('No pude iniciar ntfy solo: '+e.message)}catch(e2){}return false}
}
function ntBase(){return (CFG.nt.url||'https://ntfy.sh').replace(/\/+$/,'')}
function ntTopic(k){return String(CFG.nt.room).replace(/[^A-Za-z0-9_-]/g,'-')+'-'+k}
function netSet(t,ok){$('net').innerHTML='<span class="'+(ok?'up':'dn')+'">&#9679;</span> '+esc(t)}
function ntPub(k,obj,cb){
  try{var x=new XMLHttpRequest();x.open('POST',ntBase()+'/'+ntTopic(k),true);
    x.onreadystatechange=function(){if(x.readyState===4){var ok=x.status>=200&&x.status<300;netSet(ok?'en linea':'error '+(x.status||'sin respuesta'),ok);if(cb)cb(ok,x.status)}};
    x.send(JSON.stringify(obj))}catch(e){netSet('error: '+e.message,false);if(cb)cb(false,0)}
}
function ntStop(){clearTimeout(NT.tm);clearInterval(NT.poll);NT.poll=null;if(NT.ws){try{NT.ws.onclose=null;NT.ws.close()}catch(e){}NT.ws=null}}
function ntStart(){
  ntStop();$('net').innerHTML='';
  if(!(srv()||cli())||!CFG.nt.room)return;
  NT.since=(srv()&&CFG.nt.since)?CFG.nt.since:Math.floor(new Date().getTime()/1000)-(cli()?15:0);
  NT.fails=0;ntConnect();
  if(cli()){RS.clSync=false;RS.qTry=0;RS.qNext=new Date().getTime()+12000;
    setTimeout(function(){ntPub('cmd',{k:'q',n:CFG.nt.name})},900);setTimeout(regAskList,2000)}
}
function ntConnect(){
  var top=srv()?'cmd':'st';
  if(typeof WebSocket==='undefined'||NT.fails>=3){ntPollMode(top);return}
  var got=false;
  try{var ws=new WebSocket(ntBase().replace(/^http/,'ws')+'/'+ntTopic(top)+'/ws?since='+NT.since);NT.ws=ws;
    ws.onopen=function(){got=true;NT.fails=0;netSet('en linea',true)};
    ws.onmessage=function(e){ntMsg(e.data)};
    ws.onclose=function(){if(NT.ws!==ws)return;if(!got)NT.fails++;netSet('reconectando...',false);NT.tm=setTimeout(ntConnect,3000)};
    ws.onerror=function(){}
  }catch(e){NT.fails++;NT.tm=setTimeout(ntConnect,3000)}
}
function ntPollMode(top){
  function go(){try{var x=new XMLHttpRequest();x.open('GET',ntBase()+'/'+ntTopic(top)+'/json?poll=1&since='+NT.since+'&_='+new Date().getTime(),true);
    x.onreadystatechange=function(){if(x.readyState===4){
      if(x.status===200){var ls=x.responseText.split('\n'),i;for(i=0;i<ls.length;i++)if(ls[i])ntMsg(ls[i]);netSet('en linea (modo lento)',true)}
      else netSet('error '+(x.status||'sin respuesta'),false)}};
    x.send()}catch(e){netSet('error: '+e.message,false)}}
  netSet('en linea (modo lento)',true);go();NT.poll=setInterval(go,15000);
}
function ntMsg(txt){
  var o,m;try{o=JSON.parse(txt)}catch(e){return}
  if(o.event!=='message')return;
  if(o.time>NT.since)NT.since=o.time;
  try{m=JSON.parse(o.message)}catch(e){return}
  if(m&&typeof m==='object')m._t=o.time;
  if(srv())srvMsg(m);else if(cli())cliMsg(m);
}
function okItem(it){return it&&/^(ban|jp|inf)$/.test(it.f)&&/^[A-Za-z0-9 ]{1,12}$/.test(it.s)&&/^[A-Z]{1,2}\d{1,3}$/.test(it.a)&&(it.v===null||typeof it.v==='number')}
function srvMsg(m){
  if(regSrvMsg(m))return;
  if(m.k==='w'&&m.w){
    if(SEEN[m.id])return;SEEN[m.id]=1;var i,it,n=0;
    for(i=0;i<m.w.length;i++){it=m.w[i];if(!okItem(it))continue;pend[it.f+'|'+it.s+'|'+it.a]={f:it.f,s:it.s,a:it.a,v:it.v};n++;if(it.f==='ban'&&it.v)cierreMark()}
    CFG.nt.since=NT.since;cfgSave();
    if(n){setStat('Recibido de '+esc(m.n||'un cliente')+' ('+n+' cambios)...');clearTimeout(timer);timer=setTimeout(function(){sync(true)},500)}
  }else if(m.k==='q'){NT.snapReq=true;if(!busy&&BANK)pubSnap(true)}
}
function errMsgs(){var a=[],k;for(k in errs)if(errs[k])a.push(errs[k]);return a.join(' | ')}
function buildSnap(){
  var us=[],fbs=[],det=[],c,r,s;
  for(c=0;c<16;c++){s='';for(r=0;r<10;r++)s+=(USE&&USE[c][r])?'1':'0';us.push(s);fbs.push(BANK&&BANK.fb[c]?1:0)}
  if(JP)JP.det.slice(0,25).forEach(function(x){det.push([String(x[1]||'').substring(0,28),String(x[2]||'').substring(0,16),String(x[3]||'').substring(0,16),nm(x[4]),nm(x[5]),nm(x[6])])});
  return{fe:FE.getFullYear()+'-'+pad(FE.getMonth()+1)+'-'+pad(FE.getDate()),V:V,ap:BANK?BANK.ap:null,fb:fbs,rs:BANK?BANK.rs:null,q:BANK?BANK.q:null,use:us,P:P,A:A,
    tot:INF?INF.tot:0,t27:INF?INF.t27:0,ti:TOT.ti,tr:TOT.tr,ac3:INF?nm(INF.ac[3]):0,am15:JP?JP.am15:0,am21:JP?JP.am21:0,ao15:JP?JP.ao15:0,ao17:JP?JP.ao17:0,ao19:JP?JP.ao19:0,ao21:JP?JP.ao21:0,det:det,er:errMsgs(),fc:CI().first}
}
function pubSnap(force){
  var o=buildSnap(),js=JSON.stringify(o);
  if(!force&&js===NT.lastSnap)return;NT.lastSnap=js;
  o.t=new Date().getTime();js=JSON.stringify(o);
  var parts=[],i;for(i=0;i<js.length;i+=2800)parts.push(js.substring(i,i+2800));
  for(i=0;i<parts.length;i++)ntPub('st',{k:'s',i:o.t,n:i,m:parts.length,d:parts[i]});
}
function clientFlush(){
  var items=[],k,it,now=new Date().getTime(),i;
  for(k in pend){it=pend[k];items.push({f:it.f,s:it.s,a:it.a,v:it.v});INFL.push({m:it.m,v:it.v,t:now})}
  if(!items.length){ntPub('cmd',{k:'q',n:CFG.nt.name});setStat('Pidiendo datos al servidor...');return}
  var id=(CFG.nt.name||'cli')+'-'+now;
  for(i=0;i<items.length;i+=18)ntPub('cmd',{k:'w',id:id+'-'+i,n:CFG.nt.name,w:items.slice(i,i+18)});
  pend={};setStat('Enviado al servidor ('+items.length+' cambios). Esperando confirmacion...');
}
function cliMsg(m){
  if(regCliMsg(m))return;
  if(m.k!=='s')return;
  var a=ASM[m.i]||(ASM[m.i]={p:[],n:0,m:m.m});
  if(a.p[m.n]===undefined){a.p[m.n]=m.d;a.n++}
  if(a.n===a.m){var key;delete ASM[m.i];for(key in ASM)if(parseInt(key,10)<m.i-60000)delete ASM[key];
    try{applySnap(JSON.parse(a.p.join('')))}catch(e){setStat('<span class="dn">Datos del servidor ilegibles</span>')}}
}
function applySnap(o){
  if(o.t<LASTS)return;LASTS=o.t;
  if(o.fc&&o.fc.t){var c0=CI();if(!c0.first.t||c0.first.d!==o.fc.d||o.fc.t<c0.first.t){c0.first={d:o.fc.d,t:o.fc.t};cfgSave()}}
  var f=o.fe.split('-'),c,r,i;FE=new Date(parseInt(f[0],10),parseInt(f[1],10)-1,parseInt(f[2],10));
  BANK=o.ap?{ap:o.ap,ci:o.V,fb:o.fb,rs:o.rs,q:o.q}:null;
  for(c=0;c<16;c++)for(r=0;r<10;r++)V[c][r]=o.V[c][r];
  USE=[];for(c=0;c<16;c++){USE.push([]);for(r=0;r<10;r++)USE[c].push(o.use[c].charAt(r)==='1')}
  for(i=0;i<M.length;i++){P[i]=o.P[i];A[i]=o.A[i]}
  INF={p:[],ac:[0,0,0,o.ac3,0],tot:o.tot,t27:o.t27,fe:null};TOT.ti=o.ti||0;TOT.tr=o.tr||0;TOT.ok=true;
  JP={am15:o.am15,am21:o.am21,ao15:o.ao15,ao17:o.ao17,ao19:o.ao19,ao21:o.ao21,det:o.det.map(function(x){return[0,x[0],x[1],x[2],x[3],x[4],x[5]]})};
  reapply();render();regRender();refreshWins();
  var h=new Date();setStat(o.er?'<span class="dn">Servidor: '+esc(o.er)+'</span>':'Actualizado '+pad(h.getHours())+':'+pad(h.getMinutes())+':'+pad(h.getSeconds()));
}
function reapply(){
  var arr=[],k,j,it,now=new Date().getTime();
  for(k in pend)arr.push(pend[k]);
  INFL=INFL.filter(function(x){return now-x.t<25000});
  for(j=0;j<INFL.length;j++)arr.push(INFL[j]);
  for(j=0;j<arr.length;j++){it=arr[j];if(!it.m)continue;
    if(it.m.t==='c')V[M[it.m.i].c][it.m.r]=it.v===null?0:it.v;
    else if(it.m.t==='p')P[it.m.i]=it.v===null?'':it.v;
    else if(it.m.t==='a')A[it.m.i]=it.v===null?'':it.v}
}

var RFP=16,rzT=null;
function fit(){
  var w=document.documentElement.clientWidth||document.body.clientWidth||1280,h=document.documentElement.clientHeight||document.body.clientHeight||720,s=Math.min(w/1280,h/720);
  if(s<0.62)s=0.62;if(s>2.2)s=2.2;
  RFP=Math.round(16*s*10)/10;document.documentElement.style.fontSize=RFP+'px'}
function clampWins(){var k,e,cw=document.documentElement.clientWidth,ch=document.documentElement.clientHeight;
  for(k in WIN){e=WIN[k].el;e.style.left=Math.max(0,Math.min(e.offsetLeft,cw-e.offsetWidth))+'px';e.style.top=Math.max(0,Math.min(e.offsetTop,ch-e.offsetHeight))+'px'}}
window.onresize=function(){if(rzT)clearTimeout(rzT);rzT=setTimeout(function(){rzT=null;fit();try{render()}catch(e){}try{clampWins()}catch(e){}},50)};
function winPos(el,k){
  var u=RFP,ww=document.documentElement.clientWidth||1280,wd=26*u,cols=Math.max(1,Math.floor((ww-.6*u)/(wd+.5*u))),tp=118;
  try{tp=document.querySelector('#vCierre .vtop').getBoundingClientRect().bottom+.4*u}catch(e){}
  el.style.left=Math.round(.6*u+(k%cols)*(wd+.5*u)+Math.floor(k/cols)*1.6*u)+'px';
  el.style.top=Math.round(tp+Math.floor(k/cols)*2.4*u)+'px'}

function sumc(c){var n=0,v=0,a=0,r;for(r=0;r<10;r++){n+=V[c][r];v+=V[c][r]*D[r];if(BANK)a+=BANK.ap[c][r]*D[r]}return{n:n,v:v,a:a}}
function dif(s){var d=s.v-s.a;return '<span class="'+(d>0?'up':d<0?'dn':'')+'">'+(d>0?'+':'')+f(d)+' vs apertura</span>'}
function inUse(c,r){return (USE&&USE[c][r])||(BANK&&BANK.ap[c][r]!==0)||V[c][r]!==0}
function visible(i){var m=M[i],r;if(m.c===undefined||showEmpty)return true;for(r=0;r<10;r++)if(inUse(m.c,r))return true;return false}
function kt(l,v,c,x){return '<div class="kw"><div class="kt'+(c?' '+c:'')+'"><small>'+l+'</small><b>'+v+'</b>'+(x||'')+'</div></div>'}
function titleSet(){var t='Cierre de fichas - Capri GDL'+(cli()?' - CLIENTE':'');if(document.title!==t)document.title=t}
function render(){
  titleSet();jpBarRender();
  $('btnCfg').innerHTML=cli()?'Conexion...':(srv()?'Conexion y archivos...':'Archivos...');
  $('fe').innerHTML=fmtF(FE);$('fl1').style.display=$('fl2').style.display=cli()?'none':'';
  var h='',hid=[],vis=[],i,j,m,s,done,q=BANK&&BANK.q?BANK.q:null,
      pn=hasPend()?'<span class="hint">pendiente de guardar</span>':'',
      ew=(document.documentElement.clientWidth||1280)/(RFP||16),mx,rows,cols,pw;
  for(i=0;i<M.length;i++){if(visible(i))vis.push(i);else hid.push(M[i].n)}
  mx=Math.max(3,Math.min(8,Math.floor((ew-3)/9.2)));
  rows=Math.max(1,Math.ceil(vis.length/mx));cols=Math.max(1,Math.ceil(vis.length/rows));
  pw=Math.floor(10000/cols)/100;
  for(j=0;j<vis.length;j++){
    i=vis[j];m=M[i];s=m.c!==undefined?sumc(m.c):null;
    done=(s&&s.n>0)||(P[i]!==''&&P[i]>0);
    h+='<div class="mw" style="width:'+pw+'%"><div class="m'+(done?' done':'')+(SEL[i]?' sel':'')+(WIN[i]?' op':'')+'" onclick="tap('+i+')"><span class="nm">'+(SEL[i]?'&#10003; ':'')+m.n+(i>=14?'<span class="vip">VIP</span>':'')+'</span>';
    if(s)h+=s.n>0?'<span class="mv">'+mny(s.v)+'</span><span class="st">'+f(s.n)+' fichas</span><span class="st">'+(BANK?dif(s):'')+'</span>':'<span class="st">Sin fichas</span>';
    if(m.p)h+='<span class="st pr">Propina: '+(P[i]===''?'-':mny(P[i]))+'</span>';
    if(m.a)h+='<span class="st ac">Acumulado: '+(A[i]===''?'-':mny(A[i]))+'</span>';
    h+='</div></div>';
  }
  $('main').innerHTML=h;
  $('hid').innerHTML=hid.length?'Sin fichas en ningun dia: '+hid.join(', ')+' (ocultas). <a class="l" onclick="showEmpty=true;render()">Mostrar</a>':'';
  var hj=!!(JP||INF);
  $('kp').innerHTML=
    kt('Banca inicial (cierre ayer)',q?mny(q[0]):'-','gr')+
    kt('Total fichas al cierre',q?mny(q[1]):'-','g',q?pn:'')+
    kt('Diferencia',q?'<span class="'+(q[2]<0?'dn':'up')+'">'+(q[2]>0?'+':'')+'$ '+f(q[2])+'</span>':'-','g',q?pn:'')+
    kt('Total propinas',mny(hasPend()?nSum(P):(INF?INF.tot:0)),'g')+
    kt('Recaudado del dia',hj?mny(INF?(hasPend()?localT27():INF.t27):0):'-','');
  var j2='';
  if(hj){
    if(JP&&JP.det.length){var tj=0,ts=0;
      j2+='<h2>Pagos de jackpot del dia (clic en uno para editarlo o eliminarlo)</h2><table class="t"><tr><th>Cliente</th><th>Mesa</th><th>Jugada</th><th>Premio Jackpot</th><th>Premio Super Jackpot</th></tr>';
      JP.det.forEach(function(x,ix){tj+=nm(x[4]);ts+=nm(x[5]);j2+='<tr style="cursor:pointer" title="Clic para editar o eliminar" onclick="jeOpen('+ix+')"><td>'+esc(x[1]||'')+'</td><td>'+esc(x[2]||'')+'</td><td>'+esc(x[3]||'')+'</td><td class="n">'+(nm(x[4])?mny(nm(x[4])):'')+'</td><td class="n">'+(nm(x[5])?mny(nm(x[5])):'')+'</td></tr>'});
      j2+='<tr><th colspan="3">Total pagado hoy</th><th class="n">'+mny(tj)+'</th><th class="n">'+mny(ts)+'</th></tr></table>';
    }else j2='<div class="hint">Sin pagos de jackpot registrados para esta fecha.</div>';
  }
  $('jp').innerHTML=j2;
  regRender();
}
function card(a,b){return '<div class="c"><small>'+a+'</small><b>'+mny(b)+'</b></div>'}

/* ---- ventanas flotantes ---- */
var WIN={},ZI=20,SEL={},selMode=false,DR=null,lastKey=0;
function ban(){return 'Dia '+pad(FE.getDate())}
function chipAddr(c,r){return c<14?L.charAt(c)+(42+r):'CD'.charAt(c-14)+(59+r)}
function rowsFor(c,all){var a=[],r;for(r=0;r<10;r++)if(all||inUse(c,r))a.push(r);return a}
function nWin(){var n=0,k;for(k in WIN)n++;return n}
function selCount(){var n=0,k;for(k in SEL)if(SEL[k])n++;return n}
function selBar(){$('selb').innerHTML=selMode?'<span class="b p" onclick="abrirSel()">Abrir seleccionadas ('+selCount()+')</span><span class="b" onclick="sinOpSel()">Sin operacion a seleccionadas</span><span class="b" onclick="ceroSel()">Fichas en 0 a seleccionadas</span><span class="b" onclick="selToggle()">Cancelar</span>':'<span class="b" onclick="selToggle()">Seleccionar varias</span>'}
function selToggle(){selMode=!selMode;SEL={};selBar();render()}
function tap(i){if(selMode){SEL[i]=!SEL[i];selBar();render();return}abrir(i)}
function abrirSel(){var k=0,i;for(i=0;i<M.length;i++)if(SEL[i])abrir(i,k++);selMode=false;SEL={};selBar();render()}
function front(i){if(WIN[i])WIN[i].el.style.zIndex=++ZI}
function abrir(i,pos){
  if(WIN[i]){front(i);var f0=WIN[i].fields[0];if(f0)$(f0).focus();return}
  var m=M[i],k=pos===undefined?nWin():pos,el=document.createElement('div');
  el.className='win';el.id='w'+i;
  winPos(el,k);el.style.zIndex=++ZI;
  el.innerHTML='<div class="wt" onmousedown="dragStart(event,'+i+')"><span class="wn">'+esc(m.n)+'</span>'+
    (m.c!==undefined?'<span class="b" onclick="sinOp('+i+')">Sin operacion</span><span class="b" onclick="cero('+i+')">En 0</span>':'')+'<span class="b p" onclick="listo('+i+')">Listo</span></div>'+
    '<div id="wr'+i+'"></div><div class="wtot" id="wm'+i+'"></div><div class="hint"><a class="l" onclick="toggleAll('+i+')" id="wa'+i+'"></a></div>';
  el.onmousedown=function(){front(i)};
  $('wins').appendChild(el);
  WIN[i]={el:el,all:(m.c!==undefined&&!rowsFor(m.c,false).length),fields:[]};
  pintar(i);render();
}
function inp(id,i,k,v){return '<input id="'+id+'" data-i="'+i+'" data-k="'+k+'" type="text" autocomplete="off" value="'+(v===0||v===''?'':v)+'">'}
function pintar(i){
  var m=M[i],w=WIN[i],c=m.c,h='',j,r,vr;w.fields=[];
  if(m.p){w.fields.push('qp'+i);h+='<div class="r"><span class="chip tx">Propina</span><span class="ab"></span><span style="width:2.5rem"></span>'+inp('qp'+i,i,'p',P[i])+'</div>'}
  if(m.a){w.fields.push('qa'+i);h+='<div class="r"><span class="chip tx">Acumul.</span><span class="ab"></span><span style="width:2.5rem"></span>'+inp('qa'+i,i,'a',A[i])+'</div>'}
  if(c!==undefined){vr=rowsFor(c,w.all);
    for(j=0;j<vr.length;j++){r=vr[j];w.fields.push('q'+i+'_'+r);
      h+='<div class="r"><span class="chip" style="background:'+CH[r][0]+';color:'+CH[r][1]+'">'+f(D[r])+'</span><span class="ab">'+(BANK?'abrio '+BANK.ap[c][r]:'')+'</span>'+
        '<span class="b pm" onclick="bump('+i+','+r+',-1)">&minus;</span>'+inp('q'+i+'_'+r,i,r,V[c][r])+'<span class="b pm" onclick="bump('+i+','+r+',1)">+</span><span class="sb" id="s'+i+'_'+r+'"></span></div>'}}
  $('wr'+i).innerHTML=h;$('wa'+i).innerHTML=c===undefined?'':(w.all?'Mostrar solo las denominaciones de esta mesa':'Mostrar las 10 denominaciones');
  modal(i);if(w.fields.length)$(w.fields[0]).focus();
}
function toggleAll(i){WIN[i].all=!WIN[i].all;pintar(i)}
function modal(i){
  var m=M[i],c=m.c,r,t='',e;
  if(c!==undefined){for(r=0;r<10;r++){e=$('s'+i+'_'+r);if(e)e.innerHTML=V[c][r]?mny(V[c][r]*D[r]):''}
    var s=sumc(c);t='<div>Fichas<br><b>'+f(s.n)+'</b></div><div>Valor<br><b>'+mny(s.v)+'</b></div>'+(BANK?'<div>Dif.<br><b>'+dif(s).replace(' vs apertura','')+'</b></div>':'')}
  if(m.p)t+='<div>Propina<br><b>'+(P[i]===''?'-':mny(P[i]))+'</b></div>';
  $('wm'+i).innerHTML=t;
}
function refreshWins(force){
  var k,i,e,r;
  for(k in WIN){i=parseInt(k,10);var m=M[i];
    if(m.c!==undefined)for(r=0;r<10;r++){e=$('q'+i+'_'+r);if(e&&(force||document.activeElement!==e))e.value=V[m.c][r]?V[m.c][r]:''}
    e=$('qp'+i);if(e&&(force||document.activeElement!==e))e.value=P[i]===''?'':P[i];
    e=$('qa'+i);if(e&&(force||document.activeElement!==e))e.value=A[i]===''?'':A[i];
    modal(i)}
}
var HIST=[],REDO=[],NOAP=[];
function getv(i,t,r){return t==='c'?V[M[i].c][r]:(t==='p'?P[i]:A[i])}
function put(i,t,r,v){
  if(t==='c'){var c=M[i].c;V[c][r]=v;qW('ban',ban(),chipAddr(c,r),v,{t:'c',i:i,r:r})}
  else if(t==='p'){P[i]=v;qW('inf','PROPINAS',M[i].p+'13',v===''?null:v,{t:'p',i:i})}
  else{A[i]=v;var m=M[i];qW('inf','PROPINAS',m.a.i+'27',v===''?null:v,{t:'a',i:i});qW('jp',MES[FE.getMonth()],m.a.j+(14+FE.getDate()),v===''?null:v,{t:'a',i:i})}
}
function act(list,label,merge){
  var ch=[],j,x,o,now=new Date().getTime();
  for(j=0;j<list.length;j++){x=list[j];o=getv(x.i,x.t,x.r);if(o!==x.n)ch.push({i:x.i,t:x.t,r:x.r,o:o,n:x.n})}
  if(!ch.length)return false;
  var last=HIST[HIST.length-1];
  if(merge&&last&&last.m&&last.ch.length===1&&ch.length===1&&last.ch[0].i===ch[0].i&&last.ch[0].t===ch[0].t&&last.ch[0].r===ch[0].r&&now-last.ts<1500){last.ch[0].n=ch[0].n;last.ts=now}
  else{HIST.push({l:label,ch:ch,ts:now,m:!!merge});if(HIST.length>300)HIST.shift()}
  REDO=[];
  for(j=0;j<ch.length;j++)put(ch[j].i,ch[j].t,ch[j].r,ch[j].n);
  return true;
}
function afterHist(txt){
  render();refreshWins(true);
  if(nWin()===0){setStat(txt+'. Guardando...');setTimeout(function(){sync(true)},80)}else setStat(txt+'. Presiona Listo para guardar.');
}
function undo(){var e=HIST.pop(),j;if(!e){setStat('No hay nada que deshacer');return}REDO.push(e);
  for(j=e.ch.length-1;j>=0;j--)put(e.ch[j].i,e.ch[j].t,e.ch[j].r,e.ch[j].o);afterHist('Deshacer: '+e.l)}
function redo(){var e=REDO.pop(),j;if(!e){setStat('No hay nada que rehacer');return}HIST.push(e);
  for(j=0;j<e.ch.length;j++)put(e.ch[j].i,e.ch[j].t,e.ch[j].r,e.ch[j].n);afterHist('Rehacer: '+e.l)}
function setChip(i,r,v){act([{i:i,t:'c',r:r,n:v}],'fichas de '+f(D[r])+' en '+M[i].n,true);modal(i);render()}
function setP(i,v){act([{i:i,t:'p',r:0,n:v}],'propina de '+M[i].n,true);modal(i);render()}
function setA(i,v){act([{i:i,t:'a',r:0,n:v}],'acumulado de '+M[i].n,true);render()}
function bump(i,r,d){var x=V[M[i].c][r]+d;if(x<0)x=0;setChip(i,r,x);$('q'+i+'_'+r).value=x?x:'';$('q'+i+'_'+r).focus()}
function opList(i,mode){
  var m=M[i],c=m.c,r,l=[],sa=0;
  if(c===undefined)return null;
  if(mode==='sin'){
    if(!BANK){NOAP.push(m.n);return null}
    for(r=0;r<10;r++)sa+=BANK.ap[c][r];
    if(sa===0){NOAP.push(m.n);return null}
  }
  for(r=0;r<10;r++)l.push({i:i,t:'c',r:r,n:mode==='sin'?BANK.ap[c][r]:0});
  if(m.p)l.push({i:i,t:'p',r:0,n:0});
  if(m.a)l.push({i:i,t:'a',r:0,n:0});
  return l;
}
function sinOp(i){
  var m=M[i];NOAP=[];var l=opList(i,'sin');
  if(!l){setStat('<span class="dn">'+esc(m.n)+': no encontre fichas de apertura ni en la hoja "'+ban()+'" ni en el cierre del dia anterior. No cambie nada de lo capturado.</span>');return false}
  act(l,'sin operacion '+m.n,false);if(WIN[i])pintar(i);render();
  setStat(esc(m.n)+': sin operacion, quedo con las fichas de '+(BANK.fb[m.c]?'el cierre del dia anterior (la apertura del dia venia en 0)':'apertura')+'. Presiona Listo para guardar.');
  return true;
}
function cero(i){
  var m=M[i],l=opList(i,'cero');if(!l)return;
  act(l,'fichas en 0 '+m.n,false);if(WIN[i])pintar(i);render();
  setStat(esc(m.n)+': fichas, propina y acumulado en 0. Presiona Listo para guardar.');
}
function bulk(mode){
  var i,all=[],n=0,l;NOAP=[];
  for(i=0;i<M.length;i++)if(SEL[i]&&M[i].c!==undefined){l=opList(i,mode);if(l){all=all.concat(l);n++}}
  selMode=false;SEL={};selBar();
  var lbl=(mode==='sin'?'sin operacion':'fichas en 0')+' ('+n+' mesa'+(n===1?'':'s')+')';
  if(n)act(all,lbl,false);
  render();refreshWins(true);
  var w=NOAP.length?' <span class="dn">Sin apertura: '+esc(NOAP.join(', '))+' (no se cambiaron).</span>':'';
  if(n){setStat('Guardando '+lbl+'...'+w);setTimeout(function(){sync(true)},80)}else if(w)setStat(w);
}
function resetDia(){
  if(!confirm('Reset del dia '+fmtF(FE)+'\n\nDeja en 0 las fichas de cierre de todas las mesas, las propinas y los acumulados, en la app y en los archivos de Excel.\n\nSe puede deshacer con Deshacer (Ctrl+Z). Continuar?'))return;
  closeAll();selMode=false;SEL={};selBar();
  var l=[],i,r,m;
  for(i=0;i<M.length;i++){m=M[i];
    if(m.c!==undefined)for(r=0;r<10;r++)l.push({i:i,t:'c',r:r,n:0});
    if(m.p)l.push({i:i,t:'p',r:0,n:0});
    if(m.a)l.push({i:i,t:'a',r:0,n:0})}
  if(!act(l,'reset del dia',false)){setStat('Todo ya estaba en 0');return}
  render();refreshWins(true);
  setStat('Reset: guardando todo en 0...');setTimeout(function(){sync(true)},80);
}
function sinOpSel(){bulk('sin')}
function ceroSel(){bulk('cero')}
function listo(i){
  try{if(M[i].c!==undefined&&sumc(M[i].c).n>0)cierreMark()}catch(e0){}
  if(WIN[i]){$('wins').removeChild(WIN[i].el);delete WIN[i]}
  render();setStat('Guardando en Excel...');setTimeout(function(){sync(true)},80);
}
function closeAll(){var k;for(k in WIN){$('wins').removeChild(WIN[k].el);delete WIN[k]}}
function dragStart(e,i){e=e||window.event;var t=e.target||e.srcElement;if(t.tagName==='SPAN'&&/(^| )b( |$)/.test(t.className))return;
  var el=WIN[i].el;DR={el:el,dx:e.clientX-el.offsetLeft,dy:e.clientY-el.offsetTop};if(e.preventDefault)e.preventDefault()}
document.onmousemove=function(e){if(!DR)return;e=e||window.event;DR.el.style.left=Math.max(0,e.clientX-DR.dx)+'px';DR.el.style.top=Math.max(0,e.clientY-DR.dy)+'px'};
document.onmouseup=function(){DR=null};

var wins=document.getElementById('wins');
wins.addEventListener('input',function(e){var t=e.target;if(t.tagName!=='INPUT')return;
  lastKey=new Date().getTime();t.value=t.value.replace(/[^0-9.]/g,'');
  var n=t.value===''?'':parseFloat(t.value);if(n!==''&&isNaN(n))n='';
  var i=parseInt(t.getAttribute('data-i'),10),k=t.getAttribute('data-k');
  if(k==='p')setP(i,n);else if(k==='a')setA(i,n);else setChip(i,parseInt(k,10),n===''?0:n)});
wins.addEventListener('focusin',function(e){if(e.target.tagName==='INPUT'){e.target.select();front(parseInt(e.target.getAttribute('data-i'),10))}});
wins.addEventListener('keydown',function(e){
  var t=e.target;if(t.tagName!=='INPUT')return;
  var i=parseInt(t.getAttribute('data-i'),10),fl=WIN[i].fields,x=fl.indexOf(t.id),k=e.keyCode;
  if(k===13||k===40){e.preventDefault();
    if(x<fl.length-1)$(fl[x+1]).focus();
    else if(k===13){var ks=[],q;for(q in WIN)ks.push(parseInt(q,10));if(ks.length>1){var nx=ks[(ks.indexOf(i)+1)%ks.length];if(WIN[nx].fields[0])$(WIN[nx].fields[0]).focus()}}}
  else if(k===38){e.preventDefault();if(x>0)$(fl[x-1]).focus()}});
document.addEventListener('keydown',function(e){
  if(VIEW==='cierre'&&e.ctrlKey&&e.keyCode===90){e.preventDefault();undo();return}
  if(VIEW==='cierre'&&e.ctrlKey&&e.keyCode===89){e.preventDefault();redo();return}
  if(e.keyCode!==27)return;var top=-1,z=0,k;
  for(k in WIN){var zz=parseInt(WIN[k].el.style.zIndex,10);if(zz>=z){z=zz;top=parseInt(k,10)}}
  if(top>=0)listo(top)});

/* ---- contrasena de acceso ---- */
function sha256(m){
  var K=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
  var H=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];
  function R(n,x){return (x>>>n)|(x<<(32-n))}
  var l=m.length,i,j,w=[],wd=[],a,b,c,d,e,f,g,h,t1,t2,s0,s1;
  for(i=0;i<l;i++)wd[i>>2]=(wd[i>>2]|0)|((m.charCodeAt(i)&255)<<(24-(i%4)*8));
  wd[l>>2]=(wd[l>>2]|0)|(0x80<<(24-(l%4)*8));
  wd[(((l+8)>>6)+1)*16-1]=l*8;
  for(i=0;i<wd.length;i+=16){
    for(j=0;j<64;j++){
      if(j<16)w[j]=wd[i+j]|0;
      else{s0=R(7,w[j-15])^R(18,w[j-15])^(w[j-15]>>>3);s1=R(17,w[j-2])^R(19,w[j-2])^(w[j-2]>>>10);w[j]=(w[j-16]+s0+w[j-7]+s1)|0}}
    a=H[0];b=H[1];c=H[2];d=H[3];e=H[4];f=H[5];g=H[6];h=H[7];
    for(j=0;j<64;j++){
      t1=(h+(R(6,e)^R(11,e)^R(25,e))+((e&f)^(~e&g))+K[j]+w[j])|0;
      t2=((R(2,a)^R(13,a)^R(22,a))+((a&b)^(a&c)^(b&c)))|0;
      h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0}
    H[0]=(H[0]+a)|0;H[1]=(H[1]+b)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0}
  var o='';for(i=0;i<8;i++)o+=('00000000'+(H[i]>>>0).toString(16)).slice(-8);
  return o;
}
function pwHash(salt,pw){var h=salt+unescape(encodeURIComponent(pw)),i;for(i=0;i<2000;i++)h=sha256(salt+h);return h}
function pwSalt(){var s='',i;for(i=0;i<16;i++)s+=Math.floor(Math.random()*16).toString(16);return s}
function pwOk(pw){return !!(CFG.pw&&CFG.pw.h&&pwHash(CFG.pw.s,pw)===CFG.pw.h)}
function pwSave(pw){var s=pwSalt();CFG.pw={s:s,h:pwHash(s,pw)};cfgSave()}
var LK={mode:'',after:null};
function lkMsg(t){$('lkm').innerHTML=t}
function lkInfo(t){$('lki').innerHTML=t;$('lkm').innerHTML=''}
function lockShow(mode,after){
  LK.mode=mode;if(after)LK.after=after;
  $('lkt').innerHTML=mode==='tfa'?'Autorizacion requerida':(mode==='set'?'Crea tu contrasena':(mode==='ask'?'Contrasena':'Cambiar contrasena'));
  $('lkh').innerHTML=mode==='tfa'?'Este equipo no esta autorizado todavia. Se envia una notificacion a tu celular; respondela con tu codigo para continuar.':(mode==='set'?'Primera vez: escribe la contrasena que se va a pedir cada vez que abras el programa (minimo 4 caracteres).':(mode==='ask'?'Escribe tu contrasena para entrar.':'Escribe la actual y la nueva.'));
  $('lk0').style.display=mode==='change'?'flex':'none';
  $('lk1').style.display=mode==='tfa'?'none':'flex';
  $('lkp1').placeholder=mode==='change'?'Contrasena nueva':'Contrasena';
  $('lk2').style.display=(mode==='set'||mode==='change')?'flex':'none';
  $('lkb').innerHTML=mode==='tfa'?'Reenviar solicitud':(mode==='set'?'Guardar y entrar':(mode==='ask'?'Entrar':'Cambiar'));
  $('lkc').style.display=mode==='change'?'':'none';
  $('lkch').style.display=mode==='ask'?'':'none';
  $('lkp0').value='';$('lkp1').value='';$('lkp2').value='';lkMsg('');$('lki').innerHTML='';
  $('lk').style.display='flex';
  if(mode!=='tfa')setTimeout(function(){try{(mode==='change'?$('lkp0'):$('lkp1')).focus()}catch(e){}},50);
}
function lkOpen(){
  $('lk').style.display='none';$('lkp0').value='';$('lkp1').value='';$('lkp2').value='';
  if(LK.after){var fn=LK.after;LK.after=null;fn()}
}
function lkGo(){
  if(LK.mode==='tfa'){tfaStart();return}
  var a=$('lkp0').value,p=$('lkp1').value,q=$('lkp2').value;
  if(LK.mode==='ask'){if(pwOk(p)){lkOpen();return}lkMsg('Contrasena incorrecta');$('lkp1').value='';$('lkp1').focus();return}
  if(LK.mode==='change'&&!pwOk(a)){lkMsg('La contrasena actual no es correcta');return}
  if(p.length<4){lkMsg('Usa al menos 4 caracteres');return}
  if(p!==q){lkMsg('Las dos contrasenas no coinciden');return}
  pwSave(p);lkOpen();
}

/* ---- 2FA ---- */
var TFA={url:'https://ntfy.sh/Gato_Negro_Sec',s:'95ce30b8722d516c',h:'2e1351acbecbdadc451eb8d58f989a8ccad4c7fbc1388f6fdf63ffc4569d2693',wait:300,tm:null,t0:0,since:'',id:'',cb:null};
function devId(){var u='?',c='?';try{var n=new ActiveXObject('WScript.Network');c=n.ComputerName;u=n.UserDomain+'\\'+n.UserName}catch(e){}return c+' / '+u}
function devKey(){if(!CFG.dsalt){CFG.dsalt=pwSalt()+pwSalt();cfgSave()}return sha256(CFG.dsalt+'|'+devId())}
function devTrusted(){var k=devKey(),a=CFG.dev||[],i;for(i=0;i<a.length;i++)if(a[i]===k)return true;return false}
function devTrust(){if(!CFG.dev)CFG.dev=[];if(!devTrusted())CFG.dev.push(devKey());cfgSave()}
function tfaCheck(m){m=String(m||'').replace(/\s/g,'').toUpperCase();return m.length>=8&&m.length<=64&&pwHash(TFA.s,m)===TFA.h}
function tfaGate(next){TFA.cb=next;if(devTrusted()){next();return}tfaStart()}
function tfaOk(){clearTimeout(TFA.tm);devTrust();var n=TFA.cb;TFA.cb=null;if(n)n()}
function tfaStart(){
  clearTimeout(TFA.tm);TFA.id=pwSalt().substring(0,4).toUpperCase();
  lockShow('tfa');lkInfo('Enviando solicitud...');
  var d=new Date(),x=new XMLHttpRequest(),
      txt='Un equipo nuevo pide acceso. PC: '+devId()+' | '+fmtF(d)+' '+pad(d.getHours())+':'+pad(d.getMinutes())+' | Solicitud '+TFA.id+'. Para autorizar responde en este tema con tu codigo.';
  try{
    x.open('POST',TFA.url+'?title='+encodeURIComponent('Cierre de fichas: intento de acceso')+'&priority=4&tags=warning,lock',true);
    x.onreadystatechange=function(){
      if(x.readyState!==4)return;
      if(x.status>=200&&x.status<300){var o={};try{o=JSON.parse(x.responseText)}catch(e){}
        TFA.since=o.id||Math.floor(new Date().getTime()/1000);TFA.t0=new Date().getTime();
        lkInfo('Solicitud '+TFA.id+' enviada a tu celular. Responde con tu codigo para entrar. Esperando...');
        TFA.tm=setTimeout(tfaPoll,3000)}
      else lkMsg('No pude contactar a ntfy (codigo '+(x.status||'sin respuesta')+'). Revisa la conexion y reenvia la solicitud.')};
    x.send(txt);
  }catch(e){lkMsg('No pude enviar la solicitud: '+esc(e.message))}
}
function tfaPoll(){
  if(new Date().getTime()-TFA.t0>TFA.wait*1000){lkMsg('Se agoto el tiempo sin respuesta. Reenvia la solicitud.');return}
  var x=new XMLHttpRequest();
  try{
    x.open('GET',TFA.url+'/json?poll=1&since='+encodeURIComponent(TFA.since)+'&_='+new Date().getTime(),true);
    x.onreadystatechange=function(){
      if(x.readyState!==4)return;
      if(x.status===200){var ls=x.responseText.split('\n'),i,o,n=0;
        for(i=0;i<ls.length&&n<20;i++){if(!ls[i])continue;try{o=JSON.parse(ls[i])}catch(e){continue}
          if(o.id)TFA.since=o.id;
          if(o.event==='message'){n++;if(tfaCheck(o.message)){tfaOk();return}}}}
      TFA.tm=setTimeout(tfaPoll,3000)};
    x.send();
  }catch(e){TFA.tm=setTimeout(tfaPoll,5000)}
}

/* =================== REGISTRO DE INGRESOS Y RETIROS =================== */
var VIEW='reg',PK=null,JOBQ=[],NEWN='';
var TXT='';
var RS={clAsm:{},pendTx:{},clPub:0,clReq:false,scId:'',t:'I',nom:'',monto:0,mesa:'',sup:'',tk:'Ticket',cl:[],sg:[],si:-1,last:[],rcp:[],tm:0,busy:false,clOk:false,clErr:'',monFirst:false,clH:'',clSync:false,clChg:false,qTry:0,qNext:0,cfgPub:0};
var REG_DEF={mi:5000,mr:5000,
  mesas:['BJMD','BJ2','FB2','FREE BET','BJ1','DP1','DJW','UTH1','UTH2','MB1','MB2','RULETA','CRAPS','MB3','PRIV1','PRIV2'],
  pit:['Karina Arroyo','Olga Brencel','Edgar Gonzalez','Edgar Villagr\u00e1n','Adriana Gutierrez','Cesar Duarte'],
  ign:['JL'],mon:'',monl:[],lastpit:'',lim:20000,af:''};
var LET='A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff';
function RG(){var k,v;if(!CFG.reg)CFG.reg={};
  for(k in REG_DEF)if(CFG.reg[k]===undefined){v=REG_DEF[k];CFG.reg[k]=(v&&v.slice)?v.slice(0):v}
  if(CFG.pat.rc===undefined)CFG.pat.rc='';if(CFG.pat.dev===undefined)CFG.pat.dev='';if(CFG.pat.pro===undefined)CFG.pat.pro='';if(CFG.pat.pre===undefined)CFG.pat.pre='';return CFG.reg}
function m0(n){return '$'+Math.round(n).toLocaleString('es-MX',{maximumFractionDigits:0})}
function ovShown(id){var s=$(id).style.display;return !!s&&s!=='none'}
function ovOpen(){var a=['mDv','mJp','mFc','mAmt','mPk','mNew','mMon','mRC','mSc','mTx','mHd','mAf','mAlc','mHs','mAp','mPr','mHn','mCu','mCi','mFn','mCt','mCj','mJe','mHe','cf','rl','lk'],i;for(i=0;i<a.length;i++)if(ovShown(a[i]))return true;return false}

function nkey(s){s=String(s||'').toUpperCase();
  s=s.replace(/[\u00c0-\u00c5]/g,'A').replace(/[\u00c8-\u00cb]/g,'E').replace(/[\u00cc-\u00cf]/g,'I').replace(/[\u00d2-\u00d6]/g,'O').replace(/[\u00d9-\u00dc]/g,'U').replace(/\u00d1/g,'N');
  return s.replace(/[^A-Z ]/g,' ').replace(/\s+/g,' ').replace(/^ | $/g,'')}
function cleanTxt(v){return String(v).replace(new RegExp('[^'+LET+' ]','g'),'').replace(/ {2,}/g,' ').replace(/^ /,'')}
function proper(s){return String(s||'').toLowerCase().replace(/(^|[\s\/])([a-z\u00e0-\u00ff])/g,function(m,a,b){return a+b.toUpperCase()}).replace(/\s+/g,' ').replace(/^ | $/g,'')}
function sameName(a,b){
  var ka=nkey(a),kb=nkey(b);if(!ka||!kb)return false;if(ka===kb)return true;
  var ta=ka.split(' '),tb=kb.split(' '),i;
  if(ta.length===tb.length&&ta.slice().sort().join(' ')===tb.slice().sort().join(' '))return true;
  var s=ta.length<=tb.length?ta:tb,l=ta.length<=tb.length?tb:ta;
  if(s.length>=2){for(i=0;i<s.length;i++)if(l.indexOf(s[i])<0)return false;return true}
  return false}
function isIgn(nom){var a=RG().ign,i,k=nkey(nom);if(k==='JL')return true;for(i=0;i<a.length;i++)if(nkey(a[i])===k)return true;return false}
function juegoTxt(mesa){var u=String(mesa||'').toUpperCase().replace(/\s/g,'');
  if(u.indexOf('FB')>=0||u.indexOf('FREE')>=0)return 'JUEGA FREEBET';
  if(u.indexOf('UTH')===0)return 'JUEGA ULTIMATE TEXAS HOLDE\u00b4M';
  if(u.indexOf('MB')===0)return 'JUEGA AL PUNTO Y BANCA';
  if(u.indexOf('BJM')===0)return 'JUEGA MADNESS';
  if(u.indexOf('BJ')===0)return 'JUEGA BLACK JACK';
  if(u.indexOf('DP')===0)return 'JUEGA DRAW POKER';
  if(u.indexOf('CRAPS')===0)return 'JUEGA A LOS DADOS';
  if(u.indexOf('RULETA')===0)return 'JUEGA LA RULETA';
  return ''}

function showView(v){VIEW=v;
  $('vReg').style.display=v==='reg'?'flex':'none';$('vCierre').style.display=v==='cierre'?'flex':'none';
  $('tbR').className='tb'+(v==='reg'?' on':'');$('tbC').className='tb'+(v==='cierre'?' on':'');
  if(v==='reg'){regRender();histRefresh();setTimeout(regFocus,60)}else render()}
function regFocus(){if(VIEW==='reg'&&!ovOpen()&&!$('rgN').disabled){try{$('rgN').focus()}catch(e){}}}
function setTipo(t){RS.t=t;regRender();regFocus()}
function regMsg(t,c){$('rgMsg').innerHTML='<span class="'+(c||'')+'">'+t+'</span>'}

function regRender(){
  jpBarRender();
  if(!$('rgL'))return;
  var w=[],i,x,h;
  $('rgF').innerHTML=fmtF(FE);$('rgM').innerHTML=esc(RG().mon||'-');
  $('tI').className='b tp ing'+(RS.t==='I'?' on':'');$('tR').className='b tp ret'+(RS.t==='R'?' on':'');$('tD').className='b tp dev'+(RS.t==='D'?' on':'');$('tJ').className='b tp jp'+(RS.t==='J'?' on':'');$('tP').className='b tp pr'+(RS.t==='P'?' on':'');
  $('nlb').innerHTML=RS.t==='D'?'Nombre &middot; Enter consulta la devolucion':(RS.t==='J'?'Nombre &middot; Enter abre el pago de jackpot':(RS.t==='P'?'Nombre del ganador &middot; Enter abre la captura del premio':'Nombre'));
  $('rgN').disabled=false;
  if(cli())w.push(RS.clOk?RS.cl.length+' clientes en la lista'+(RS.clSync?' (del servidor).':' (copia guardada; sincronizando con el servidor...)'):'<span class=\"dn\">Lista de clientes no recibida.</span> <a class=\"l\" onclick=\"regAskList()\">Pedir al servidor</a>');
  else{
    if(!rp('inf'))w.push('<span class="dn">Falta la ruta del Informe (Conexion y archivos).</span>');
    if(!rp('rc'))w.push('<span class="dn">Falta la ruta del Rating Card (Conexion y archivos): sin ella no se actualiza el rating ni hay autocompletar.</span>');
    else if(RS.clErr)w.push('<span class="dn">Lista de clientes: '+esc(RS.clErr)+'</span>');
    else if(RS.clOk)w.push(RS.cl.length+' clientes en la lista. <a class=\"l\" onclick=\"regReloadList()\">Recargar lista</a>');
    if(RS.rcp.length)w.push('<span class="dn">Rating Card pendiente de '+RS.rcp.length+' registro(s).</span> <a class="l" onclick="regRetry(false)">Reintentar</a>')}
  $('rgW').innerHTML=w.join(' &nbsp;|&nbsp; ');
  $('rgL').innerHTML=hsHtml();
}

/* ---- trabajos con Excel ---- */
function jobRun(fn){JOBQ.push(fn);if(!busy)jobNext()}
function jobNext(){
  if(busy||!JOBQ.length)return;
  busy=true;var fn=JOBQ.shift();
  setTimeout(function(){
    try{fn()}catch(e){RS.busy=false;regMsg('Error: '+esc(e.message),'dn')}
    busy=false;
    if(again){again=false;sync(true);return}
    jobNext()},30)}
function xlStart(){var xl=new ActiveXObject("Excel.Application");xl.Visible=false;xl.DisplayAlerts=false;try{xl.EnableEvents=false;xl.AutomationSecurity=3}catch(e){}return xl}
function xlQuit(xl){try{if(xl){try{while(xl.Workbooks.Count>0)xl.Workbooks.Item(1).Close(false)}catch(e){}xl.Quit()}}catch(e){}}
function closeBk(ob){if(!ob.live){try{ob.wb.Close(false)}catch(e){}}}
function findSheet(wb,exact,parts){
  var i,w,n,j,ok;
  for(i=1;i<=wb.Worksheets.Count;i++){w=wb.Worksheets.Item(i);n=String(w.Name).replace(/^\s+|\s+$/g,'').toUpperCase();
    if(exact&&n===exact)return w;
    if(parts){ok=true;for(j=0;j<parts.length;j++)if(n.indexOf(parts[j])<0)ok=false;if(ok)return w}}
  throw new Error('no encuentro la hoja '+(exact||parts.join(' ')))}
function cellTxt(ws,r,c){var v=ws.Cells(r,c).Value2;return(v===null||v===undefined)?'':String(v).replace(/^\s+|\s+$/g,'')}
function isEmp(v){return v===null||v===undefined||String(v)===''}
function sumCli(rows,nom){var t=0,i,x;for(i=0;i<rows.length;i++){x=rows[i];if(x[4]&&typeof x[2]==='number'&&sameName(String(x[4]),nom))t+=x[2]}return t}

/* lista de clientes (autocompletar) */
function regInit(){
  RS.rcp=CFG.rcp||[];
  if(cli()){regAskList();return}
  jobRun(jobLoadCl)}
function jobLoadCl(){
  var xl=null,p=rp('rc'),prevOk=RS.clOk;
  RS.clOk=false;RS.clErr='';
  if(!p){regRender();return}
  try{
    if(!fso.FileExists(p))throw new Error('no encuentro '+p);
    xl=xlStart();var ob=openBook(xl,p,false);
    try{var ws=findSheet(ob.wb,null,['LISTA','CLIENTE']),v=rr(ws,'C2:C5000'),i,a=[],s;
      for(i=0;i<v.length;i++){s=v[i][0];if(!isEmp(s)&&typeof s==='string'){s=String(s).replace(/^\s+|\s+$/g,'');if(s)a.push({n:proper(s),k:nkey(s)})}}
      var hh=lhash(a);RS.clChg=!!(RS.clH&&RS.clH!==hh);RS.cl=a;RS.clOk=true;RS.clH=hh}
    finally{closeBk(ob)}
  }catch(e){RS.clErr=e.message;if(prevOk)RS.clOk=true}
  finally{xlQuit(xl)}
  regRender();
  if(RS.rl){RS.rl=false;if(RS.clErr)regMsg('No pude recargar la lista: '+esc(RS.clErr),'dn');else regMsg('Lista recargada: '+RS.cl.length+' clientes.','up')}
  if(srv()&&RS.clOk&&(RS.clReq||RS.clChg)){RS.clPub=0;pubClients();pubCfg()}}
function regReloadList(){RS.rl=true;regMsg('Recargando la lista de clientes...','');jobRun(jobLoadCl)}
function regTotRefresh(){
  if(cli()){sync(true);return}
  regMsg('Leyendo totales...','');
  jobRun(function(){
    var xl=null,p=rp('inf');
    try{if(!p||!fso.FileExists(p))throw new Error('falta el Informe');
      xl=xlStart();var ob=openBook(xl,p,false);
      try{var ws=findSheet(ob.wb,'INGRESOS Y RETIROS'),tt=totIR(ws);TOT.ti=tt.ti;TOT.tr=tt.tr;TOT.ok=true;regMsg('Totales actualizados','up')}
      finally{closeBk(ob)}
    }catch(e){regMsg('No pude leer los totales: '+esc(e.message),'dn')}
    finally{xlQuit(xl)}
    regRender();if(srv())ntPub('st',{k:'v',ti:TOT.ti,tr:TOT.tr})})}

/* =================== RED: registro, lista de clientes, configuracion y score entre equipos =================== */
function lhash(l){var s=0,c=0,i,j,h,t;
  for(i=0;i<l.length;i++){t=l[i].n;h=5381;for(j=0;j<t.length;j++)h=((h<<5)+h+t.charCodeAt(j))|0;s=(s+(h>>>0))>>>0;c++}
  return s.toString(16)+'-'+c}
function clPath(){return base()+'cierre_clientes.json'}
function clCacheSave(){
  if(!cli()||!RS.clOk)return;
  try{var n=[],i;for(i=0;i<RS.cl.length;i++)n.push(RS.cl[i].n);
    var t=fso.CreateTextFile(clPath(),true,true);t.Write(JSON.stringify({room:CFG.nt.room,d:n.join('|')}));t.Close()}catch(e){}}
function clCacheLoad(){
  if(!cli()||RS.clOk)return;
  try{if(!fso.FileExists(clPath()))return;
    var t=fso.OpenTextFile(clPath(),1,false,-1),x=t.ReadAll();t.Close();
    var o=JSON.parse(x),n=String(o.d||'').split('|'),l=[],i;
    if(o.room!==CFG.nt.room)return;
    for(i=0;i<n.length;i++)if(n[i])l.push({n:n[i],k:nkey(n[i])});
    if(l.length){RS.cl=l;RS.clOk=true;RS.clH=lhash(l)}}catch(e){}}
function regAskList(){if(cli()&&CFG.nt.room){ntPub('cmd',{k:'ql',n:CFG.nt.name,h:RS.clOk?RS.clH:''});if(!RS.clOk)regRender()}}
function pubClients(){
  if(!srv()||!RS.clOk)return;
  var names=[],i;for(i=0;i<RS.cl.length;i++)names.push(RS.cl[i].n);
  var js=names.join('|'),parts=[],id=new Date().getTime();
  if(!RS.clH)RS.clH=lhash(RS.cl);
  for(i=0;i<js.length;i+=1800)parts.push(js.substring(i,i+1800));
  for(i=0;i<parts.length;i++)ntPub('st',{k:'c',i:id,n:i,m:parts.length,d:parts[i],h:RS.clH});
  RS.clPub=id;RS.clReq=false;RS.clChg=false}
function pubCfg(){
  if(!srv())return;var g=RG();
  ntPub('st',{k:'g',g:{mi:g.mi,mr:g.mr,lim:g.lim,mesas:g.mesas,pit:g.pit,mn:CFG.mn||null,dv:DVC(),ci:{dl:CI().dl,sb:CI().sb}}})}
var LETRE='['+LET+' ]';
function txCheck(x){
  var okTxt=function(v,mn,mx,re){return typeof v==='string'&&v.length>=mn&&v.length<=mx&&re.test(v)};
  if(!x||typeof x!=='object')return 'registro invalido';
  if(x.t!=='I'&&x.t!=='R')return 'tipo invalido';
  if(x.tk!=='Manual'&&x.tk!=='Ticket')return 'ticket invalido';
  if(!okTxt(x.nom,3,60,new RegExp('^'+LETRE+'+$')))return 'nombre invalido';
  if(!okTxt(x.mesa,1,30,/^[A-Za-z0-9 ()\/.-]+$/))return 'mesa invalida';
  if(!okTxt(x.sup,2,40,new RegExp('^'+LETRE+'+$')))return 'sup. / pit boss invalido';
  if(!okTxt(x.mon,2,40,new RegExp('^['+LET+' \\/]+$')))return 'monitorista invalido';
  if(typeof x.monto!=='number'||x.monto!==Math.floor(x.monto)||x.monto<1||x.monto>10000000)return 'monto invalido';
  if(!okTxt(x.h,8,8,/^\d\d:\d\d:\d\d$/))return 'hora invalida';
  var fe=FE.getFullYear()+'-'+pad(FE.getMonth()+1)+'-'+pad(FE.getDate());
  if(x.fe!==fe)return 'la fecha de operacion del cliente ('+x.fe+') no es la del servidor ('+fe+')';
  return ''}
function regSrvMsg(m){
  var now=new Date().getTime();
  if(m.k==='ql'){
    var cf=function(){if(now-RS.cfgPub>=15000){RS.cfgPub=now;pubCfg()}};
    if(!RS.clOk){RS.clReq=true;cf();return true}
    if(m.h&&m.h===RS.clH){ntPub('st',{k:'cok',h:RS.clH});cf();return true}
    if(now-RS.clPub<15000)return true;
    pubClients();cf();return true}
  if(m.k==='t'&&m.x){srvTx(m);return true}
  if(m.k==='sc'){srvScore(m);return true}
  if(m.k==='dq'){srvDvQ(m);return true}
  if(m.k==='aq'){srvAfQ(m);return true}
  if(m.k==='jp'){srvJp(m);return true}
  if(m.k==='jo'){srvJpOp(m);return true}
  if(m.k==='as'){srvAfSave(m);return true}
  if(m.k==='dv'){srvDvSave(m);return true}
  if(m.k==='hq'){srvHistQ(m);return true}
  if(m.k==='ho'){srvHistOp(m);return true}
  if(m.k==='cc'){srvCierre(m);return true}
  if(m.k==='fn'||m.k==='ct'){srvInfTxt(m);return true}
  if(m.k==='fq'){srvInfQ(m);return true}
  if(m.k==='cj'){srvCajas(m);return true}
  return false}
function srvTx(m){
  if(!m.id||SEEN[m.id])return;SEEN[m.id]=1;
  if(DUP||!claimTx(m.id))return;
  CFG.nt.since=NT.since;cfgSave();
  if(m._t&&new Date().getTime()/1000-m._t>300){ntPub('st',{k:'r',id:m.id,ok:false,msg:'la solicitud llego con mas de 5 minutos de retraso y no se aplico; revisa el Informe y captura de nuevo',rc:false,ti:TOT.ti,tr:TOT.tr});regMsg('['+esc(m.n||'cliente')+'] solicitud vencida, no se aplico','dn');return}
  var x=m.x,err=txCheck(x),hh;
  if(err){ntPub('st',{k:'r',id:m.id,ok:false,msg:err,rc:false,ti:TOT.ti,tr:TOT.tr});regMsg('['+esc(m.n||'cliente')+'] rechazado: '+esc(err),'dn');return}
  hh=x.h.split(':');
  var tx={t:x.t,tk:x.tk,nom:x.nom,monto:x.monto,mesa:x.mesa,sup:x.sup,mon:x.mon,hora:new Date(2000,0,1,parseInt(hh[0],10),parseInt(hh[1],10),parseInt(hh[2],10)),dia:FE.getDate(),by:String(m.n||'cliente').substring(0,20),id:m.id};
  regMsg('['+esc(tx.by)+'] recibido: '+esc(tx.nom)+' '+m0(tx.monto)+'...','');
  jobRun(function(){jobSave(tx)})}
function srvScore(m){
  if(DUP||!m.id||SEEN[m.id])return;SEEN[m.id]=1;CFG.nt.since=NT.since;cfgSave();
  if((m.mode!=='S'&&m.mode!=='C')||typeof m.f!=='number'||m.f<0||m.f>1000000000||m.f!==Math.floor(m.f)){ntPub('st',{k:'x',id:m.id,ok:false,txt:'',msg:'solicitud invalida'});return}
  jobRun(function(){jobScore(m.mode,m.f,String(m.n||'cliente').substring(0,20),m.id)})}
function regPubRes(tx,ok,msg,rcOk){
  if(!srv())return;
  ntPub('st',{k:'r',id:tx.id||'',ok:ok,msg:String(msg||'').substring(0,200),rc:!!rcOk,ti:TOT.ti,tr:TOT.tr})}
function regSendTx(tx){
  var now=new Date().getTime(),h=tx.hora,id=(CFG.nt.name||'cli')+'-'+now+'-'+Math.floor(Math.random()*1000),
      fe=FE.getFullYear()+'-'+pad(FE.getMonth()+1)+'-'+pad(FE.getDate()),
      x={t:tx.t,tk:tx.tk,nom:tx.nom,monto:tx.monto,mesa:tx.mesa,sup:tx.sup,mon:tx.mon,h:pad(h.getHours())+':'+pad(h.getMinutes())+':'+pad(h.getSeconds()),fe:fe},
      rec={h:pad(h.getHours())+':'+pad(h.getMinutes()),t:tx.t,tk:tx.tk,nom:tx.nom,monto:tx.monto,mesa:tx.mesa,sup:tx.sup,by:'',st:'Enviando...'};
  RS.last.unshift(rec);RS.pendTx[id]={rec:rec,t:now};
  $('rgN').value='';RS.nom='';sugClear();regMsg('Enviando al servidor...','');regRender();
  ntPub('cmd',{k:'t',id:id,n:CFG.nt.name,x:x},function(ok){
    if(ok){if(RS.pendTx[id])rec.st='Enviado, esperando al servidor...'}
    else{rec.st='<span class="dn">No se pudo enviar (sin conexion). NO se registro.</span>';delete RS.pendTx[id];regMsg('No se pudo enviar: sin conexion con el servidor. Repite el registro.','dn')}
    regRender();regFocus()})}
function regCliMsg(m){
  var i,k;
  if(m.k==='c'){
    var a=RS.clAsm[m.i]||(RS.clAsm[m.i]={p:[],n:0,m:m.m});
    if(a.p[m.n]===undefined){a.p[m.n]=m.d;a.n++}
    if(a.n===a.m){var names=a.p.join('').split('|'),l=[];delete RS.clAsm[m.i];
      for(k in RS.clAsm)if(parseInt(k,10)<m.i-300000)delete RS.clAsm[k];
      for(i=0;i<names.length;i++)if(names[i])l.push({n:names[i],k:nkey(names[i])});
      RS.cl=l;RS.clOk=true;RS.clErr='';RS.clSync=true;RS.clH=lhash(l);clCacheSave();regRender()}
    return true}
  if(m.k==='cok'){if(RS.clOk&&m.h===RS.clH&&!RS.clSync){RS.clSync=true;regRender()}return true}
  if(m.k==='a'&&typeof m.n==='string'){var kk=nkey(m.n),f=false;for(i=0;i<RS.cl.length;i++)if(RS.cl[i].k===kk){f=true;break}
    if(!f){RS.cl.push({n:m.n,k:kk});if(RS.clOk){RS.clH=lhash(RS.cl);clCacheSave()}}return true}
  if(m.k==='g'&&m.g){var g=RG(),s=m.g;
    if(typeof s.mi==='number')g.mi=s.mi;if(typeof s.mr==='number')g.mr=s.mr;if(typeof s.lim==='number')g.lim=s.lim;
    if(s.mesas&&s.mesas.length)g.mesas=s.mesas;if(s.pit&&s.pit.length)g.pit=s.pit;
    if(s.dv&&s.dv.tiers&&s.dv.tiers.length)g.dv={tiers:s.dv.tiers,rd:s.dv.rd||50,days:s.dv.days||3};
    if(s.mn&&s.mn.length){CFG.mn=s.mn;mnApply()}
    if(s.ci){if(s.ci.dl)CI().dl=s.ci.dl;if(s.ci.sb)CI().sb=s.ci.sb}
    cfgSave();render();regRender();return true}
  if(m.k==='v'){TOT.ti=m.ti||0;TOT.tr=m.tr||0;TOT.ok=true;regRender();return true}
  if(m.k==='r'){
    TOT.ti=m.ti||0;TOT.tr=m.tr||0;TOT.ok=true;
    var p=m.id&&RS.pendTx[m.id];
    if(p){delete RS.pendTx[m.id];
      if(m.ok){p.rec.st=m.rc?'<span class="up">Informe + Rating Card</span>':'<span class="dn">Informe OK, Rating Card pendiente (servidor)</span>';regMsg(m.rc?'Registrado en el servidor.':'Registrado en el Informe; el Rating Card quedo pendiente en el servidor.',m.rc?'up':'dn')}
      else{var pf=/^REVISA/.test(m.msg||'')?'':'NO se registro: ';p.rec.st='<span class="dn">'+pf+esc(m.msg||'error')+'</span>';regMsg(pf+esc(m.msg||'error'),'dn')}}
    if(p&&m.ok)histRefresh();
    regRender();return true}
  if(m.k==='hr'){hsCliPart(m);return true}
  if(m.k==='hz'||m.k==='cz'){afCliDone(m);return true}
  if(m.k==='dr'){dvCliRes(m);return true}
  if(m.k==='ar'||m.k==='az'){afCliDone(m);return true}
  if(m.k==='jz'){jpCliDone(m);return true}
  if(m.k==='dz'){dvCliSaved(m);return true}
  if(m.k==='x'){
    if(m.id!==RS.scId)return true;RS.scId='';
    if(m.ok){note('','');txOpen(m.txt)}else note('El servidor no pudo generar el texto: '+esc(m.msg||''),'dn');
    return true}
  return false}

/* ---- autocompletar ---- */
var SUG_MAX=500;
function phon(s){
  s=String(s||'');
  s=s.replace(/CH/g,'3').replace(/LL/g,'Y').replace(/QU/g,'K').replace(/Q/g,'K')
     .replace(/GU([EI])/g,'G$1').replace(/G([EI])/g,'J$1')
     .replace(/C([EI])/g,'S$1').replace(/C/g,'K')
     .replace(/Z/g,'S').replace(/V/g,'B').replace(/H/g,'')
     .replace(/(.)\1+/g,'$1');
  return s}
function lev(a,b,mx){
  var la=a.length,lb=b.length,i,j,pp=null,p,c,d,t;
  if(Math.abs(la-lb)>mx)return mx+1;
  p=[];for(j=0;j<=lb;j++)p[j]=j;
  for(i=1;i<=la;i++){c=[i];
    for(j=1;j<=lb;j++){
      d=p[j-1]+(a.charAt(i-1)===b.charAt(j-1)?0:1);
      t=p[j]+1;if(t<d)d=t;
      t=c[j-1]+1;if(t<d)d=t;
      if(pp&&i>1&&j>1&&a.charAt(i-1)===b.charAt(j-2)&&a.charAt(i-2)===b.charAt(j-1)){t=pp[j-2]+1;if(t<d)d=t}
      c[j]=d}
    pp=p;p=c}
  return p[lb]}
function sugScore(c,tk,ptk){
  var ws,pw,j,z,t,pt,s,best,tot=0,d,mx,w;
  if(!c.ws){c.ws=c.k.split(' ');c.pw=[];for(z=0;z<c.ws.length;z++)c.pw[z]=phon(c.ws[z])}
  ws=c.ws;pw=c.pw;
  for(j=0;j<tk.length;j++){
    t=tk[j];pt=ptk[j];best=99;
    for(z=0;z<ws.length;z++){
      w=ws[z];
      if(w===t)s=0;else if(w.indexOf(t)===0)s=1;else if(w.indexOf(t)>0)s=3;else s=99;
      if(s<best)best=s;if(best===0)break}
    if(best>2){
      for(z=0;z<pw.length;z++){
        w=pw[z];
        if(w.indexOf(pt)===0)s=2;else if(w.indexOf(pt)>0)s=4;else s=99;
        if(s<best)best=s}}
    if(best>4&&pt.length>=4){
      mx=pt.length>=8?2:1;
      for(z=0;z<pw.length;z++){
        w=pw[z];
        d=Math.min(lev(pt,w,mx),lev(pt,w.substr(0,pt.length),mx));
        if(d<=mx&&5+d<best)best=5+d}}
    if(best>=99)return -1;
    tot+=best}
  return tot}
function sugUpdate(){
  var q=nkey($('rgN').value),tk,ptk=[],i,j,c,r=[],s,n;
  RS.sg=[];RS.si=-1;RS.sgN=0;
  if(q){tk=q.split(' ');for(j=0;j<tk.length;j++)ptk[j]=phon(tk[j]);
    for(i=0;i<RS.cl.length;i++){c=RS.cl[i];s=sugScore(c,tk,ptk);
      if(s>=0){if(c.k.indexOf(q)===0)s-=0.5;r.push({c:c,s:s})}}
    r.sort(function(x,y){return x.s!==y.s?x.s-y.s:(x.c.k<y.c.k?-1:(x.c.k>y.c.k?1:0))});
    RS.sgN=r.length;n=Math.min(r.length,SUG_MAX);
    for(i=0;i<n;i++)RS.sg.push(r[i].c)}
  sugDraw()}
function sugDraw(){var h='',i,el=$('rgSug');
  for(i=0;i<RS.sg.length;i++)h+='<div class="sg'+(i===RS.si?' on':'')+'" onmousedown="sugClick('+i+')" onmousemove="sugHover('+i+')">'+esc(RS.sg[i].n)+'</div>';
  if(RS.sgN>RS.sg.length)h+='<div class="sgm">Mostrando '+RS.sg.length+' de '+RS.sgN+' &middot; escribe mas letras para acotar</div>';
  else if(RS.sg.length>1)h+='<div class="sgm">'+RS.sg.length+' coincidencias</div>';
  el.style.display=h?'block':'none';
  sugFit();el.innerHTML=h;el.scrollTop=0}
function sugFit(){var el=$('rgSug'),r,vh,mh;
  try{vh=document.documentElement.clientHeight||document.body.clientHeight;r=el.parentNode.getBoundingClientRect();
    mh=vh-r.bottom-14;if(mh<120)mh=120;el.style.maxHeight=mh+'px'}catch(x){}}
function sugSel(i,noscroll){var el=$('rgSug'),c=el.children,o=RS.si,e,t,b;
  if(o>=0&&c[o])c[o].className='sg';
  RS.si=i;
  if(i>=0&&c[i]){e=c[i];e.className='sg on';
    if(!noscroll){t=e.offsetTop;b=t+e.offsetHeight;
      if(t<el.scrollTop)el.scrollTop=t;else if(b>el.scrollTop+el.clientHeight)el.scrollTop=b-el.clientHeight}}}
function sugHover(i){if(RS.si===i)return;sugSel(i,true)}
function sugClear(){RS.sg=[];RS.si=-1;sugDraw()}
function sugClick(i){if(RS.sg[i])regPickName(RS.sg[i].n)}
function regEnter(){
  if(RS.busy||ovOpen())return;
  if(RS.t==='J'){
    if(!cli()&&!rp('jp')){regMsg('Falta la ruta del libro de Jackpot (Conexion y archivos).','dn');return}}
  else if(RS.t==='P'){
    if(cli()){regMsg('El premio se captura en la PC servidor (necesita Excel).','dn');return}
    if(!rp('pre')){regMsg('Falta la ruta del archivo de Premios (Conexion y archivos).','dn');return}}
  else if(RS.t!=='D'&&!cli()&&!rp('inf')){regMsg('Falta la ruta del Informe (Conexion y archivos).','dn');return}
  if(!RG().mon&&RS.t!=='P'){monOpen(true);return}
  var raw=cleanTxt($('rgN').value).replace(/ $/,''),k,i;
  if(RS.si>=0&&RS.sg[RS.si]){regPickName(RS.sg[RS.si].n);return}
  if(nkey(raw).length<3){regMsg('Escribe el nombre del cliente.','dn');return}
  k=nkey(raw);
  for(i=0;i<RS.cl.length;i++)if(RS.cl[i].k===k){regPickName(RS.cl[i].n);return}
  if(RS.t==='J'||RS.t==='P'){regPickName(proper(raw));return}
  if(RS.t==='D'){regMsg('Ese cliente no esta en la lista: para una devolucion elige uno de la lista.','dn');return}
  NEWN=proper(raw);$('nwN').innerHTML=esc(NEWN);$('mNew').style.display='flex'}
function newOk(){$('mNew').style.display='none';regPickName(NEWN)}
function newNo(){$('mNew').style.display='none';regFocus()}
function regPickName(n){RS.nom=proper(n);$('rgN').value=RS.nom;sugClear();regMsg('','');
  if(RS.t==='D'){dvStart();return}
  if(RS.t==='J'){jpOpen();return}
  if(RS.t==='P'){prOpen(RS.nom);return}
  amtOpen()}
function dvStart(){
  DV.wantOpen=true;regMsg((cli()?'Cargando... consultando al servidor las devoluciones de ':'Consultando devoluciones de ')+esc(RS.nom)+'...','');
  dvLookup(RS.nom,true);
  if(DV.res&&!DV.res.wait){DV.wantOpen=false;regMsg('','');dvOpen()}}

/* ---- captura: monto ---- */
function minTipo(){return RS.t==='I'?RG().mi:RG().mr}
function amtParse(s){
  var d=String(s).replace(/[^0-9]/g,''),n,mn=minTipo(),v;
  if(!d)return{v:0,ok:false,msg:''};
  n=parseInt(d,10);v=n;
  if(n<mn&&n<1000&&n*1000>=mn)v=n*1000;
  if(v<mn)return{v:v,ok:false,msg:'El minimo es '+m0(mn)};
  return{v:v,ok:true,msg:''}}
function amtOpen(){
  $('amT').innerHTML=(RS.t==='I'?'INGRESO':'RETIRO')+' &middot; monto';$('amN').innerHTML=esc(RS.nom);
  $('amV').value='';$('amP').innerHTML='';$('mAmt').style.display='flex';$('amV').focus()}
function amtPrev(){var r=amtParse($('amV').value);
  $('amP').innerHTML=!$('amV').value?'':(r.ok?'<span class="up">'+m0(r.v)+'</span>':'<span class="dn">'+(r.v?m0(r.v)+' &nbsp;':'')+r.msg+'</span>')}
function amtOk(){
  var r=amtParse($('amV').value);if(!r.ok){amtPrev();return}
  RS.monto=r.v;RS.tk='Ticket';$('mAmt').style.display='none';
  if(RS.monto>RG().lim)pickOpen((RS.t==='I'?'INGRESO ':'RETIRO ')+m0(RS.monto)+' - '+RS.nom+': pasa de '+m0(RG().lim)+', es MANUAL o con TICKET?',['Manual','Ticket'],2,function(x){RS.tk=x;mesaPick()},0);
  else mesaPick()}
function mesaPick(){
  pickOpen((RS.t==='I'?'INGRESO ':'RETIRO ')+m0(RS.monto)+' ('+RS.tk+') - '+RS.nom+': elige la MESA',RG().mesas,4,function(m){RS.mesa=m;pitPick()},0)}
function amtCancel(){$('mAmt').style.display='none';regFocus()}

/* ---- captura: mesa y Sup. / Pit Boss ---- */
function pickOpen(title,items,cols,cb,start){
  PK={items:items,cols:cols,cb:cb,i:start||0};RS.tm=new Date().getTime();
  $('pkT').innerHTML=esc(title);pkDraw();$('mPk').style.display='flex'}
function pkDraw(){var h='',i,w=Math.floor(100/PK.cols)-2;
  for(i=0;i<PK.items.length;i++)h+='<span class="opt'+(i===PK.i?' on':'')+'" style="width:'+w+'%" onclick="pkPick('+i+')">'+esc(PK.items[i])+'</span>';
  $('pkG').innerHTML=h}
function pkClose(){PK=null;$('mPk').style.display='none'}
function pkPick(i){if(!PK)return;var cb=PK.cb,it=PK.items[i];RS.tm=new Date().getTime();pkClose();cb(it)}
function pkMove(k){var n=PK.items.length,c=PK.cols,i=PK.i;
  if(k===37)i=i>0?i-1:i;else if(k===39)i=i<n-1?i+1:i;else if(k===38)i=i-c>=0?i-c:i;else if(k===40)i=i+c<n?i+c:i;
  PK.i=i;pkDraw()}
function pitPick(){var p=RG().pit,st=p.indexOf(RG().lastpit);
  pickOpen((RS.t==='I'?'INGRESO ':'RETIRO ')+m0(RS.monto)+' - '+RS.nom+' - '+RS.mesa+': elige el SUP. / PIT BOSS',p,2,function(s){RS.sup=s;RG().lastpit=s;cfgSave();regSave()},st<0?0:st)}
function regCancel(){regMsg('Registro cancelado.','');regFocus()}

/* ---- guardar ---- */
function regSave(){
  var tx={t:RS.t,tk:RS.tk,nom:RS.nom,monto:RS.monto,mesa:RS.mesa,sup:RS.sup,mon:RG().mon,hora:new Date(),dia:FE.getDate()};
  if(cli()){regSendTx(tx);return}
  if(DUP){regMsg('Este servidor esta duplicado: usa el otro y cierra esta ventana.','dn');return}
  RS.busy=true;regMsg('Guardando en Excel...','');
  jobRun(function(){jobSave(tx)})}
function jobSave(tx){
  var xl=null,err='',rcErr='',rows=null,row=0,h=tx.hora,hs=pad(h.getHours())+':'+pad(h.getMinutes()),rcOk=false,wrote=false,i;
  try{
    var pi=rp('inf');if(!pi)throw new Error('falta la ruta del Informe');if(!fso.FileExists(pi))throw new Error('no encuentro '+pi);
    xl=xlStart();
    var ob=openBook(xl,pi,true),wb=ob.wb;
    try{
      if(wb.ReadOnly)throw new Error('el Informe esta abierto como solo lectura (otro equipo o una copia oculta de Excel); cierra Excel en el servidor y reintenta');
      var ws=findSheet(wb,'INGRESOS Y RETIROS'),I=tx.t==='I',cn=I?'H':'P',cm=I?'F':'N',c0=I?4:12;
      var e=lastRow(ws),a=rr(ws,cn+'39:'+cn+e),b=rr(ws,cm+'39:'+cm+e);
      row=-1;for(i=0;i<a.length;i++)if(isEmp(a[i][0])&&isEmp(b[i][0])){row=39+i;break}
      if(row<0)throw new Error('ya no hay filas libres en INGRESOS Y RETIROS (39 a '+e+')');
      wrote=true;
      ws.Cells(row,c0).Value2=(h.getHours()*3600+h.getMinutes()*60+h.getSeconds())/86400;ws.Cells(row,c0).NumberFormat='hh:mm';
      ws.Cells(row,c0+1).Value=tx.mesa;ws.Cells(row,c0+2).Value=tx.monto;ws.Cells(row,c0+3).Value=tx.tk;
      ws.Cells(row,c0+4).Value=tx.nom;ws.Cells(row,c0+5).Value=tx.sup;ws.Cells(row,c0+6).Value=tx.mon;
      if(Math.abs(nm(ws.Cells(row,c0+2).Value2)-tx.monto)>0.001)throw new Error('no quedo escrito en la fila '+row+' (hoja protegida?)');
      ob.app.Calculate();
      var tt=totIR(ws);TOT.ti=tt.ti;TOT.tr=tt.tr;TOT.ok=true;
      rows={i:rr(ws,'D39:J'+lastRow(ws)),r:rr(ws,'L39:R'+lastRow(ws))};
      wb.Save();
    }finally{closeBk(ob)}
    if(!isIgn(tx.nom)){
      if(!rp('rc'))rcErr='falta la ruta del Rating Card';
      else{try{var rcr=rcUpdate(xl,tx.nom,tx.mesa,rows,tx.dia);rcOk=true;if(rcr&&rcr.newList)nwMark(tx.nom)}catch(e){rcErr=e.message}}
    }else rcOk=true;
  }catch(e){err=e.message}
  finally{xlQuit(xl)}
  if(err&&wrote)err='REVISA EL INFORME: se escribio en la fila '+row+' pero fallo despues ('+err+'). NO lo repitas sin revisar.';
  if(err&&!wrote&&/solo lectura/i.test(err)&&!tx.rty){tx.rty=1;if(killOrphans()>0){jobSave(tx);return}}
  if(!rcOk&&/solo lectura/i.test(rcErr))RS.roErr=true;
  if(!tx.by)RS.busy=false;
  var pre=tx.by?'['+esc(tx.by)+'] ':'',isNew=false;
  if(err){regMsg(pre+(wrote?'':'NO se registro: ')+esc(err),'dn');regPubRes(tx,false,err,false);regRender();if(!tx.by)regFocus();return}
  RS.last.unshift({h:hs,t:tx.t,tk:tx.tk,by:tx.by||'',nom:tx.nom,monto:tx.monto,mesa:tx.mesa,sup:tx.sup,st:rcOk?'<span class="up">Informe + Rating Card</span>':'<span class="dn">Informe OK, Rating Card pendiente</span>'});
  if(rows)histSet(hsBuild(rows.i,rows.r));
  if(!rcOk){for(i=RS.rcp.length-1;i>=0;i--)if(RS.rcp[i].nom===tx.nom&&RS.rcp[i].dia===tx.dia)RS.rcp.splice(i,1);
    RS.rcp.push({nom:tx.nom,mesa:tx.mesa,dia:tx.dia});CFG.rcp=RS.rcp;cfgSave()}
  if(RS.clOk&&rcOk){var k=nkey(tx.nom),f=false;for(i=0;i<RS.cl.length;i++)if(RS.cl[i].k===k){f=true;break}if(!f){RS.cl.push({n:tx.nom,k:k});RS.clH=lhash(RS.cl);isNew=true}}
  if(!tx.by){$('rgN').value='';RS.nom='';sugClear();try{dvClear()}catch(e){}}
  regMsg(pre+(rcOk?(tx.t==='I'?'Ingreso':'Retiro')+' registrado: '+esc(tx.nom)+' '+m0(tx.monto)+' ('+esc(tx.mesa)+')':'Registrado en el Informe, pero NO en el Rating Card: '+esc(rcErr)),rcOk?'up':'dn');
  regRender();if(!tx.by)regFocus();
  regPubRes(tx,true,rcOk?'':rcErr,rcOk);
  if(isNew&&srv())ntPub('st',{k:'a',n:tx.nom});
  if(rcOk&&RS.rcp.length)setTimeout(function(){regRetry(true)},800)}

function rcUpdate(xl,nom,mesa,rows,dia){
  var pr=rp('rc');if(!pr)throw new Error('falta la ruta del Rating Card');if(!fso.FileExists(pr))throw new Error('no encuentro '+pr);
  var ob=openBook(xl,pr,true),wb=ob.wb;
  try{
    if(wb.ReadOnly)throw new Error('el Rating Card esta abierto como solo lectura en otro lado');
    var wsD=findSheet(wb,'DETALLE'),wsL=findSheet(wb,null,['LISTA','CLIENTE']),wsC=findSheet(wb,'RATING CARD');
    var ti=sumCli(rows.i,nom),tr=sumCli(rows.r,nom),i,last=-1,found=false,v,newList=false;
    if(ti===0&&tr===0)return rcClear(ob,wb,wsD,wsL,wsC,nom,dia);
    if(ti===0&&tr>0)ti=1000;
    var lv=rr(wsL,'C2:C5000');
    for(i=0;i<lv.length;i++){v=lv[i][0];if(!isEmp(v)){last=i;if(!found&&sameName(String(v),nom))found=true}}
    if(!found){if(last+1>=lv.length)throw new Error('la LISTA DE CLIENTES esta llena');wsL.Cells(2+last+1,3).Value=nom.toUpperCase();newList=true}
    var cols=[2,10,18],f,b,t,slot=null,free=null,ix;
    for(f=5;f<=5605&&!slot;f+=35)for(b=0;b<3;b++){
      t=cellTxt(wsD,f,cols[b]);ix=((f-5)/35)*3+b;
      if(t){if(sameName(t,nom)){slot={f:f,c:cols[b],ix:ix};break}}
      else if(!free&&ix<=479)free={f:f,c:cols[b],ix:ix}}
    var created=false;
    if(!slot){if(!free)throw new Error('no hay tarjetas libres en DETALLE');wsD.Cells(free.f,free.c).Value=nom.toUpperCase();slot=free;created=true}
    var r=slot.f+1+dia;
    wsD.Cells(r,slot.c+1).Value=ti;wsD.Cells(r,slot.c+2).Value=tr;
    if(Math.abs(nm(wsD.Cells(r,slot.c+1).Value2)-ti)>0.001||Math.abs(nm(wsD.Cells(r,slot.c+2).Value2)-tr)>0.001)throw new Error('no quedo escrito en DETALLE fila '+r);
    if(created){var g=juegoTxt(mesa);if(g&&cellTxt(wsC,5+slot.ix,9)==='')wsC.Cells(5+slot.ix,9).Value=g}
    ob.app.Calculate();wb.Save();return{newList:newList,created:created,card:false,list:false}
  }finally{closeBk(ob)}}
function regRetry(silent){
  if(!RS.rcp.length||cli())return;if(!silent)regMsg('Reintentando Rating Card...','');
  jobRun(function(){
    var xl=null,left=[],okn=0,i,it,rows,pi=rp('inf'),nuevos=[],k,j,f;
    if(RS.roErr){RS.roErr=false;killOrphans()}
    try{xl=xlStart();var ob=openBook(xl,pi,false);
      try{var ws=findSheet(ob.wb,'INGRESOS Y RETIROS');rows={i:rr(ws,'D39:J'+lastRow(ws)),r:rr(ws,'L39:R'+lastRow(ws))}}finally{closeBk(ob)}
      for(i=0;i<RS.rcp.length;i++){it=RS.rcp[i];try{var rr0=rcUpdate(xl,it.nom,it.mesa,rows,it.dia||FE.getDate());okn++;if(rr0&&rr0.newList)nwMark(it.nom);if(rr0&&rr0.list)hsListDrop(it.nom);else nuevos.push(it.nom)}catch(e){left.push(it);if(/solo lectura/i.test(e.message))RS.roErr=true}}
    }catch(e){left=RS.rcp.slice(0);nuevos=[]}
    finally{xlQuit(xl)}
    RS.rcp=left;CFG.rcp=left;cfgSave();
    if(RS.clOk)for(i=0;i<nuevos.length;i++){k=nkey(nuevos[i]);f=false;for(j=0;j<RS.cl.length;j++)if(RS.cl[j].k===k){f=true;break}
      if(!f){RS.cl.push({n:nuevos[i],k:k});RS.clH=lhash(RS.cl);if(srv())ntPub('st',{k:'a',n:nuevos[i]})}}
    if(!silent||okn)regMsg(left.length?'Quedan '+left.length+' pendientes del Rating Card.':'Rating Card al dia ('+okn+').',left.length?'dn':'up');
    regRender()})}
setInterval(function(){if(!cli()&&RS.rcp&&RS.rcp.length&&!busy&&!JOBQ.length&&rp('inf'))regRetry(true)},60000);

/* =================== HISTORIAL DE MOVIMIENTOS: editar / eliminar =================== */
var HE={it:null,t:'I',busy:false};
function hsTxt(v){return String(v===null||v===undefined?'':v).replace(/[|;\r\n]/g,' ').replace(/^\s+|\s+$/g,'')}
function hsFmtH(v){var m,q;
  if(typeof v==='number'){m=Math.floor((v-Math.floor(v))*1440+0.0001);return pad(Math.floor(m/60)%24)+':'+pad(m%60)}
  if(typeof v==='string'){q=/(\d{1,2})\s*:\s*(\d{2})/.exec(v);if(q)return pad(parseInt(q[1],10)%24)+':'+q[2]}
  return '--:--'}
function hsBlock(v,t){var o=[],i,x;
  for(i=0;i<v.length;i++){x=v[i];if(isEmp(x[4])&&isEmp(x[2]))continue;
    o.push({t:t,row:39+i,h:hsFmtH(x[0]),mesa:hsTxt(x[1]),monto:nm(x[2]),tk:hsTxt(x[3]),nom:hsTxt(x[4]),sup:hsTxt(x[5])})}
  return o}
function hsBuild(vi,vr){return{i:hsBlock(vi,'I'),r:hsBlock(vr,'R')}}
function histSet(h){RS.hist=h;RS.histAt=new Date().getTime();RS.histErr='';RS.hqNext=0}
function hsPack(h){var a=[],k,i,x,s;
  for(k=0;k<2;k++){s=k?h.r:h.i;for(i=0;i<s.length;i++){x=s[i];a.push([x.t,x.row,x.h,x.mesa,x.monto,x.tk,x.nom,x.sup].join('|'))}}
  return a.join(';')}
function hsUnpack(s){var h={i:[],r:[]},a=s?s.split(';'):[],i,f,x;
  for(i=0;i<a.length;i++){f=a[i].split('|');if(f.length<8)continue;
    x={t:f[0],row:parseInt(f[1],10),h:f[2],mesa:f[3],monto:parseFloat(f[4])||0,tk:f[5],nom:f[6],sup:f[7]};
    if(x.t==='I')h.i.push(x);else if(x.t==='R')h.r.push(x)}
  return h}
function hsPublish(id,h){var js=hsPack(h),n=Math.max(1,Math.ceil(js.length/1500)),i;
  for(i=0;i<n;i++)ntPub('st',{k:'hr',id:id,n:i,m:n,d:js.substring(i*1500,(i+1)*1500),ti:TOT.ti,tr:TOT.tr})}
function hsCliPart(m){
  if(!RS.afq||!m.id||!RS.afq[m.id])return;
  var a=RS.hqA||(RS.hqA={}),s=a[m.id]||(a[m.id]={p:[],n:0,m:m.m});
  if(s.p[m.n]===undefined){s.p[m.n]=m.d;s.n++}
  if(s.n===s.m){delete a[m.id];afCliDone({k:'hr',id:m.id,ok:true,hist:hsUnpack(s.p.join('')),ti:m.ti,tr:m.tr})}}

function jobHistRead(cb){
  var xl=null,err='',h=null,p=rp('inf');
  try{
    if(!p)throw new Error('falta la ruta del Informe');if(!fso.FileExists(p))throw new Error('no encuentro '+p);
    xl=xlStart();var ob=openBook(xl,p,false);
    try{var ws=findSheet(ob.wb,'INGRESOS Y RETIROS'),ul=lastRow(ws),tt;
      h=hsBuild(rr(ws,'D39:J'+ul),rr(ws,'L39:R'+ul));tt=totIR(ws);TOT.ti=tt.ti;TOT.tr=tt.tr;TOT.ok=true}
    finally{closeBk(ob)}
  }catch(ex){err=ex.message}
  finally{xlQuit(xl)}
  cb(h,err)}
function histRefresh(fresh,force){
  var now=new Date().getTime();
  if(!force&&RS.hq&&now-RS.hqT<60000)return;
  if(!fresh&&!force&&now<(RS.hqNext||0))return;
  if(cli()){
    if(!CFG.nt.room)return;
    RS.hq=true;RS.hqT=now;
    afCliReq('hq',{fresh:!!fresh},function(r,err){RS.hq=false;
      if(!r||!r.ok){RS.histErr=err||(r&&r.err)||'error del servidor';RS.hqNext=new Date().getTime()+60000;regRender();return}
      histSet(r.hist);if(typeof r.ti==='number'){TOT.ti=r.ti;TOT.tr=r.tr;TOT.ok=true}
      hsFixSel();regRender()},60000,'El servidor no respondio al pedir el historial.');
    return}
  if(!rp('inf'))return;
  if(!fresh&&RS.hist&&now-RS.histAt<300000){regRender();return}
  RS.hq=true;RS.hqT=now;
  jobRun(function(){jobHistRead(function(h,err){RS.hq=false;
    if(err){RS.histErr=err;RS.hqNext=new Date().getTime()+60000}else{histSet(h);hsFixSel()}
    regRender()})})}
setInterval(function(){
  var now=new Date().getTime();
  if(HE.busy||ovOpen())return;
  if(srv()){if(!RS.hist&&rp('inf')&&!busy&&!JOBQ.length)histRefresh();return}
  if(cli()&&CFG.nt.room&&RS.clSync&&(!RS.hist||(VIEW==='reg'&&now-RS.histAt>90000)))histRefresh()},15000);
function srvHistQ(m){
  if(DUP||!m.id||SEEN[m.id])return;SEEN[m.id]=1;CFG.nt.since=NT.since;cfgSave();
  if(m._t&&new Date().getTime()/1000-m._t>120)return;
  if(!rp('inf')){ntPub('st',{k:'hz',id:m.id,ok:false,err:'Falta la ruta del Informe en el servidor (Conexion y archivos).'});return}
  if(!m.fresh&&RS.hist&&new Date().getTime()-RS.histAt<300000){hsPublish(m.id,RS.hist);return}
  jobRun(function(){jobHistRead(function(h,err){
    if(err){ntPub('st',{k:'hz',id:m.id,ok:false,err:String(err).substring(0,200)});return}
    histSet(h);regRender();hsPublish(m.id,h)})})}

function hsSelItem(){var s=RS.hsel,a,i;if(!s||!RS.hist)return null;a=s.t==='I'?RS.hist.i:RS.hist.r;
  for(i=0;i<a.length;i++)if(a[i].row===s.row&&a[i].h===s.h&&a[i].nom===s.nom&&a[i].monto===s.monto)return a[i];
  for(i=0;i<a.length;i++)if(a[i].h===s.h&&a[i].nom===s.nom&&a[i].monto===s.monto)return a[i];
  return null}
function hsFixSel(){var it=hsSelItem();RS.hsel=it?{t:it.t,row:it.row,h:it.h,nom:it.nom,monto:it.monto}:null}
function hsSide(a,t,title,cls){
  var rows='',i,x,sum=0,sel;
  for(i=0;i<a.length;i++)if(!isJL(a[i].nom))sum+=a[i].monto;
  for(i=a.length-1;i>=0;i--){x=a[i];sel=RS.hsel&&RS.hsel.t===t&&RS.hsel.row===x.row;
    rows+='<tr class="hr'+(sel?' sel':'')+'" id="hr_'+t+x.row+'" onclick="hxPick(\''+t+'\','+x.row+')" ondblclick="hxPick(\''+t+'\','+x.row+');hsEdit()"><td>'+esc(x.h)+'</td><td>'+esc(x.nom)+'</td><td class="n">'+m0(x.monto)+(x.tk==='Manual'?' <small>M</small>':'')+'</td><td>'+esc(x.mesa)+'</td><td>'+esc(x.sup)+'</td></tr>'}
  return '<div class="hc"><div class="hh '+cls+'">'+title+' &middot; '+a.length+' &middot; '+m0(sum)+'</div><div class="hs"><table class="t hx"><tr><th>Hora</th><th>Cliente</th><th>Monto</th><th>Mesa</th><th>Sup. / Pit Boss</th></tr>'+
    (rows||'<tr><td colspan="5" class="hint">Sin movimientos</td></tr>')+'</table></div></div>'}
function hsBarHtml(){var it=hsSelItem();
  if(it)return 'Seleccionado: <b>'+(it.t==='I'?'INGRESO':'RETIRO')+'</b> &middot; '+esc(it.nom)+' &middot; '+m0(it.monto)+' &middot; '+esc(it.mesa)+' ('+esc(it.h)+') <span class="b p" onclick="hsEdit()">Editar</span><span class="b d" onclick="hsDel()">Eliminar</span>';
  return 'Haz clic en un movimiento para editarlo o eliminarlo (doble clic = editar).'}
function hsScore(){var sc=TOT.ti-TOT.tr;return '<div class="hsc"><small>SCORE'+(sc<0?' &middot; LOSS':(sc>0?' &middot; WIN':''))+'</small><b class="'+(sc<0?'dn':(sc>0?'up':''))+'">'+(sc<0?'('+m0(-sc)+')':m0(sc))+'</b></div>'}
function hsHtml(){var hs=RS.hist,h='<div class="hbar"><span class="hsb" id="hsBar">'+hsBarHtml()+'</span><a class="l" onclick="histRefresh(true)">Actualizar historial</a></div>';
  if(!hs)return h+'<div class="hint">'+(RS.histErr?'<span class="dn">No pude cargar el historial: '+esc(RS.histErr)+'</span>':'Cargando historial...')+'</div>';
  return h+(RS.histErr?'<div class="hint"><span class="dn">'+esc(RS.histErr)+'</span></div>':'')+hsScore()+'<div class="hg">'+hsSide(hs.i,'I','INGRESOS','ing')+hsSide(hs.r,'R','RETIROS','ret')+'</div>'}
function hxPick(t,row){var a=RS.hist&&(t==='I'?RS.hist.i:RS.hist.r),i,e;if(!a)return;
  for(i=0;i<a.length;i++)if(a[i].row===row){
    if(RS.hsel){e=$('hr_'+RS.hsel.t+RS.hsel.row);if(e)e.className='hr'}
    RS.hsel={t:t,row:row,h:a[i].h,nom:a[i].nom,monto:a[i].monto};
    e=$('hr_'+t+row);if(e)e.className='hr sel';
    e=$('hsBar');if(e)e.innerHTML=hsBarHtml();return}}
function hsSay(t,c){if(ovShown('mHe'))heMsg(t,c);else regMsg(t,c)}

function heMsg(t,c){$('heMsg').innerHTML=t?'<span class="'+(c||'')+'">'+t+'</span>':''}
function heMp(){var d=String($('heM').value).replace(/[^0-9]/g,'');$('heMp').innerHTML=d?m0(parseInt(d,10)):''}
function heTipo(t){HE.t=t;$('heI').className='b tp ing'+(t==='I'?' on':'');$('heR').className='b tp ret'+(t==='R'?' on':'')}
function heFill(id,arr,cur){var h='',i,f=false,a=arr.slice(0);
  for(i=0;i<a.length;i++)if(a[i]===cur){f=true;break}
  if(cur&&!f)a.push(cur);
  for(i=0;i<a.length;i++)h+='<option value="'+esc(a[i])+'"'+(a[i]===cur?' selected':'')+'>'+esc(a[i])+'</option>';
  $(id).innerHTML=h}
function hsEdit(){var it=hsSelItem();if(!it||HE.busy||ovOpen())return;
  HE.it=it;HE.busy=false;
  $('heO').innerHTML='Original: '+(it.t==='I'?'Ingreso':'Retiro')+' de las '+esc(it.h)+' &middot; '+esc(it.nom)+' &middot; '+m0(it.monto)+' &middot; '+esc(it.mesa)+' &middot; '+esc(it.sup);
  $('heN').value=it.nom;$('heM').value=String(it.monto);
  heFill('heS',RG().mesas,it.mesa);heFill('heP',RG().pit,it.sup);
  $('heK').value=it.tk==='Manual'?'Manual':'Ticket';
  heTipo(it.t);heMsg('');heMp();
  $('mHe').style.display='flex';try{$('heN').focus();$('heN').select()}catch(e){}}
function heClose(){if(HE.busy)return;$('mHe').style.display='none';HE.it=null;regFocus()}
function hsInList(nom){var k=nkey(nom),i;for(i=0;i<RS.cl.length;i++)if(RS.cl[i].k===k)return true;return false}
function heSave(){
  if(HE.busy||!HE.it)return;
  var it=HE.it,nom=proper(cleanTxt($('heN').value).replace(/ $/,'')),d=String($('heM').value).replace(/[^0-9]/g,''),mo=d?parseInt(d,10):0,
      mesa=$('heS').value,sup=$('heP').value,tk=$('heK').value,t=HE.t;
  if(nkey(nom).length<3){heMsg('Escribe el nombre del cliente.','dn');return}
  if(!mo||mo>10000000){heMsg('Escribe un monto valido.','dn');return}
  if(!mesa||!sup){heMsg('Elige la mesa y el Sup. / Pit Boss.','dn');return}
  if(t===it.t&&nkey(nom)===nkey(it.nom)&&mo===it.monto&&mesa===it.mesa&&sup===it.sup&&tk===(it.tk==='Manual'?'Manual':'Ticket')){heMsg('No cambiaste nada.','dn');return}
  if(nkey(nom)!==nkey(it.nom)&&!isIgn(nom)&&RS.clOk&&!hsInList(nom)&&!confirm('"'+nom+'" no esta en la lista de clientes.\n\nSe agregara como cliente nuevo al Rating Card. Continuar?'))return;
  hsRun({a:'e',t:it.t,row:it.row,exp:{h:it.h,nom:it.nom,monto:it.monto,mesa:it.mesa},nw:{t:t,nom:nom,monto:mo,mesa:mesa,sup:sup,tk:tk}})}
function hsDel(){var it=hsSelItem();if(!it||HE.busy||ovOpen())return;HE.it=it;hsAskDel(it)}
function heDelete(){if(HE.busy||!HE.it)return;hsAskDel(HE.it)}
function hsAskDel(it){
  if(!confirm('Eliminar este '+(it.t==='I'?'INGRESO':'RETIRO')+'?\n\nCliente: '+it.nom+'\nMonto: '+m0(it.monto)+'\nMesa: '+it.mesa+'\nHora: '+it.h+'\n\nSe quita del Informe y se resta del Rating Card. Si era un cliente nuevo y no tiene mas movimientos, tambien se quita su ficha y su nombre de la lista.\nEsto no se puede deshacer.'))return;
  hsRun({a:'d',t:it.t,row:it.row,exp:{h:it.h,nom:it.nom,monto:it.monto,mesa:it.mesa},nw:null})}
function hsRun(op){
  HE.busy=true;hsSay(cli()?'Enviando al servidor...':'Guardando en el Informe y el Rating Card...','');
  var fin=function(r,err){HE.busy=false;hsOpDone(r,err)};
  if(cli()){
    afCliReq('ho',{a:op.a,t:op.t,row:op.row,exp:op.exp,nw:op.nw},function(r,err){fin(r,err)},180000,'El servidor no confirmo. NO se sabe si se aplico: actualiza el historial y revisa el Informe antes de repetir.');return}
  if(DUP){HE.busy=false;hsSay('Este servidor esta duplicado: usa el otro y cierra esta ventana.','dn');return}
  jobRun(function(){jobHistOp(op,'',function(res){fin(res,'')})})}
function hsOpDone(r,err){
  if(!r){hsSay(esc(err||'sin respuesta'),'dn');return}
  if(typeof r.ti==='number'){TOT.ti=r.ti;TOT.tr=r.tr;TOT.ok=true}
  if(!r.ok){
    if(/^REVISA/.test(r.err||'')){HE.busy=false;heClose();alert(r.err)}
    else hsSay(esc(r.err||'error'),'dn');
    histRefresh(true,true);regRender();return}
  HE.busy=false;heClose();RS.hsel=null;
  regMsg(esc(r.msg||'Listo'),r.rc?'up':'dn');
  if(cli())histRefresh(false,true);
  regRender();regFocus()}

function nwMark(nom){var o=CFG.nw=CFG.nw||{},t=new Date().getTime(),x;o[nkey(nom)]=t;for(x in o)if(t-o[x]>2*86400000)delete o[x];cfgSave()}
function nwHas(nom){return !!(CFG.nw&&CFG.nw[nkey(nom)])}
function nwDel(nom){if(CFG.nw){delete CFG.nw[nkey(nom)];cfgSave()}}
function hsListDrop(nom){var k=nkey(nom),i,ch=false;
  for(i=RS.cl.length-1;i>=0;i--)if(RS.cl[i].k===k){RS.cl.splice(i,1);ch=true}
  if(ch&&RS.clOk){RS.clH=lhash(RS.cl);if(srv()){RS.clPub=0;pubClients()}}}
function rcClear(ob,wb,wsD,wsL,wsC,nom,dia){
  var cols=[2,10,18],f,b,t,slot=null,i,r,v,empty=true,out={newList:false,created:false,card:false,list:false},lv,n;
  for(f=5;f<=5605&&!slot;f+=35)for(b=0;b<3;b++){t=cellTxt(wsD,f,cols[b]);if(t&&sameName(t,nom)){slot={f:f,c:cols[b],ix:((f-5)/35)*3+b};break}}
  if(slot){
    r=slot.f+1+dia;
    wsD.Cells(r,slot.c+1).ClearContents();wsD.Cells(r,slot.c+2).ClearContents();
    if(nm(wsD.Cells(r,slot.c+1).Value2)!==0||nm(wsD.Cells(r,slot.c+2).Value2)!==0)throw new Error('no pude limpiar el dia en DETALLE fila '+r+' (hoja protegida?)');
    v=rr(wsD,colName(slot.c+1)+(slot.f+2)+':'+colName(slot.c+5)+(slot.f+32));
    for(i=0;i<v.length&&empty;i++)if(nm(v[i][0])!==0||nm(v[i][1])!==0||nm(v[i][4])!==0)empty=false;
    if(empty){wsD.Cells(slot.f,slot.c).ClearContents();try{wsC.Cells(5+slot.ix,9).ClearContents()}catch(ex){}out.card=true}}
  if(nwHas(nom)&&(!slot||out.card)){
    lv=rr(wsL,'C2:C5000');n=0;
    for(i=0;i<lv.length;i++)if(!isEmp(lv[i][0])&&nkey(String(lv[i][0]))===nkey(nom)){wsL.Cells(2+i,3).ClearContents();n++}
    if(n){out.list=true}nwDel(nom)}
  ob.app.Calculate();wb.Save();return out}

function hsNoFormulas(ws,c0,r1,r2){var hf=ws.Range(colName(c0)+r1+':'+colName(c0+6)+r2).HasFormula;
  if(hf!==false)throw new Error('hay formulas en la tabla de movimientos del Informe: no escribo encima')}
function hsShiftUp(ws,c0,row,e){
  var v=rr(ws,colName(c0)+row+':'+colName(c0+6)+e),n=v.length,i,j,s,d,cell;
  for(i=0;i<n-1;i++)for(j=0;j<7;j++){s=v[i+1][j];d=v[i][j];
    if(s===d||(isEmp(s)&&isEmp(d)))continue;
    cell=ws.Cells(row+i,c0+j);
    if(isEmp(s))cell.ClearContents();else{cell.Value2=s;if(j===0&&typeof s==='number')cell.NumberFormat='hh:mm'}}
  for(j=0;j<7;j++)ws.Cells(e,c0+j).ClearContents()}
function hsCheckOp(m){
  var x=m.exp,n=m.nw;
  if(m.a!=='e'&&m.a!=='d')return 'accion invalida';
  if(m.t!=='I'&&m.t!=='R')return 'tipo invalido';
  if(typeof m.row!=='number'||m.row!==Math.floor(m.row)||m.row<39||m.row>110)return 'fila invalida';
  if(!x||typeof x.h!=='string'||!/^(\d\d:\d\d|--:--)$/.test(x.h)||typeof x.nom!=='string'||x.nom.length>80||typeof x.monto!=='number')return 'datos del movimiento invalidos';
  if(m.a==='e'){
    if(!n||typeof n!=='object')return 'faltan los datos nuevos';
    if(n.t!=='I'&&n.t!=='R')return 'tipo nuevo invalido';
    if(n.tk!=='Manual'&&n.tk!=='Ticket')return 'ticket invalido';
    if(typeof n.nom!=='string'||n.nom.length<3||n.nom.length>60||!new RegExp('^'+LETRE+'+$').test(n.nom))return 'nombre invalido';
    if(typeof n.mesa!=='string'||n.mesa.length<1||n.mesa.length>30||!/^[A-Za-z0-9 ()\/.-]+$/.test(n.mesa))return 'mesa invalida';
    if(typeof n.sup!=='string'||n.sup.length<2||n.sup.length>40||!new RegExp('^'+LETRE+'+$').test(n.sup))return 'sup. / pit boss invalido';
    if(typeof n.monto!=='number'||n.monto!==Math.floor(n.monto)||n.monto<1||n.monto>10000000)return 'monto invalido'}
  return ''}
function jobHistOp(op,by,done){
  var xl=null,err='',wrote=false,rcErr=[],res={ok:false,err:'',msg:'',rc:true,ti:TOT.ti,tr:TOT.tr,rm:[]},p=rp('inf'),dia=FE.getDate(),
      rows=null,hist=null,nmOld='',mesaOld='',names=[],i,r1,extra=[];
  try{
    if(!p)throw new Error('falta la ruta del Informe');if(!fso.FileExists(p))throw new Error('no encuentro '+p);
    xl=xlStart();
    var ob=openBook(xl,p,true),wb=ob.wb;
    try{
      if(wb.ReadOnly)throw new Error('el Informe esta abierto como solo lectura (otro equipo o una copia oculta de Excel); cierra Excel en el servidor y reintenta');
      var ws=findSheet(wb,'INGRESOS Y RETIROS'),e=lastRow(ws),I=op.t==='I',c0=I?4:12,x,t0,t1,hora,mon,mo=op.exp.monto,ei,er,nw=op.nw,I2,c1,a,b,row2,k;
      if(op.row<39||op.row>e)throw new Error('esa fila ya no esta en la tabla del Informe; actualiza el historial');
      x=rr(ws,colName(c0)+op.row+':'+colName(c0+6)+op.row)[0];
      if(hsFmtH(x[0])!==op.exp.h||nm(x[2])!==mo||nkey(hsTxt(x[4]))!==nkey(op.exp.nom))
        throw new Error('ese movimiento ya no esta igual en el Informe (otro equipo lo cambio o lo borro). Actualiza el historial y vuelve a intentarlo');
      nmOld=hsTxt(x[4]);mesaOld=hsTxt(x[1]);hora=x[0];mon=hsTxt(x[6]);
      t0=totIR(ws,true);
      if(op.a==='d'){
        hsNoFormulas(ws,c0,op.row,e);wrote=true;hsShiftUp(ws,c0,op.row,e)}
      else{
        I2=nw.t==='I';
        if(I2===I){
          hsNoFormulas(ws,c0,op.row,op.row);wrote=true;
          ws.Cells(op.row,c0+1).Value=nw.mesa;ws.Cells(op.row,c0+2).Value=nw.monto;ws.Cells(op.row,c0+3).Value=nw.tk;
          ws.Cells(op.row,c0+4).Value=nw.nom;ws.Cells(op.row,c0+5).Value=nw.sup}
        else{
          c1=I2?4:12;
          a=rr(ws,(I2?'H':'P')+'39:'+(I2?'H':'P')+e);b=rr(ws,(I2?'F':'N')+'39:'+(I2?'F':'N')+e);row2=-1;
          for(k=0;k<a.length;k++)if(isEmp(a[k][0])&&isEmp(b[k][0])){row2=39+k;break}
          if(row2<0)throw new Error('ya no hay filas libres del otro lado en INGRESOS Y RETIROS (39 a '+e+')');
          hsNoFormulas(ws,c1,row2,row2);hsNoFormulas(ws,c0,op.row,e);wrote=true;
          if(typeof hora==='number'){ws.Cells(row2,c1).Value2=hora;ws.Cells(row2,c1).NumberFormat='hh:mm'}else ws.Cells(row2,c1).Value=hora;
          ws.Cells(row2,c1+1).Value=nw.mesa;ws.Cells(row2,c1+2).Value=nw.monto;ws.Cells(row2,c1+3).Value=nw.tk;
          ws.Cells(row2,c1+4).Value=nw.nom;ws.Cells(row2,c1+5).Value=nw.sup;ws.Cells(row2,c1+6).Value=mon;
          hsShiftUp(ws,c0,op.row,e)}}
      ob.app.Calculate();
      t1=totIR(ws,true);ei=t0.ti;er=t0.tr;
      if(I)ei-=mo;else er-=mo;
      if(op.a==='e'){if(nw.t==='I')ei+=nw.monto;else er+=nw.monto}
      if(Math.abs(t1.ti-ei)>0.001||Math.abs(t1.tr-er)>0.001)throw new Error('los totales no cuadran despues del cambio (esperado '+m0(ei)+' / '+m0(er)+', quedo '+m0(t1.ti)+' / '+m0(t1.tr)+')');
      t1=totIR(ws);TOT.ti=t1.ti;TOT.tr=t1.tr;TOT.ok=true;
      rows={i:rr(ws,'D39:J'+e),r:rr(ws,'L39:R'+e)};hist=hsBuild(rows.i,rows.r);
      wb.Save()
    }finally{closeBk(ob)}
    if(!isIgn(nmOld))names.push({nom:nmOld,mesa:mesaOld});
    if(op.a==='e'&&nkey(op.nw.nom)!==nkey(nmOld)&&!isIgn(op.nw.nom))names.push({nom:op.nw.nom,mesa:op.nw.mesa});
    else if(op.a==='e'&&names.length&&nkey(op.nw.nom)===nkey(nmOld))names[0].mesa=op.nw.mesa;
    if(names.length&&!rp('rc'))rcErr.push('falta la ruta del Rating Card');
    else for(i=0;i<names.length;i++){
      try{r1=rcUpdate(xl,names[i].nom,names[i].mesa,rows,dia);
        if(r1&&r1.newList)nwMark(names[i].nom);
        if(r1&&r1.card)extra.push('ficha de '+names[i].nom+' quitada del Rating Card');
        if(r1&&r1.list){res.rm.push(names[i].nom);extra.push(names[i].nom+' quitado de la lista de clientes')}}
      catch(ex2){rcErr.push(names[i].nom+': '+ex2.message);if(/solo lectura/i.test(ex2.message))RS.roErr=true;
        var q;for(q=RS.rcp.length-1;q>=0;q--)if(RS.rcp[q].nom===names[i].nom&&RS.rcp[q].dia===dia)RS.rcp.splice(q,1);
        RS.rcp.push({nom:names[i].nom,mesa:names[i].mesa,dia:dia});CFG.rcp=RS.rcp;cfgSave()}}
  }catch(ex){err=ex.message}
  finally{xlQuit(xl)}
  if(err&&wrote)err='REVISA EL INFORME: se hizo el cambio pero fallo despues ('+err+'). NO lo repitas sin revisar el Informe y el Rating Card.';
  if(err&&!wrote&&/solo lectura/i.test(err)&&!op.rty){op.rty=1;if(killOrphans()>0){jobHistOp(op,by,done);return}}
  if(err){res.err=err;done(res);return}
  histSet(hist);RS.hsel=null;
  for(i=0;i<res.rm.length;i++)hsListDrop(res.rm[i]);
  res.ok=true;res.ti=TOT.ti;res.tr=TOT.tr;res.rc=!rcErr.length;
  res.msg=(op.a==='d'?(op.t==='I'?'Ingreso':'Retiro')+' eliminado: '+nmOld+' '+m0(op.exp.monto):(op.t==='I'?'Ingreso':'Retiro')+' corregido: '+nmOld+' '+m0(op.exp.monto)+' -> '+op.nw.nom+' '+m0(op.nw.monto)+' ('+op.nw.mesa+')')+
    (rcErr.length?'. Informe OK, pero el Rating Card quedo pendiente ('+rcErr.join('; ')+')':'. Informe y Rating Card actualizados')+(extra.length?' ('+extra.join('; ')+')':'');
  done(res)}
function srvHistOp(m){
  if(!m.id||SEEN[m.id])return;SEEN[m.id]=1;
  if(DUP||!claimTx(m.id))return;
  CFG.nt.since=NT.since;cfgSave();
  var by=String(m.n||'cliente').substring(0,20),err=hsCheckOp(m);
  function no(msg){ntPub('st',{k:'hz',id:m.id,ok:false,err:msg,ti:TOT.ti,tr:TOT.tr});regMsg('['+esc(by)+'] cambio rechazado: '+esc(msg),'dn')}
  if(m._t&&new Date().getTime()/1000-m._t>300){no('la solicitud llego con mas de 5 minutos de retraso y no se aplico; actualiza el historial');return}
  if(err){no(err);return}
  if(!rp('inf')){no('falta la ruta del Informe en el servidor');return}
  regMsg('['+esc(by)+'] recibido: '+(m.a==='d'?'eliminar':'editar')+' movimiento de '+esc(m.exp.nom)+'...','');
  jobRun(function(){jobHistOp({a:m.a,t:m.t,row:m.row,exp:m.exp,nw:m.nw||null},by,function(res){
    ntPub('st',{k:'hz',id:m.id,ok:res.ok,err:String(res.err||'').substring(0,250),msg:String(res.msg||'').substring(0,230),rc:!!res.rc,ti:TOT.ti,tr:TOT.tr});
    if(res.ok)ntPub('st',{k:'v',ti:TOT.ti,tr:TOT.tr});
    regMsg('['+esc(by)+'] '+esc(res.ok?res.msg:('NO se aplico: '+res.err)),res.ok?'up':'dn');regRender()})})}
document.addEventListener('keydown',function(e){
  if(!ovShown('mHe'))return;
  var k=e.keyCode,tg=e.target||e.srcElement;
  if(k===27){e.preventDefault();e.stopPropagation();heClose()}
  else if(k===13&&(!tg||tg.tagName!=='SELECT')){e.preventDefault();e.stopPropagation();heSave()}},true);

/* =================== BOTON CIERRE =================== */
var CIERRE_TO=['FRANCISCO FLORES <jfflores@winpot.com.mx>','Ruben Medina Gdl <rmedina@winpot.com.mx>','Joel Osorio Gdl <josorio@winpot.com.mx>'];
var PARTE_TO=['FRANCISCO FLORES <jfflores@winpot.com.mx>','Karina Arroyo <karroyo@winpot.com.mx>','Ruben Medina Gdl <rmedina@winpot.com.mx>','Joel Osorio Gdl <josorio@winpot.com.mx>','OLGA <Obrencel@capricasino.com.mx>','Juan C Estrada Circunvalacion <jcestrada@capricasino.com.mx>','Auditor Circunvalacion <adr-011-gdl-cir@capricasino.com.mx>','Javier Jefe de Seguridad <sjv-011.gdl-cir@capricasino.com.mx>'];
function esRojo(c){var r=c&255,g=(c>>8)&255,b=(c>>16)&255;return r>=180&&g<=170&&b<=170&&(r-g)>=60&&(r-b)>=60}
function colorCelda(cel){var c;try{c=cel.DisplayFormat.Interior.Color}catch(ex){c=cel.Interior.Color}return Number(c)}
function fechaLarga(f){var q=/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(String(f||'')),d=FE,
  M=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  if(q&&parseInt(q[2],10)>=1&&parseInt(q[2],10)<=12)return parseInt(q[1],10)+' de '+M[parseInt(q[2],10)-1]+' del '+q[3];
  return d.getDate()+' de '+M[d.getMonth()]+' del '+d.getFullYear()}
function parteCuerpo(f,nov){var i,l=['Buen d\u00eda.','Se env\u00eda el informe de novedades correspondiente al d\u00eda '+fechaLarga(f),''];
  if(!nov||!nov.length)l.push('Sin novedades relevantes.');
  else for(i=0;i<nov.length;i++)l.push((i+1)+'.- '+nov[i]);
  l.push('','Saludos.');return l.join('\r\n')}
function cmN(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',')}
function cmX(n){if(n===Math.floor(n))return cmN(n);var a=Math.abs(n).toFixed(2).split('.');return (n<0?'-':'')+a[0].replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+a[1]}
function cmD(n){var a=Math.abs(n).toFixed(2).split('.');return (n<0?'-':'')+'$'+a[0].replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+a[1]}
function horaAmPm(d){var h=d.getHours();return pad(h%12===0?12:h%12)+':'+pad(d.getMinutes())+(h<12?' a. m.':' p. m.')}
function txtPropinas(mesas,host,jl,jpA,jpS){
  return ['Se lleva a cabo el conteo de propinas','Mesas: $'+cmX(mesas),'Hostess: $'+cmX(host),'Retiro JL: $'+cmX(jl),'Jackpot Acumulado: $'+cmX(jpA)+'    Super Jackpot: $'+cmX(jpS)].join('\n')}
function txtFichas(cnt,tot){var pos=[],neg=[],i,c,d;
  for(i=0;i<D.length;i++){c=nm(cnt[i]);d='$'+(D[i]===2.5?'2.50':cmN(D[i]));
    if(c>0)pos.push(c+' Fichas de '+d);else if(c<0)neg.push((-c)+' Fichas de '+d)}
  return 'Fichas en circulacion: \nPositivo: '+(pos.join(', ')||'Sin fichas')+'\nNegativo: '+(neg.join(', ')||'Sin fichas')+'\nTotal: '+cmD(tot)}
function infFila(v,pat,partial){var i,t;
  for(i=0;i<v.length;i++){t=nkey(String(v[i][0]===null||v[i][0]===undefined?'':v[i][0]));
    if(partial?t.indexOf(pat)>=0:t.indexOf(pat)===0)return i+1}
  return -1}
function infPon(ws,row,txt,hora){var c=ws.Cells(row,4).MergeArea.Cells(1,1),h=ws.Cells(row,7).MergeArea.Cells(1,1);
  c.Value=txt;try{c.WrapText=true}catch(ex){}
  if(String(c.Value2||'')!==txt)throw new Error('no quedo escrito el comentario en la fila '+row+' de INFORME (hoja protegida?)');
  h.NumberFormat='@';h.Value=hora}
function jobCierre(cb,opt){
  var xl=null,res={ok:false,err:'',warn:[],f:'',pro:'',fic:''},pi=rp('inf'),pb=rp('ban'),pj=rp('jp'),wrote=false,
      cnt=null,x89=0,jpA=0,jpS=0,mesas=0,host=0,jl=0,tot=0,hora=horaAmPm(new Date()),ob,wb,ws,v,i,r1,r2,r3,r4,pv,t;
  try{
    if(!pi)throw new Error('falta la ruta del Informe (Conexion y archivos)');if(!fso.FileExists(pi))throw new Error('no encuentro '+pi);
    if(!pb)throw new Error('falta la ruta del Banco de fichas (Conexion y archivos)');if(!fso.FileExists(pb))throw new Error('no encuentro '+pb);
    if(!pj)throw new Error('falta la ruta del libro de Jackpot (Conexion y archivos)');if(!fso.FileExists(pj))throw new Error('no encuentro '+pj);
    xl=xlStart();
    ob=openBook(xl,pb,false);
    try{try{ws=ob.wb.Worksheets.Item('Dia '+pad(FE.getDate()))}catch(ex){throw new Error('El banco no tiene la hoja "Dia '+pad(FE.getDate())+'"')}
      v=rr(ws,'X77:X86');cnt=[];for(i=0;i<10;i++)cnt.push(nm(v[i]?v[i][0]:0));x89=n1(ws,'X89')}
    finally{closeBk(ob)}
    ob=openBook(xl,pj,false);
    try{ws=jpSheet(ob.wb);jpA=n1(ws,'AM15');jpS=n1(ws,'AM21')}
    finally{closeBk(ob)}
    ob=openBook(xl,pi,true);wb=ob.wb;
    try{
      if(wb.ReadOnly)throw new Error('el Informe esta abierto como solo lectura (otro equipo o una copia oculta de Excel); cierra Excel en el servidor y reintenta');
      ws=findSheet(wb,'PROPINAS');pv=rr(ws,'R13:R19');
      if(typeof pv[0][0]!=='number')res.warn.push('PROPINAS!R13 (Mesas) esta vacio: se puso $0');
      if(typeof pv[6][0]!=='number')res.warn.push('PROPINAS!R19 (Hostess) esta vacio: se puso $0');
      mesas=nm(pv[0][0]);host=nm(pv[6][0]);
      ws=findSheet(wb,'INGRESOS Y RETIROS');jl=sumJL({r:rr(ws,'L39:R'+lastRow(ws))});
      for(i=0;i<10;i++)tot+=cnt[i]*D[i];
      if(x89!==0&&Math.abs(x89-tot)>0.009){res.warn.push('el total de fichas calculado ('+cmD(tot)+') no coincide con X89 del banco ('+cmD(x89)+'): se uso X89');tot=x89}
      res.pro=txtPropinas(mesas,host,jl,jpA,jpS);res.fic=txtFichas(cnt,tot);
      try{res.f=String(afSheet(wb).Range('E5').Text||'').replace(/^\s+|\s+$/g,'')}catch(ex){res.f=''}
      if(!res.f||/#/.test(res.f))res.f=fmtF(FE);
      ws=findSheet(wb,'INFORME');v=rr(ws,'D1:D400');
      r1=infFila(v,'CONTEO DE PROPINAS',true);r2=infFila(v,'FICHAS EN CIRCULACION',false);
      if(r1<0)throw new Error('no encuentro en la columna D de la hoja INFORME la fila "Se lleva a cabo el conteo de propinas"');
      if(r2<0)throw new Error('no encuentro en la columna D de la hoja INFORME la fila "Fichas en circulacion"');
      res.nov=[];res.nvok=false;
      try{for(i=0;i<v.length;i++){
          if(typeof v[i][0]!=='string')continue;
          t=String(v[i][0]).replace(/\s*[\r\n]+\s*/g,' ').replace(/^\s+|\s+$/g,'');
          if(!t)continue;
          if(esRojo(colorCelda(ws.Cells(i+1,4))))res.nov.push(t)}
        res.nvok=true}
      catch(ex){res.warn.push('no pude leer las casillas rojas del Informe ('+ex.message+'): NO se abrira el parte informativo')}
      wrote=true;
      infPon(ws,r1,res.pro,hora);infPon(ws,r2,res.fic,hora);
      if(opt){
        r3=infFila(v,'SE INICIA PRESENTACION DE BANCAS',false);r4=infFila(v,'SE REALIZA EL CIERRE DE LA SALA',false);
        if(r3<0)res.warn.push('no encontre en la columna D la fila "Se inicia presentacion de Bancas..."');else ciHora(ws,r3,opt.hp);
        if(r4<0)res.warn.push('no encontre en la columna D la fila "Se realiza el cierre de la Sala..."');else ciHora(ws,r4,opt.hc);
        ciNombres(ws,opt,res);ciOper(ws,opt,res,r3,r4)}
      ob.app.Calculate();wb.Save()
    }finally{closeBk(ob)}
    res.ok=true
  }catch(ex){res.err=ex.message}
  finally{xlQuit(xl)}
  if(res.err&&wrote)res.err='REVISA EL INFORME: se escribio parte de los comentarios y fallo despues ('+res.err+')';
  if(res.err&&!wrote&&/solo lectura/i.test(res.err)&&!jobCierre.rty){jobCierre.rty=1;if(killOrphans()>0){jobCierre(cb,opt);return}}
  jobCierre.rty=0;
  cb(res)}

function CI(){if(!CFG.ci)CFG.ci={};var c=CFG.ci;if(!c.first)c.first={d:'',t:0};if(!c.dl)c.dl=[];if(!c.sb)c.sb=[];if(!c.last)c.last={pit:'',sb:'',dl:''};if(c.opr===undefined)c.opr='';return c}
function cierreMark(){var c=CI(),k=dvYmd(FE);if(c.first.d!==k){c.first={d:k,t:new Date().getTime()};cfgSave()}}
function ciHM(d){return pad(d.getHours())+':'+pad(d.getMinutes())}
function ciParse(t){var q=/^\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*$/.exec(String(t));if(!q)return null;var h=parseInt(q[1],10),m=parseInt(q[2],10);if(h>23||m>59)return null;return[h,m]}
function ciNear(t){var a=ciParse(t);if(!a)return '03:00';var m=a[0]*60+a[1],f=function(x){var d=Math.abs(m-x);return Math.min(d,1440-d)};return f(300)<f(180)?'05:00':'03:00'}
function ciTxt(t){var a=ciParse(t);return horaAmPm(new Date(2000,0,1,a[0],a[1]))}
function ciSel(id,lab,list,cur){var h='<span class="cfl">'+lab+'</span><div class="f"><select id="'+id+'" class="cfi" style="width:18rem"><option value="">- elige -</option>',i,f=false;
  for(i=0;i<list.length;i++){if(list[i]===cur)f=true;h+='<option value="'+esc(list[i])+'"'+(list[i]===cur?' selected':'')+'>'+esc(list[i])+'</option>'}
  if(cur&&!f)h+='<option value="'+esc(cur)+'" selected>'+esc(cur)+'</option>';
  return h+'</select><input id="'+id+'N" class="cfi" type="text" maxlength="40" style="width:14rem" placeholder="o escribe uno nuevo" oninput="var c=cleanTxt(this.value);if(c!==this.value)this.value=c"></div>'}
function ciVal(id){var n=proper(cleanTxt($(id+'N').value).replace(/ $/,''));return n||$(id).value}
function ciOpen(){
  var c=CI(),g=RG(),f=(c.first.d===dvYmd(FE)&&c.first.t)?ciHM(new Date(c.first.t)):'';
  $('ciB').innerHTML=ciSel('ciPit','Pit Boss',g.pit,c.last.pit)+ciSel('ciSub','Sub Auditoria',c.sb,c.last.sb)+ciSel('ciDlr','Dealer',c.dl,c.last.dl)+
    '<span class="cfl">Operador (se escribe en la columna C del INFORME)</span><div class="f"><input id="ciOp" class="cfi" type="text" maxlength="40" style="width:18rem" value="'+esc(RG().mon||'')+'" oninput="var q=cleanMon(this.value);if(q!==this.value)this.value=q"></div>'+
    '<div class="f" style="align-items:flex-start;margin-top:0.5rem"><div style="margin-right:0.875rem"><span class="cfl">Hora de presentacion de bancas (24 h)</span><input id="ciHp" class="cfi" type="text" maxlength="5" style="width:7rem;font-size:1.25rem;font-weight:700" value="'+f+'" oninput="ciHpIn()"><div class="hint">'+(f?'Tomada de la primera mesa capturada hoy.':'Aun no se captura ninguna mesa hoy: escribela (ej. 22:30).')+'</div></div>'+
    '<div><span class="cfl">Hora de cierre de sala (3:00 o 5:00)</span><input id="ciHc" class="cfi" type="text" maxlength="5" style="width:7rem;font-size:1.25rem;font-weight:700" value="'+(f?ciNear(f):'')+'"></div></div>'+
    '<div id="ciMsg" style="min-height:1.25rem;margin-top:0.5rem"></div>';
  $('mCi').style.display='flex';try{$('ciPit').focus()}catch(e){}}
function ciHpIn(){var a=ciParse($('ciHp').value);if(a)$('ciHc').value=ciNear($('ciHp').value)}
function ciClose(){$('mCi').style.display='none';regFocus()}
function ciAddName(list,n){var k=nkey(n),i;if(!n)return;for(i=0;i<list.length;i++)if(nkey(list[i])===k)return;list.push(n)}
function ciGo(){
  var pit=ciVal('ciPit'),sb=ciVal('ciSub'),dl=ciVal('ciDlr'),hp=$('ciHp').value,hc=$('ciHc').value,c=CI(),o;
  if(!ciParse(hp)){$('ciMsg').innerHTML='<span class="dn">La hora de presentacion no es valida (24 h, ej. 22:30).</span>';return}
  if(!ciParse(hc)){$('ciMsg').innerHTML='<span class="dn">La hora de cierre no es valida (ej. 03:00 o 05:00).</span>';return}
  var op=proper(cleanMon($('ciOp').value).replace(/\/+/g,'/').replace(/^\/|\/$/g,'')),ml=RG().monl,mi;
  if(nkey(op).length<2){$('ciMsg').innerHTML='<span class="dn">Falta el nombre del operador.</span>';try{$('ciOp').focus()}catch(e){}return}
  RG().mon=op;for(mi=ml.length-1;mi>=0;mi--)if(ml[mi]===op)ml.splice(mi,1);ml.unshift(op);if(ml.length>8)ml.length=8;try{regRender()}catch(e){}
  hp=pad(ciParse(hp)[0])+':'+pad(ciParse(hp)[1]);hc=pad(ciParse(hc)[0])+':'+pad(ciParse(hc)[1]);
  ciAddName(RG().pit,pit);ciAddName(c.sb,sb);ciAddName(c.dl,dl);
  c.last={pit:pit,sb:sb,dl:dl};cfgSave();if(srv())pubCfg();
  o={pit:pit,sb:sb,dl:dl,hp:hp,hc:hc,op:op};
  $('mCi').style.display='none';
  setStat('Cierre: escribiendo los comentarios en el Informe...');
  if(cli()){
    afCliReq('cc',o,function(r,err){cierreFin(r||{ok:false,err:err||'sin respuesta',warn:''})},180000,'El servidor no respondio. NO se sabe si se escribieron los comentarios: revisa la hoja INFORME antes de repetir.');return}
  jobRun(function(){jobCierre(function(r){r.warn=r.warn.join(' | ');cierreFin(r)},o)})}
function cierreMail(){if(busy||ovOpen())return;ciOpen()}
document.addEventListener('keydown',function(e){
  if(!ovShown('mCi'))return;
  var k=e.keyCode,tg=e.target||e.srcElement;
  if(k===27){e.preventDefault();e.stopPropagation();ciClose()}
  else if(k===13&&(!tg||tg.tagName!=='SELECT')){e.preventDefault();e.stopPropagation();ciGo()}},true);

function ciHora(ws,row,hhmm){var h=ws.Cells(row,7).MergeArea.Cells(1,1);h.NumberFormat='@';h.Value=ciTxt(hhmm)}
function ciLab(s){return nkey(String(s||'').replace(/[\u0300-\u036f]/g,'')).replace(/ /g,'')}
function ciKind(lab){var k=ciLab(lab);if(k==='PITBOSS')return 'pit';if(k.indexOf('SUBAUDITOR')===0)return 'sb';if(k==='DEALER')return 'dl';return ''}
function ciParseLine(s){s=String(s);var i=s.indexOf(':'),k;if(i<0)return null;k=ciKind(s.substring(0,i));if(!k)return null;return{k:k,lab:s.substring(0,i+1)}}
function ciBlank(v){return v===null||v===undefined||String(v).replace(/[\s\u200b-\u200d\u2060\ufeff]+/g,'')===''}
var CIERRE_SUB=['SE INICIA PRESENTACION DE BANCAS','CONTEO DE PROPINAS','FICHAS EN CIRCULACION'];
function ciSubRows(ws){var v=rr(ws,'D1:D400'),m={},i,j,t;
  for(i=0;i<v.length;i++){if(typeof v[i][0]!=='string')continue;t=nkey(v[i][0]);
    for(j=0;j<CIERRE_SUB.length;j++)if(t.indexOf(CIERRE_SUB[j])>=0){m[i+1]=true;break}}
  return m}
function ciNombres(ws,opt,res){
  var v=rr(ws,'E1:E400'),sr=ciSubRows(ws),r,t,ls,i,p,ch,nw,c,val,hasPit,hasSb,n={pit:0,sb:0,dl:0},heal=[];
  for(r=0;r<v.length;r++){t=v[r][0];if(typeof t!=='string'||t.indexOf(':')<0)continue;
    ls=t.split(/\r\n|\n|\r|\u000b/);ch=false;hasPit=false;hasSb=false;
    for(i=0;i<ls.length;i++){p=ciParseLine(ls[i]);if(!p)continue;
      if(p.k==='pit')hasPit=true;else if(p.k==='sb')hasSb=true;
      val=opt[p.k];if(!val)continue;
      ls[i]=p.lab+' '+val;n[p.k]++;ch=true}
    if(hasPit&&!hasSb&&opt.sb&&sr[r+1]){ls.push('Sub Auditor\u00eda: '+opt.sb);n.sb++;heal.push(r+1);ch=true}
    if(ch){nw=ls.join('\n');c=ws.Cells(r+1,5).MergeArea.Cells(1,1);c.Value=nw;
      if(String(c.Value2||'')!==nw)throw new Error('no quedaron escritos los nombres en la fila '+(r+1)+' de INFORME (hoja protegida?)')}}
  if(opt.pit&&!n.pit)res.warn.push('no encontre "Pit Boss:" en la columna E del INFORME');
  if(opt.sb&&!n.sb)res.warn.push('no encontre "Sub Auditoria:" en la columna E del INFORME');
  if(opt.dl&&!n.dl)res.warn.push('no encontre "Dealer:" en la columna E del INFORME');
  if(heal.length)res.warn.push('en la(s) fila(s) '+heal.join(', ')+' de INFORME faltaba la linea "Sub Auditoria:" y se agrego')}
function ciFinBit(ws,r3){
  var v=rr(ws,'D1:D400'),i,t,e=-1,d,x;
  for(i=r3-1;i<v.length;i++){t=typeof v[i][0]==='string'?nkey(v[i][0]):'';
    if(t.indexOf('CORTE DE CAJA')>=0||t.indexOf('JEFE DE CAJAS')===0){e=i+1;break}}
  if(e<0){e=r3;x=r3;while(x<=400){d=ws.Cells(x,4).MergeArea;if(isEmp(d.Cells(1,1).Value2))break;e=d.Row+d.Rows.Count-1;x=e+1}}
  d=ws.Cells(e,4).MergeArea;return d.Row+d.Rows.Count-1}
function ciEsFecha(x){
  if(typeof x==='number')return x>=36526&&x<=73051;
  if(typeof x==='string')return /^\s*\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{2,4}\s*$/.test(x);
  return false}
function ciOper(ws,opt,res,r3,r4){
  var vb=rr(ws,'B1:B400'),vd=rr(ws,'D1:D400'),last=-1,i,x,c,cc,b,n=0,first=-1,lastW=-1,ad,seen={},hb,hd;
  if(!opt.op){res.warn.push('Operador: no hay nombre de operador, no se escribio en la columna C');return}
  if(r3<0){res.warn.push('Operador: no encontre la fila "Se inicia presentacion de Bancas", no se donde empezar; no se escribio el operador');return}
  vb=rr(ws,'B1:B400');vd=rr(ws,'D1:D400');
  for(i=vb.length-1;i>=r3-1;i--)if(ciEsFecha(vb[i][0])){b=ws.Cells(i+1,2).MergeArea;last=b.Row+b.Rows.Count-1;break}
  if(last<r3){res.warn.push('Operador: no encontre ninguna fecha en la columna B desde la fila '+r3+'; no se escribio el operador');return}
  x=r3;
  while(x<=last){
    c=ws.Cells(x,3).MergeArea;i=x-1;
    hb=vb[i]?ciEsFecha(vb[i][0]):false;hd=vd[i]?!ciBlank(vd[i][0]):false;
    if(hb||hd){cc=c.Cells(1,1);ad=String(cc.Address(false,false));
      if(!seen[ad]){seen[ad]=1;cc.Value=opt.op;
        if(String(cc.Value2||'')!==String(opt.op))throw new Error('no quedo escrito el operador en '+ad+' de INFORME (hoja protegida?)');
        n++;if(first<0)first=x;lastW=x}}
    x=c.Row+c.Rows.Count}
  if(!n)res.warn.push('Operador: no encontre renglones para escribir entre las filas '+r3+' y '+last);
  else res.oper='Operador "'+opt.op+'" escrito en la columna C, filas '+first+' a '+lastW+' ('+n+' celdas)'}
function ciCheck(m){
  var okN=function(v){return v===''||(typeof v==='string'&&v.length>=2&&v.length<=40&&new RegExp('^'+LETRE+'+$').test(v))},okH=function(v){return typeof v==='string'&&!!ciParse(v)};
  if(!okN(m.pit)||!okN(m.sb)||!okN(m.dl))return 'nombre invalido';
  if(!okH(m.hp)||!okH(m.hc))return 'hora invalida';
  if(!(m.op===''||(typeof m.op==='string'&&m.op.length<=40&&new RegExp('^['+LET+' \\/]+$').test(m.op))))return 'operador invalido';
  return ''}

/* ================= Fichas no negociables (FNN) y Cartas ================= */
var FNN_D=['$10,000','$5,000','$1,000','$500','$100','$50'];
var CT_G=[{n:'MB',d:'Z'},{n:'BJ',d:'Z'},{n:'Plastico',d:'M'},{n:'Destruccion',d:'Z'}];
function itDig(el){var c=String(el.value).replace(/[^0-9]/g,'');if(c!==el.value)el.value=c}
function itNum(id){var v=$(id).value;return /^[0-9]{1,5}$/.test(v)?parseInt(v,10):-1}
function termTxt(t,n){return t==='M'?'mazos':'zapatos'}
function txtFnn(q){
  return 'Se presentan FNN: '+q[0]+'/$10,000, '+q[1]+'/$5,000, '+q[2]+'/$1,000, '+q[3]+'$500, '+q[4]+'$100, '+q[5]+'$50.'}
function txtCartas(q,t,serie,color){
  var z0=termTxt(t[0]),z1=termTxt(t[1]),z2=termTxt(t[2]),z3=termTxt(t[3]);
  return 'Dealer presenta '+q[0]+' '+z0+' color rojo y '+q[1]+' '+z0+' color azul para MB, '+
    q[2]+' '+z1+' color rojo y '+q[3]+' '+z1+' color azul para BJ, '+
    q[4]+' '+z2+' color rojo de pl\u00e1stico, '+q[5]+' '+z2+' color azul de pl\u00e1stico, '+
    q[6]+' '+z3+' azules y '+q[7]+' '+z3+' rojos para destruccion y un juego de dados de Craps Serie: #'+serie+' Color: '+color+'.'}
function infBusca(v,pat,desde,hasta){var i,t;
  for(i=desde-1;i<hasta&&i<v.length;i++){t=typeof v[i][0]==='string'?nkey(v[i][0]):'';if(t.indexOf(pat)>=0)return i+1}
  return -1}
function infDados(v,r3){var i,raw,q,se,co;
  for(i=0;i<=r3-2;i++){raw=v[i][0];if(typeof raw!=='string')continue;
    if(nkey(raw).indexOf('JUEGO DE DADOS')<0)continue;
    q=/Serie\s*:?\s*#?\s*([^\s,;]+)[\s\S]*?Color\s*:?\s*([^.\r\n]+)/i.exec(raw);if(!q)continue;
    se=String(q[1]).replace(/\.+$/,'').replace(/^#+/,'');co=String(q[2]).replace(/^\s+|\s+$/g,'');
    if(!se||!co||/^x+$/i.test(se)||/^x+$/i.test(co))continue;
    return{serie:se,color:co,row:i+1}}
  return null}
function infPonTxt(ws,row,txt,hora){
  var c=ws.Cells(row,4).MergeArea.Cells(1,1),h=ws.Cells(row,7).MergeArea.Cells(1,1);
  c.Value=txt;try{c.WrapText=true}catch(ex){}
  if(String(c.Value2||'')!==txt)throw new Error('no quedo escrito el comentario en la fila '+row+' de INFORME (hoja protegida?)');
  h.NumberFormat='@';h.Value=hora}
function jobInfTxt(kind,o,cb){
  var xl=null,res={ok:false,err:'',warn:[],txt:'',row:0,serie:'',color:''},pi=rp('inf'),wrote=false,hora=horaAmPm(new Date()),
      ob,wb,ws,v,r3,fin,row,d,se,co,txt;
  try{
    if(!pi)throw new Error('falta la ruta del Informe (Conexion y archivos)');if(!fso.FileExists(pi))throw new Error('no encuentro '+pi);
    xl=xlStart();ob=openBook(xl,pi,true);wb=ob.wb;
    try{
      if(wb.ReadOnly)throw new Error('el Informe esta abierto como solo lectura (otro equipo o una copia oculta de Excel); cierra Excel en el servidor y reintenta');
      ws=findSheet(wb,'INFORME');v=rr(ws,'D1:D400');
      r3=infFila(v,'SE INICIA PRESENTACION DE BANCAS',false);
      if(r3<0)throw new Error('no encuentro en la columna D de INFORME la fila "Se inicia presentacion de Bancas" (desde ahi se busca; no se escribio nada)');
      fin=ciFinBit(ws,r3);
      if(kind==='fn'){
        row=infBusca(v,'SE PRESENTAN FNN',r3,fin);
        if(row<0)throw new Error('no encuentro la fila "Se presentan FNN" debajo de "Se inicia presentacion de Bancas" (filas '+r3+' a '+fin+'); no se escribio nada');
        txt=txtFnn(o.q)}
      else{
        row=infBusca(v,'DEALER PRESENTA',r3,fin);
        if(row<0)throw new Error('no encuentro la fila "Dealer presenta ..." debajo de "Se inicia presentacion de Bancas" (filas '+r3+' a '+fin+'); no se escribio nada');
        se=o.serie||'';co=o.color||'';
        if(!se||!co){d=infDados(v,r3);
          if(!d)throw new Error('no encontre arriba de "Se inicia presentacion de Bancas" el renglon del juego de dados con Serie y Color; escribelos en la ventana (no se escribio nada)');
          if(!se)se=d.serie;if(!co)co=d.color}
        res.serie=se;res.color=co;
        txt=txtCartas(o.q,o.t,se,co)}
      wrote=true;
      infPonTxt(ws,row,txt,hora);
      res.txt=txt;res.row=row;
      ob.app.Calculate();wb.Save()
    }finally{closeBk(ob)}
    res.ok=true
  }catch(ex){res.err=ex.message}
  finally{xlQuit(xl)}
  if(res.err&&wrote)res.err='REVISA EL INFORME: puede haberse escrito parte del renglon y fallo despues ('+res.err+')';
  if(res.err&&!wrote&&/solo lectura/i.test(res.err)&&!jobInfTxt.rty){jobInfTxt.rty=1;if(killOrphans()>0){jobInfTxt(kind,o,cb);return}}
  jobInfTxt.rty=0;
  cb(res)}
function infTxtFin(r,what){
  setStat('');
  if(!r.ok){alert('No se escribio '+what+' en el Informe:\n\n'+r.err);note('<span class="dn">'+esc(what)+': NO se escribio ('+esc(r.err)+')</span>','dn');return}
  note(esc(what)+' escrito(a) en la fila '+r.row+' del INFORME.'+(r.serie?' Serie #'+esc(r.serie)+' Color '+esc(r.color)+'.':''),'up');
  if(r.warn)alert('Avisos:\n\n'+String(r.warn).replace(/ \| /g,'\n'))}
function infTxtSend(kind,o,what){
  setStat(what+': escribiendo en el Informe...');
  if(cli()){
    var b={q:o.q};if(kind==='ct'){b.t=o.t.join('');b.serie=o.serie;b.color=o.color}
    afCliReq(kind,b,function(r,err){infTxtFin(r||{ok:false,err:err||'sin respuesta',warn:'',row:0},what)},180000,'El servidor no respondio. NO se sabe si se escribio: revisa la hoja INFORME antes de repetir.');return}
  jobRun(function(){jobInfTxt(kind,o,function(r){r.warn=r.warn.join(' | ');infTxtFin(r,what)})})}
function srvInfTxt(m){
  if(!m.id||SEEN[m.id])return;SEEN[m.id]=1;
  if(DUP||!claimTx(m.id))return;
  CFG.nt.since=NT.since;cfgSave();
  var by=String(m.n||'cliente').substring(0,20),kind=m.k,q=m.q,t=[],i,o,err='',tt=String(m.t||''),nq=kind==='fn'?6:8;
  function no(msg){ntPub('st',{k:'cz',id:m.id,ok:false,err:msg,warn:'',row:0});regMsg('['+esc(by)+'] '+(kind==='fn'?'FNN':'cartas')+' rechazado: '+esc(msg),'dn')}
  if(m._t&&new Date().getTime()/1000-m._t>300){no('la solicitud llego con mas de 5 minutos de retraso y no se aplico; repite la captura');return}
  if(!q||q.length!==nq){no('cantidades invalidas');return}
  for(i=0;i<nq;i++)if(typeof q[i]!=='number'||q[i]!==Math.floor(q[i])||q[i]<0||q[i]>99999){no('cantidad invalida');return}
  if(kind==='ct'){
    if(!/^[ZM]{4}$/.test(tt)){no('tipo (zapatos/mazos) invalido');return}
    for(i=0;i<4;i++)t.push(tt.charAt(i));
    if(typeof m.serie!=='string'||!/^[A-Za-z0-9\-]{0,20}$/.test(m.serie)){no('serie invalida');return}
    if(typeof m.color!=='string'||!new RegExp('^['+LET+' ]{0,30}$').test(m.color)){no('color invalido');return}}
  o={q:q,t:t,serie:m.serie||'',color:m.color||''};
  regMsg('['+esc(by)+'] '+(kind==='fn'?'FNN':'cartas')+': escribiendo en el Informe...','');
  jobRun(function(){jobInfTxt(kind,o,function(r){
    ntPub('st',{k:'cz',id:m.id,ok:r.ok,err:String(r.err||'').substring(0,250),warn:r.warn.join(' | ').substring(0,250),row:r.row,serie:r.serie,color:r.color});
    regMsg('['+esc(by)+'] '+(kind==='fn'?'FNN':'cartas')+': '+(r.ok?'escrito en el Informe':'NO se escribio ('+esc(r.err)+')'),r.ok?'up':'dn')})})}

function parseCartas(raw){
  var q=[-1,-1,-1,-1,-1,-1,-1,-1],t=['','','',''],n=0,m,se='',co='',
      g=[/(\d+)\s+(zapatos|mazos)\s+color\s+rojo\s+y\s+(\d+)\s+(?:zapatos|mazos)\s+color\s+azul\s+para\s+MB/i,
         /(\d+)\s+(zapatos|mazos)\s+color\s+rojo\s+y\s+(\d+)\s+(?:zapatos|mazos)\s+color\s+azul\s+para\s+BJ/i,
         /(\d+)\s+(zapatos|mazos)\s+color\s+rojo\s+de\s+pl\S*\s*,?\s*(\d+)\s+(?:zapatos|mazos)\s+color\s+azul\s+de\s+pl/i,
         /(\d+)\s+(zapatos|mazos)\s+azules\s+y\s+(\d+)\s+(?:zapatos|mazos)\s+rojos/i],i;
  for(i=0;i<4;i++){m=g[i].exec(raw);if(m){q[i*2]=parseInt(m[1],10);q[i*2+1]=parseInt(m[3],10);t[i]=/mazos/i.test(m[2])?'M':'Z';n++}}
  m=/Serie\s*:?\s*#?\s*([^\s,;]+)[\s\S]*?Color\s*:?\s*([^.\r\n]+)/i.exec(raw);
  if(m){se=String(m[1]).replace(/\.+$/,'').replace(/^#+/,'');co=String(m[2]).replace(/^\s+|\s+$/g,'');if(/^x+$/i.test(se)||/^x+$/i.test(co)){se='';co=''}else n++}
  return n?{q:q,t:t,serie:se,color:co}:null}
function jobInfRead(cb){
  var xl=null,res={ok:false,err:'',fn:null,ct:null,fr:0,cr:0},pi=rp('inf'),ob,ws,v,r3,i,raw,t,x;
  try{
    if(!pi)throw new Error('falta la ruta del Informe (Conexion y archivos)');if(!fso.FileExists(pi))throw new Error('no encuentro '+pi);
    xl=xlStart();ob=openBook(xl,pi,false);
    try{
      ws=findSheet(ob.wb,'INFORME');v=rr(ws,'D1:D400');
      r3=infFila(v,'SE INICIA PRESENTACION DE BANCAS',false);
      if(r3<0)throw new Error('no encuentro "Se inicia presentacion de Bancas" en la columna D de INFORME');
      for(i=0;i<=r3-2;i++){raw=v[i][0];if(typeof raw!=='string')continue;t=nkey(raw);
        if(!res.ct&&t.indexOf('DEALER PRESENTA')>=0&&t.indexOf('JUEGO DE DADOS')>=0){x=parseCartas(raw);if(x){res.ct=x;res.cr=i+1}}}
    }finally{closeBk(ob)}
    res.ok=true
  }catch(ex){res.err=ex.message}
  finally{xlQuit(xl)}
  cb(res)}
function infLeerReq(cb){
  if(cli()){afCliReq('fq',{},function(r,err){cb(r&&r.ok?r:{ok:false,err:(r&&r.err)||err||'sin respuesta'})},120000,'El servidor no respondio.');return}
  jobRun(function(){jobInfRead(cb)})}
function srvInfQ(m){
  if(DUP||!m.id||SEEN[m.id])return;SEEN[m.id]=1;CFG.nt.since=NT.since;cfgSave();
  if(m._t&&new Date().getTime()/1000-m._t>120)return;
  jobRun(function(){jobInfRead(function(r){
    ntPub('st',{k:'cz',id:m.id,ok:r.ok,err:String(r.err||'').substring(0,200),fn:r.fn,ct:r.ct,fr:r.fr,cr:r.cr})})})}
function ctFill(r){
  if(!ovShown('mCt'))return;
  if(!r.ok){$('ctMsg').innerHTML='<span class="dn">No pude leer la serie y el color de la manana: '+esc(r.err)+'. Escribelos a mano.</span>';return}
  var c=r.ct;
  if(!c||!c.serie||!c.color){$('ctMsg').innerHTML='<span class="dn">No encontre arriba la serie y el color de los dados. Escribelos a mano.</span>';return}
  if($('ctSe').value==='')$('ctSe').value=c.serie;
  if($('ctCo').value==='')$('ctCo').value=c.color;
  ctPv();
  $('ctMsg').innerHTML='<span class="up">Serie y color de los dados cargados de la manana (fila '+r.cr+' del INFORME). Puedes cambiarlos.</span>'}

/* ================= Cajas: corte de caja ================= */
var CJ={inf:null};
function cjL(k){var c=CI();if(!c[k])c[k]=[];return c[k]}
function cjAmt(t){t=String(t).replace(/[\s$,]/g,'');if(!/^[+-]?\d{1,7}(\.\d{1,2})?$/.test(t))return null;return parseFloat(t)}
function cjRsClean(el){var q=el.value.replace(/[^0-9.+\-$,]/g,'');if(q!==el.value)el.value=q}
function txtCajas(inf,r,ji){
  var rs=(r===0)?'$0 faltante':(r<0?'$-'+cmX(-r)+' faltante':'$'+cmX(r)+' sobrante');
  return 'Jefe de Cajas  realiza el cierre y corte de Caja de J. V.  '+(inf?'Informa: '+ji+'  '+rs:'Informa: No Informa')+'  y propina $0.'}
function cajasOpen(){
  if(busy||ovOpen())return;
  CJ.inf=null;$('cjMsg').innerHTML='';cjRender();$('mCj').style.display='flex'}
function cjClose(){$('mCj').style.display='none';regFocus()}
function cjPick(v){CJ.inf=v;$('cjMsg').innerHTML='';cjRender()}
function cjBack(){CJ.inf=null;$('cjMsg').innerHTML='';cjRender()}
function cjRender(){
  var c=CI(),h;
  if(CJ.inf===null){
    $('cjGoB').style.display='none';
    $('cjB').innerHTML='<span class="cfl" style="font-size:1.125rem">&iquest;Te informaron el resultado de la caja?</span><div class="f" style="margin-top:0.75rem"><span class="b p" style="font-size:1.25rem;padding:0.625rem 2rem" onclick="cjPick(true)">Si (S)</span><span class="b" style="font-size:1.25rem;padding:0.625rem 2rem" onclick="cjPick(false)">No (N)</span></div>';
    return}
  h='<div id="cjF" onkeyup="cjPv()" onchange="cjPv()"><div class="f"><span class="b" onclick="cjBack()">&larr; Cambiar respuesta</span><b>'+(CJ.inf?'Si me informaron':'No me informaron')+'</b></div>'+
    (CJ.inf?ciSel('cjCj','Cajero',cjL('cj'),c.lcj||''):'');
  if(CJ.inf)h+=ciSel('cjJi','Informa (quien informa)',cjL('ji'),c.lji||'')+
    '<span class="cfl">Resultado de la caja ($): positivo = sobrante, negativo = faltante, 0 = normal</span><div class="f"><input id="cjRs" class="cfi" type="text" autocomplete="off" maxlength="10" value="0" style="width:10rem;font-size:1.25rem;font-weight:700;text-align:center" oninput="cjRsClean(this)"></div>';
  h+='<span class="cfl">Asi quedara en el INFORME</span><div id="cjPv" style="background:#0c1d19;border:1px solid #2a5246;border-radius:0.375rem;padding:0.5rem;font-weight:700"></div></div>';
  $('cjB').innerHTML=h;$('cjGoB').style.display='';cjPv();
  try{$('cjCj').focus()}catch(e){}}
function cjVals(){var r=CJ.inf?cjAmt($('cjRs').value):0;return{inf:CJ.inf,cj:CJ.inf?ciVal('cjCj'):'',ji:CJ.inf?ciVal('cjJi'):'',res:r}}
function cjPv(){if(!ovShown('mCj')||CJ.inf===null||!$('cjPv'))return;var v=cjVals();
  $('cjPv').innerHTML=esc(txtCajas(v.inf,v.res===null?0:v.res,v.ji||'...')+(v.inf?'   [Cajero: '+(v.cj||'...')+']':''))}
function cjGo(){
  var v=cjVals(),c=CI();
  if(CJ.inf===null)return;
  if(v.inf&&nkey(v.cj).length<2){$('cjMsg').innerHTML='<span class="dn">Falta el nombre del cajero.</span>';return}
  if(v.inf&&nkey(v.ji).length<2){$('cjMsg').innerHTML='<span class="dn">Falta el nombre de quien informa.</span>';return}
  if(v.res===null){$('cjMsg').innerHTML='<span class="dn">El resultado no es valido (ej. 0, -100 o 250.50).</span>';return}
  if(v.inf){ciAddName(cjL('cj'),v.cj);c.lcj=v.cj;ciAddName(cjL('ji'),v.ji);c.lji=v.ji}
  cfgSave();if(srv())pubCfg();
  $('mCj').style.display='none';
  cajasSend({inf:v.inf,res:v.res,cj:v.cj,ji:v.ji})}
function cajasSend(o){
  setStat('Cajas: escribiendo en el Informe...');
  if(cli()){afCliReq('cj',{inf:o.inf,res:o.res,cj:o.cj,ji:o.ji},function(r,err){infTxtFin(r||{ok:false,err:err||'sin respuesta',warn:'',row:0},'Cajas')},180000,'El servidor no respondio. NO se sabe si se escribio: revisa la hoja INFORME antes de repetir.');return}
  jobRun(function(){jobCajas(o,function(r){r.warn=r.warn.join(' | ');infTxtFin(r,'Cajas')})})}
function jobCajas(o,cb){
  var xl=null,res={ok:false,err:'',warn:[],row:0,txt:''},pi=rp('inf'),wrote=false,now=new Date(),hora=horaAmPm(now),hPrev=horaAmPm(new Date(now.getTime()-300000)),
      ob,wb,ws,v,r3,row,top,c,h,ec,fc,p,txt,cj;
  try{
    if(!pi)throw new Error('falta la ruta del Informe (Conexion y archivos)');if(!fso.FileExists(pi))throw new Error('no encuentro '+pi);
    xl=xlStart();ob=openBook(xl,pi,true);wb=ob.wb;
    try{
      if(wb.ReadOnly)throw new Error('el Informe esta abierto como solo lectura (otro equipo o una copia oculta de Excel); cierra Excel en el servidor y reintenta');
      ws=findSheet(wb,'INFORME');v=rr(ws,'D1:D400');
      r3=infFila(v,'SE INICIA PRESENTACION DE BANCAS',false);
      if(r3<0)throw new Error('no encuentro en la columna D de INFORME la fila "Se inicia presentacion de Bancas" (desde ahi se busca; no se escribio nada)');
      row=infBusca(v,'JEFE DE CAJAS REALIZA',r3,400);
      if(row<0)throw new Error('no encuentro la fila "Jefe de Cajas realiza el cierre y corte de Caja" debajo de "Se inicia presentacion de Bancas"; no se escribio nada');
      txt=txtCajas(o.inf,o.res,o.ji);cj='Cajero: '+o.cj;
      top=ws.Cells(row,4).MergeArea.Row;
      ec=ws.Cells(row,5).MergeArea.Cells(1,1);fc=ws.Cells(row,6).MergeArea.Cells(1,1);
      if(nkey(String(ec.Value2||'')).indexOf('CAJERO')<0&&nkey(String(fc.Value2||'')).indexOf('CAJERO')>=0)ec=fc;
      wrote=true;
      infPonTxt(ws,row,txt,hora);
      if(o.inf){ec.Value=cj;
        if(String(ec.Value2||'')!==cj)throw new Error('no quedo escrito el cajero en la fila '+row+' de INFORME (hoja protegida?)')}
      if(top-1>=r3){p=ws.Cells(top-1,7).MergeArea.Cells(1,1);p.NumberFormat='@';p.Value=hPrev}
      else res.warn.push('no hay renglon anterior para ponerle la hora de 5 minutos antes');
      res.txt=txt;res.row=row;
      ob.app.Calculate();wb.Save()
    }finally{closeBk(ob)}
    res.ok=true
  }catch(ex){res.err=ex.message}
  finally{xlQuit(xl)}
  if(res.err&&wrote)res.err='REVISA EL INFORME: puede haberse escrito parte del renglon y fallo despues ('+res.err+')';
  if(res.err&&!wrote&&/solo lectura/i.test(res.err)&&!jobCajas.rty){jobCajas.rty=1;if(killOrphans()>0){jobCajas(o,cb);return}}
  jobCajas.rty=0;
  cb(res)}
function srvCajas(m){
  if(!m.id||SEEN[m.id])return;SEEN[m.id]=1;
  if(DUP||!claimTx(m.id))return;
  CFG.nt.since=NT.since;cfgSave();
  var by=String(m.n||'cliente').substring(0,20),okN=function(x){return typeof x==='string'&&x.length>=2&&x.length<=40&&new RegExp('^'+LETRE+'+$').test(x)},o;
  function no(msg){ntPub('st',{k:'cz',id:m.id,ok:false,err:msg,warn:'',row:0});regMsg('['+esc(by)+'] cajas rechazado: '+esc(msg),'dn')}
  if(m._t&&new Date().getTime()/1000-m._t>300){no('la solicitud llego con mas de 5 minutos de retraso y no se aplico; repite la captura');return}
  if(typeof m.inf!=='boolean'){no('dato invalido');return}
  if(m.inf&&!okN(m.cj)){no('cajero invalido');return}
  if(m.inf&&!okN(m.ji)){no('nombre de quien informa invalido');return}
  if(typeof m.res!=='number'||m.res!==m.res||Math.abs(m.res)>9999999||Math.abs(m.res*100-Math.round(m.res*100))>0.000001){no('resultado invalido');return}
  o={inf:m.inf,res:m.inf?m.res:0,cj:m.inf?m.cj:'',ji:m.inf?m.ji:''};
  regMsg('['+esc(by)+'] cajas: escribiendo en el Informe...','');
  jobRun(function(){jobCajas(o,function(r){
    ntPub('st',{k:'cz',id:m.id,ok:r.ok,err:String(r.err||'').substring(0,250),warn:r.warn.join(' | ').substring(0,250),row:r.row});
    regMsg('['+esc(by)+'] cajas: '+(r.ok?'escrito en el Informe':'NO se escribio ('+esc(r.err)+')'),r.ok?'up':'dn')})})}
document.addEventListener('keydown',function(e){
  if(!ovShown('mCj'))return;
  var k=e.keyCode,tg=e.target||e.srcElement,ids,i;
  if(k===27){e.preventDefault();e.stopPropagation();cjClose();return}
  if(CJ.inf===null){
    if(k===83||k===49||k===97){e.preventDefault();e.stopPropagation();cjPick(true)}
    else if(k===78||k===50||k===98){e.preventDefault();e.stopPropagation();cjPick(false)}
    return}
  if(k===13&&(!tg||tg.tagName!=='SELECT')){e.preventDefault();e.stopPropagation();
    ids=CJ.inf?['cjCjN','cjJiN','cjRs']:['cjCjN'];i=ids.indexOf(tg&&tg.id);
    if(i>=0&&i<ids.length-1){try{$(ids[i+1]).focus()}catch(x){}}else cjGo()}},true);

function inRow(id,lab,w){return '<div style="margin-right:0.625rem;margin-bottom:0.5rem"><span class="cfl">'+lab+'</span><input id="'+id+'" class="cfi" type="text" autocomplete="off" maxlength="5" style="width:'+w+';font-size:1.25rem;font-weight:700;text-align:center" oninput="itDig(this);fnnPv();ctPv()"></div>'}
function fnnOpen(){
  if(busy||ovOpen())return;
  var h='<div class="f" style="flex-wrap:wrap;align-items:flex-end">',i;
  for(i=0;i<6;i++)h+=inRow('fn'+i,FNN_D[i],'6.5rem');
  $('fnB').innerHTML=h+'</div>';$('fnMsg').innerHTML='';fnnPv();
  $('mFn').style.display='flex';try{$('fn0').focus()}catch(e){}}
function fnnVals(){var q=[],i,n;for(i=0;i<6;i++){n=itNum('fn'+i);q.push(n)}return q}
function fnnPv(){if(!ovShown('mFn'))return;var q=fnnVals(),i,a=[];for(i=0;i<6;i++)a.push(q[i]<0?'XX':q[i]);$('fnPv').innerHTML=esc(txtFnn(a))}
function fnnClose(){$('mFn').style.display='none';regFocus()}
function fnnGo(){
  var q=fnnVals(),i;
  for(i=0;i<6;i++)if(q[i]<0){$('fnMsg').innerHTML='<span class="dn">Falta la cantidad de '+FNN_D[i]+' (escribe 0 si no hay).</span>';try{$('fn'+i).focus()}catch(e){}return}
  $('mFn').style.display='none';
  infTxtSend('fn',{q:q},'Fichas no negociables')}

function ctRow(i,lab,a,b,la,lb){
  return '<div class="f" style="align-items:flex-end;flex-wrap:wrap"><div style="margin-right:0.625rem;margin-bottom:0.5rem"><span class="cfl">'+lab+'</span><select id="ctT'+i+'" class="cfi" style="width:9rem;font-size:1.125rem" onchange="ctPv()"><option value="Z"'+(CT_G[i].d==='Z'?' selected':'')+'>Zapatos</option><option value="M"'+(CT_G[i].d==='M'?' selected':'')+'>Mazos</option></select></div>'+
    inRow('ct'+a,la||'Rojo','6rem')+inRow('ct'+b,lb||'Azul','6rem')+'</div>'}
function cartasOpen(){
  if(busy||ovOpen())return;
  var h=ctRow(0,'MB',0,1)+ctRow(1,'BJ',2,3)+ctRow(2,'De plastico',4,5)+ctRow(3,'Para destruccion',6,7,'Azul','Rojo')+
    '<div class="f" style="align-items:flex-end;flex-wrap:wrap"><div style="margin-right:0.625rem"><span class="cfl">Serie de dados (vacio = automatica)</span><input id="ctSe" class="cfi" type="text" autocomplete="off" maxlength="20" style="width:12rem;font-size:1.125rem" oninput="var c=this.value.replace(/[^A-Za-z0-9\\-]/g,\'\');if(c!==this.value)this.value=c;ctPv()"></div>'+
    '<div><span class="cfl">Color de dados (vacio = automatico)</span><input id="ctCo" class="cfi" type="text" autocomplete="off" maxlength="30" style="width:12rem;font-size:1.125rem" oninput="var c=cleanTxt(this.value);if(c!==this.value)this.value=c;ctPv()"></div></div>';
  $('ctB').innerHTML=h;$('ctMsg').innerHTML='';ctPv();
  $('mCt').style.display='flex';try{$('ct0').focus()}catch(e){}
  $('ctMsg').innerHTML='<span class="hint">Leyendo la serie y el color de la manana en el INFORME...</span>';infLeerReq(ctFill)}
function ctQ(){var q=[],i;for(i=0;i<8;i++)q.push(itNum('ct'+i));return q}
function ctT(){var t=[],i;for(i=0;i<4;i++)t.push($('ctT'+i).value==='M'?'M':'Z');return t}
function ctPv(){if(!ovShown('mCt'))return;var q=ctQ(),i,a=[],se=$('ctSe').value,co=proper(cleanTxt($('ctCo').value).replace(/ $/,''));
  for(i=0;i<8;i++)a.push(q[i]<0?'XX':q[i]);
  $('ctPv').innerHTML=esc(txtCartas(a,ctT(),se||'(auto)',co||'(auto)'))}
function ctClose(){$('mCt').style.display='none';regFocus()}
function ctGo(){
  var q=ctQ(),i,nm8=['MB rojo','MB azul','BJ rojo','BJ azul','plastico rojo','plastico azul','destruccion azules','destruccion rojos'],se=$('ctSe').value,co=proper(cleanTxt($('ctCo').value).replace(/ $/,''));
  for(i=0;i<8;i++)if(q[i]<0){$('ctMsg').innerHTML='<span class="dn">Falta la cantidad de '+nm8[i]+' (escribe 0 si no hay).</span>';try{$('ct'+i).focus()}catch(e){}return}
  if(co&&(co.length<2||co.length>30)){$('ctMsg').innerHTML='<span class="dn">El color no es valido.</span>';return}
  $('mCt').style.display='none';
  infTxtSend('ct',{q:q,t:ctT(),serie:se,color:co},'Cartas')}

document.addEventListener('keydown',function(e){
  var k=e.keyCode,tg=e.target||e.srcElement,fn=ovShown('mFn'),ct=ovShown('mCt'),ids,i,id;
  if(!fn&&!ct)return;
  if(k===27){e.preventDefault();e.stopPropagation();if(fn)fnnClose();else ctClose();return}
  if(k!==13||(tg&&tg.tagName==='SELECT'))return;
  e.preventDefault();e.stopPropagation();
  if(fn){ids=['fn0','fn1','fn2','fn3','fn4','fn5'];id=tg&&tg.id;i=ids.indexOf(id);
    if(i>=0&&i<ids.length-1){try{$(ids[i+1]).focus()}catch(x){}}else fnnGo()}
  else{ids=['ct0','ct1','ct2','ct3','ct4','ct5','ct6','ct7','ctSe','ctCo'];id=tg&&tg.id;i=ids.indexOf(id);
    if(i>=0&&i<ids.length-1){try{$(ids[i+1]).focus()}catch(x){}}else ctGo()}},true);

function cierreFin(r){
  setStat('');
  if(!r.ok){
    if(/^REVISA/.test(r.err||'')){alert(r.err);return}
    if(!confirm('No se pudieron escribir los comentarios en el Informe:\n\n'+r.err+'\n\nAbrir de todos modos el correo?'))return;
    cierreGo(r.f||fmtF(FE),'');return}
  var nov=typeof r.nov==='string'?(r.nov?r.nov.split('\n'):[]):(r.nov||[]);
  cierreGo(r.f||fmtF(FE),r.warn,r.oper,nov,!!r.nvok)}
function cierreGo(f,warn,oper,nov,nvok){
  var asu='DATOS AL CIERRE '+f+', CASINO CAPRI CIRCUNVALACI\u00d3N',
      cu=['Buen dia.','','Les hago env\u00edo de los datos de cierre correspondientes al dia operativo '+f+'.','','Banco de Fichas.','Depuraci\u00f3n de tarjetas.','Devoluciones.','Fill y Credit.','Jackpot.','Propinas J.V.','Rating Card.','','Saludos.'].join('\r\n'),
      url='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(CIERRE_TO.join(','))+'&su='+encodeURIComponent(asu)+'&body='+encodeURIComponent(cu);
  try{new ActiveXObject('WScript.Shell').Run(url)}
  catch(ex){alert('No pude abrir el navegador: '+ex.message);return}
  if(nvok){
    var url2='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(PARTE_TO.join(','))+'&su='+encodeURIComponent('PARTE INFORMATIVO '+f+' CASINO CAPRI, GUADALAJARA')+'&body='+encodeURIComponent(parteCuerpo(f,nov));
    setTimeout(function(){try{new ActiveXObject('WScript.Shell').Run(url2)}catch(ex){alert('No pude abrir el correo del parte informativo: '+ex.message)}},1500)}
  note('Cierre: comentarios escritos en el INFORME'+(oper?' ('+esc(oper)+')':'')+' y correo abierto en Gmail ('+esc(f)+')'+(nvok?' + parte informativo ('+nov.length+' novedad(es) en rojo)':'')+'.'+(warn?' <span class="dn">Aviso: '+esc(warn)+'</span>':''),warn?'dn':'up');
  if(warn)alert('Avisos del cierre:\n\n'+String(warn).replace(/ \| /g,'\n'))}
function srvCierre(m){
  if(!m.id||SEEN[m.id])return;SEEN[m.id]=1;
  if(DUP||!claimTx(m.id))return;
  CFG.nt.since=NT.since;cfgSave();
  var by=String(m.n||'cliente').substring(0,20);
  if(m._t&&new Date().getTime()/1000-m._t>300){ntPub('st',{k:'cz',id:m.id,ok:false,err:'la solicitud llego con mas de 5 minutos de retraso y no se aplico; repite el cierre',warn:'',f:''});return}
  var err=ciCheck(m),o;
  if(err){ntPub('st',{k:'cz',id:m.id,ok:false,err:err,warn:'',f:''});regMsg('['+esc(by)+'] cierre rechazado: '+esc(err),'dn');return}
  o={pit:m.pit,sb:m.sb,dl:m.dl,hp:m.hp,hc:m.hc,op:m.op};
  ciAddName(RG().pit,o.pit);ciAddName(CI().sb,o.sb);ciAddName(CI().dl,o.dl);cfgSave();pubCfg();
  regMsg('['+esc(by)+'] cierre: escribiendo comentarios en el Informe...','');
  jobRun(function(){jobCierre(function(r){
    var nv=(r.nov||[]).join('\n');
    if(nv.length>2800){nv=nv.substring(0,2800);r.warn.push('las novedades en rojo son muy largas y se recortaron en el parte: revisalo antes de enviar')}
    ntPub('st',{k:'cz',id:m.id,ok:r.ok,err:String(r.err||'').substring(0,250),warn:r.warn.join(' | ').substring(0,250),f:r.f||'',oper:String(r.oper||'').substring(0,200),nov:nv,nvok:!!r.nvok});
    regMsg('['+esc(by)+'] cierre: '+(r.ok?'comentarios escritos en el Informe':'NO se escribieron ('+esc(r.err)+')'),r.ok?'up':'dn')},o)})}

/* ---- monitorista ---- */
function monOpen(first){
  RS.monFirst=!!first;var m=RG().mon,l=RG().monl,h='',i;
  $('mnV').value=m;
  for(i=0;i<l.length&&i<8;i++)h+='<span class="b" onclick="monSet('+i+')">'+esc(l[i])+'</span> ';
  $('mnL').innerHTML=h?'<div class="hint">Usados antes:</div><div style="margin-bottom:0.5rem">'+h+'</div>':'';
  $('mnX').style.display=(first&&!m)?'none':'';
  $('mMon').style.display='flex';$('mnV').focus();$('mnV').select()}
function monSet(i){$('mnV').value=RG().monl[i];monOk()}
function monOk(){
  var v=proper(cleanMon($('mnV').value).replace(/\/+/g,'/').replace(/^\/|\/$/g,'')),l=RG().monl,i;
  if(nkey(v).length<2)return;
  RG().mon=v;for(i=l.length-1;i>=0;i--)if(l[i]===v)l.splice(i,1);l.unshift(v);if(l.length>8)l.length=8;
  cfgSave();$('mMon').style.display='none';regRender();regFocus()}
function monClose(){$('mMon').style.display='none';regFocus()}
function cleanMon(v){return String(v).replace(new RegExp('[^'+LET+' \\/]','g'),'').replace(/ {2,}/g,' ').replace(/^ /,'')}

/* ---- configuracion del registro ---- */
function regCfgOpen(){var g=RG();
  if(cli()){alert('La configuracion del registro (mesas, pit bosses, montos) se cambia en la PC servidor y se copia sola a todas.');return}
  $('cfMi').value=g.mi;$('cfMr').value=g.mr;$('cfMe').value=g.mesas.join('\n');$('cfPi').value=g.pit.join('\n');$('cfIg').value=g.ign.join('\n');$('cfLim').value=g.lim;$('cfAf').value=g.af;$('cfCiD').value=CI().dl.join('\n');$('cfCiS').value=CI().sb.join('\n');$('cfCiO').value=CI().opr;dvCfgFill();
  $('mRC').style.display='flex'}
function regCfgClose(){$('mRC').style.display='none';regFocus()}
function lines(s){var a=String(s).split(/\r?\n/),o=[],i,t;for(i=0;i<a.length;i++){t=a[i].replace(/^\s+|\s+$/g,'');if(t)o.push(t)}return o}
function regCfgSave(){if(!dvCfgRead())return;var g=RG(),mi=parseInt(String($('cfMi').value).replace(/[^0-9]/g,''),10),mr=parseInt(String($('cfMr').value).replace(/[^0-9]/g,''),10),me=lines($('cfMe').value),pi=lines($('cfPi').value);
  if(!mi||!mr||!me.length||!pi.length){alert('Revisa los montos minimos y que haya al menos una mesa y un Sup. / Pit Boss.');return}
  g.mi=mi;g.mr=mr;g.mesas=me;g.pit=pi;g.ign=lines($('cfIg').value);g.lim=parseInt(String($('cfLim').value).replace(/[^0-9]/g,''),10)||20000;g.af=String($('cfAf').value).replace(/^\s+|\s+$/g,'');CI().dl=lines($('cfCiD').value);CI().sb=lines($('cfCiS').value);CI().opr=String($('cfCiO').value).replace(/^\s+|\s+$/g,'');cfgSave();pubCfg();regCfgClose();regRender()}

/* ---- Score / Cierre para WhatsApp ---- */
function mS(n){return (n<0?'-':'')+m0(Math.abs(n))}
function note(t,c){if(VIEW==='reg')regMsg(t,c);else setStat(t)}
function scoreOpen(){
  if(!cli()&&!rp('inf')){alert('Falta la ruta del Informe (Conexion y archivos).');return}
  $('scF').value='';$('scP').innerHTML='';$('mSc').style.display='flex';$('scF').focus()}
function scPrev(){var d=$('scF').value.replace(/[^0-9]/g,'');$('scP').innerHTML=d?'<span class="up">'+m0(parseInt(d,10))+'</span>':''}
function scClose(){$('mSc').style.display='none';regFocus()}
function scGo(mode){
  var f=0,d=$('scF').value.replace(/[^0-9]/g,'');
  if(mode==='S'){if(!d){$('scP').innerHTML='<span class="dn">Escribe las fichas en circulacion (0 si no hay)</span>';return}f=parseInt(d,10)}
  $('mSc').style.display='none';if(mode==='S')almScoreDone();
  if(cli()){var id=(CFG.nt.name||'cli')+'-s-'+new Date().getTime();RS.scId=id;note('Cargando... pidiendo el texto al servidor.','');
    ntPub('cmd',{k:'sc',id:id,n:CFG.nt.name,mode:mode,f:f},function(ok){if(!ok){RS.scId='';note('No se pudo contactar al servidor.','dn')}});
    setTimeout(function(){if(RS.scId===id){RS.scId='';note('El servidor no respondio.','dn')}},90000);return}
  note('Leyendo el Informe...','');
  jobRun(function(){jobScore(mode,f)})}
function readAforo(wb){
  var nmS=String(RG().af||'').replace(/^\s+|\s+$/g,'').toUpperCase(),ws=nmS?findSheet(wb,nmS):findSheet(wb,null,['AFORO']);
  var v=rr(ws,'C10:U27'),row=-1,r,c,m=0,cl=0,tb=[1,2,3,4,5,6,7,8,9,10,11,12,13,16,17],x,any,hr=new Date().getHours(),last=-1;
  function hourOf(h){var mi;if(typeof h==='number'){mi=Math.round((h-Math.floor(h))*1440);return Math.floor(mi/60)%24}
    if(typeof h==='string'){var q=/(\d{1,2})\s*:\s*(\d{2})/.exec(h);if(q)return parseInt(q[1],10)%24}
    return -1}
  for(r=0;r<v.length;r++){
    for(c=0,any=false;c<tb.length;c++)if(typeof v[r][tb[c]]==='number'&&v[r][tb[c]]>0)any=true;
    if(any)last=r;
    if(row<0&&hourOf(v[r][0])===hr)row=r}
  if(row<0)row=last;
  if(row>=0){
    for(c=0;c<tb.length;c++){x=v[row][tb[c]];if(typeof x==='number'&&x>0){m++;if(tb[c]!==14)cl+=x}}
    var q1=v[row][14],u1=v[row][18];
    if(typeof q1==='number')cl=q1+(typeof u1==='number'?u1:0)}
  return{mesas:m,clientes:cl,fila:row>=0?10+row:0}}
function topCliente(rows){
  var g=[],i,j,x,q,f;
  for(i=0;i<rows.i.length;i++){x=rows.i[i];if(!x[4]||typeof x[2]!=='number'||isIgn(String(x[4])))continue;
    q=null;for(j=0;j<g.length;j++)if(sameName(g[j].n,String(x[4]))){q=g[j];break}
    if(!q){q={n:String(x[4]),ti:0,tr:0,bm:'',bv:0};g.push(q)}
    q.ti+=x[2];if(x[2]>q.bv){q.bv=x[2];q.bm=String(x[1]||'')}}
  if(!g.length)return null;
  for(i=0;i<rows.r.length;i++){x=rows.r[i];if(!x[4]||typeof x[2]!=='number')continue;
    for(j=0;j<g.length;j++)if(sameName(g[j].n,String(x[4]))){g[j].tr+=x[2];break}}
  f=g[0];for(j=1;j<g.length;j++)if(g[j].ti>f.ti||(g[j].ti===f.ti&&g[j].tr>f.tr))f=g[j];
  return f}
function sumJL(rows){var t=0,i,x;for(i=0;i<rows.r.length;i++){x=rows.r[i];if(x[4]&&typeof x[2]!=='number'&&nkey(String(x[4]))==='JL')t+=x[2]}return t}
function topGanadores(rows,n){
  var g=[],i,j,x,q,k,nm2;
  function add(nom,v,isIn){var q2=null,z;
    for(z=0;z<g.length;z++)if(sameName(g[z].n,nom)){q2=g[z];break}
    if(!q2){q2={n:nom,ti:0,tr:0,net:0};g.push(q2)}
    if(isIn)q2.ti+=v;else q2.tr+=v}
  for(i=0;i<rows.i.length;i++){x=rows.i[i];if(!x[4]||typeof x[2]!=='number'||isIgn(String(x[4])))continue;add(String(x[4]),x[2],true)}
  for(i=0;i<rows.r.length;i++){x=rows.r[i];if(!x[4]||typeof x[2]!=='number'||isIgn(String(x[4])))continue;add(String(x[4]),x[2],false)}
  for(j=0;j<g.length;j++)g[j].net=g[j].tr-g[j].ti;
  g=g.filter(function(a){return a.net>0});
  g.sort(function(a,b){return b.net-a.net});
  return g.slice(0,n)}
function buildScore(mode,ti,tr,fichas,af,rows){
  var sc,t=[];
  if(mode==='C'){sc=ti-tr;
    t.push('Cierre de Mesas CAPRI','','*Total de Ingresos*  '+m0(ti),'*Total de Retiros*  '+m0(tr),'','*SCORE '+(sc<0?'LOSS':(sc>0?'WIN':''))+':*  '+mS(sc));
    return t.join('\n')}
  sc=ti-(tr+fichas);
  var jl=sumJL(rows),tc=topCliente(rows);
  t.push('Score mesas Capri','','Mesas activas: '+af.mesas,'Clientes en sala: '+af.clientes,'Ingresos totales: '+m0(ti),'Retiros totales: '+m0(tr),'Fichas en circulaci\u00f3n: '+m0(fichas));
  if(jl>0)t.push('JL: '+m0(jl));
  t.push('*Score:* '+mS(sc));
  if(sc<0){var gw=topGanadores(rows,3),gt=0,gi;
    if(gw.length){t.push('','Clientes que mas ganaron:');
      for(gi=0;gi<gw.length;gi++){gt+=gw[gi].net;t.push('\u2022 '+gw[gi].n+' gan\u00f3 '+m0(gw[gi].net)+' (ingres\u00f3 '+m0(gw[gi].ti)+', retir\u00f3 '+m0(gw[gi].tr)+')')}
      if(gw.length>1)t.push('Entre ellos: '+m0(gt))}
    else if(tc)t.push('','\u2022 '+tc.n+' ingres\u00f3 '+m0(tc.ti)+(tc.bm?' en '+tc.bm:'')+(tc.tr>0?', retir\u00f3 '+m0(tc.tr):''));}
  else if(tc)t.push('','\u2022 '+tc.n+' ingres\u00f3 '+m0(tc.ti)+(tc.bm?' en '+tc.bm:'')+(tc.tr>0?', retir\u00f3 '+m0(tc.tr):''));
  return t.join('\n')}
function jobScore(mode,fichas,by,id){
  var xl=null,txt='',err='',p=rp('inf');
  try{
    if(!p||!fso.FileExists(p))throw new Error('no encuentro el Informe');
    xl=xlStart();var ob=openBook(xl,p,false);
    try{
      var ws=findSheet(ob.wb,'INGRESOS Y RETIROS'),tt=totIR(ws),ti=tt.ti,tr=tt.tr,rows={i:rr(ws,'D39:J'+lastRow(ws)),r:rr(ws,'L39:R'+lastRow(ws))},af=null;
      TOT.ti=ti;TOT.tr=tr;TOT.ok=true;
      if(mode==='S')af=readAforo(ob.wb);
      txt=buildScore(mode,ti,tr,fichas,af,rows)
    }finally{closeBk(ob)}
  }catch(e){err=e.message}
  finally{xlQuit(xl)}
  regRender();if(srv()&&!err)ntPub('st',{k:'v',ti:TOT.ti,tr:TOT.tr});
  if(by!==undefined){ntPub('st',{k:'x',id:id,ok:!err,txt:txt,msg:String(err||'').substring(0,200)});return}
  if(err){note('No pude generar el texto: '+esc(err),'dn');if(/aforo/i.test(err))alert('No encuentro la hoja del reporte de aforo. Escribe su nombre en Configuracion (Hoja de aforo).');return}
  note('','');txOpen(txt)}
function txOpen(t){TXT=t;$('txA').innerText=t;$('mTx').style.display='flex'}
function txClose(){$('mTx').style.display='none';regFocus()}
function txCopy(){try{window.clipboardData.setData('Text',TXT);return true}catch(e){return false}}
function waOpen(){
  var c=txCopy(),u=encodeURIComponent(TXT),sh;
  try{sh=new ActiveXObject('WScript.Shell')}catch(e){alert('No pude abrir WhatsApp.');return}
  try{sh.Run('whatsapp://send?text='+u,1,false)}catch(e){try{sh.Run('https://wa.me/?text='+u,1,false)}catch(e2){alert('No pude abrir WhatsApp. El texto quedo copiado: pegalo con Ctrl+V.')}}
  $('mTx').style.display='none';note(c?'Texto copiado y WhatsApp abierto (si no aparece, pegalo con Ctrl+V).':'WhatsApp abierto.','up')}

/* =================== DEVOLUCIONES =================== */
var DV={nom:'',key:'',res:null,t:0,fe:0,tk:0,man:false,busy:false,wantFc:false};
function DVC(){var g=RG();
  if(!g.dv||!g.dv.tiers||!g.dv.tiers.length)g.dv={tiers:[[10000,10],[100000,12]],rd:50,days:3};
  if(!g.dv.rd)g.dv.rd=50;if(!g.dv.days)g.dv.days=3;return g.dv}
function dvMin(){var t=DVC().tiers,m=t[0][0],i;for(i=1;i<t.length;i++)if(t[i][0]<m)m=t[i][0];return m}
function dvPct(loss){var t=DVC().tiers,i,bf=-1,bp=0;
  for(i=0;i<t.length;i++)if(loss>=t[i][0]&&t[i][0]>bf){bf=t[i][0];bp=t[i][1]}
  if(bf<0){for(i=0;i<t.length;i++)if(bf<0||t[i][0]<bf){bf=t[i][0];bp=t[i][1]}}
  return bp}
function dvRound(x){var r=DVC().rd||50;return Math.round(x/r)*r}
function dvAmt(loss,pct){return dvRound(loss*pct/100)}
function rpFor(k,d){var p=CFG.pat[k];return p?p.replace(/\{MES\}/g,MES[d.getMonth()]).replace(/\{AAAA\}/g,d.getFullYear()).replace(/\{DD\}/g,pad(d.getDate())):''}
function dvPrev(k){return new Date(FE.getFullYear(),FE.getMonth(),FE.getDate()-k)}
function dvMonKey(d){return d.getFullYear()+'-'+d.getMonth()}
function dvNum(id){var s=String($(id).value).replace(',','.').replace(/[^0-9.]/g,'');return parseFloat(s)||0}
function dvParseDate(s){
  var m=/^\s*(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\s*$/.exec(String(s)),d,mo,y,x;
  if(!m)return null;d=parseInt(m[1],10);mo=parseInt(m[2],10);y=m[3]?parseInt(m[3],10):FE.getFullYear();if(y<100)y+=2000;
  x=new Date(y,mo-1,d);if(x.getFullYear()!==y||x.getMonth()!==mo-1||x.getDate()!==d)return null;
  if(!m[3]&&ser(x)>ser(FE)){y--;x=new Date(y,mo-1,d);if(x.getMonth()!==mo-1)return null}
  return x}

function dvCfgFill(){var d=DVC(),t=d.tiers.slice(0),i,a=[];
  t.sort(function(x,y){return x[0]-y[0]});
  for(i=0;i<t.length;i++)a.push(t[i][0]+'='+t[i][1]);
  $('cfDvT').value=a.join('\n');$('cfDvR').value=d.rd;$('cfDvD').value=d.days}
function dvCfgRead(){
  var l=lines($('cfDvT').value),t=[],i,m,p,rd,dy;
  for(i=0;i<l.length;i++){
    m=/^\s*([0-9][0-9., ]*)\s*[=:;]\s*([0-9]+(?:[.,][0-9]+)?)\s*%?\s*$/.exec(l[i]);
    if(!m){alert('Porcentajes de devolucion: la linea "'+l[i]+'" no es valida.\nUsa el formato  perdida=porcentaje  (ejemplo: 10000=10).');return false}
    p=parseFloat(m[2].replace(',','.'));
    if(!(p>0&&p<=100)){alert('Porcentajes de devolucion: el porcentaje de "'+l[i]+'" debe estar entre 1 y 100.');return false}
    t.push([parseInt(m[1].replace(/[^0-9]/g,''),10),p])}
  if(!t.length){alert('Escribe al menos un escalon de devolucion (ejemplo: 10000=10).');return false}
  rd=parseInt(String($('cfDvR').value).replace(/[^0-9]/g,''),10)||50;
  dy=parseInt(String($('cfDvD').value).replace(/[^0-9]/g,''),10)||3;if(dy<1)dy=1;if(dy>10)dy=10;
  var g=DVC();g.tiers=t;g.rd=rd;g.days=dy;return true}

function dvClear(){DV.nom='';DV.key='';DV.res=null;DV.tk++;DV.rid='';DV.wantFc=false;DV.wantOpen=false;
  if($('dvBox')){$('dvBox').style.display='none';$('dvBox').innerHTML=''}if($('dvAm'))$('dvAm').innerHTML=''}
function dvLookup(nom,force){
  var key=nkey(nom),now=new Date().getTime(),tk;
  if(!force&&DV.res&&!DV.res.wait&&DV.key===key&&now-DV.t<45000&&DV.fe===ser(FE)){dvDraw();return}
  DV.nom=nom;DV.key=key;DV.res=null;DV.tk++;tk=DV.tk;
  if(cli()){
    if(!CFG.nt.room){DV.res={err:'Falta el codigo de sala (Conexion...).'};dvDraw();return}
    DV.res={wait:true};dvDraw();dvCliAsk(nom);return}
  if(!rp('rc')){DV.res={err:'Falta la ruta del Rating Card (Conexion y archivos).'};dvDraw();return}
  DV.res={wait:true};dvDraw();
  jobRun(function(){dvJobLookup(nom,tk)})}
function dvFindCard(ws,nom){
  var cols=[2,10,18],nv=[],b,k,t,rw;
  for(b=0;b<3;b++)nv.push(rr(ws,colName(cols[b])+'5:'+colName(cols[b])+'5605'));
  for(k=0;k<160;k++)for(b=0;b<3;b++){rw=nv[b][k*35];t=rw?rw[0]:null;
    if(t!==null&&t!==undefined&&String(t).replace(/^\s+|\s+$/g,'')!==''&&sameName(String(t),nom))return{f:5+k*35,c:cols[b],nm:String(t)}}
  return null}
function dvReadCard(wb,nom,d){
  var ws=findSheet(wb,'DETALLE'),card=dvFindCard(ws,nom),v,days=[],i,row,x;
  if(!card)return{found:false,month:d.getMonth(),year:d.getFullYear()};
  v=rr(ws,colName(card.c+1)+(card.f+2)+':'+colName(card.c+5)+(card.f+32));
  for(i=0;i<31;i++){row=v[i]||[];x={d:i+1,ing:nm(row[0]),ret:nm(row[1]),res:0,dev:nm(row[4])};x.res=x.ret-x.ing;days.push(x)}
  return{found:true,name:card.nm,days:days,dm:new Date(d.getFullYear(),d.getMonth()+1,0).getDate(),month:d.getMonth(),year:d.getFullYear()}}
function dvReadLibro(xl,res,order,need){
  var p=rp('dev'),ob=null,i,d,ws,v,r,out=[],seen={},sn;
  if(!p){res.libroErr='falta la ruta del libro de devoluciones (Conexion y archivos): se usa solo la ficha del Rating Card';return}
  try{
    if(!fso.FileExists(p))throw new Error('no encuentro el libro de devoluciones ('+p+')');
    ob=openBook(xl,p,false);
    for(i=0;i<order.length;i++){d=need[order[i]];sn=MES[d.getMonth()];if(seen[sn])continue;seen[sn]=1;
      try{ws=findSheet(ob.wb,sn);v=rr(ws,'B5:L1004')}catch(e){continue}
      for(r=0;r<v.length;r++)if(!isEmp(v[r][3])&&typeof v[r][2]==='number'&&sameName(String(v[r][3]),res.nom))
        out.push({fp:v[r][2],fe:(typeof v[r][0]==='number'?v[r][0]:0),monto:nm(v[r][6])})}
    res.libro=out
  }catch(e){res.libroErr=e.message}
  finally{if(ob)closeBk(ob)}}
function dvCollect(nom){
  var xl=null,res={nom:nom,cards:{},fe:ser(FE)},i,d,mk,need={},order=[],p,ob,n=DVC().days;
  need[dvMonKey(FE)]=FE;order.push(dvMonKey(FE));
  for(i=1;i<=n;i++){d=dvPrev(i);mk=dvMonKey(d);if(!need[mk]){need[mk]=d;order.push(mk)}}
  try{
    xl=xlStart();
    for(i=0;i<order.length;i++){mk=order[i];d=need[mk];p=rpFor('rc',d);ob=null;
      try{
        if(!p||!fso.FileExists(p))throw new Error('no encuentro el Rating Card de '+MES[d.getMonth()]+' ('+p+')');
        ob=openBook(xl,p,false);
        res.cards[mk]=dvReadCard(ob.wb,nom,d)
      }catch(e){res.cards[mk]={err:e.message}}
      finally{if(ob)closeBk(ob)}}
    dvReadLibro(xl,res,order,need);
  }catch(e){res.err=e.message}
  finally{xlQuit(xl)}
  return res}
function dvJobLookup(nom,tk){
  if(tk!==DV.tk)return;
  var res=dvCollect(nom);
  if(tk!==DV.tk)return;
  dvBuild(res);DV.res=res;DV.t=new Date().getTime();DV.fe=res.fe;
  dvDraw();
  if(DV.wantFc){DV.wantFc=false;fcShow()}
  if(DV.wantOpen){DV.wantOpen=false;regMsg('','');dvOpen()}}
function dvBuild(res){
  var n=DVC().days,mn=dvMin(),i,j,k,d,c,x,dd,rows=[],dels=[],lb=res.libro||[],lm;
  for(i=0;i<=n;i++){d=dvPrev(i);c=res.cards[dvMonKey(d)];
    if(c&&c.found){dd=c.days[d.getDate()-1];if(dd.dev>0)dels.push({s:ser(d),rem:dd.dev})}}
  for(j=0;j<lb.length;j++)for(k=0;k<dels.length;k++)if(dels[k].s===lb[j].fe&&dels[k].rem>0){dels[k].rem=Math.max(0,dels[k].rem-lb[j].monto);break}
  for(i=n;i>=0;i--){
    d=dvPrev(i);c=res.cards[dvMonKey(d)];
    x={k:i,date:d,lab:pad(d.getDate())+'/'+pad(d.getMonth()+1),ing:0,ret:0,res:0,dev:0,devv:0,src:'',loss:0,sug:0,pct:0,st:'err',msg:''};
    if(!c||c.err){x.msg=c?c.err:'sin datos'}
    else if(!c.found){x.st='nocard';x.msg='Sin ficha en '+MES[d.getMonth()]}
    else{
      dd=c.days[d.getDate()-1];x.ing=dd.ing;x.ret=dd.ret;x.res=dd.ret-dd.ing;x.dev=dd.dev;
      if(x.res<0)x.loss=-x.res;
      if(x.loss>=mn){
        x.pct=dvPct(x.loss);x.sug=dvAmt(x.loss,x.pct);x.st='pend';lm=null;
        for(j=0;j<lb.length;j++)if(lb[j].fp===ser(d)){lm=lb[j];break}
        if(lm){x.st='dev';x.devv=lm.monto;x.src='libro'}
        else{for(k=0;k<dels.length;k++)if(dels[k].rem>0&&dels[k].s>ser(d)){x.st='dev';x.devv=dels[k].rem;x.src='ficha';dels[k].rem=0;break}}}
      else x.st=x.loss>0?'baja':'sin'}
    rows.push(x)}
  rows.reverse();
  res.rows=rows;res.pend=[];res.cur=res.cards[dvMonKey(FE)];
  for(i=0;i<rows.length;i++)if(rows[i].st==='pend')res.pend.push(rows[i])}
function dvStTxt(x){
  if(x.st==='dev')return '<span class="up">Devuelto '+m0(x.devv)+(x.src==='ficha'?' (segun la ficha; no esta en el libro)':' (libro)')+'</span>';
  if(x.st==='pend')return '<span class="dn">PENDIENTE: '+x.pct+'% = '+m0(x.sug)+'</span>';
  if(x.st==='baja')return 'Perdida menor al minimo ('+m0(dvMin())+')';
  if(x.st==='sin')return (x.ing||x.ret)?'Sin perdida':'Sin actividad';
  return '<span class="dn">'+esc(x.msg||'sin datos')+'</span>'}
function dvTable(r){
  var h='<table class="t"><tr><th>Dia</th><th>Ingreso</th><th>Retiro</th><th>Resultado</th><th>Entregado ese dia</th><th>Estado</th></tr>',i,x;
  for(i=0;i<r.rows.length;i++){x=r.rows[i];
    h+='<tr><td>'+x.lab+(x.k===1?' (ayer)':(x.k===0?' (hoy)':''))+'</td><td class="n">'+m0(x.ing)+'</td><td class="n">'+m0(x.ret)+'</td><td class="n '+(x.res<0?'dn':(x.res>0?'up':''))+'">'+mS(x.res)+'</td><td class="n">'+(x.dev?m0(x.dev):'-')+'</td><td>'+dvStTxt(x)+'</td></tr>'}
  return h+'</table>'}
function dvDraw(){
  var r=DV.res,cls='nn',t='',body='',am='',i,x,tot=0,nd=0,ne=0,nn2=0,btn,n=DVC().days;
  if(!r){$('dvAm').innerHTML='';return}
  btn='<div><span class="b p" onclick="dvOpen()">Devolucion</span><span class="b" onclick="fcOpen()">Ficha completa</span></div>';
  if(r.wait){t=cli()?(DV.ack?'Cargando... el servidor esta leyendo el Rating Card de '+esc(DV.nom):(DV.slow?'El servidor no ha contestado todavia. Revisa que este abierto y con la version nueva del programa. Sigo esperando...':'Cargando... pidiendo al servidor las devoluciones de '+esc(DV.nom))):'Buscando devoluciones de '+esc(DV.nom)+' en el Rating Card...';btn=''}
  else if(r.err){cls='er';t=esc(r.err)}
  else{
    for(i=0;i<r.rows.length;i++){x=r.rows[i];if(x.st==='err')ne++;else if(x.st==='nocard')nn2++;else if(x.st==='dev')nd++}
    for(i=0;i<r.pend.length;i++)tot+=r.pend[i].sug;
    if(ne===r.rows.length){cls='er';t='No pude leer el Rating Card: '+esc(r.rows[0].msg)}
    else if(nn2===r.rows.length){cls='nn';t=esc(DV.nom)+': no tiene ficha en el Rating Card (cliente nuevo).'}
    else if(r.pend.length){cls='pd';t='DEVOLUCION PENDIENTE &middot; '+esc(DV.nom)+' &middot; sugerido '+m0(tot)}
    else if(nd){cls='ok';t=esc(DV.nom)+': ya tiene devolucion en los ultimos '+n+' dias. Sin pendientes.'}
    else{cls='nn';t=esc(DV.nom)+': SIN devolucion (no tuvo perdidas con derecho en los ultimos '+n+' dias).'}
    if(ne&&ne<r.rows.length)body+='<div class="dn" style="margin-top:0.25rem">Algun dia no se pudo leer: '+esc(r.rows[0].msg)+'</div>';
    if(r.libroErr)body+='<div class="hint" style="margin-top:0.25rem">Libro de devoluciones: '+esc(r.libroErr)+'</div>';
    body=dvTable(r)+body;
    for(i=0;i<r.pend.length;i++)am+='<div>'+r.pend[i].lab+' &middot; perdida '+m0(r.pend[i].loss)+' &rarr; '+r.pend[i].pct+'% = <b>'+m0(r.pend[i].sug)+'</b></div>'}
  $('dvAm').innerHTML='<div class="dvb '+cls+'" style="margin:0 0 0.5rem"><h4 style="font-size:0.9375rem;margin:0 0 0.25rem">'+t+'</h4>'+am+btn+'</div>';
  if(ovShown('mDv'))dvChips()}

function dvName(){return DV.nom||proper(cleanTxt($('rgN').value).replace(/ $/,''))}
function dvChips(){
  var r=DV.res,h='',i,x;
  if(!r||r.wait){$('dvDays').innerHTML='<span class="hint">'+(cli()?'Cargando... esperando al servidor':'Buscando en el Rating Card...')+'</span>';return}
  if(r.err||!r.rows){$('dvDays').innerHTML='<span class="hint">'+esc(r.err||'Sin datos del Rating Card')+'</span>';return}
  for(i=0;i<r.rows.length;i++){x=r.rows[i];
    if(x.loss>0)h+='<span class="b'+(x.st==='pend'?' p':'')+'" onclick="dvPickDay('+i+')">'+x.lab+' &middot; perdida '+m0(x.loss)+(x.st==='dev'?' (ya devuelto '+m0(x.devv)+')':'')+'</span> '}
  $('dvDays').innerHTML=h||'<span class="hint">Sin perdidas en los ultimos '+DVC().days+' dias. Puedes capturar la devolucion a mano.</span>'}
function dvPickDay(i){
  var x=DV.res.rows[i];
  $('dvF').value=x.lab+'/'+x.date.getFullYear();$('dvL').value=x.loss;$('dvP').value=dvPct(x.loss);DV.man=false;dvIn('L');$('dvP').focus()}
function dvOpen(){
  var n0=dvName(),g=RG(),i,h,o,sel,x,r,pick=-1;
  if(nkey(n0).length<3){note('Escribe o elige primero el nombre del cliente.','dn');return}
  if(DV.nom!==n0||!DV.res)dvLookup(n0);
  DV.nom=n0;DV.man=false;
  $('dvT').innerHTML='Devolucion &middot; '+esc(n0);
  $('dvFE').innerHTML='Fecha de entrega: <b>'+fmtF(FE)+'</b> &middot; la hora se anota al guardar &middot; Monitorista: <b>'+esc(g.mon||'-')+'</b>';
  h='<option value="">- elige -</option>';for(i=0;i<g.mesas.length;i++)h+='<option>'+esc(g.mesas[i])+'</option>';$('dvS').innerHTML=h;
  h='<option value="">- elige -</option>';for(i=0;i<g.pit.length;i++)h+='<option>'+esc(g.pit[i])+'</option>';$('dvR').innerHTML=h;
  if(g.dvr){for(i=0;i<g.pit.length;i++)if(g.pit[i]===g.dvr)$('dvR').selectedIndex=i+1}
  $('dvC').value='Sin Novedad';$('dvMsg').innerHTML='';
  r=DV.res;
  if(r&&r.rows){for(i=r.rows.length-1;i>=0;i--)if(r.rows[i].st==='pend'){pick=i;break}
    if(pick<0)for(i=0;i<r.rows.length;i++)if(r.rows[i].loss>0){pick=i;break}}
  if(pick>=0){x=r.rows[pick];$('dvF').value=x.lab+'/'+x.date.getFullYear();$('dvL').value=x.loss;$('dvP').value=dvPct(x.loss);$('dvM').value=dvAmt(x.loss,dvPct(x.loss))}
  else{x=dvPrev(0);$('dvF').value=pad(x.getDate())+'/'+pad(x.getMonth()+1)+'/'+x.getFullYear();$('dvL').value='';$('dvP').value=dvPct(dvMin());$('dvM').value=''}
  dvChips();dvIn('X');
  $('mDv').style.display='flex';try{$('dvP').focus();$('dvP').select()}catch(e){}}
function dvIn(w){
  var el,c,l,p;
  if(w==='L'||w==='M'||w==='P'){el=$('dv'+w);c=String(el.value).replace(w==='P'?/[^0-9.,]/g:/[^0-9]/g,'');if(c!==el.value)el.value=c}
  if(w==='M')DV.man=true;
  if(!DV.man&&w!=='M'){l=dvNum('dvL');p=dvNum('dvP');$('dvM').value=(l>0&&p>0)?dvAmt(l,p):''}
  l=dvNum('dvL');
  $('dvMsg').innerHTML=(l>0&&l<dvMin())?'<span class="hint">La perdida esta por debajo del minimo ('+m0(dvMin())+'). Puedes guardarla si es cortesia.</span>':''}
function dvKey(e){e=e||window.event;var k=e.keyCode,t=e.target||e.srcElement;
  if(k===27){e.preventDefault();dvClose()}
  else if(k===13&&t&&t.tagName!=='SELECT'){e.preventDefault();dvSave()}}
function dvClose(){
  $('mDv').style.display='none';
  if(RS.t==='D'&&!ovShown('mAmt')){$('rgN').value='';RS.nom='';sugClear();dvClear()}
  if(ovShown('mAmt')){try{$('amV').focus()}catch(e){}}else regFocus()}
function dvMsg2(t,c){$('dvMsg').innerHTML='<span class="'+(c||'')+'">'+t+'</span>'}
function dvSave(){
  if(DV.busy)return;
  var d=dvParseDate($('dvF').value),l=dvNum('dvL'),p=dvNum('dvP'),m=dvNum('dvM'),s=$('dvS').value,r=$('dvR').value,cm=String($('dvC').value).replace(/^\s+|\s+$/g,'');
  if(!d){dvMsg2('La fecha de perdida no es valida (usa dd/mm/aaaa).','dn');return}
  if(ser(d)>ser(FE)){dvMsg2('La fecha de perdida no puede ser posterior a la fecha de entrega ('+fmtF(FE)+').','dn');return}
  if(!(m>0)){dvMsg2('Escribe el monto a devolver.','dn');return}
  if(!s){dvMsg2('Elige el lugar de entrega (mesa).','dn');return}
  if(!r){dvMsg2('Elige quien reporta.','dn');return}
  if(!RG().mon){monOpen(true);return}
  DV.busy=true;dvMsg2('Guardando en los Excel...','');
  var rec={nom:DV.nom,fe:new Date(FE.getFullYear(),FE.getMonth(),FE.getDate()),hora:new Date(),fp:d,loss:l,pct:p,monto:m,over:(m!==dvAmt(l,p)),lugar:s,rep:r,mon:RG().mon,cm:cm||'Sin Novedad',cancel:false};
  if(cli()){dvCliSave(rec,false);return}
  jobRun(function(){dvJobSave(rec)})}
function dvFmt(cell,f){try{if(String(cell.NumberFormat)==='General')cell.NumberFormat=f}catch(e){}}
function dvPut(ws,row,c0,rec,modo){
  var c=function(k){return ws.Cells(row,c0+k)},h=c(6),a;
  c(0).Value2=ser(rec.fe);dvFmt(c(0),'dd/mm/yyyy');
  c(1).Value2=(rec.hora.getHours()*60+rec.hora.getMinutes())/1440;dvFmt(c(1),'hh:mm');
  c(2).Value2=ser(rec.fp);dvFmt(c(2),'dd/mm/yyyy');
  c(3).Value=rec.nom;
  c(4).Value2=rec.loss;dvFmt(c(4),'$#,##0');
  c(5).Value2=rec.pct/100;dvFmt(c(5),'0%');
  if(modo==='f'&&!rec.over)h.Formula='=MROUND('+colName(c0+4)+row+'*'+colName(c0+5)+row+','+DVC().rd+')';
  else{a=false;if(modo==='i'){try{a=(h.HasFormula===true)}catch(e){}}if(!a)h.Value2=rec.monto}
  dvFmt(h,'$#,##0');
  c(7).Value=rec.lugar;c(8).Value=rec.rep;c(9).Value=rec.mon;c(10).Value=rec.cm;
  if(Math.abs(nm(c(4).Value2)-rec.loss)>0.001||String(c(3).Value)!==rec.nom)throw new Error('no quedo escrito en la fila '+row+' (hoja protegida?)')}
function dvJobSave(rec){
  var xl=null,out=[],fails=[],stp=[],lab=fmtF(rec.fp);
  function step(t,fn){
    try{var s=fn();if(rec.cancel)return;out.push('<span class="up">'+t+' OK'+(s?' ('+s+')':'')+'</span>');stp.push([t,1,String(s||'').substring(0,200)])}
    catch(e){fails.push(t+': '+e.message);out.push('<span class="dn">'+t+': '+esc(e.message)+'</span>');stp.push([t,0,String(e.message).substring(0,200)])}}
  try{
    xl=xlStart();
    step('Libro de devoluciones',function(){
      var p=rp('dev'),ob,wb,ws,v,i,row=-1,sn=MES[rec.fe.getMonth()];
      if(!p)throw new Error('falta la ruta (Conexion y archivos)');
      if(!fso.FileExists(p))throw new Error('no encuentro '+p);
      ob=openBook(xl,p,true);wb=ob.wb;
      try{
        if(wb.ReadOnly)throw new Error('esta abierto como solo lectura en otro lado');
        ws=findSheet(wb,sn);v=rr(ws,'B5:L1004');
        for(i=0;i<v.length;i++){
          if(!isEmp(v[i][3])&&typeof v[i][2]==='number'&&v[i][2]===ser(rec.fp)&&sameName(String(v[i][3]),rec.nom)){
            var dm='Ya hay una devolucion de '+rec.nom+' por la perdida del '+lab+' (monto '+m0(nm(v[i][6]))+') en la hoja '+sn+'.';
            if(rec.remote){if(!rec.force){rec.cancel=true;rec.dupMsg=dm;return ''}}
            else if(!confirm(dm+'\n\nRegistrar otra de todos modos?')){rec.cancel=true;return ''}}}
        for(i=0;i<v.length;i++)if(isEmp(v[i][0])&&isEmp(v[i][3])&&isEmp(v[i][4])){row=5+i;break}
        if(row<0)throw new Error('no hay filas libres en la hoja '+sn);
        dvPut(ws,row,2,rec,'f');ob.app.Calculate();wb.Save();return 'hoja '+sn+', fila '+row
      }finally{closeBk(ob)}});
    if(!rec.cancel)step('Informe (hoja DEVOLUCIONES)',function(){
      var p=rp('inf'),ob,wb,ws,v,i,j,hr=4,bc=2,row=-1,f=false;
      if(!p)throw new Error('falta la ruta del Informe');
      if(!fso.FileExists(p))throw new Error('no encuentro '+p);
      ob=openBook(xl,p,true);wb=ob.wb;
      try{
        if(wb.ReadOnly)throw new Error('el Informe esta abierto como solo lectura (otro equipo o copia oculta de Excel)');
        ws=findSheet(wb,'DEVOLUCIONES');v=rr(ws,'A1:P20');
        for(i=0;i<v.length&&!f;i++)for(j=0;j<v[i].length;j++)if(typeof v[i][j]==='string'&&nkey(v[i][j])==='NOMBRE DEL CLIENTE'){hr=i+1;bc=j+1-3;f=true;break}
        if(bc<1)bc=2;
        v=rr(ws,colName(bc+3)+(hr+1)+':'+colName(bc+4)+(hr+600));
        for(i=0;i<v.length;i++)if(isEmp(v[i][0])&&isEmp(v[i][1])){row=hr+1+i;break}
        if(row<0)throw new Error('no hay filas libres en la hoja DEVOLUCIONES');
        dvPut(ws,row,bc,rec,'i');ob.app.Calculate();wb.Save();return 'fila '+row
      }finally{closeBk(ob)}});
    if(!rec.cancel)step('Rating Card (ficha)',function(){
      var p=rpFor('rc',rec.fe),ob,wb,ws,card,cell,cur;
      if(!p)throw new Error('falta la ruta del Rating Card');
      if(!fso.FileExists(p))throw new Error('no encuentro '+p);
      ob=openBook(xl,p,true);wb=ob.wb;
      try{
        if(wb.ReadOnly)throw new Error('el Rating Card esta abierto como solo lectura en otro lado');
        ws=findSheet(wb,'DETALLE');card=dvFindCard(ws,rec.nom);
        if(!card)throw new Error('no tiene ficha en el Rating Card de '+MES[rec.fe.getMonth()]+'; anota la devolucion a mano');
        cell=ws.Cells(card.f+1+rec.fe.getDate(),card.c+5);cur=nm(cell.Value2);
        cell.Value2=cur+rec.monto;
        if(Math.abs(nm(cell.Value2)-(cur+rec.monto))>0.001)throw new Error('no quedo escrito en la ficha');
        ob.app.Calculate();wb.Save();return 'dia de entrega '+rec.fe.getDate()+(cur>0?', sumado a '+m0(cur):'')
      }finally{closeBk(ob)}})
  }catch(e){fails.push(e.message);out.push('<span class="dn">'+esc(e.message)+'</span>');stp.push(['',0,String(e.message).substring(0,200)])}
  finally{xlQuit(xl)}
  if(rec.remote){dvRemoteDone(rec,stp,fails);return}
  DV.busy=false;
  if(rec.cancel){dvMsg2('Cancelado: no se escribio nada.','dn');return}
  RG().dvr=rec.rep;cfgSave();
  $('mDv').style.display='none';
  note('Devolucion '+m0(rec.monto)+' de '+esc(rec.nom)+' (perdida del '+lab+'): '+out.join(' | '),fails.length?'dn':'up');
  if(fails.length)alert('Devolucion de '+rec.nom+' - revisa lo que no se pudo escribir:\n\n'+fails.join('\n')+'\n\nLo que si se escribio ya quedo guardado: no lo repitas.');
  $('rgN').value='';RS.nom='';sugClear();dvClear();
  if(ovShown('mAmt')){try{$('amV').focus()}catch(e){}}else regFocus()}

/* =================== DEVOLUCIONES DESDE UN CLIENTE =================== */
function dvYmd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function dvRid(t){return (CFG.nt.name||'cli')+'-'+t+'-'+new Date().getTime()+'-'+Math.floor(Math.random()*1000)}
function dvPack(res){
  var o={nom:res.nom,fe:res.fe,err:res.err||'',lb:res.libroErr||'',dv:DVC(),r:[]},i,x,rows=res.rows||[];
  var c=res.cur;
  if(!c)o.cu={f:0};else if(c.err)o.cu={e:String(c.err).substring(0,160)};else if(!c.found)o.cu={f:0};
  else{o.cu={f:1,nm:c.name,dm:c.dm,mo:c.month,yr:c.year,d:[]};for(i=0;i<c.days.length;i++)o.cu.d.push([c.days[i].ing,c.days[i].ret,c.days[i].dev])}
  for(i=0;i<rows.length;i++){x=rows[i];
    o.r.push([x.k,x.date.getFullYear(),x.date.getMonth(),x.date.getDate(),x.ing,x.ret,x.dev,x.devv,x.src==='libro'?'l':(x.src==='ficha'?'f':''),x.loss,x.sug,x.pct,x.st,String(x.msg||'').substring(0,160)])}
  return JSON.stringify(o)}
function dvPubRes(id,js){
  var parts=[],i;for(i=0;i<js.length;i+=1800)parts.push(js.substring(i,i+1800));
  for(i=0;i<parts.length;i++)ntPub('st',{k:'dr',id:id,n:i,m:parts.length,d:parts[i]})}
function dvPubErr(id,msg){dvPubRes(id,JSON.stringify({nom:'',fe:ser(FE),err:String(msg||'error').substring(0,200),lb:'',r:[]}))}
function srvDvQ(m){
  if(DUP||!m.id||SEEN[m.id])return;SEEN[m.id]=1;CFG.nt.since=NT.since;cfgSave();
  var nom=String(m.nom||''),by=String(m.n||'cliente').substring(0,20);
  if(m._t&&new Date().getTime()/1000-m._t>120)return;
  if(nom.length<3||nom.length>60||!new RegExp('^'+LETRE+'+$').test(nom)){dvPubErr(m.id,'nombre invalido');return}
  if(!rp('rc')){dvPubErr(m.id,'Falta la ruta del Rating Card en el servidor (Conexion y archivos).');return}
  regMsg('['+esc(by)+'] consulta de devolucion: '+esc(nom)+'...','');
  ntPub('st',{k:'dr',id:m.id,ack:1});
  jobRun(function(){jobDvQ(m.id,nom)})}
function jobDvQ(id,nom){
  var res,js;
  try{res=dvCollect(nom);dvBuild(res);js=dvPack(res)}
  catch(e){js=JSON.stringify({nom:nom,fe:ser(FE),err:String(e.message).substring(0,200),lb:'',r:[]})}
  dvPubRes(id,js)}
function dvCheck(x){
  var okTxt=function(v,mn,mx,re){return typeof v==='string'&&v.length>=mn&&v.length<=mx&&re.test(v)},
      okDt=function(v){var q=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(v)),d;if(!q)return null;d=new Date(+q[1],+q[2]-1,+q[3]);return(d.getFullYear()===+q[1]&&d.getMonth()===+q[2]-1&&d.getDate()===+q[3])?d:null},
      fp,fe=dvYmd(FE);
  if(!x||typeof x!=='object')return 'registro invalido';
  if(!okTxt(x.nom,3,60,new RegExp('^'+LETRE+'+$')))return 'nombre invalido';
  if(x.fe!==fe)return 'la fecha de entrega del cliente ('+x.fe+') no es la del servidor ('+fe+')';
  fp=okDt(x.fp);if(!fp)return 'fecha de perdida invalida';
  if(ser(fp)>ser(FE))return 'la fecha de perdida es posterior a la fecha de entrega';
  if(ser(FE)-ser(fp)>370)return 'la fecha de perdida es demasiado antigua';
  if(!okTxt(x.h,8,8,/^\d\d:\d\d:\d\d$/))return 'hora invalida';
  if(typeof x.loss!=='number'||!isFinite(x.loss)||x.loss<0||x.loss>1000000000)return 'perdida invalida';
  if(typeof x.pct!=='number'||!isFinite(x.pct)||!(x.pct>0)||x.pct>100)return 'porcentaje invalido';
  if(typeof x.monto!=='number'||!isFinite(x.monto)||!(x.monto>0)||x.monto>10000000)return 'monto invalido';
  if(!okTxt(x.lugar,1,30,/^[A-Za-z0-9 ()\/.-]+$/))return 'lugar de entrega invalido';
  if(!okTxt(x.rep,2,40,new RegExp('^'+LETRE+'+$')))return 'quien reporta invalido';
  if(!okTxt(x.mon,2,40,new RegExp('^['+LET+' \\/]+$')))return 'monitorista invalido';
  if(typeof x.cm!=='string'||x.cm.length>120)return 'comentario invalido';
  return ''}
function dvPubZ(id,ok,msg,stp,dup){ntPub('st',{k:'dz',id:id,ok:!!ok,msg:String(msg||'').substring(0,300),st:stp||[],dup:!!dup})}
function srvDvSave(m){
  if(!m.id||SEEN[m.id])return;SEEN[m.id]=1;
  if(DUP||!claimTx(m.id))return;
  CFG.nt.since=NT.since;cfgSave();
  var by=String(m.n||'cliente').substring(0,20),x=m.x,err,rec,f,hh;
  if(m._t&&new Date().getTime()/1000-m._t>300){dvPubZ(m.id,false,'la solicitud llego con mas de 5 minutos de retraso y no se aplico; revisa el libro y captura de nuevo');regMsg('['+esc(by)+'] devolucion vencida, no se aplico','dn');return}
  err=dvCheck(x);
  if(err){dvPubZ(m.id,false,err);regMsg('['+esc(by)+'] devolucion rechazada: '+esc(err),'dn');return}
  f=x.fp.split('-');hh=x.h.split(':');
  rec={nom:x.nom,fe:new Date(FE.getFullYear(),FE.getMonth(),FE.getDate()),hora:new Date(2000,0,1,parseInt(hh[0],10),parseInt(hh[1],10),parseInt(hh[2],10)),
       fp:new Date(parseInt(f[0],10),parseInt(f[1],10)-1,parseInt(f[2],10)),loss:x.loss,pct:x.pct,monto:x.monto,over:(x.monto!==dvAmt(x.loss,x.pct)),
       lugar:x.lugar,rep:x.rep,mon:x.mon,cm:x.cm.replace(/[\u0000-\u001f]/g,' ').replace(/^[=+@\-\s]+/,'')||'Sin Novedad',
       cancel:false,remote:{id:m.id,by:by},force:!!x.force};
  regMsg('['+esc(by)+'] recibido: devolucion '+m0(rec.monto)+' de '+esc(rec.nom)+'...','');
  ntPub('st',{k:'dz',id:m.id,ack:1});
  jobRun(function(){jobDvSave(rec)})}
function dvRemoteDone(rec,stp,fails){
  var r=rec.remote,dup=!!(rec.cancel&&rec.dupMsg);
  if(rec.cancel){dvPubZ(r.id,false,rec.dupMsg||'cancelado',[],dup);regMsg('['+esc(r.by)+'] devolucion de '+esc(rec.nom)+' no se aplico: '+esc(rec.dupMsg||'cancelada')+' Esperando respuesta del cliente.','dn');return}
  dvPubZ(r.id,!fails.length,fails.join(' | '),stp,false);
  regMsg('['+esc(r.by)+'] devolucion '+m0(rec.monto)+' de '+esc(rec.nom)+(fails.length?': con errores, revisa: '+esc(fails.join(' | ')):' registrada.'),fails.length?'dn':'up')}

function dvCliFail(id,msg){
  if(id&&DV.rid!==id)return;
  DV.rid='';DV.res={err:msg};DV.wantOpen=false;DV.wantFc=false;dvDraw();regMsg(esc(msg),'dn')}
function dvCliAsk(nom){
  var id=dvRid('dq');DV.rid=id;RS.dvAsm={};DV.ack=false;DV.slow=false;
  setTimeout(function(){if(DV.rid===id&&!DV.ack&&DV.res&&DV.res.wait){DV.slow=true;dvDraw()}},25000);
  ntPub('cmd',{k:'dq',id:id,n:CFG.nt.name,nom:nom},function(ok){if(!ok)dvCliFail(id,'No se pudo contactar al servidor (sin conexion). Repite la consulta.')});
  setTimeout(function(){if(DV.rid===id)dvCliFail(id,'El servidor no respondio. Revisa que el servidor este abierto y repite la consulta.')},90000)}
function dvUnpack(o){
  var res={nom:o.nom,fe:o.fe,err:o.err||'',rows:[],pend:[],cards:{}},i,a,x,d;
  if(o.lb)res.libroErr=o.lb;
  if(o.cu){if(o.cu.e)res.cur={err:o.cu.e};else if(!o.cu.f)res.cur={found:false,month:FE.getMonth(),year:FE.getFullYear()};
    else{res.cur={found:true,name:o.cu.nm,dm:o.cu.dm,month:o.cu.mo,year:o.cu.yr,days:[]};
      for(i=0;i<o.cu.d.length;i++)res.cur.days.push({d:i+1,ing:o.cu.d[i][0],ret:o.cu.d[i][1],res:o.cu.d[i][1]-o.cu.d[i][0],dev:o.cu.d[i][2]})}}
  for(i=0;i<(o.r||[]).length;i++){a=o.r[i];d=new Date(a[1],a[2],a[3]);
    x={k:a[0],date:d,lab:pad(d.getDate())+'/'+pad(d.getMonth()+1),ing:a[4],ret:a[5],res:a[5]-a[4],dev:a[6],devv:a[7],src:a[8]==='l'?'libro':(a[8]==='f'?'ficha':''),loss:a[9],sug:a[10],pct:a[11],st:a[12],msg:a[13]};
    res.rows.push(x);if(x.st==='pend')res.pend.push(x)}
  return res}
function dvCliRes(m){
  if(!m.id||m.id!==DV.rid)return;
  if(m.ack){if(DV.res&&DV.res.wait){DV.ack=true;dvDraw()}return}
  RS.dvAsm=RS.dvAsm||{};
  var a=RS.dvAsm[m.id]||(RS.dvAsm[m.id]={p:[],n:0,m:m.m}),o,res;
  if(a.p[m.n]===undefined){a.p[m.n]=m.d;a.n++}
  if(a.n<a.m)return;
  delete RS.dvAsm[m.id];
  try{o=JSON.parse(a.p.join(''))}catch(e){dvCliFail(m.id,'La respuesta del servidor llego incompleta. Repite la consulta.');return}
  DV.rid='';
  if(o.dv&&o.dv.tiers&&o.dv.tiers.length){RG().dv={tiers:o.dv.tiers,rd:o.dv.rd||50,days:o.dv.days||3};cfgSave()}
  res=dvUnpack(o);res.nom=DV.nom;
  DV.res=res;DV.t=new Date().getTime();DV.fe=ser(FE);
  dvDraw();
  if(DV.wantFc){DV.wantFc=false;fcShow()}
  if(DV.wantOpen){DV.wantOpen=false;regMsg('','');dvOpen()}}

function dvCliSave(rec,force){
  var id=dvRid('dv'),h=rec.hora,
      x={nom:rec.nom,fe:dvYmd(rec.fe),fp:dvYmd(rec.fp),h:pad(h.getHours())+':'+pad(h.getMinutes())+':'+pad(h.getSeconds()),loss:rec.loss,pct:rec.pct,monto:rec.monto,lugar:rec.lugar,rep:rec.rep,mon:rec.mon,cm:rec.cm,force:!!force};
  DV.sid=id;DV.srec=rec;DV.busy=true;DV.sack=false;dvMsg2('Enviando al servidor... espera la confirmacion.','');
  setTimeout(function(){if(DV.sid===id&&DV.busy&&!DV.sack)dvMsg2('El servidor todavia no confirma que recibio el registro. Revisa que este abierto y con la version nueva. NO repitas hasta saber si se registro.','dn')},25000);
  ntPub('cmd',{k:'dv',id:id,n:CFG.nt.name,x:x},function(ok){
    if(!ok&&DV.sid===id){DV.sid='';DV.busy=false;dvMsg2('No se pudo enviar (sin conexion). NO se registro. Intenta de nuevo.','dn')}});
  setTimeout(function(){if(DV.sid===id&&DV.busy){DV.busy=false;dvMsg2('El servidor no ha confirmado. NO se sabe si se registro: revisa el Informe / libro antes de repetir. Si llega la confirmacion se avisara.','dn')}},120000)}
function dvCliSaved(m){
  if(!m.id||m.id!==DV.sid)return;
  if(m.ack){DV.sack=true;if(DV.busy)dvMsg2('El servidor recibio el registro y lo esta escribiendo en los Excel...','');return}
  var rec=DV.srec,st=m.st||[],out=[],fails=[],i,s,lab,shown=ovShown('mDv');
  DV.sid='';DV.busy=false;
  if(m.dup){
    if(confirm((m.msg||'Ya hay una devolucion igual.')+'\n\nRegistrar otra de todos modos?'))dvCliSave(rec,true);
    else dvMsg2('Cancelado: no se escribio nada.','dn');
    return}
  if(!st.length){dvMsg2('NO se registro: '+esc(m.msg||'error del servidor'),'dn');return}
  lab=fmtF(rec.fp);
  for(i=0;i<st.length;i++){s=st[i];
    if(s[1])out.push('<span class="up">'+esc(s[0])+' OK'+(s[2]?' ('+esc(s[2])+')':'')+'</span>');
    else{fails.push((s[0]?s[0]+': ':'')+s[2]);out.push('<span class="dn">'+(s[0]?esc(s[0])+': ':'')+esc(s[2])+'</span>')}}
  RG().dvr=rec.rep;cfgSave();
  $('mDv').style.display='none';
  note('Devolucion '+m0(rec.monto)+' de '+esc(rec.nom)+' (perdida del '+lab+'): '+out.join(' | '),fails.length?'dn':'up');
  if(fails.length)alert('Devolucion de '+rec.nom+' - revisa lo que no se pudo escribir en el servidor:\n\n'+fails.join('\n')+'\n\nLo que si se escribio ya quedo guardado: no lo repitas.');
  if(shown||RS.nom===rec.nom){$('rgN').value='';RS.nom='';sugClear();dvClear()}
  if(ovShown('mAmt')){try{$('amV').focus()}catch(e){}}else regFocus()}

/* =================== JACKPOT: franja fija y pago =================== */
var JPF={busy:false,man:false};
var JP_JUG=[['FULL','FULL','J'],['POKER','POKER','J'],['ESCALERA COLOR','ESCALERA DE COLOR','S'],['ESCALERA REAL','ESCALERA REAL','S']];
function jpMesas(){var o=[],i;for(i=0;i<M.length;i++)if(M[i].a)o.push(M[i].n);return o}
function jm(n){return '$'+Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}
function jpVals(){
  var a=JP?nm(JP.am15):0,b=JP?nm(JP.am21):0,ok=!!JP&&(a>0||b>0);
  return{ok:ok,jp:a,sj:b,
    full:(ok&&typeof JP.ao15==='number')?JP.ao15:a*0.1,
    pok:(ok&&typeof JP.ao17==='number')?JP.ao17:a*0.2,
    esc:(ok&&typeof JP.ao19==='number')?JP.ao19:b*0.25,
    real:(ok&&typeof JP.ao21==='number')?JP.ao21:b}}
function jx(l,v,c){return '<div class="jx '+c+'"><small>'+l+'</small><b>'+v+'</b></div>'}
function jpBarRender(){
  var v=jpVals(),h,els=['jpbR','jpbC'],i,e,act,o,b,pt='';
  h=jx('Jackpot',jm(v.jp),'jbig jgold')+jx('Super Jackpot',jm(v.sj),'jbig jblue')+jx('Full',jm(v.full),'jtier')+jx('Poker',jm(v.pok),'jtier')+jx('Escalera de color',jm(v.esc),'jtier');
  for(i=0;i<els.length;i++){e=$(els[i]);if(!e)continue;
    if(v.ok){if(e.getAttribute('data-h')!==h){e.innerHTML=h;e.setAttribute('data-h',h)}e.className='jpb on'}
    else{e.className='jpb';e.removeAttribute('data-h')}}
  try{act=$(VIEW==='reg'?'jpbR':'jpbC');
    if(v.ok&&act&&act.offsetHeight){b=Math.round(act.getBoundingClientRect().bottom)+10;pt=b+'px'}
    o=document.querySelectorAll('.ov');for(i=0;i<o.length;i++)o[i].style.paddingTop=pt}catch(e2){}}
function jpPrize(j){var v=jpVals(),x=j==='FULL'?v.full:(j==='POKER'?v.pok:(j==='ESCALERA COLOR'?v.esc:v.real));return Math.round(x/5)*5}
function jpCol(j){var i;for(i=0;i<JP_JUG.length;i++)if(JP_JUG[i][0]===j)return JP_JUG[i][2];return 'J'}
function jpNum(){return parseFloat(String($('jpAmt').value).replace(/[^0-9.]/g,''))||0}
function jpMsg2(t,c){$('jpMsg').innerHTML='<span class="'+(c||'')+'">'+t+'</span>'}
function jpOpen(){
  var h='',i,g=RG(),ms;
  if(!RG().mon){monOpen(true);return}
  JPF.man=false;
  $('jpT').innerHTML='Pago de Jackpot &middot; '+esc(RS.nom);
  $('jpFE').innerHTML='Fecha: <b>'+fmtF(FE)+'</b> &middot; Monitorista: <b>'+esc(g.mon||'-')+'</b>'+(nkeyIn(RS.nom)?'':' &middot; <span class="dn">cliente fuera de la lista: se escribe tal cual</span>');
  for(i=0;i<JP_JUG.length;i++)h+='<option value="'+JP_JUG[i][0]+'">'+JP_JUG[i][1]+'</option>';
  $('jpJug').innerHTML=h;$('jpJug').selectedIndex=0;
  h='<option value="">- elige -</option>';ms=jpMesas();for(i=0;i<ms.length;i++)h+='<option value="'+esc(ms[i])+'">'+esc(ms[i])+'</option>';
  $('jpMesa').innerHTML=h;$('jpMesa').selectedIndex=0;
  for(i=0;i<ms.length;i++)if(ms[i]===g.jpm)$('jpMesa').selectedIndex=i+1;
  $('jpAmt').value=jpPrize('FULL')||'';
  jpMsg2('','');jpIn('J');
  $('mJp').style.display='flex';
  try{$('jpMesa').focus()}catch(e){}}
function nkeyIn(n){var k=nkey(n),i;for(i=0;i<RS.cl.length;i++)if(RS.cl[i].k===k)return true;return false}
function jpIn(w){
  var el,c,j,col,amt,v=jpVals(),base,rest;
  if(w==='A'){JPF.man=true;el=$('jpAmt');c=String(el.value).replace(/[^0-9.]/g,'');if(c!==el.value)el.value=c}
  j=$('jpJug').value;col=jpCol(j);
  if(w==='J'){JPF.man=false;$('jpAmt').value=jpPrize(j)||''}
  amt=jpNum();base=col==='J'?v.jp:v.sj;rest=base-amt;
  $('jpInfo').innerHTML='Se anota en <b>'+(col==='J'?'PREMIO JACKPOT (AJ)':'PREMIO SUPER JACKPOT (AK)')+'</b> &middot; '+(col==='J'?'Jackpot':'Super Jackpot')+' ahora <b>'+(v.ok?jm(base):'-')+'</b>'+(v.ok&&amt>0?' &rarr; quedara en <b>'+jm(rest)+'</b>':'')}
function jpClose(){
  $('mJp').style.display='none';
  $('rgN').value='';RS.nom='';sugClear();regFocus()}
function jpSave(){
  if(JPF.busy)return;
  var mesa=String($('jpMesa').value).replace(/^\s+|\s+$/g,'').toUpperCase(),j=$('jpJug').value,amt=jpNum(),rec;
  if(!mesa){jpMsg2('Elige la mesa.','dn');return}
  if(!(amt>0)){jpMsg2('Escribe el premio a pagar.','dn');return}
  if(!cli()&&!rp('jp')){jpMsg2('Falta la ruta del libro de Jackpot (Conexion y archivos).','dn');return}
  JPF.busy=true;jpMsg2('Guardando en el libro de Jackpot...','');
  rec={nom:RS.nom,fe:new Date(FE.getFullYear(),FE.getMonth(),FE.getDate()),mesa:mesa,jug:j,col:jpCol(j),amt:amt,cancel:false};
  if(cli()){jpCliSave(rec,false);return}
  jobRun(function(){jpJobSave(rec)})}
function jpJobSave(rec){
  var xl=null,res='',err='',cl=(rec.col==='J'?'AJ':'AK');
  try{
    xl=xlStart();
    var p=rp('jp'),ob,wb,ws,v,i,row=-1,r5;
    if(!p)throw new Error('falta la ruta del libro de Jackpot');
    if(!fso.FileExists(p))throw new Error('no encuentro '+p);
    ob=openBook(xl,p,true);wb=ob.wb;
    try{
      if(wb.ReadOnly)throw new Error('el libro de Jackpot esta abierto como solo lectura en otro lado');
      ws=jpSheet(wb);v=rr(ws,'AF15:AK65');
      for(i=0;i<v.length;i++)
        if(typeof v[i][0]==='number'&&Math.round(v[i][0])===ser(rec.fe)&&!isEmp(v[i][1])&&sameName(String(v[i][1]),rec.nom)&&String(v[i][3]).toUpperCase()===rec.jug.toUpperCase()&&Math.abs(nm(rec.col==='J'?v[i][4]:v[i][5])-rec.amt)<0.001){
          var dm='Ya hay un pago igual de '+rec.nom+' ('+rec.jug+', '+m0(rec.amt)+') con fecha '+fmtF(rec.fe)+' en la hoja '+ws.Name+'.';
          if(rec.remote){if(!rec.force){rec.cancel=true;rec.dupMsg=dm}}
          else if(!confirm(dm+'\n\nRegistrar otro de todos modos?')){rec.cancel=true}
          break}
      if(!rec.cancel){
        for(i=0;i<v.length;i++)if(isEmp(v[i][0])&&isEmp(v[i][1])&&isEmp(v[i][4])&&isEmp(v[i][5])){row=15+i;break}
        if(row<0)throw new Error('no hay filas libres en AF15:AK65 de la hoja '+ws.Name+' (la fila 66 es el TOTAL)');
        ws.Cells(row,32).Value2=ser(rec.fe);
        ws.Cells(row,33).Value=rec.nom;
        ws.Cells(row,34).Value=rec.mesa;
        ws.Cells(row,35).Value=rec.jug;
        ws.Cells(row,rec.col==='J'?36:37).Value2=rec.amt;
        if(Math.abs(nm(ws.Cells(row,rec.col==='J'?36:37).Value2)-rec.amt)>0.001||String(ws.Cells(row,33).Value)!==rec.nom)throw new Error('no quedo escrito en la fila '+row+' (hoja protegida?)');
        ob.app.Calculate();wb.Save();
        try{readJp(wb)}catch(e2){}
        res='hoja '+ws.Name+', fila '+row+', columna '+cl}
    }finally{closeBk(ob)}
  }catch(e){err=e.message}
  finally{xlQuit(xl)}
  if(rec.remote){jpRemoteDone(rec,res,err);return}
  JPF.busy=false;
  if(rec.cancel){jpMsg2('Cancelado: no se escribio nada.','dn');return}
  if(err){jpMsg2('NO se registro: '+esc(err),'dn');alert('El pago de jackpot de '+rec.nom+' NO se pudo escribir:\n\n'+err);return}
  var g=RG();g.jpm=rec.mesa;cfgSave();
  $('mJp').style.display='none';
  render();regRender();
  if(srv()&&BANK){try{pubSnap(true)}catch(e3){}}
  note('Jackpot pagado: '+esc(rec.nom)+' &middot; '+esc(rec.jug)+' &middot; '+m0(rec.amt)+' ('+res+')','up');
  $('rgN').value='';RS.nom='';sugClear();regFocus()}

function srvJp(m){
  if(!m.id||SEEN[m.id])return;SEEN[m.id]=1;
  if(DUP||!claimTx(m.id))return;
  CFG.nt.since=NT.since;cfgSave();
  var by=String(m.n||'cliente').substring(0,20),x=m.x,ms=jpMesas(),mesa='',i,okJ=false;
  function no(msg){ntPub('st',{k:'jz',id:m.id,ok:false,err:msg});regMsg('['+esc(by)+'] pago de jackpot rechazado: '+esc(msg),'dn')}
  if(m._t&&new Date().getTime()/1000-m._t>300){no('la solicitud llego con mas de 5 minutos de retraso y no se aplico; revisa el libro y captura de nuevo');return}
  if(!x||typeof x!=='object'){no('registro invalido');return}
  if(typeof x.nom!=='string'||x.nom.length<3||x.nom.length>60||!new RegExp('^'+LETRE+'+$').test(x.nom)){no('nombre invalido');return}
  if(x.fe!==dvYmd(FE)){no('la fecha del cliente ('+x.fe+') no es la del servidor ('+dvYmd(FE)+')');return}
  for(i=0;i<ms.length;i++)if(typeof x.mesa==='string'&&ms[i].toUpperCase()===x.mesa.toUpperCase())mesa=ms[i].toUpperCase();
  if(!mesa){no('mesa invalida');return}
  for(i=0;i<JP_JUG.length;i++)if(JP_JUG[i][0]===x.jug)okJ=true;
  if(!okJ){no('jugada invalida');return}
  if(typeof x.amt!=='number'||!isFinite(x.amt)||!(x.amt>0)||x.amt>1000000000){no('premio invalido');return}
  if(!rp('jp')){no('falta la ruta del libro de Jackpot en el servidor');return}
  regMsg('['+esc(by)+'] recibido: jackpot de '+esc(x.nom)+' '+esc(x.jug)+' '+m0(x.amt)+'...','');
  ntPub('st',{k:'jz',id:m.id,ack:1});
  jobRun(function(){jpJobSave({nom:x.nom,fe:new Date(FE.getFullYear(),FE.getMonth(),FE.getDate()),mesa:mesa,jug:x.jug,col:jpCol(x.jug),amt:x.amt,cancel:false,remote:{id:m.id,by:by},force:!!x.force})})}
function jpRemoteDone(rec,res,err){
  var r=rec.remote,by=esc(r.by);
  if(rec.cancel){ntPub('st',{k:'jz',id:r.id,ok:false,dup:!!rec.dupMsg,msg:rec.dupMsg||'',err:rec.dupMsg?'':'cancelado'});
    regMsg('['+by+'] pago de jackpot de '+esc(rec.nom)+' no aplicado: '+esc(rec.dupMsg||'cancelado')+' Esperando respuesta del cliente.','dn');return}
  if(err){ntPub('st',{k:'jz',id:r.id,ok:false,err:String(err).substring(0,250)});regMsg('['+by+'] jackpot de '+esc(rec.nom)+' NO se registro: '+esc(err),'dn');return}
  render();regRender();
  if(srv()&&BANK){try{pubSnap(true)}catch(e3){}}
  ntPub('st',{k:'jz',id:r.id,ok:true,res:String(res||'').substring(0,120)});
  regMsg('['+by+'] jackpot pagado: '+esc(rec.nom)+' &middot; '+esc(rec.jug)+' &middot; '+m0(rec.amt)+' ('+esc(res)+')','up')}
function jpCliSave(rec,force){
  var id=dvRid('jp'),x={nom:rec.nom,fe:dvYmd(rec.fe),mesa:rec.mesa,jug:rec.jug,amt:rec.amt,force:!!force};
  JPF.sid=id;JPF.srec=rec;JPF.busy=true;JPF.sack=false;jpMsg2('Enviando al servidor... espera la confirmacion.','');
  ntPub('cmd',{k:'jp',id:id,n:CFG.nt.name,x:x},function(ok){
    if(!ok&&JPF.sid===id){JPF.sid='';JPF.busy=false;jpMsg2('No se pudo enviar (sin conexion). NO se registro. Intenta de nuevo.','dn')}});
  setTimeout(function(){if(JPF.sid===id&&JPF.busy&&!JPF.sack)jpMsg2('El servidor todavia no confirma que recibio el pago. Revisa que este abierto y con la version nueva. NO repitas hasta saber si se registro.','dn')},25000);
  setTimeout(function(){if(JPF.sid===id&&JPF.busy){JPF.busy=false;jpMsg2('El servidor no ha confirmado. NO se sabe si se registro: revisa el libro de Jackpot antes de repetir. Si llega la confirmacion se avisara.','dn')}},120000)}
function jpCliDone(m){
  if(!m.id||m.id!==JPF.sid)return;
  if(m.ack){JPF.sack=true;if(JPF.busy)jpMsg2('El servidor recibio el pago y lo esta escribiendo en el libro de Jackpot...','');return}
  var rec=JPF.srec,shown=ovShown('mJp');
  JPF.sid='';JPF.busy=false;
  if(m.dup){
    if(confirm((m.msg||'Ya hay un pago igual.')+'\n\nRegistrar otro de todos modos?'))jpCliSave(rec,true);
    else jpMsg2('Cancelado: no se escribio nada.','dn');
    return}
  if(!m.ok){jpMsg2('NO se registro: '+esc(m.err||'error del servidor'),'dn');alert('El pago de jackpot de '+rec.nom+' NO se pudo escribir:\n\n'+(m.err||'error del servidor'));return}
  RG().jpm=rec.mesa;cfgSave();
  $('mJp').style.display='none';
  note('Jackpot pagado: '+esc(rec.nom)+' &middot; '+esc(rec.jug)+' &middot; '+m0(rec.amt)+' ('+esc(m.res||'')+')','up');
  if(shown||RS.nom===rec.nom){$('rgN').value='';RS.nom='';sugClear()}
  regFocus()}

/* =================== JACKPOT: editar / eliminar =================== */
var JE={it:null,busy:false};
function jeMsg(t,c){$('jeMsg').innerHTML=t?'<span class="'+(c||'')+'">'+t+'</span>':''}
function jeOpen(ix){
  var x=JP&&JP.det[ix],ms,h,i,f;
  if(!x||JE.busy||ovOpen())return;
  if(typeof x[6]!=='number'||!x[6]){alert('Presiona Actualizar para poder editar este pago.');return}
  JE.it={row:x[6],nom:String(x[1]||''),mesa:String(x[2]||''),jug:String(x[3]||'').toUpperCase(),amt:nm(x[4])||nm(x[5])};
  ms=jpMesas();f=false;h='';for(i=0;i<ms.length;i++){if(ms[i].toUpperCase()===JE.it.mesa.toUpperCase())f=true;h+='<option value="'+esc(ms[i])+'"'+(ms[i].toUpperCase()===JE.it.mesa.toUpperCase()?' selected':'')+'>'+esc(ms[i])+'</option>'}
  if(!f)h='<option value="'+esc(JE.it.mesa)+'" selected>'+esc(JE.it.mesa)+'</option>'+h;
  $('jeMesa').innerHTML=h;
  h='';for(i=0;i<JP_JUG.length;i++)h+='<option value="'+JP_JUG[i][0]+'"'+(JP_JUG[i][0]===JE.it.jug?' selected':'')+'>'+JP_JUG[i][1]+'</option>';
  $('jeJug').innerHTML=h;
  $('jeN').value=JE.it.nom;$('jeAmt').value=String(JE.it.amt);
  $('jeO').innerHTML='Original: '+esc(JE.it.nom)+' &middot; '+esc(JE.it.mesa)+' &middot; '+esc(JE.it.jug)+' &middot; '+jm(JE.it.amt);
  jeMsg('');$('mJe').style.display='flex';try{$('jeAmt').focus();$('jeAmt').select()}catch(e){}}
function jeClose(){if(JE.busy)return;$('mJe').style.display='none';JE.it=null;regFocus()}
function jeSave(){
  if(JE.busy||!JE.it)return;
  var it=JE.it,nom=proper(cleanTxt($('jeN').value).replace(/ $/,'')),mesa=$('jeMesa').value,jug=$('jeJug').value,amt=parseFloat($('jeAmt').value)||0;
  if(nkey(nom).length<3){jeMsg('Escribe el nombre del cliente.','dn');return}
  if(!(amt>0)){jeMsg('Escribe el premio.','dn');return}
  if(nkey(nom)===nkey(it.nom)&&mesa.toUpperCase()===it.mesa.toUpperCase()&&jug===it.jug&&Math.abs(amt-it.amt)<0.001){jeMsg('No cambiaste nada.','dn');return}
  jeRun({a:'e',row:it.row,exp:{nom:it.nom,mesa:it.mesa,jug:it.jug,amt:it.amt},nw:{nom:nom,mesa:mesa.toUpperCase(),jug:jug,amt:amt}})}
function jeDel(){
  if(JE.busy||!JE.it)return;var it=JE.it;
  if(!confirm('Eliminar este pago de jackpot?\n\nCliente: '+it.nom+'\nMesa: '+it.mesa+'\nJugada: '+it.jug+'\nPremio: '+jm(it.amt)+'\n\nSe borra del libro de Jackpot y el jackpot se recalcula solo.'))return;
  jeRun({a:'d',row:it.row,exp:{nom:it.nom,mesa:it.mesa,jug:it.jug,amt:it.amt},nw:null})}
function jeRun(op){
  JE.busy=true;jeMsg(cli()?'Enviando al servidor...':'Guardando en el libro de Jackpot...','');
  if(cli()){afCliReq('jo',{a:op.a,row:op.row,exp:op.exp,nw:op.nw},function(r,err){jeDone(r,err)},180000,'El servidor no confirmo. NO se sabe si se aplico: presiona Actualizar y revisa antes de repetir.');return}
  if(DUP){JE.busy=false;jeMsg('Este servidor esta duplicado: usa el otro y cierra esta ventana.','dn');return}
  jobRun(function(){jpJobOp(op,function(r){jeDone(r,'')})})}
function jeDone(r,err){
  JE.busy=false;
  if(!r||!r.ok){jeMsg(esc((r&&r.err)||err||'error'),'dn');return}
  JE.it=null;$('mJe').style.display='none';
  note(esc(r.msg||'Listo'),'up');
  if(cli())sync(true);else{render();regRender();if(BANK){try{pubSnap(true)}catch(e){}}}
  regFocus()}
function jpJobOp(op,cb){
  var xl=null,err='',msg='',p=rp('jp'),ob,wb,ws,x,e=op.exp,n=op.nw,row=op.row,cur,c,res={ok:false,err:'',msg:''};
  try{
    if(!p)throw new Error('falta la ruta del libro de Jackpot');
    if(!fso.FileExists(p))throw new Error('no encuentro '+p);
    xl=xlStart();ob=openBook(xl,p,true);wb=ob.wb;
    try{
      if(wb.ReadOnly)throw new Error('el libro de Jackpot esta abierto como solo lectura en otro lado');
      ws=jpSheet(wb);
      if(row<15||row>65)throw new Error('fila invalida');
      x=rr(ws,'AF'+row+':AK'+row)[0];cur=nm(x[4])||nm(x[5]);
      if(typeof x[0]!=='number'||Math.round(x[0])!==ser(FE)||nkey(String(x[1]||'')).indexOf(nkey(e.nom).substring(0,20))!==0||String(x[3]||'').toUpperCase()!==String(e.jug).toUpperCase()||Math.abs(cur-e.amt)>0.001)
        throw new Error('ese pago ya no esta igual en el libro (otro equipo lo cambio o lo borro). Actualiza y vuelve a intentarlo');
      if(ws.Range('AF'+row+':AK'+row).HasFormula!==false)throw new Error('hay formulas en esa fila del libro: no escribo encima');
      if(op.a==='d'){
        for(c=32;c<=37;c++)ws.Cells(row,c).ClearContents();
        ob.app.Calculate();
        if(!isEmp(ws.Cells(row,33).Value2)||nm(ws.Cells(row,36).Value2)!==0||nm(ws.Cells(row,37).Value2)!==0)throw new Error('no se pudo borrar la fila '+row+' (hoja protegida?)');
        msg='Pago de jackpot eliminado: '+e.nom+' '+e.jug+' '+m0(e.amt)}
      else{
        ws.Cells(row,33).Value=n.nom;ws.Cells(row,34).Value=n.mesa;ws.Cells(row,35).Value=n.jug;
        ws.Cells(row,36).ClearContents();ws.Cells(row,37).ClearContents();
        ws.Cells(row,jpCol(n.jug)==='J'?36:37).Value2=n.amt;
        ob.app.Calculate();
        if(Math.abs(nm(ws.Cells(row,jpCol(n.jug)==='J'?36:37).Value2)-n.amt)>0.001||String(ws.Cells(row,33).Value)!==n.nom)throw new Error('no quedo escrito en la fila '+row+' (hoja protegida?)');
        msg='Pago de jackpot corregido: '+e.nom+' '+m0(e.amt)+' -> '+n.nom+' '+n.jug+' '+m0(n.amt)}
      wb.Save();try{readJp(wb)}catch(e2){}
    }finally{closeBk(ob)}
    res.ok=true;res.msg=msg
  }catch(ex){err=ex.message;res.err=err}
  finally{xlQuit(xl)}
  cb(res)}
function jpCheckOp(m){
  var ms=jpMesas(),i,ok,e=m.exp,n=m.nw,t=function(v){return typeof v==='string'&&v.length>=1&&v.length<=60};
  if(m.a!=='e'&&m.a!=='d')return 'accion invalida';
  if(typeof m.row!=='number'||m.row!==Math.floor(m.row)||m.row<15||m.row>65)return 'fila invalida';
  if(!e||!t(e.nom)||!t(e.jug)||!t(e.mesa)||typeof e.amt!=='number')return 'datos del pago invalidos';
  if(m.a==='e'){
    if(!n||typeof n.nom!=='string'||n.nom.length<3||n.nom.length>60||!new RegExp('^'+LETRE+'+$').test(n.nom))return 'nombre invalido';
    ok=false;for(i=0;i<ms.length;i++)if(typeof n.mesa==='string'&&ms[i].toUpperCase()===n.mesa.toUpperCase())ok=true;
    if(!ok)return 'mesa invalida';
    ok=false;for(i=0;i<JP_JUG.length;i++)if(JP_JUG[i][0]===n.jug)ok=true;
    if(!ok)return 'jugada invalida';
    if(typeof n.amt!=='number'||!isFinite(n.amt)||!(n.amt>0)||n.amt>1000000000)return 'premio invalido'}
  return ''}
function srvJpOp(m){
  if(!m.id||SEEN[m.id])return;SEEN[m.id]=1;
  if(DUP||!claimTx(m.id))return;
  CFG.nt.since=NT.since;cfgSave();
  var by=String(m.n||'cliente').substring(0,20),err=jpCheckOp(m);
  function no(msg){ntPub('st',{k:'az',id:m.id,ok:false,err:msg});regMsg('['+esc(by)+'] cambio de jackpot rechazado: '+esc(msg),'dn')}
  if(m._t&&new Date().getTime()/1000-m._t>300){no('la solicitud llego con mas de 5 minutos de retraso y no se aplico; actualiza y repite');return}
  if(err){no(err);return}
  if(!rp('jp')){no('falta la ruta del libro de Jackpot en el servidor');return}
  regMsg('['+esc(by)+'] recibido: '+(m.a==='d'?'eliminar':'editar')+' pago de jackpot de '+esc(m.exp.nom)+'...','');
  jobRun(function(){jpJobOp({a:m.a,row:m.row,exp:m.exp,nw:m.nw||null},function(r){
    ntPub('st',{k:'az',id:m.id,ok:r.ok,err:String(r.err||'').substring(0,250),msg:String(r.msg||'').substring(0,230)});
    if(r.ok){render();regRender();if(BANK){try{pubSnap(true)}catch(e1){}}}
    regMsg('['+esc(by)+'] '+esc(r.ok?r.msg:('NO se aplico: '+r.err)),r.ok?'up':'dn')})})}
document.addEventListener('keydown',function(e){
  if(!ovShown('mJe'))return;
  var k=e.keyCode,tg=e.target||e.srcElement;
  if(k===27){e.preventDefault();e.stopPropagation();jeClose()}
  else if(k===13&&(!tg||tg.tagName!=='SELECT')){e.preventDefault();e.stopPropagation();jeSave()}},true);

/* ---- ficha completa ---- */
function fcOpen(){
  var n0=dvName();
  if(nkey(n0).length<3){note('Escribe o elige primero el nombre del cliente.','dn');return}
  if(DV.nom!==n0||!DV.res){dvLookup(n0,true);DV.wantFc=true;note('Cargando la ficha de '+esc(n0)+'...','');return}
  if(DV.res.wait){DV.wantFc=true;return}
  fcShow()}
function fcRefresh(){var n0=DV.nom;if(!n0)return;$('fcB').innerHTML='<div class="hint">Actualizando...</div>';dvLookup(n0,true);DV.wantFc=true}
function fcClose(){$('mFc').style.display='none';if(ovShown('mAmt')){try{$('amV').focus()}catch(e){}}else regFocus()}
function fcShow(){
  var r=DV.res,c=r&&r.cur,h='',i,x,ti=0,tr=0,td=0,rs,hl,lo=dvPrev(DVC().days),mes=MES[FE.getMonth()]+' '+FE.getFullYear();
  $('fcT').innerHTML='Ficha &middot; '+esc(c&&c.name?proper(c.name):DV.nom);
  if(!c||c.err){h='<div class="dn">'+esc(c?c.err:'No pude leer el Rating Card.')+'</div>'}
  else if(!c.found){h='<div class="dn">'+esc(DV.nom)+' no tiene ficha en el Rating Card de '+mes+'.</div>'}
  else{
    for(i=0;i<c.dm;i++){ti+=c.days[i].ing;tr+=c.days[i].ret;td+=c.days[i].dev}
    rs=tr-ti;
    h+='<div class="hint" style="margin:0 0 0.375rem">'+mes+'</div>';
    h+='<div><div class="c"><small>INGRESADO EN EL MES</small><b>'+m0(ti)+'</b></div><div class="c"><small>RETIRADO EN EL MES</small><b>'+m0(tr)+'</b></div>'+
       '<div class="c big"><small>'+(rs>0?'GANANCIA DEL CLIENTE':(rs<0?'PERDIDA DEL CLIENTE':'RESULTADO'))+'</small><b class="'+(rs>0?'up':(rs<0?'dn':''))+'">'+m0(Math.abs(rs))+'</b></div>'+
       '<div class="c"><small>DEVUELTO EN EL MES</small><b>'+m0(td)+'</b></div></div>';
    h+='<div style="margin:0.125rem 0 0.5rem;font-size:1rem">Ingreso '+m0(ti)+' &middot; retiro '+m0(tr)+' &rarr; <b class="'+(rs>0?'up':(rs<0?'dn':''))+'">'+(rs>0?'ganancia del cliente '+m0(rs):(rs<0?'perdida del cliente '+m0(-rs):'sin diferencia'))+'</b></div>';
    h+='<table class="t" style="width:100%"><tr><th>Dia</th><th>Ingreso</th><th>Retiro</th><th>Resultado</th><th>Devuelto (entrega)</th></tr>';
    for(i=0;i<c.dm;i++){x=c.days[i];
      hl=(c.month===FE.getMonth()&&x.d<=FE.getDate()&&(lo.getMonth()!==FE.getMonth()||x.d>=lo.getDate()));
      h+='<tr'+(hl?' style="background:#1b4036"':'')+'><td>'+x.d+'</td><td class="n">'+m0(x.ing)+'</td><td class="n">'+m0(x.ret)+'</td><td class="n '+(x.res<0?'dn':(x.res>0?'up':''))+'">'+mS(x.res)+'</td><td class="n">'+(x.dev?m0(x.dev):'-')+'</td></tr>'}
    h+='<tr style="font-weight:700"><td>Total</td><td class="n">'+m0(ti)+'</td><td class="n">'+m0(tr)+'</td><td class="n '+(rs<0?'dn':(rs>0?'up':''))+'">'+mS(rs)+'</td><td class="n">'+m0(td)+'</td></tr></table>';
    h+='<div class="hint">Resultado = retiro - ingreso (positivo: gano el cliente; negativo: perdio). La devolucion se anota en el dia en que se entrega. Sombreados: los ultimos dias revisados. Datos leidos al elegir el nombre; usa Actualizar para volver a leer.</div>'}
  $('fcB').innerHTML=h;$('mFc').style.display='flex'}
document.addEventListener('keydown',function(e){if(e.keyCode===27&&ovShown('mFc')){e.preventDefault();fcClose()}},false);

/* =================== ENCABEZADOS =================== */
var HDB=['BJM','BJ 2|BJ2','FB2|FB2/DD2|DD2','BJ FB|BJ FB1','UTH 1|UTH1','BJ1','DP 1|DP1','DJW|DJW/DP2','UTH2|UTH 2','MB 1|MB1','MB 2|MB2','Ruleta','Craps','MB3|MB 3','PRIV 1 (BJ4)|Priv1|PRIV1','PRIV 2 (MB4)|Priv2|PRIV2'];
var HD={hits:[],files:[],map:null};
function mnApply(){var i;for(i=0;i<M.length;i++){if(M[i].n0===undefined)M[i].n0=M[i].n;if(CFG.mn&&CFG.mn[i])M[i].n=CFG.mn[i]}}
function hkey(s){s=String(s||'').toUpperCase();
  s=s.replace(/[\u00c0-\u00c5]/g,'A').replace(/[\u00c8-\u00cb]/g,'E').replace(/[\u00cc-\u00cf]/g,'I').replace(/[\u00d2-\u00d6]/g,'O').replace(/[\u00d9-\u00dc]/g,'U').replace(/\u00d1/g,'N');
  return s.replace(/\s+/g,'')}
function colName(n){var s='';while(n>0){var m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s}
function hdOpen(){
  if(cli()){alert('El cambio de encabezados se hace en la PC servidor (ahi estan los libros).');return}
  var i,h='<table class="t"><tr><th>#</th><th>Nombre en el HTA hoy</th><th>Buscar en los libros (| separa variantes)</th><th>Nombre nuevo</th></tr>';
  for(i=0;i<M.length;i++)h+='<tr><td>'+(i+1)+'</td><td>'+esc(M[i].n)+'</td><td><input class="cfi" id="hdB'+i+'" style="width:15.625rem" value="'+esc((CFG.mb&&CFG.mb[i])||HDB[i])+'"></td><td><input class="cfi" id="hdN'+i+'" style="width:11.875rem" value="'+esc(M[i].n)+'"></td></tr>';
  $('hdT').innerHTML=h+'</table>';$('hdR').innerHTML='';$('hdP').value='';$('hdX').value=(CFG.hdx||[]).join('\n');
  HD.hits=[];$('mHd').style.display='flex'}
function hdClose(){$('mHd').style.display='none';regFocus()}
function hdPaste(){var l=lines($('hdP').value),i;for(i=0;i<M.length&&i<l.length;i++)$('hdN'+i).value=l[i]}
function hdNames(){var a=[],i,v;for(i=0;i<M.length;i++){v=String($('hdN'+i).value).replace(/^\s+|\s+$/g,'');a.push(v||M[i].n)}return a}
function hdSaveNames(useMesas,nuevoComoBuscar){
  var a=hdNames(),b=[],i;
  for(i=0;i<M.length;i++)b.push(nuevoComoBuscar?a[i]:String($('hdB'+i).value));
  CFG.mn=a;CFG.mb=b;CFG.hdx=lines($('hdX').value);mnApply();
  if(useMesas){var ms=[];for(i=0;i<a.length;i++)if(a[i])ms.push(a[i]);RG().mesas=ms}
  cfgSave();pubCfg();render();regRender()}
function hdGuardar(){hdSaveNames($('hdM').checked,false);$('hdR').innerHTML='<span class="up">Nombres guardados en el programa (los libros no se tocaron).</span>'}
function hdFiles(){
  var f=[],seen={},k,p,i,x,add=function(l,pp){var key=String(pp).toLowerCase();if(!pp||seen[key])return;seen[key]=1;f.push({l:l,p:pp})};
  for(i=0;i<KS.length;i++){k=KS[i][0];p=rp(k);if(p)add(KS[i][1],p)}
  x=lines($('hdX').value);for(i=0;i<x.length;i++)add('Otro: '+x[i].replace(/^.*\\/,''),x[i]);
  return f}
function hdBuild(){
  var m={},dups=[],i,b,j,n;
  for(i=0;i<M.length;i++){n=String($('hdN'+i).value).replace(/^\s+|\s+$/g,'');if(!n)continue;
    b=String($('hdB'+i).value).split('|');
    for(j=0;j<b.length;j++){var t=b[j].replace(/^\s+|\s+$/g,'');if(!t)continue;var k=hkey(t);
      if(!m[k])m[k]={i:i,n:n};else if(m[k].i!==i)dups.push(t)}}
  return{m:m,dups:dups}}
function hdScan(){
  var o=hdBuild();HD.map=o.m;HD.dups=o.dups;HD.nn=hdNames();HD.files=hdFiles();
  if(!HD.files.length){$('hdR').innerHTML='<span class="dn">No hay archivos configurados (Conexion y archivos).</span>';return}
  $('hdR').innerHTML='Buscando encabezados en los libros...';
  jobRun(jobHdScan)}
function jobHdScan(){
  var xl=null,hits=[],notes=[],fm=0,fi,f,ob,i,sn,ws,lim,v,r,c,s,k,a,x;
  try{
    xl=xlStart();
    for(fi=0;fi<HD.files.length;fi++){f=HD.files[fi];f.n=0;f.sh={};
      if(!fso.FileExists(f.p)){notes.push(esc(f.l)+': no encontre el archivo');continue}
      ob=null;
      try{ob=openBook(xl,f.p,false);
        for(i=1;i<=ob.wb.Worksheets.Count;i++){ws=ob.wb.Worksheets.Item(i);sn=String(ws.Name).replace(/^\s+|\s+$/g,'').toUpperCase();
          if(/DETALLE|LISTA DE CLIENTES|RATING CARD/.test(sn))continue;
          if(sn.indexOf('AFORO')>=0){
            v=rr(ws,'D9:P9');
            for(c=0;c<13;c++){s=v[0][c];x=HD.nn[c];if(!x||String(s===null||s===undefined?'':s).replace(/^\s+|\s+$/g,'')===x)continue;
              a=colName(4+c)+'9';
              try{if(ws.Range(a).HasFormula===true){fm++;continue}}catch(e){}
              hits.push({f:fi,sh:String(ws.Name),a:a,o:(s===null||s===undefined)?'(vacia)':s,n:x});f.n++;f.sh[ws.Name]=1}
            continue}
          lim=sn==='INGRESOS Y RETIROS'?37:60;
          v=rr(ws,'A1:BH'+lim);
          for(r=0;r<v.length;r++)for(c=0;c<v[r].length;c++){s=v[r][c];if(typeof s!=='string')continue;
            k=HD.map[hkey(s)];if(!k||k.n===String(s).replace(/^\s+|\s+$/g,''))continue;
            a=colName(c+1)+(r+1);
            try{if(ws.Range(a).HasFormula===true){fm++;continue}}catch(e){}
            hits.push({f:fi,sh:String(ws.Name),a:a,o:s,n:k.n});f.n++;f.sh[ws.Name]=1}}
      }catch(e){notes.push(esc(f.l)+': '+esc(e.message))}
      finally{if(ob)closeBk(ob)}}
  }finally{xlQuit(xl)}
  HD.hits=hits;
  var h='<table class="t"><tr><th>Aplicar</th><th>Archivo</th><th>Hojas</th><th>Celdas</th></tr>',ns;
  for(fi=0;fi<HD.files.length;fi++){f=HD.files[fi];ns=0;for(x in f.sh)ns++;
    h+='<tr><td><input type="checkbox" id="hdC'+fi+'"'+(f.n?' checked':' disabled')+'></td><td>'+esc(f.l)+'<div class="hint" style="margin:0">'+esc(f.p)+'</div></td><td class="n">'+ns+'</td><td class="n">'+f.n+'</td></tr>'}
  h+='</table>';
  if(hits.length){h+='<div class="hint">Ejemplos:</div>';for(i=0;i<hits.length&&i<14;i++)h+='<div class="hint" style="margin:0">'+esc(hits[i].sh)+'!'+hits[i].a+': '+esc(hits[i].o)+' &rarr; <b>'+esc(hits[i].n)+'</b></div>';
    h+='<div class="f" style="margin-top:0.625rem"><span class="b p" onclick="hdApply()">Aplicar a los archivos marcados</span></div>'}
  else h+='<div class="dn">No encontre encabezados que cambiar.</div>';
  if(fm)h+='<div class="hint">'+fm+' celda(s) con formula se omiten.</div>';
  if(HD.dups.length)h+='<div class="dn">Variantes repetidas en dos mesas (gana la primera): '+esc(HD.dups.join(', '))+'</div>';
  for(i=0;i<notes.length;i++)h+='<div class="dn">'+notes[i]+'</div>';
  $('hdR').innerHTML=h}
function hdApply(){
  var sel=[],i;for(i=0;i<HD.files.length;i++){var cb=$('hdC'+i);if(cb&&cb.checked)sel.push(i)}
  if(!sel.length){alert('Marca al menos un archivo.');return}
  if(!confirm('Se van a cambiar los encabezados en '+sel.length+' archivo(s) y se guardaran. Conviene tener una copia. Continuar?'))return;
  $('hdR').innerHTML='Aplicando cambios...';
  jobRun(function(){jobHdApply(sel)})}
function jobHdApply(sel){
  var xl=null,rep=[],si,fi,f,ob,j,h,ok,bad,ws;
  try{xl=xlStart();
    for(si=0;si<sel.length;si++){fi=sel[si];f=HD.files[fi];ok=0;bad=0;ob=null;
      try{ob=openBook(xl,f.p,true);
        if(ob.wb.ReadOnly)throw new Error('esta abierto como solo lectura en otro lado');
        for(j=0;j<HD.hits.length;j++){h=HD.hits[j];if(h.f!==fi)continue;
          try{ws=ob.wb.Worksheets.Item(h.sh);ws.Range(h.a).Value=h.n;ok++}catch(e){bad++}}
        ob.wb.Save();rep.push(esc(f.l)+': '+ok+' celdas cambiadas'+(bad?', '+bad+' fallaron (hoja protegida?)':''))}
      catch(e){rep.push('<span class="dn">'+esc(f.l)+': '+esc(e.message)+'</span>')}
      finally{if(ob)closeBk(ob)}}
  }finally{xlQuit(xl)}
  hdSaveNames($('hdM').checked,true);
  $('hdR').innerHTML='<div class="up">Listo.</div><div>'+rep.join('<br>')+'</div><div class="hint">Los nombres nuevos quedaron guardados como los actuales. Si abres esta ventana otra vez, ya buscara con ellos.</div>'}
function abrirArchivo(k){
  var p=rp(k);
  if(!p){alert('Primero elige o escribe la ruta de este archivo.');return}
  if(!fso.FileExists(p)){alert('No encuentro el archivo:\n'+p);return}
  try{var sh=new ActiveXObject('WScript.Shell');sh.Run('"'+p+'"',1,false)}catch(e){alert('No pude abrirlo: '+e.message)}}

/* ---- teclado y entradas ---- */
function regBind(){
  var n=$('rgN'),a=$('amV'),m=$('mnV');
  n.onkeypress=function(e){e=e||window.event;var c=e.keyCode||e.which;if(c===13||e.ctrlKey||e.altKey)return true;
    return new RegExp('['+LET+' ]').test(String.fromCharCode(c))};
  n.oninput=function(){var c=cleanTxt(this.value);if(c!==this.value)this.value=c;sugUpdate()};
  n.onkeydown=function(e){e=e||window.event;var k=e.keyCode;
    if(k===13){e.preventDefault();regEnter()}
    else if(k===40&&RS.sg.length){e.preventDefault();sugSel((RS.si+1)%RS.sg.length)}
    else if(k===38&&RS.sg.length){e.preventDefault();sugSel(RS.si<=0?RS.sg.length-1:RS.si-1)}
    else if(k===34&&RS.sg.length){e.preventDefault();sugSel(Math.min(RS.sg.length-1,RS.si+8))}
    else if(k===33&&RS.sg.length){e.preventDefault();sugSel(Math.max(0,RS.si-8))}
    else if(k===9&&RS.sg.length){e.preventDefault();regPickName(RS.sg[RS.si>=0?RS.si:0].n)}
    else if(k===27){sugClear()}};
  n.onblur=function(){setTimeout(function(){try{if(document.activeElement===$('rgSug')){$('rgN').focus();return}}catch(x){}sugClear()},150)};
  a.onkeypress=function(e){e=e||window.event;var c=e.keyCode||e.which;if(c===13||e.ctrlKey)return true;return c>=48&&c<=57};
  a.oninput=function(){var c=this.value.replace(/[^0-9]/g,'');if(c!==this.value)this.value=c;amtPrev()};
  a.onkeydown=function(e){e=e||window.event;if(e.keyCode===13){e.preventDefault();amtOk()}else if(e.keyCode===27){e.preventDefault();amtCancel()}};
  m.onkeypress=function(e){e=e||window.event;var c=e.keyCode||e.which;if(c===13||e.ctrlKey)return true;return new RegExp('['+LET+' \\/]').test(String.fromCharCode(c))};
  m.onkeydown=function(e){e=e||window.event;if(e.keyCode===13){e.preventDefault();monOk()}else if(e.keyCode===27&&!$('mnX').style.display){e.preventDefault();monClose()}};
  setInterval(function(){var k,now=new Date().getTime(),ch=false;
    if(cli()&&CFG.nt.room&&!RS.clSync&&now>=RS.qNext){RS.qTry++;RS.qNext=now+Math.min(300000,6000*Math.pow(2,RS.qTry));regAskList()}
    for(k in RS.pendTx)if(now-RS.pendTx[k].t>40000){RS.pendTx[k].rec.st='<span class="dn">Sin confirmacion del servidor: revisa el Informe antes de repetirlo</span>';delete RS.pendTx[k];ch=true}
    if(ch)regRender()},5000);
  var sf=$('scF');
  sf.onkeypress=function(e){e=e||window.event;var c=e.keyCode||e.which;if(c===13||e.ctrlKey)return true;return c>=48&&c<=57};
  sf.oninput=function(){var c=this.value.replace(/[^0-9]/g,'');if(c!==this.value)this.value=c;scPrev()};
  sf.onkeydown=function(e){e=e||window.event;if(e.keyCode===13){e.preventDefault();scGo('S')}else if(e.keyCode===27){e.preventDefault();scClose()}};
  document.addEventListener('keydown',function(e){
    var k=e.keyCode,now=new Date().getTime();
    if(k===116){e.preventDefault();e.stopPropagation();try{e.keyCode=0}catch(x){}
      if(VIEW==='reg'&&!ovOpen()&&!PK&&!ovShown('mTx'))setTipo('J');return}
    if(k===117){e.preventDefault();e.stopPropagation();try{e.keyCode=0}catch(x){}
      if(!ovOpen()&&!PK&&!ovShown('mTx')){if(VIEW==='reg')setTipo('P');else prOpen()}return}
    if(k===9&&e.ctrlKey&&!PK&&!ovOpen()&&!ovShown('mTx')&&!ovShown('mNew')){e.preventDefault();e.stopPropagation();showView(VIEW==='reg'?'cierre':'reg');return}
    if(PK){
      if(now-RS.tm<200){e.preventDefault();e.stopPropagation();return}
      if(k>=37&&k<=40){e.preventDefault();e.stopPropagation();pkMove(k)}
      else if(k===13){e.preventDefault();e.stopPropagation();pkPick(PK.i)}
      else if(k===27){e.preventDefault();e.stopPropagation();pkClose();regCancel()}
      return}
    if(ovShown('mPr')){
      var tgp=e.target||e.srcElement,idp=tgp&&tgp.id;
      if(k===13){e.preventDefault();e.stopPropagation();prEnter(idp)}
      else if(k===27){e.preventDefault();e.stopPropagation();prClose()}
      else if(k===40||k===38){e.preventDefault();e.stopPropagation();prPitMove(k===40?1:-1)}
      else if(k===34||k===33){e.preventDefault();e.stopPropagation();prDrawMove(k===34?1:-1)}
      return}
    if(ovShown('mAp')){
      if(k===13){e.preventDefault();e.stopPropagation();apSave()}
      else if(k===27){e.preventDefault();e.stopPropagation();apClose()}
      else if(k===40||k===38){e.preventDefault();e.stopPropagation();apMove(k===40?1:-1)}
      else if(k>=65&&k<=90&&!e.ctrlKey&&!e.altKey){e.preventDefault();e.stopPropagation();apLetter(k)}
      else if(k===9){e.preventDefault();e.stopPropagation();apHFocus()}
      else if(((k>=48&&k<=57)||(k>=96&&k<=105))&&!e.ctrlKey&&!e.altKey){var ae=document.activeElement;if(!ae||ae.id!=='apH'){apHFocus();AP.hEdit=true}}
      return}
    if(ovShown('mTx')){
      if(k===13){e.preventDefault();e.stopPropagation();waOpen()}
      else if(k===27){e.preventDefault();e.stopPropagation();txClose()}
      return}
    if(ovShown('mNew')){
      if(k===13){e.preventDefault();e.stopPropagation();newOk()}
      else if(k===27){e.preventDefault();e.stopPropagation();newNo()}
      return}
    if(ovShown('mCu')){
      if(k===13){if($('cuGo').style.display!=='none'&&!CU.busy&&!CU.wr){e.preventDefault();e.stopPropagation();cuApply()}}
      else if(k===27){e.preventDefault();e.stopPropagation();cuClose()}
      return}
    if(ovShown('mJp')){
      if(k===27){e.preventDefault();e.stopPropagation();jpClose()}
      else if(k===13){var tg=e.target||e.srcElement;if(!tg||tg.tagName!=='SELECT'){e.preventDefault();e.stopPropagation();jpSave()}}
      return}
    if(VIEW==='reg'&&!ovOpen()){
      if(k===113){e.preventDefault();setTipo('I')}
      else if(k===114){e.preventDefault();setTipo('R')}
      else if(k===115){e.preventDefault();setTipo('D')}}
  },true);
}

/* =================== PERSONAL ADMINISTRATIVO =================== */
var AP={k:'I',rows:[],sel:0,busy:false,ok:false,hEdit:false};
function apNowTxt(){var d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())}
function apHSet(){AP.hEdit=false;$('apH').value=apNowTxt()}
function apHin(){var e=$('apH'),c=e.value.replace(/[^0-9:]/g,'');if(c!==e.value)e.value=c;AP.hEdit=true}
function apHFocus(){try{$('apH').focus();$('apH').select()}catch(e){}}
function apHParse(){var v=String($('apH').value).replace(/\s/g,''),q=/^(\d{1,2}):?(\d{2})$/.exec(v),h,m;
  if(!q)return null;h=parseInt(q[1],10);m=parseInt(q[2],10);
  if(h>23||m>59)return null;return{h:h,m:m}}
setInterval(function(){if(ovShown('mAp')&&!AP.hEdit&&!AP.busy)$('apH').value=apNowTxt()},15000);
function apTimeTxt(v){var m;
  if(typeof v==='number'){m=Math.round((v-Math.floor(v))*1440)%1440;return pad(Math.floor(m/60))+':'+pad(m%60)}
  return(v===null||v===undefined)?'':String(v).replace(/^\s+|\s+$/g,'')}
function apMsg(t,c){$('apMsg').innerHTML=t?'<span class="'+(c||'')+'">'+t+'</span>':''}
function apFind(ws){
  var r,h=0,out=[],n;
  for(r=1;r<=30;r++)if(cellTxt(ws,r,4).toUpperCase()==='NOMBRE'){h=r;break}
  if(!h)h=10;
  for(r=h+1;r<=h+60;r++){n=cellTxt(ws,r,4);if(!n)break;
    out.push({r:r,n:n,p:cellTxt(ws,r,3),i:apTimeTxt(ws.Cells(r,5).Value2),s:apTimeTxt(ws.Cells(r,6).Value2)})}
  return out}
function jobApRead(cb){
  var xl=null,ob=null,err='',rows=[],p=rp('inf');
  try{
    if(!p)throw new Error('falta la ruta del Informe');if(!fso.FileExists(p))throw new Error('no encuentro '+p);
    xl=xlStart();ob=openBook(xl,p,false);
    rows=apFind(findSheet(ob.wb,null,['JEFATURA']))
  }catch(e){err=e.message}
  finally{if(ob)closeBk(ob);xlQuit(xl)}
  cb(rows,err)}
function jobApSave(kind,row,nom,hh,mm,ow,cb,rty){
  var xl=null,ob=null,err='',res=null,p=rp('inf'),wrote=false,ws,c,ad,cur,col=(kind==='I'?5:6),v=(hh*60+mm)/1440;
  try{
    if(!p)throw new Error('falta la ruta del Informe');if(!fso.FileExists(p))throw new Error('no encuentro '+p);
    xl=xlStart();ob=openBook(xl,p,true);
    if(ob.wb.ReadOnly)throw new Error('el Informe esta abierto como solo lectura (otro equipo o una copia oculta de Excel); cierra Excel en el servidor y reintenta');
    ws=findSheet(ob.wb,null,['JEFATURA']);
    if(cellTxt(ws,row,4)!==nom)throw new Error('la lista de la hoja cambio: cierra esta ventana y vuelve a abrirla');
    c=ws.Cells(row,col);ad=String(c.Address(false,false));
    if(c.HasFormula===true)throw new Error('la celda '+ad+' tiene una formula: no escribo encima');
    cur=apTimeTxt(c.Value2);
    if(cur&&!ow){res={dup:cur}}
    else{
      try{if(!/h/i.test(String(c.NumberFormat)))c.NumberFormat='hh:mm'}catch(x){}
      c.Value2=v;wrote=true;
      if(Math.abs(nm(c.Value2)-v)>0.000001)throw new Error('no quedo escrito en '+ad+' (hoja protegida?)');
      ob.app.Calculate();ob.wb.Save();
      res={t:apTimeTxt(c.Value2),ad:ad}}
  }catch(e){err=e.message}
  finally{if(ob)closeBk(ob);xlQuit(xl)}
  if(err&&!wrote&&/solo lectura/i.test(err)&&!rty){if(killOrphans()>0){jobApSave(kind,row,nom,hh,mm,ow,cb,1);return}}
  if(err&&wrote)err='REVISA la hoja HORARIO DE JEFATURAS: se escribio la hora pero fallo despues ('+err+')';
  cb(err,res)}
function apOpen(k){
  if(cli()){alert('El ingreso y la salida del personal se capturan en la PC servidor (necesita Excel).');return}
  if(!rp('inf')){alert('Falta la ruta del Informe (Conexion y archivos).');return}
  if(ovShown('mAp'))return;
  AP.k=k;AP.rows=[];AP.sel=0;AP.ok=false;AP.busy=false;
  try{document.activeElement.blur()}catch(e){}
  $('apT').innerHTML=(k==='I'?'Ingreso':'Salida')+' del personal';
  $('apBtn').innerHTML=(k==='I'?'Guardar ingreso':'Guardar salida')+' (Enter)';
  apMsg('');apHSet();$('mAp').style.display='flex';apLoad()}
function apClose(){$('mAp').style.display='none';regFocus()}
function apLoad(){
  AP.ok=false;$('apInfo').innerHTML='Leyendo la hoja HORARIO DE JEFATURAS...';apDraw();
  jobRun(function(){jobApRead(function(rows,err){
    if(err){AP.rows=[];$('apInfo').innerHTML='<span class="dn">No pude leer la hoja: '+esc(err)+'</span>';apDraw();return}
    AP.rows=rows;AP.ok=true;if(AP.sel>=rows.length)AP.sel=0;
    $('apInfo').innerHTML=rows.length?'Se guarda la hora actual en la columna de '+(AP.k==='I'?'ingreso':'salida')+' del nombre elegido.':'<span class="dn">No encontre nombres en la hoja HORARIO DE JEFATURAS (columna NOMBRE).</span>';
    apDraw()})})}
function apDraw(){
  var h='',i,x,a,b,hi=(AP.k==='I');
  for(i=0;i<AP.rows.length;i++){x=AP.rows[i];
    a=(hi?'<i style="font-style:normal;font-weight:700">Ingreso: '+(x.i||'--')+'</i>':'Ingreso: '+(x.i||'--'));
    b=(!hi?'<i style="font-style:normal;font-weight:700">Salida: '+(x.s||'--')+'</i>':'Salida: '+(x.s||'--'));
    h+='<div class="hsr'+(i===AP.sel?' on':'')+'" onclick="apPick('+i+')" ondblclick="apSave()"><b>'+esc(x.n)+(x.p?' <small style="font-weight:400;opacity:.75">'+esc(x.p)+'</small>':'')+'</b><span>'+a+' &nbsp;&middot;&nbsp; '+b+'</span></div>'}
  $('apList').innerHTML=h}
function apPick(i){AP.sel=i;apDraw()}
function apMove(d){var n=AP.rows.length;if(!n)return;AP.sel=(AP.sel+d+n)%n;apDraw()}
function apLetter(code){var n=AP.rows.length,i,j,c=String.fromCharCode(code);
  for(j=1;j<=n;j++){i=(AP.sel+j)%n;if(nkey(AP.rows[i].n).charAt(0)===c){AP.sel=i;apDraw();return}}}
function apSave(){apGo(AP.sel,false)}
function apGo(ix,ow){
  var x=AP.rows[ix],k=AP.k,t=apHParse(),H=t?t.h:0,M=t?t.m:0,lb=(k==='I'?'ingreso':'salida');
  if(AP.busy)return;
  if(!t){apMsg('La hora no es valida: escribela como HH:MM (por ejemplo 18:30).','dn');apHFocus();return}
  if(!AP.ok||!x){apMsg('Espera: todavia estoy leyendo la hoja.','dn');return}
  AP.busy=true;apMsg('Guardando '+esc(x.n)+'...','');
  jobRun(function(){jobApSave(k,x.r,x.n,H,M,ow,function(err,res){
    AP.busy=false;
    if(err){apMsg('NO guardado: '+esc(err),'dn');return}
    if(res&&res.dup){
      apMsg('');
      if(confirm(x.n+' ya tiene '+lb+' a las '+res.dup+'.\n\n\u00bfSobrescribir con '+pad(H)+':'+pad(M)+'?'))apGo(ix,true);
      return}
    if(k==='I')x.i=res.t;else x.s=res.t;
    apMsg('Registrado: '+lb+' de '+esc(x.n)+' a las '+res.t,'up');apHSet();apDraw()})})}

/* =================== PREMIOS (F6) =================== */
var PR={all:[],vis:[],sel:0,pit:-1,busy:false,ok:false,hEdit:false,alt:false};
function tm12(v){var m,h;if(typeof v!=='number')return '';m=Math.round((v-Math.floor(v))*1440)%1440;h=Math.floor(m/60);return (h%12||12)+':'+pad(m%60)+' '+(h>=12?'PM':'AM')}
function fmtS(s){var d=new Date(Date.UTC(1899,11,30)+s*86400000);return pad(d.getUTCDate())+'/'+pad(d.getUTCMonth()+1)}
function prFol(n){return ('000'+n).slice(-3)}
function prFull(x){return !(isEmp(x.g)&&isEmp(x.o))}
function prSheet(wb){var mn=MES[FE.getMonth()],yy=String(FE.getFullYear()),i,w,n;
  for(i=1;i<=wb.Worksheets.Count;i++){w=wb.Worksheets.Item(i);n=String(w.Name).toUpperCase();if(n.indexOf(mn)>=0&&n.indexOf(yy)>=0)return w}
  throw new Error('no encuentro la hoja de '+mn+' '+yy+' en el archivo de Premios')}
function prCols(ws){var r,c,t,h=0,m={};
  for(r=1;r<=30&&!h;r++)if(cellTxt(ws,r,2).toUpperCase()==='FECHA')h=r;
  if(!h)throw new Error('no encuentro el encabezado FECHA en la hoja "'+ws.Name+'"');
  m.hd=h;
  for(c=2;c<=14;c++){t=cellTxt(ws,h,c).toUpperCase();
    if(t==='FECHA')m.f=c;else if(t==='HORARIO')m.h=c;else if(t.indexOf('HORA')===0)m.e=c;else if(t==='MESA')m.m=c;else if(t.indexOf('PIT')===0)m.p=c;else if(t==='GANADOR')m.g=c;else if(t==='FOLIO')m.o=c;else if(t==='MONTO')m.t=c}
  if(!(m.f&&m.h&&m.e&&m.m&&m.p&&m.g&&m.o&&m.t))throw new Error('faltan encabezados en la hoja "'+ws.Name+'" (FECHA, HORARIO, HORA DE ENTREGA, MESA, PIT BOSS / SUP., GANADOR, FOLIO, MONTO)');
  return m}
function prRead(ws){var m=prCols(ws),h=m.hd,v=rr(ws,'A'+(h+1)+':N'+(h+150)),out=[],i,x,d;
  for(i=0;i<v.length;i++){x=v[i];d=x[m.f-1];
    if(typeof d!=='number'){if(out.length)break;continue}
    out.push({r:h+1+i,d:Math.round(d),h:x[m.h-1],e:x[m.e-1],p:x[m.p-1],g:x[m.g-1],o:x[m.o-1],t:x[m.t-1]})}
  return out}
function jobPrRead(cb){
  var xl=null,ob=null,err='',rows=[],p=rp('pre');
  try{
    if(!p)throw new Error('falta la ruta del archivo de Premios');if(!fso.FileExists(p))throw new Error('no encuentro '+p);
    xl=xlStart();ob=openBook(xl,p,false);
    rows=prRead(prSheet(ob.wb))
  }catch(e){err=e.message}
  finally{if(ob)closeBk(ob);xlQuit(xl)}
  cb(rows,err)}
function jobPrSave(row,dd,hr,fol,nom,pit,hh,mm,ow,cb,rty){
  var xl=null,ob=null,err='',res=null,p=rp('pre'),wrote=false,ws,m,cs,i,c,v=(hh*60+mm)/1440,gv,ov;
  try{
    if(!p)throw new Error('falta la ruta del archivo de Premios');if(!fso.FileExists(p))throw new Error('no encuentro '+p);
    xl=xlStart();ob=openBook(xl,p,true);
    if(ob.wb.ReadOnly)throw new Error('el archivo de Premios esta abierto como solo lectura (otro equipo o una copia oculta de Excel); cierra Excel en el servidor y reintenta');
    ws=prSheet(ob.wb);m=prCols(ws);
    if(Math.round(nm(ws.Cells(row,m.f).Value2))!==dd||Math.abs(nm(ws.Cells(row,m.h).Value2)-hr)>0.0001)throw new Error('la hoja cambio: cierra esta ventana y vuelve a abrirla');
    cs=[m.e,m.m,m.p,m.g,m.o];
    for(i=0;i<cs.length;i++){c=ws.Cells(row,cs[i]);if(c.HasFormula===true)throw new Error('la celda '+String(c.Address(false,false))+' tiene una formula: no escribo encima')}
    gv=cellTxt(ws,row,m.g);ov=cellTxt(ws,row,m.o);
    if((gv||ov)&&!ow){res={dup:{g:gv,o:ov}}}
    else{
      c=ws.Cells(row,m.e);try{if(!/h/i.test(String(c.NumberFormat)))c.NumberFormat='[$-409]h:mm AM/PM;@'}catch(x){}
      c=ws.Cells(row,m.o);try{if(String(c.NumberFormat)==='General')c.NumberFormat='000'}catch(x){}
      wrote=true;
      ws.Cells(row,m.e).Value2=v;ws.Cells(row,m.m).Value2='PIT';ws.Cells(row,m.p).Value2=pit;ws.Cells(row,m.g).Value2=nom;ws.Cells(row,m.o).Value2=fol;
      if(Math.abs(nm(ws.Cells(row,m.e).Value2)-v)>0.000001||cellTxt(ws,row,m.p)!==pit||cellTxt(ws,row,m.g)!==nom||nm(ws.Cells(row,m.o).Value2)!==fol)
        throw new Error('no quedo escrito en la fila '+row+' (hoja protegida?)');
      ob.app.Calculate();ob.wb.Save();
      res={t:tm12(v)}}
  }catch(e){err=e.message}
  finally{if(ob)closeBk(ob);xlQuit(xl)}
  if(err&&!wrote&&/solo lectura/i.test(err)&&!rty){if(killOrphans()>0){jobPrSave(row,dd,hr,fol,nom,pit,hh,mm,ow,cb,1);return}}
  if(err&&wrote)err='REVISA el archivo de Premios (fila '+row+'): se escribio algo pero fallo despues ('+err+'). No lo repitas sin revisar.';
  cb(err,res)}
function prMsg(t,c){$('prMsg').innerHTML=t?'<span class="'+(c||'')+'">'+t+'</span>':''}
function prNow(){var d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())}
function prHSet(){PR.hEdit=false;$('prH').value=prNow()}
function prHin(){var e=$('prH'),c=e.value.replace(/[^0-9:]/g,'');if(c!==e.value)e.value=c;PR.hEdit=true}
function prFin(){var e=$('prF'),c=e.value.replace(/[^0-9]/g,'');if(c!==e.value)e.value=c}
function prNin(){var e=$('prN'),c=cleanTxt(e.value);if(c!==e.value)e.value=c}
function prHParse(){var v=String($('prH').value).replace(/\s/g,''),q=/^(\d{1,2}):?(\d{2})$/.exec(v),h,m;
  if(!q)return null;h=parseInt(q[1],10);m=parseInt(q[2],10);
  if(h>23||m>59)return null;return{h:h,m:m}}
setInterval(function(){if(ovShown('mPr')&&!PR.hEdit&&!PR.busy)$('prH').value=prNow()},15000);
function prOpen(nom){
  if(cli()){alert('El premio se captura en la PC servidor (necesita Excel).');return}
  if(!rp('pre')){alert('Falta la ruta del archivo de Premios (boton "Conexion y archivos...").');return}
  if(ovShown('mPr'))return;
  var l=RG().pit,i,lp=CFG.reg.prpit||'';
  PR.all=[];PR.vis=[];PR.sel=0;PR.ok=false;PR.busy=false;PR.alt=false;PR.pit=-1;
  for(i=0;i<l.length;i++)if(l[i]===lp)PR.pit=i;
  try{document.activeElement.blur()}catch(e){}
  $('prF').value='';$('prN').value=nom?cleanTxt(nom):'';prHSet();prMsg('');prPitDraw();
  $('mPr').style.display='flex';prLoad();
  try{$('prF').focus()}catch(e){}}
function prClose(){if(PR.busy)return;$('mPr').style.display='none';if(VIEW==='reg'&&RS.t==='P'){$('rgN').value='';RS.nom='';sugClear()}regFocus()}
function prVisSet(){var s=ser(FE),a=PR.all,i,v=[],d0=0;
  for(i=0;i<a.length;i++)if(a[i].d===s)v.push(a[i]);
  PR.alt=false;
  if(!v.length){
    for(i=0;i<a.length;i++)if(a[i].d>s&&!prFull(a[i])){d0=a[i].d;break}
    if(d0){PR.alt=true;for(i=0;i<a.length;i++)if(a[i].d===d0)v.push(a[i])}}
  PR.vis=v;PR.sel=0;
  for(i=0;i<v.length;i++)if(!prFull(v[i])){PR.sel=i;break}}
function prLoad(){
  PR.ok=false;$('prInfo').innerHTML='Leyendo el archivo de Premios...';prDraw();
  jobRun(function(){jobPrRead(function(rows,err){
    if(err){PR.all=[];PR.vis=[];$('prInfo').innerHTML='<span class="dn">No pude leer el archivo de Premios: '+esc(err)+'</span>';prDraw();return}
    PR.all=rows;PR.ok=true;prVisSet();
    $('prInfo').innerHTML=!PR.vis.length?'<span class="dn">No hay rifas pendientes en la hoja de '+MES[FE.getMonth()]+'.</span>':
      (PR.alt?'<span class="dn">No hay rifa programada para el dia de operacion '+fmtF(FE)+'.</span> Se muestran las siguientes rifas pendientes.':'Dia de operacion '+fmtF(FE)+': elige la rifa (clic o Re Pag / Av Pag).');
    prDraw()})})}
function prDraw(){
  var h='',i,x,t;
  for(i=0;i<PR.vis.length;i++){x=PR.vis[i];
    t=prFull(x)?'capturado: '+esc(String(x.g||''))+(typeof x.o==='number'?' &middot; folio '+prFol(x.o):''):'pendiente';
    h+='<div class="hsr'+(i===PR.sel?' on':'')+'" onclick="prPick('+i+')"><b>'+(PR.alt?fmtS(x.d)+' &middot; ':'')+tm12(x.h)+' &nbsp; '+m0(nm(x.t))+'</b><span>'+t+'</span></div>'}
  $('prList').innerHTML=h}
function prPick(i){PR.sel=i;prDraw();prRefocus()}
function prDrawMove(d){var n=PR.vis.length;if(!n)return;PR.sel=(PR.sel+d+n)%n;prDraw()}
function prPitDraw(){
  var l=RG().pit,h='',i,on;
  for(i=0;i<l.length;i++){on=(i===PR.pit);
    h+='<span class="b" style="margin:0.1875rem 0.375rem 0.1875rem 0;'+(on?'background:#e0b84f;color:#2b2208;border-color:#fff;font-weight:700':'')+'" onclick="prPitPick('+i+')">'+esc(l[i])+'</span>'}
  $('prP').innerHTML=h}
function prPitPick(i){PR.pit=i;prPitDraw();prRefocus()}
function prPitMove(d){var n=RG().pit.length;if(!n)return;PR.pit=(PR.pit<0)?(d>0?0:n-1):(PR.pit+d+n)%n;prPitDraw()}
function prRefocus(){try{if($('prF').value&&!$('prN').value)$('prN').focus();else if($('prF').value)$('prN').focus();else $('prF').focus()}catch(e){}}
function prEnter(id){if(id==='prF'&&!$('prN').value){try{$('prN').focus()}catch(e){}return}prSave()}
function prSave(){prGo(false)}
function prGo(ow){
  var x=PR.vis[PR.sel],l=RG().pit,t=prHParse(),fol=parseInt(String($('prF').value).replace(/[^0-9]/g,''),10),nom=cleanTxt($('prN').value).replace(/ $/,''),pit,n=PR.vis.length;
  if(PR.busy)return;
  if(!PR.ok||!x){prMsg('Espera: todavia estoy leyendo el archivo, o no hay una rifa que capturar.','dn');return}
  if(!(fol>0&&fol<=9999)){prMsg('Escribe el folio (numero).','dn');$('prF').focus();return}
  if(nom.length<3){prMsg('Escribe el nombre del ganador.','dn');$('prN').focus();return}
  if(PR.pit<0||PR.pit>=l.length){prMsg('Elige el Sup. / Pit Boss (flechas arriba/abajo o clic).','dn');return}
  if(!t){prMsg('La hora de entrega no es valida: escribela como HH:MM (por ejemplo 20:15).','dn');$('prH').focus();return}
  pit=l[PR.pit];PR.busy=true;prMsg('Guardando...','');
  jobRun(function(){jobPrSave(x.r,x.d,nm(x.h),fol,nom,pit,t.h,t.m,!!ow,function(err,res){
    var i,j;
    PR.busy=false;
    if(err){prMsg('NO guardado: '+esc(err),'dn');return}
    if(res&&res.dup){
      prMsg('');
      if(confirm('Esa rifa ya tiene capturado a '+res.dup.g+(res.dup.o?' (folio '+res.dup.o+')':'')+'.\n\n\u00bfSobrescribir con '+nom+' (folio '+fol+')?'))prGo(true);
      return}
    x.g=nom;x.o=fol;x.p=pit;x.e=(t.h*60+t.m)/1440;
    CFG.reg.prpit=pit;cfgSave();
    prMsg('Guardado: '+esc(nom)+', folio '+prFol(fol)+', rifa de '+tm12(x.h)+' &middot; entrega '+res.t+' &middot; '+esc(pit),'up');
    $('prF').value='';$('prN').value='';prHSet();
    for(i=1;i<=n;i++){j=(PR.sel+i)%n;if(!prFull(PR.vis[j])){PR.sel=j;break}}
    prDraw();try{$('prF').focus()}catch(e){}})})}

/* =================== ALARMAS (aforo y score de WhatsApp) + CAPTURA DE AFORO =================== */
var AL_DEF={mute:false,voice:'',
  af:{on:true,mode:'voz',txt:'Es hora de capturar el aforo',mp3:'',rep:30,min:0,vip:true,every:1},
  wa:{on:true,mode:'voz',txt:'Es hora de enviar el score de mesas por WhatsApp',mp3:'',rep:30,every:120,first:'12:00',last:0},
  afd:{d:'',h:{}}};
function ALM(){var k,j;if(!CFG.alm)CFG.alm={};
  for(k in AL_DEF){
    if(CFG.alm[k]===undefined)CFG.alm[k]=JSON.parse(JSON.stringify(AL_DEF[k]));
    else if(AL_DEF[k]!==null&&typeof AL_DEF[k]==='object'){for(j in AL_DEF[k])if(CFG.alm[k][j]===undefined)CFG.alm[k][j]=AL_DEF[k][j]}}
  if(!CFG.alm.v2){CFG.alm.v2=1;if(CFG.alm.wa.every===60)CFG.alm.wa.every=120}
  return CFG.alm}
var AFH=[11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3];
var AF={busy:false,st:'',q:[],qi:0,vals:[],mi:0,mes:[],last:-1};
var AL={on:false,start:0,chk:false,chkKey:'',sndAt:0,vo:null,wmp:null,aud:null,af:{show:false,snooze:0,nextSnd:0,recheck:false,msg:'',sn:5},wa:{show:false,snooze:0,nextSnd:0,msg:'',sn:5}};
function afIdxOf(h){return h>=11?h-11:(h<=3?h+13:-1)}
function afCur(){var h=new Date().getHours();if(h>=11)return h-11;if(h<=3)return h+13;if(h<=5)return 16;return -1}
function afShort(h){return (h%12===0?12:h%12)+(h<12?' am':' pm')}
function afLbl(h){return pad(h)+':00 ('+afShort(h)+')'}
function afDay(){var d=fechaOp();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function afDone(){var a=ALM(),k=afDay();if(a.afd.d!==k)a.afd={d:k,h:{}};return a.afd.h}
function afMesas(){var o=[],i;
  if(cli()&&AF.srvMes&&AF.srvMes.length)return AF.srvMes.slice(0);
  for(i=0;i<13;i++)o.push({n:M[i].n,col:4+i});
  if(ALM().af.vip){o.push({n:M[14].n,col:19});o.push({n:M[15].n,col:20})}
  return o}
function afSheet(wb){var n=String(RG().af||'').replace(/^\s+|\s+$/g,'').toUpperCase();return n?findSheet(wb,n):findSheet(wb,null,['AFORO'])}
function afHourOf(h){var mi,q;
  if(typeof h==='number'){mi=Math.round((h-Math.floor(h))*1440);return Math.floor(mi/60)%24}
  if(typeof h==='string'){q=/(\d{1,2})\s*:\s*(\d{2})/.exec(h);if(q)return parseInt(q[1],10)%24}
  return -1}
function afRowMap(v){var map=[],i,r,h,hit=0;for(i=0;i<17;i++)map.push(0);
  for(r=0;r<v.length;r++){h=afHourOf(v[r][0]);if(h>=0){i=afIdxOf(h);if(i>=0&&!map[i]){map[i]=10+r;hit++}}}
  if(hit<10)for(i=0;i<17;i++)map[i]=10+i;
  return map}

function jobAfRead(cb){
  var xl=null,err='',st=null,p=rp('inf');
  try{
    if(!p)throw new Error('falta la ruta del Informe');if(!fso.FileExists(p))throw new Error('no encuentro '+p);
    xl=xlStart();var ob=openBook(xl,p,false);
    try{
      var ws=afSheet(ob.wb),v=rr(ws,'C10:U27'),map=afRowMap(v),tb=[1,2,3,4,5,6,7,8,9,10,11,12,13,16,17],dn=afDone(),cur=afCur(),last=-1,i,j,r,any,x,pend=[];
      for(i=0;i<17;i++){r=map[i]-10;any=false;
        if(r>=0&&r<v.length)for(j=0;j<tb.length;j++){x=v[r][tb[j]];if(typeof x==='number'&&x>0)any=true}
        if(any||dn[AFH[i]])last=i}
      for(i=last+1;i<=cur;i++)pend.push(AFH[i]);
      st={pend:pend,last:last>=0?AFH[last]:-1}
    }finally{closeBk(ob)}
  }catch(e){err=e.message}
  finally{xlQuit(xl)}
  cb(st,err)}

function jobAfSave(h,mes,vals,cb,rty){
  var xl=null,err='',p=rp('inf');
  try{
    if(!p)throw new Error('falta la ruta del Informe');if(!fso.FileExists(p))throw new Error('no encuentro '+p);
    xl=xlStart();var ob=openBook(xl,p,true),wb=ob.wb;
    try{
      if(wb.ReadOnly)throw new Error('el Informe esta abierto como solo lectura (otro equipo o una copia oculta de Excel); cierra Excel en el servidor y reintenta');
      var ws=afSheet(wb),v=rr(ws,'C10:U27'),map=afRowMap(v),row=map[afIdxOf(h)],i,c,bad=[],bad2=[];
      if(!row)throw new Error('no encuentro el renglon de las '+afLbl(h));
      for(i=0;i<mes.length;i++){c=ws.Cells(row,mes[i].col);if(c.HasFormula===true)bad.push(String(c.Address(false,false)))}
      if(bad.length)throw new Error('hay formulas en '+bad.join(', ')+': no escribo encima');
      for(i=0;i<mes.length;i++)ws.Cells(row,mes[i].col).Value=vals[i]||0;
      for(i=0;i<mes.length;i++)if(Math.abs(nm(ws.Cells(row,mes[i].col).Value2)-(vals[i]||0))>0.001)bad2.push(mes[i].n);
      if(bad2.length)throw new Error('no quedo escrito en '+bad2.join(', ')+' (hoja protegida?)');
      ob.app.Calculate();wb.Save();
    }finally{closeBk(ob)}
  }catch(e){err=e.message}
  finally{xlQuit(xl)}
  if(err&&/solo lectura/i.test(err)&&!rty){if(killOrphans()>0){jobAfSave(h,mes,vals,cb,1);return}}
  cb(err)}

function afStart(){
  if(!cli()&&!rp('inf')){alert('Falta la ruta del Informe (Conexion y archivos).');return}
  if(AF.busy||ovShown('mAf'))return;
  if(fmtF(FE)!==fmtF(fechaOp())&&!confirm('La fecha del programa ('+fmtF(FE)+') no es el dia operativo ('+fmtF(fechaOp())+'). Capturar el aforo en el Informe de la fecha del programa?'))return;
  AF.busy=true;note(cli()?'Cargando... consultando al servidor el aforo.':'Revisando el aforo en el Informe...','');
  almHide('af');AL.af.recheck=false;
  afAsk(function(st,err){
    AF.busy=false;
    if(err){note('No pude revisar el aforo: '+esc(err),'dn');if(/aforo/i.test(err))alert('No encuentro la hoja del reporte de aforo. Escribe su nombre en Configuracion (Hoja de aforo).');return}
    if(!st.pend.length){note('Aforo al corriente'+(st.last>=0?' (ultima hora capturada: '+afLbl(st.last)+')':'')+'. No falta ninguna hora.','up');return}
    note('','');afOpen(st)})}
function afOpen(st){
  var l=[],i;AF.q=st.pend.slice(0);AF.qi=0;AF.last=st.last;AF.st='sum';AF.vals=[];AF.mi=0;AF.mes=afMesas();
  for(i=0;i<AF.q.length;i++)l.push(afLbl(AF.q[i]));
  $('afSum').innerHTML='<div style="font-size:1.125rem;margin:0.5rem 0">Faltan por capturar <b>'+AF.q.length+'</b> hora(s):</div>'+
    '<div style="font-size:1.25rem;font-weight:700;color:#e0b84f;margin:0.375rem 0">'+l.join(' &middot; ')+'</div>'+
    '<div class="hint">'+(st.last>=0?'Ultima hora capturada: '+afLbl(st.last):'Todavia no hay horas capturadas hoy')+'. Se captura en bucle: una hora tras otra, mesa por mesa en el orden del reporte (cada hora se guarda en el Informe al terminarla).</div>'+
    '<div class="f" style="margin-top:0.75rem"><span class="b p" onclick="afBegin()">Comenzar (Enter)</span><span class="b" onclick="afCancel()">Cancelar (Esc)</span></div>';
  $('afMsg').innerHTML='';$('mAf').style.display='flex';afRender()}
function afBegin(){AF.mes=afMesas();AF.vals=[];AF.mi=0;AF.st='cap';$('afMsg').innerHTML='';afRender()}
function afGrid(){var h='',i,v,c;
  for(i=0;i<AF.mes.length;i++){v=AF.vals[i];c='afc'+(AF.st==='cap'&&i===AF.mi?' cur':(v!==undefined?' ok':''));
    h+='<span class="'+c+'" onclick="afGo('+i+')"><small>'+esc(AF.mes[i].n)+'</small><b>'+(v===undefined?'-':v)+'</b></span>'}
  $('afGridW').innerHTML=h}
function afRender(){var h=AF.q[AF.qi],i,t=0,m;
  $('afSum').style.display=AF.st==='sum'?'block':'none';
  $('afCap').style.display=AF.st==='cap'?'block':'none';
  $('afRev').style.display=(AF.st==='rev'||AF.st==='wait')?'block':'none';
  $('afGridW').style.display=AF.st==='sum'?'none':'block';
  $('afT').innerHTML='Aforo &middot; '+(h===undefined?'':afLbl(h));
  if(AF.st==='cap'){m=AF.mes[AF.mi];
    $('afPr').innerHTML='Hora '+(AF.qi+1)+' de '+AF.q.length+' &middot; mesa '+(AF.mi+1)+' de '+AF.mes.length;
    $('afMn').innerHTML=esc(m.n);$('afV').value=AF.vals[AF.mi]?AF.vals[AF.mi]:'';
    afGrid();try{$('afV').focus();$('afV').select()}catch(e){}}
  else if(AF.st==='rev'||AF.st==='wait'){for(i=0;i<AF.mes.length;i++)t+=(AF.vals[i]||0);
    $('afRevT').innerHTML='Revisa los valores de las <b>'+afLbl(h)+'</b>. Total de clientes: <b>'+t+'</b>.'+(AF.st==='wait'?' Guardando...':'');afGrid()}}
function afRead(){var v=String($('afV').value).replace(/[^0-9]/g,'');AF.vals[AF.mi]=v===''?0:parseInt(v,10)}
function afNext(){if(AF.st!=='cap')return;afRead();if(AF.mi<AF.mes.length-1)AF.mi++;else AF.st='rev';afRender()}
function afBack(){if(AF.st!=='cap')return;afRead();if(AF.mi>0)AF.mi--;afRender()}
function afGo(i){if(AF.st==='cap')afRead();else if(AF.st!=='rev')return;AF.mi=i;AF.st='cap';afRender()}
function afCorrect(){if(AF.st!=='rev')return;AF.st='cap';AF.mi=AF.mes.length-1;afRender()}
function afAfter(h){afDone()[h]=1;cfgSave();AF.qi++;
  if(AF.qi>=AF.q.length){afClose();note('Aforo capturado y guardado hasta las '+afLbl(h)+'.','up');almHide('af');return}
  AF.vals=[];AF.mi=0;AF.st='cap';afRender()}
function afSave(){
  if(AF.st!=='rev')return;
  var h=AF.q[AF.qi],vals=AF.vals.slice(0),mes=AF.mes.slice(0);
  AF.st='wait';$('afMsg').innerHTML='';afRender();
  afWrite(h,mes,vals,function(err){
    if(err){AF.st='rev';afRender();$('afMsg').innerHTML='<span class="dn">NO se guardo: '+esc(err)+'</span>';return}
    afAfter(h)})}
function afSkip(){var h=AF.q[AF.qi];if(AF.st!=='cap'&&AF.st!=='rev')return;
  if(!confirm('Marcar las '+afLbl(h)+' como capturadas SIN escribir nada en el Informe?'))return;afAfter(h)}
function afCancel(){
  if(AF.st==='wait')return;
  if(AF.st==='cap'||AF.st==='rev'){if(!confirm('Salir de la captura? Lo de la hora en curso no se guardara.'))return}
  afClose()}
function afClose(){AF.st='';$('mAf').style.display='none';regFocus()}

function afAsk(cb){
  if(!cli()){jobRun(function(){jobAfRead(cb)});return}
  afCliReq('aq',{},function(r,err){
    if(!r){cb(null,err);return}
    if(!r.ok){cb(null,r.err||'error del servidor');return}
    AF.srvMes=r.mes||null;cb({pend:r.pend||[],last:(typeof r.last==='number'?r.last:-1)},'')},60000,'El servidor no respondio. Revisa que el servidor este abierto y repite.')}
function afWrite(h,mes,vals,cb){
  if(!cli()){jobRun(function(){jobAfSave(h,mes,vals,cb)});return}
  afCliReq('as',{h:h,v:vals},function(r,err){cb(r?(r.ok?'':(r.err||'error del servidor')):err)},120000,'El servidor no confirmo. NO se sabe si se guardo: revisa el Informe y vuelve a guardar (repetir es seguro: sobrescribe la misma hora).')}
function afCliReq(k,body,cb,ms,tmoMsg){
  var id=dvRid(k),o={k:k,id:id,n:CFG.nt.name},p;
  RS.afq=RS.afq||{};
  if(!CFG.nt.room){cb(null,'Falta el codigo de sala (Conexion...).');return}
  for(p in body)o[p]=body[p];
  RS.afq[id]=cb;
  ntPub('cmd',o,function(ok){if(!ok&&RS.afq[id]){delete RS.afq[id];cb(null,'No se pudo contactar al servidor (sin conexion).')}});
  setTimeout(function(){if(RS.afq[id]){delete RS.afq[id];cb(null,tmoMsg)}},ms)}
function afCliDone(m){var cb=RS.afq&&m.id&&RS.afq[m.id];if(!cb)return;delete RS.afq[m.id];cb(m,'')}
function srvAfQ(m){
  if(DUP||!m.id||SEEN[m.id])return;SEEN[m.id]=1;CFG.nt.since=NT.since;cfgSave();
  if(m._t&&new Date().getTime()/1000-m._t>120)return;
  if(!rp('inf')){ntPub('st',{k:'ar',id:m.id,ok:false,err:'Falta la ruta del Informe en el servidor (Conexion y archivos).'});return}
  jobRun(function(){jobAfRead(function(st,err){
    if(err)ntPub('st',{k:'ar',id:m.id,ok:false,err:String(err).substring(0,200)});
    else ntPub('st',{k:'ar',id:m.id,ok:true,pend:st.pend,last:st.last,mes:afMesas()})})})}
function srvAfSave(m){
  if(!m.id||SEEN[m.id])return;SEEN[m.id]=1;
  if(DUP||!claimTx(m.id))return;
  CFG.nt.since=NT.since;cfgSave();
  var by=String(m.n||'cliente').substring(0,20),h=m.h,v=m.v,mes,i;
  function no(msg){ntPub('st',{k:'az',id:m.id,ok:false,err:msg});regMsg('['+esc(by)+'] aforo rechazado: '+esc(msg),'dn')}
  if(m._t&&new Date().getTime()/1000-m._t>300){no('la solicitud llego con mas de 5 minutos de retraso y no se aplico; revisa el Informe y captura de nuevo');return}
  if(typeof h!=='number'||AFH.indexOf(h)<0){no('hora invalida');return}
  mes=afMesas();
  if(!v||v.length!==mes.length){no('la lista de mesas del cliente no coincide con la del servidor: vuelve a empezar el aforo');return}
  for(i=0;i<v.length;i++)if(typeof v[i]!=='number'||v[i]!==Math.floor(v[i])||v[i]<0||v[i]>99999){no('valor invalido en '+mes[i].n);return}
  if(!rp('inf')){no('falta la ruta del Informe en el servidor');return}
  regMsg('['+esc(by)+'] recibido: aforo de las '+afLbl(h)+'...','');
  jobRun(function(){jobAfSave(h,mes,v.slice(0),function(err){
    if(!err){afDone()[h]=1;cfgSave()}
    ntPub('st',{k:'az',id:m.id,ok:!err,err:String(err||'').substring(0,250)});
    regMsg('['+esc(by)+'] aforo de las '+afLbl(h)+(err?' NO se guardo: '+esc(err):' guardado.'),err?'dn':'up')})})}

function waFirst(d){var a=ALM().wa,q=/^(\d{1,2})\s*:\s*(\d{2})$/.exec(String(a.first||'')),h=12,m=0;
  if(q){h=parseInt(q[1],10);m=parseInt(q[2],10);if(h>23||m>59){h=12;m=0}}
  return new Date(d.getFullYear(),d.getMonth(),d.getDate()+(h<11?1:0),h,m,0).getTime()}
function waDue(){var a=ALM().wa,d=fechaOp(),base=new Date(d.getFullYear(),d.getMonth(),d.getDate(),11,0,0).getTime(),last=a.last||0;
  if(last<base)return waFirst(d);return last+Math.max(1,a.every)*60000}
function almScoreDone(){ALM().wa.last=new Date().getTime();cfgSave();AL.wa.snooze=0;almHide('wa')}
function snoozeCtl(w){var o='',i;for(i=1;i<=10;i++)o+='<option value="'+i+'"'+(i===AL[w].sn?' selected':'')+'>'+i+' min</option>';
  return '<select id="alS_'+w+'" class="cfi" onchange="AL.'+w+'.sn=parseInt(this.value,10)">'+o+'</select><span class="b" onclick="almSnooze(\''+w+'\')">Posponer</span>'}
function almDraw(){var h='',el=$('alBox'),l;
  if(AL.af.show)h+='<div class="alc"><h4>Aforo pendiente</h4><div class="alt">'+AL.af.msg+'</div><div class="f"><span class="b af" onclick="afStart()">Comenzar captura</span>'+snoozeCtl('af')+'<span class="b" onclick="almMuteToggle()" id="sndB3">Sonido</span></div></div>';
  if(AL.wa.show){l=ALM().wa.last;
    h+='<div class="alc"><h4>Score de WhatsApp</h4><div class="alt">'+(l?'Ultimo score: '+pad(new Date(l).getHours())+':'+pad(new Date(l).getMinutes())+'. ':'Todavia no se ha enviado el score. ')+'Ya toca enviarlo.</div><div class="f"><span class="b p" onclick="almWaGo()">Introducir fichas en circulacion</span>'+snoozeCtl('wa')+'<span class="b" onclick="almMuteToggle()" id="sndB4">Sonido</span></div></div>'}
  el.innerHTML=h;el.style.display=h?'flex':'none';almBtns()}
function almShow(w,msg){AL[w].show=true;AL[w].nextSnd=0;if(msg!==undefined)AL[w].msg=msg;almDraw()}
function almHide(w){if(!AL[w].show)return;AL[w].show=false;AL[w].nextSnd=0;almDraw();if(!AL.af.show&&!AL.wa.show)almStopSnd()}
function almSnooze(w){var n=parseInt(($('alS_'+w)||{}).value,10)||AL[w].sn||5;if(n<1)n=1;if(n>10)n=10;
  AL[w].sn=n;AL[w].snooze=new Date().getTime()+n*60000;if(w==='af')AL.af.recheck=true;almHide(w);note('Aviso pospuesto '+n+' min.','')}
function almWaGo(){almHide('wa');AL.wa.snooze=new Date().getTime()+180000;scoreOpen()}
function almAfCheck(){
  if(AL.chk)return;AL.chk=true;
  afAsk(function(st,err){
    AL.chk=false;
    if(ovShown('mAf'))return;
    if(err){if(cli()){AL.chkKey='';AL.af.snooze=new Date().getTime()+120000;return}almShow('af','No pude revisar el aforo en el Informe: '+esc(err));return}
    if(!st.pend.length){almHide('af');return}
    var l=[],i;for(i=0;i<st.pend.length;i++)l.push(afShort(st.pend[i]));
    almShow('af','Faltan por capturar <b>'+st.pend.length+'</b> hora(s): '+l.join(', ')+'.')})}

function almVoice(){if(AL.vo===null)return null;if(AL.vo)return AL.vo;try{AL.vo=new ActiveXObject('SAPI.SpVoice')}catch(e){AL.vo=null}return AL.vo}
function almSay(txt){var vo=almVoice(),n,i,want=ALM().voice;if(!vo)return false;
  try{if(want){n=vo.GetVoices();for(i=0;i<n.Count;i++)if(String(n.Item(i).GetDescription())===want){vo.Voice=n.Item(i);break}}}catch(e){}
  try{vo.Speak(txt,3);return true}catch(e2){return false}}
function almPlay(path){
  try{if(!AL.wmp)AL.wmp=new ActiveXObject('WMPlayer.OCX');AL.wmp.settings.volume=100;AL.wmp.URL=path;AL.wmp.controls.play();return true}catch(e){}
  try{AL.aud=new Audio('file:///'+path.replace(/\\/g,'/'));AL.aud.play();return true}catch(e2){}
  return false}
function almStopSnd(){try{if(AL.vo)AL.vo.Speak('',3)}catch(e){}try{if(AL.wmp)AL.wmp.controls.stop()}catch(e2){}try{if(AL.aud)AL.aud.pause()}catch(e3){}}
function almSound(o){
  if(o.mode==='mp3'&&o.mp3&&fso.FileExists(o.mp3)){if(almPlay(o.mp3))return}
  almSay(o.txt||'Aviso')}
function almBtns(){var m=ALM().mute,i,e,ids=['sndB1','sndB2','sndB3','sndB4'];
  for(i=0;i<ids.length;i++){e=$(ids[i]);if(e){e.innerHTML=m?'Sonido: NO':'Sonido: SI';e.className=m?'b d':'b'}}}
function almMuteToggle(){var a=ALM();a.mute=!a.mute;cfgSave();if(a.mute)almStopSnd();else{AL.af.nextSnd=0;AL.wa.nextSnd=0}almBtns()}

function almTick(){
  if(!AL.on)return;
  var now=new Date().getTime(),a=ALM(),d,k,w,ws=['af','wa'],i;
  if(a.wa.on&&!AL.wa.show&&now>=AL.wa.snooze&&afCur()>=0&&!ovShown('mSc')&&now>=waDue())almShow('wa');
  if(a.af.on&&!AL.chk&&!AF.busy&&!ovShown('mAf')&&now-AL.start>20000&&afCur()>=0&&(cli()?!!(CFG.nt.room&&RS.clSync):rp('inf'))){
    d=new Date();k=afDay()+'-'+d.getHours();
    if((AL.chkKey!==k&&afCur()%Math.max(1,a.af.every||1)===0&&d.getMinutes()>=a.af.min&&now>=AL.af.snooze)||(AL.af.recheck&&now>=AL.af.snooze)){AL.chkKey=k;AL.af.recheck=false;almAfCheck()}}
  if(!a.mute&&now>=AL.sndAt){
    for(i=0;i<ws.length;i++){w=ws[i];
      if(AL[w].show&&now>=AL[w].nextSnd){AL[w].nextSnd=now+Math.max(5,a[w].rep)*1000;AL.sndAt=now+6000;almSound(a[w]);break}}}}
function almStart(){
  if(AL.on)return;ALM();AL.on=true;AL.start=new Date().getTime();almBtns();
  var v=$('afV');
  v.onkeypress=function(e){e=e||window.event;var c=e.keyCode||e.which;if(c===13||e.ctrlKey)return true;return c>=48&&c<=57};
  v.oninput=function(){var c=this.value.replace(/[^0-9]/g,'');if(c!==this.value)this.value=c};
  document.addEventListener('keydown',function(e){
    if(!ovShown('mAf'))return;
    var k=e.keyCode;
    function stop(){e.preventDefault();e.stopPropagation()}
    if(AF.st==='sum'){if(k===13){stop();afBegin()}else if(k===27){stop();afCancel()}}
    else if(AF.st==='cap'){if(k===13){stop();afNext()}else if(k===38){stop();afBack()}else if(k===27){stop();afCancel()}}
    else if(AF.st==='rev'){if(k===13){stop();afSave()}else if(k===27){stop();afCorrect()}}
  },true);
  setInterval(almTick,2000)}

function almBlock(w,title){var a=ALM()[w],h='';
  h+='<div class="alh">'+title+'</div>';
  h+='<label class="alk"><input type="checkbox" id="al_'+w+'_on"'+(a.on?' checked':'')+'> Alarma activa</label>';
  h+='<span class="cfl">Tipo de aviso</span><select id="al_'+w+'_mode" class="cfi" style="width:20rem"><option value="voz"'+(a.mode==='voz'?' selected':'')+'>Voz (lee el texto)</option><option value="mp3"'+(a.mode==='mp3'?' selected':'')+'>Archivo de audio (.mp3)</option></select>';
  h+='<span class="cfl">Texto que dice la voz</span><input id="al_'+w+'_txt" class="cfi" type="text" style="width:100%" value="'+esc(a.txt)+'">';
  h+='<span class="cfl">Archivo .mp3</span><div class="f"><input id="al_'+w+'_mp3" class="cfi" type="text" style="flex:1" value="'+esc(a.mp3)+'"><span class="b" onclick="$(\'al_'+w+'_pk\').click()">Examinar</span>'+
     '<input id="al_'+w+'_pk" type="file" accept=".mp3,.wav" style="position:absolute;width:0;height:0;opacity:0" onchange="$(\'al_'+w+'_mp3\').value=this.value"></div>';
  h+='<span class="cfl">Repetir el sonido cada (segundos, mientras el aviso siga en pantalla)</span><input id="al_'+w+'_rep" class="cfi" type="text" style="width:6rem" value="'+a.rep+'">';
  if(w==='af'){
    h+='<span class="cfl">Avisar cada (horas: 1 = cada hora, 2 = cada 2 horas; se cuenta desde las 11:00)</span><input id="al_af_every" class="cfi" type="text" style="width:6rem" value="'+(a.every||1)+'">';
    h+='<span class="cfl">Minuto de la hora en que avisa (0 = en punto)</span><input id="al_af_min" class="cfi" type="text" style="width:6rem" value="'+a.min+'">';
    h+='<label class="alk"><input type="checkbox" id="al_af_vip"'+(a.vip?' checked':'')+'> Incluir sala VIP (Priv1 y Priv2) en la captura</label>'}
  else{h+='<span class="cfl">Hora del primer score del dia (HH:MM, 24 h). Si lo generas antes, el reloj arranca desde ese envio</span><input id="al_wa_first" class="cfi" type="text" style="width:6rem" value="'+esc(a.first||'12:00')+'">';
    h+='<span class="cfl">Despues del primer envio, avisar cada (minutos: 120 = cada 2 horas; se cuenta desde la ultima vez que se genero el Score)</span><input id="al_wa_every" class="cfi" type="text" style="width:6rem" value="'+a.every+'">'}
  h+='<div class="f" style="margin-top:0.5rem"><span class="b" onclick="almCfgTest(\''+w+'\')">Probar sonido</span><span class="b" onclick="almStopSnd()">Callar</span></div>';
  return h}
function almCfgOpen(){var a=ALM(),h='<option value="">(predeterminada de Windows)</option>',vo=almVoice(),i,n,d;
  try{if(vo){n=vo.GetVoices();for(i=0;i<n.Count;i++){d=String(n.Item(i).GetDescription());h+='<option value="'+esc(d)+'"'+(d===a.voice?' selected':'')+'>'+esc(d)+'</option>'}}}catch(e){}
  $('alVoice').innerHTML=h;
  $('alCf').innerHTML=almBlock('af','ALARMA DE AFORO')+almBlock('wa','ALARMA DE SCORE WHATSAPP');
  $('mAlc').style.display='flex'}
function almCfgClose(){almStopSnd();$('mAlc').style.display='none';regFocus()}
function almRead(w){var o={mode:$('al_'+w+'_mode').value,txt:String($('al_'+w+'_txt').value).replace(/^\s+|\s+$/g,''),mp3:String($('al_'+w+'_mp3').value).replace(/^\s+|\s+$/g,''),
  rep:parseInt($('al_'+w+'_rep').value,10)||30,on:$('al_'+w+'_on').checked};
  if(o.rep<5)o.rep=5;if(o.rep>600)o.rep=600;return o}
function almCfgTest(w){var o=almRead(w),a=ALM(),sv=a.voice;a.voice=$('alVoice').value;
  if(o.mode==='mp3'&&!fso.FileExists(o.mp3))alert('No encuentro el archivo .mp3; se usa la voz.');
  almSound(o);a.voice=sv}
function almCfgSave(){var a=ALM(),x,y,mn,ev,ae,fq,fs;
  x=almRead('af');y=almRead('wa');
  mn=parseInt($('al_af_min').value,10);if(isNaN(mn)||mn<0)mn=0;if(mn>59)mn=59;
  ev=parseInt($('al_wa_every').value,10);if(isNaN(ev)||ev<5)ev=120;if(ev>720)ev=720;
  ae=parseInt($('al_af_every').value,10);if(isNaN(ae)||ae<1)ae=1;if(ae>6)ae=6;
  fq=/^(\d{1,2})\s*:\s*(\d{2})$/.exec(String($('al_wa_first').value));
  if(fq&&parseInt(fq[1],10)<=23&&parseInt(fq[2],10)<=59)fs=pad(parseInt(fq[1],10))+':'+fq[2];
  else{alert('La hora del primer score debe ser HH:MM (por ejemplo 12:00). Se deja 12:00.');fs='12:00'}
  if((x.mode==='mp3'&&!fso.FileExists(x.mp3))||(y.mode==='mp3'&&!fso.FileExists(y.mp3))){if(!confirm('Un archivo .mp3 no existe. Se usara la voz en su lugar. Guardar de todos modos?'))return}
  if(!x.txt)x.txt=AL_DEF.af.txt;if(!y.txt)y.txt=AL_DEF.wa.txt;
  a.voice=$('alVoice').value;
  a.af.on=x.on;a.af.mode=x.mode;a.af.txt=x.txt;a.af.mp3=x.mp3;a.af.rep=x.rep;a.af.min=mn;a.af.every=ae;a.af.vip=$('al_af_vip').checked;
  a.wa.on=y.on;a.wa.mode=y.mode;a.wa.txt=y.txt;a.wa.mp3=y.mp3;a.wa.rep=y.rep;a.wa.every=ev;a.wa.first=fs;
  cfgSave();almCfgClose();note('Alarmas guardadas.','up')}

/* =================== HOSTESS =================== */
var HS_DEF={names:['Rayito','Lorena','Angelin','Alejandro']};
function HSC(){if(!CFG.hs)CFG.hs={};if(!CFG.hs.names||!CFG.hs.names.length)CFG.hs.names=HS_DEF.names.slice(0);return CFG.hs}
var HS={saving:false,cur:null,curP:null,warn:'',sel:0,log:[],pend:0,logF:0};
function txtOf(x){return (x===null||x===undefined)?'':String(x).replace(/^\s+|\s+$/g,'')}
function hsVals(ws,row,cols,n){var o=[],i;for(i=0;i<n;i++)o.push(cols[i]?nm(ws.Cells(row,cols[i]).Value2):null);return o}
function hsFindInf(wb){
  var ws=findSheet(wb,'PROPINAS'),v=rr(ws,'A1:AD70'),r,c,t,r0=-1,c0=-1,hr=-1,tc=-1,cols=[];
  for(r=0;r<v.length&&r0<0;r++)for(c=0;c<v[r].length;c++){t=txtOf(v[r][c]);if(/^PROPINAS\s+HOS/i.test(t)){r0=r;c0=c;break}}
  if(r0<0)throw new Error('no encuentro el bloque PROPINAS HOSTESS en la hoja PROPINAS del Informe');
  for(r=r0+1;r<=r0+5&&r<v.length&&hr<0;r++)for(c=c0;c<v[r].length;c++)if(/^TOTAL$/i.test(txtOf(v[r][c]))){hr=r;tc=c;break}
  if(hr<0)throw new Error('no encuentro la columna TOTAL del bloque de hostess');
  for(c=c0;c<tc;c++){t=v[hr][c];if(typeof t==='string'&&txtOf(t)&&!/^FECHA$/i.test(txtOf(t)))cols.push(c+1)}
  if(!cols.length)throw new Error('no encuentro los nombres de las hostess en el encabezado del Informe');
  return{ws:ws,hrow:hr+1,drow:hr+2,cols:cols}}
function hsBlockPro(ws){
  var v=rr(ws,'B18:H46'),r,t,r0=-1,nr,nv,j,cols=[];
  for(r=0;r<v.length;r++){t=txtOf(v[r][1]);if(/HOSTESS/i.test(t)){r0=18+r;break}}
  if(r0<0)return null;
  nr=r0+1;nv=rr(ws,'C'+nr+':G'+nr)[0];
  for(j=0;j<nv.length;j++)if(typeof nv[j]==='string'&&txtOf(nv[j]))cols.push(3+j);
  return{r0:r0,nr:nr,cols:cols}}
function hsFindPro(wb,d){
  var sr=ser(d),i,w,b7,ws=null,best=-1,q,bl,v,r,row=-1;
  function isCtl(x){try{return /CONTROL INTERNO/i.test(txtOf(x.Range('D2').Value2))}catch(e){return false}}
  for(i=1;i<=wb.Worksheets.Count;i++){w=wb.Worksheets.Item(i);
    try{b7=w.Range('B7').Value2}catch(e){b7=null}
    if(typeof b7==='number'&&sr>=b7&&sr<=b7+15&&b7>best&&isCtl(w)){best=b7;ws=w}}
  if(!ws){q=d.getDate()<=15?/(^|\D)0?1\s*AL\s*15/i:/(^|\D)16\s*AL/i;
    for(i=1;i<=wb.Worksheets.Count;i++){w=wb.Worksheets.Item(i);if(q.test(String(w.Name))&&isCtl(w)){ws=w;break}}}
  if(!ws)throw new Error('no encuentro la hoja de la quincena de '+fmtF(d)+' en el archivo de Propinas');
  bl=hsBlockPro(ws);if(!bl)throw new Error('no encuentro PROPINAS HOSTESS en la hoja "'+ws.Name+'"');
  if(!bl.cols.length)throw new Error('no encuentro nombres de hostess en la hoja "'+ws.Name+'"');
  v=rr(ws,'B'+(bl.r0+2)+':B'+(bl.r0+18));
  for(r=0;r<v.length;r++)if(typeof v[r][0]==='number'&&Math.round(v[r][0])===sr){row=bl.r0+2+r;break}
  if(row<0)throw new Error('no encuentro el dia '+fmtF(d)+' en la hoja "'+ws.Name+'"');
  return{ws:ws,row:row,cols:bl.cols}}

function jobHsRead(cb){
  var xl=null,err='',res={inf:null,pro:null,warn:''},pi=rp('inf'),pp=rp('pro'),n=HSC().names.length,ob,ob2,b,c;
  try{
    if(!pi)throw new Error('falta la ruta del Informe');if(!fso.FileExists(pi))throw new Error('no encuentro '+pi);
    xl=xlStart();
    ob=openBook(xl,pi,false);
    try{b=hsFindInf(ob.wb);res.inf={vals:hsVals(b.ws,b.drow,b.cols,n),cols:b.cols.length}}finally{closeBk(ob)}
    if(!pp)res.warn='Falta la ruta del archivo de Propinas (Conexion y archivos): por ahora solo se guarda en el Informe.';
    else if(!fso.FileExists(pp))res.warn='No encuentro el archivo de Propinas: '+esc(pp)+'. No se podra guardar hasta corregirlo.';
    else{try{ob2=openBook(xl,pp,false);try{c=hsFindPro(ob2.wb,FE);res.pro={vals:hsVals(c.ws,c.row,c.cols,n),sheet:String(c.ws.Name)}}finally{closeBk(ob2)}}
      catch(e2){res.warn='Archivo de Propinas: '+esc(e2.message)+'. No se podra guardar hasta corregirlo.'}}
  }catch(e){err=e.message}
  finally{xlQuit(xl)}
  cb(res,err)}

function jobHsSave(adds,cb,rty){
  var xl=null,err='',res=[],pi=rp('inf'),pp=rp('pro'),obs=[],tg=[],names=HSC().names,t,i,c,cur,ex,wrote=false,o1,o2,bi,bp;
  try{
    if(!pi)throw new Error('falta la ruta del Informe');if(!fso.FileExists(pi))throw new Error('no encuentro '+pi);
    xl=xlStart();
    o1=openBook(xl,pi,true);obs.push(o1);
    if(o1.wb.ReadOnly)throw new Error('el Informe esta abierto como solo lectura (otro equipo o una copia oculta de Excel); cierra Excel en el servidor y reintenta');
    bi=hsFindInf(o1.wb);tg.push({ws:bi.ws,row:bi.drow,cols:bi.cols,ob:o1,l:'el Informe'});
    if(pp){
      if(!fso.FileExists(pp))throw new Error('no encuentro el archivo de Propinas: '+pp);
      o2=openBook(xl,pp,true);obs.push(o2);
      if(o2.wb.ReadOnly)throw new Error('el archivo de Propinas esta abierto como solo lectura; cierralo o cierra Excel en el servidor y reintenta');
      bp=hsFindPro(o2.wb,FE);tg.push({ws:bp.ws,row:bp.row,cols:bp.cols,ob:o2,l:'Propinas (hoja "'+bp.ws.Name+'")'})}
    for(t=0;t<tg.length;t++)for(i=0;i<adds.length;i++)if(adds[i]>0){
      if(!tg[t].cols[i])throw new Error('no hay columna para "'+names[i]+'" en '+tg[t].l+'. Revisa los nombres (boton Nombres...) o el encabezado.');
      c=tg[t].ws.Cells(tg[t].row,tg[t].cols[i]);
      if(c.HasFormula===true&&!/^=[0-9+.\s]+$/.test(String(c.Formula)))throw new Error('la celda '+String(c.Address(false,false))+' de '+tg[t].l+' tiene una formula: no escribo encima')}
    for(t=0;t<tg.length;t++)for(i=0;i<adds.length;i++)if(adds[i]>0){
      c=tg[t].ws.Cells(tg[t].row,tg[t].cols[i]);cur=nm(c.Value2);ex=cur+adds[i];wrote=true;
      if(c.HasFormula===true)c.Formula=String(c.Formula)+'+'+adds[i];else c.Value=ex;
      if(Math.abs(nm(c.Value2)-ex)>0.001)throw new Error('no quedo escrito en '+String(c.Address(false,false))+' de '+tg[t].l+' (hoja protegida?)');
      if(t===0)res.push({i:i,add:adds[i],nw:ex})}
    for(t=0;t<tg.length;t++){tg[t].ob.app.Calculate();tg[t].ob.wb.Save()}
  }catch(e){err=e.message}
  finally{for(i=0;i<obs.length;i++)closeBk(obs[i]);xlQuit(xl)}
  if(err&&!wrote&&/solo lectura/i.test(err)&&!rty){if(killOrphans()>0){jobHsSave(adds,cb,1);return}}
  if(err&&wrote)err='REVISA el Informe y el archivo de Propinas: se escribio algo pero fallo despues ('+err+'). NO lo repitas sin revisar.';
  cb(err,res)}

function hsMoney(n){return m0(n)}
function hsNameI(){var n=HSC().names.length;if(HS.sel>=n)HS.sel=n-1;if(HS.sel<0)HS.sel=0;return HS.sel}
function hsMsg(t){$('hsMsg').innerHTML=t}
function hsDraw(){var nl=HSC().names,h='',i,cu,t;
  hsNameI();
  for(i=0;i<nl.length;i++){cu=HS.cur?HS.cur[i]:undefined;
    t=HS.cur?(cu===null?'<span class="dn">sin columna</span>':'hoy: '+hsMoney(cu)):'leyendo...';
    h+='<div class="hsr'+(i===HS.sel?' on':'')+'" onclick="hsPick('+i+')"><b>'+esc(nl[i])+'</b><span>'+t+'</span></div>'}
  $('hsList').innerHTML=h;hsPrev()}
function hsPrev(){var nl=HSC().names,i=hsNameI(),a=parseInt(String($('hsAmt').value).replace(/[^0-9]/g,''),10)||0,cu=HS.cur?HS.cur[i]:null;
  $('hsSel').innerHTML=esc(nl[i]||'');
  $('hsN').innerHTML=(a>0&&HS.cur&&cu!==null&&cu!==undefined)?'<span class="up">= '+hsMoney(cu+a)+'</span>':''}
function hsPick(i){HS.sel=i;hsDraw();hsFocus()}
function hsMove(d){var n=HSC().names.length;HS.sel=(hsNameI()+d+n)%n;hsDraw()}
function hsLetter(code){var nl=HSC().names,n=nl.length,i,j,c=String.fromCharCode(code);
  for(j=1;j<=n;j++){i=(HS.sel+j)%n;if(nkey(nl[i]).charAt(0)===c){HS.sel=i;hsDraw();return}}}
function hsIn(){var e=$('hsAmt'),c=e.value.replace(/[^0-9]/g,'');if(c!==e.value)e.value=c;hsPrev()}
function hsKey(e){e=e||window.event;var k=e.keyCode;
  if(k===13){e.preventDefault();hsSave()}
  else if(k===27){e.preventDefault();hsClose()}
  else if(k===40){e.preventDefault();hsMove(1)}
  else if(k===38){e.preventDefault();hsMove(-1)}
  else if(k>=65&&k<=90&&!e.ctrlKey&&!e.altKey){e.preventDefault();hsLetter(k)}
  else if(k>=48&&k<=57||k===8||k===9||k===46||(k>=96&&k<=105)||k===37||k===39||k===36||k===35||e.ctrlKey){}
  else e.preventDefault()}
function hsLogDraw(){var h='',i,x,s;
  if(!HS.log.length){$('hsLog').innerHTML='';return}
  h='<h2>Capturado en esta sesion</h2><table class="t">';
  for(i=0;i<HS.log.length&&i<12;i++){x=HS.log[i];
    s=x.ok===1?'<span class="up">guardado'+(x.t?' &middot; total hoy '+hsMoney(x.t):'')+'</span>':(x.ok===-1?'<span class="dn">NO guardado: '+esc(x.st)+'</span>':'guardando...');
    h+='<tr><td>'+x.h+'</td><td>'+esc(x.n)+'</td><td class="n">+'+hsMoney(x.a)+'</td><td>'+s+'</td></tr>'}
  $('hsLog').innerHTML=h+'</table>'}
function hsLoad(){HS.cur=null;HS.curP=null;HS.warn='';hsDraw();$('hsInfo').innerHTML='Leyendo lo capturado hoy...';
  jobRun(function(){jobHsRead(function(res,err){
    if(err){HS.cur=null;$('hsInfo').innerHTML='<span class="dn">No pude leer el Informe: '+esc(err)+'</span>';hsDraw();return}
    HS.cur=res.inf.vals;HS.curP=res.pro?res.pro.vals:null;HS.warn=res.warn;
    var h='Dia de operacion '+fmtF(FE)+(res.pro?' &middot; archivo de Propinas: hoja "'+esc(res.pro.sheet)+'"':'');
    if(res.warn)h+='<br><span class="dn">'+res.warn+'</span>';
    if(res.inf.cols<HSC().names.length)h+='<br><span class="dn">El Informe solo tiene '+res.inf.cols+' columna(s) con nombre y hay '+HSC().names.length+' hostess en la lista.</span>';
    $('hsInfo').innerHTML=h;hsDraw()})})}
function hsOpen(){
  if(cli()){alert('Las propinas de hostess se capturan en la PC servidor (necesita Excel).');return}
  if(!rp('inf')){alert('Falta la ruta del Informe (Conexion y archivos).');return}
  if(ovShown('mHs'))return;
  if(HS.logF!==ser(FE)){HS.log=[];HS.logF=ser(FE)}
  $('hsT').innerHTML='Propinas hostess &middot; '+fmtF(FE);hsMsg('');$('hsAmt').value='';
  hsDraw();hsLogDraw();$('mHs').style.display='flex';
  hsFocus();
  hsLoad()}
function hsFocus(){try{$('hsAmt').focus();$('hsAmt').select()}catch(e){}}
function hsClose(){$('mHs').style.display='none';regFocus()}
function hsSave(){
  var nl=HSC().names,n=nl.length,i=hsNameI(),a=parseInt(String($('hsAmt').value).replace(/[^0-9]/g,''),10)||0,adds=[],j,ent,hh=new Date(),nom=nl[i];
  if(!HS.cur){hsMsg('<span class="dn">Espera un momento: todavia estoy leyendo lo capturado hoy.</span>');return}
  if(HS.cur[i]===null){hsMsg('<span class="dn">'+esc(nom)+' no tiene columna en el Informe: revisa los nombres (boton Nombres...).</span>');return}
  if(!(a>0)){hsMsg('<span class="dn">Escribe la propina de '+esc(nom)+'.</span>');return}
  for(j=0;j<n;j++)adds.push(j===i?a:0);
  ent={h:pad(hh.getHours())+':'+pad(hh.getMinutes()),n:nom,a:a,st:'',ok:0,t:0};
  HS.log.unshift(ent);HS.pend++;
  HS.cur[i]+=a;if(HS.curP&&typeof HS.curP[i]==='number')HS.curP[i]+=a;
  $('hsAmt').value='';hsMsg('');hsDraw();hsLogDraw();hsFocus();
  jobRun(function(){jobHsSave(adds,function(err,res){
    HS.pend--;
    if(err){ent.ok=-1;ent.st=err;
      if(ovShown('mHs')){hsLogDraw();hsMsg('<span class="dn">NO se guardo '+esc(nom)+' '+hsMoney(a)+': '+esc(err)+'</span>');hsLoad()}
      else alert('Hostess: NO se guardo '+nom+' '+hsMoney(a)+'\n\n'+err);
      return}
    ent.ok=1;if(res&&res.length)ent.t=res[0].nw;
    if(ovShown('mHs'))hsLogDraw();
    note('Hostess: '+esc(nom)+' +'+hsMoney(a)+' guardado.','up')})})}

function hsNames(){$('hnT').value=HSC().names.join('\n');$('hnH').checked=true;$('mHn').style.display='flex';try{$('hnT').focus()}catch(e){}}
function hsNamesClose(){$('mHn').style.display='none';if(ovShown('mHs'))hsFocus();else regFocus()}
function hsNamesSave(){
  var l=lines($('hnT').value),nn=[],i,t;
  for(i=0;i<l.length;i++){t=proper(cleanTxt(l[i]));if(t)nn.push(t)}
  if(!nn.length||nn.length>8){alert('Escribe entre 1 y 8 nombres (solo letras).');return}
  HSC().names=nn;cfgSave();
  var h=$('hnH').checked;$('mHn').style.display='none';
  if(ovShown('mHs')){hsDraw();hsLoad()}
  if(h){note('Cambiando los nombres en los encabezados...','');
    jobRun(function(){jobHsHeads(nn,function(msg,err){note(err?'<span class="dn">'+esc(err)+'</span>':esc(msg),err?'dn':'up')})})}
  else note('Nombres guardados en el programa (los encabezados de Excel no se tocaron).','up');
  if(ovShown('mHs'))hsFocus()}
function jobHsHeads(nn,cb){
  var xl=null,err='',out=[],pi=rp('inf'),pp=rp('pro'),o,o2,b,i,j,w,bl,k;
  try{
    xl=xlStart();
    if(pi&&fso.FileExists(pi)){o=openBook(xl,pi,true);
      try{if(o.wb.ReadOnly)out.push('Informe: solo lectura, no cambiado');
        else{b=hsFindInf(o.wb);for(i=0;i<nn.length&&i<b.cols.length;i++)b.ws.Cells(b.hrow,b.cols[i]).Value=nn[i];o.wb.Save();out.push('Informe')}}
      finally{closeBk(o)}}
    if(pp&&fso.FileExists(pp)){o2=openBook(xl,pp,true);k=0;
      try{if(o2.wb.ReadOnly)out.push('Propinas: solo lectura, no cambiado');
        else{for(j=1;j<=o2.wb.Worksheets.Count;j++){w=o2.wb.Worksheets.Item(j);
            try{bl=hsBlockPro(w)}catch(e1){bl=null}
            if(bl&&bl.cols.length){for(i=0;i<nn.length&&i<bl.cols.length;i++)w.Cells(bl.nr,bl.cols[i]).Value=nn[i];k++}}
          o2.wb.Save();out.push('Propinas ('+k+' hoja(s))')}}
      finally{closeBk(o2)}}
  }catch(e){err=e.message}
  finally{xlQuit(xl)}
  cb('Nombres actualizados en: '+(out.length?out.join(', '):'ningun archivo (revisa las rutas)')+'.',err)}

/* =================== CUADRAR =================== */
var CU={busy:false,wr:false,plan:null,done:null,note:''};
var CU_SIMB=1000;
function cuIdx(){return{m:{},mu:[]}}
function cuAddIdx(ix,name,i){var k=nkey(name),t,tm={},q;
  if(!k)return;
  if(ix.m[k]===undefined)ix.m[k]=i;
  t=k.split(' ');
  if(t.length>=2){for(q=0;q<t.length;q++)tm[t[q]]=1;ix.mu.push({i:i,k:k,t:t,tm:tm,sk:t.slice().sort().join(' ')})}}
function cuFindIdx(ix,name){var k=nkey(name),t,tm={},q,j,o,ok,sk;
  if(!k)return -1;
  t=k.split(' ');
  if(t.length<2)return ix.m[k]===undefined?-1:ix.m[k];
  for(q=0;q<t.length;q++)tm[t[q]]=1;
  sk=t.slice().sort().join(' ');
  for(j=0;j<ix.mu.length;j++){o=ix.mu[j];
    if(o.k===k||o.sk===sk)return o.i;
    ok=true;
    if(t.length<=o.t.length){for(q=0;q<t.length;q++)if(!o.tm[t[q]]){ok=false;break}}
    else{for(q=0;q<o.t.length;q++)if(!tm[o.t[q]]){ok=false;break}}
    if(ok)return o.i}
  return -1}
function cuDate(s){var d=new Date(Date.UTC(1899,11,30)+Math.floor(s)*86400000);return pad(d.getUTCDate())+'/'+pad(d.getUTCMonth()+1)}

function cuReadInf(xl,pl){
  var pi=rp('inf'),ob,ws,e1,tt,v,i,j,f=false,hr=4,bc=2;
  if(!pi)throw new Error('falta la ruta del Informe');if(!fso.FileExists(pi))throw new Error('no encuentro '+pi);
  ob=openBook(xl,pi,false);
  try{
    ws=findSheet(ob.wb,'INGRESOS Y RETIROS');e1=lastRow(ws);
    pl.ri=rr(ws,'D39:J'+e1);pl.rt=rr(ws,'L39:R'+e1);tt=totIR(ws,true);pl.totI=tt.ti;pl.totR=tt.tr;
    pl.dvInf=null;
    try{
      ws=findSheet(ob.wb,'DEVOLUCIONES');v=rr(ws,'A1:P20');
      for(i=0;i<v.length&&!f;i++)for(j=0;j<v[i].length;j++)if(typeof v[i][j]==='string'&&nkey(v[i][j])==='NOMBRE DEL CLIENTE'){hr=i+1;bc=j+1-3;f=true;break}
      if(bc<1)bc=2;
      v=rr(ws,colName(bc)+(hr+1)+':'+colName(bc+10)+(hr+600));
      pl.dvInf={hr:hr,bc:bc,rows:v}
    }catch(e2){pl.warn.push('Informe, hoja DEVOLUCIONES: '+e2.message)}
  }finally{closeBk(ob)}}
function cuReadRc(xl,pl){
  var pr=rp('rc'),ob,wsD,wsL,cols=[2,10,18],blk=[],b,k,ix,t,row,d,lv,i,cards=[],free=[],last=-1,names=[];
  if(!pr)throw new Error('falta la ruta del Rating Card');if(!fso.FileExists(pr))throw new Error('no encuentro el Rating Card ('+pr+')');
  ob=openBook(xl,pr,false);
  try{
    wsD=findSheet(ob.wb,'DETALLE');wsL=findSheet(ob.wb,null,['LISTA','CLIENTE']);
    for(b=0;b<3;b++)blk.push(rr(wsD,colName(cols[b])+'5:'+colName(cols[b]+5)+'5604'));
    for(k=0;k<160;k++)for(b=0;b<3;b++){
      ix=k*3+b;row=blk[b][k*35];t=(row&&row[0]!==null&&row[0]!==undefined)?String(row[0]).replace(/^\s+|\s+$/g,''):'';
      if(t){d=blk[b][k*35+1+pl.dia]||[];cards.push({ix:ix,k:k,b:b,nm:t,ing:nm(d[1]),ret:nm(d[2]),used:false})}
      else if(ix<=479)free.push(ix)}
    lv=rr(wsL,'C2:C5000');
    for(i=0;i<lv.length;i++){t=lv[i][0];if(!isEmp(t)){last=i;names.push(String(t))}}
    pl.cards=cards;pl.free=free;pl.lista=names;pl.listaLast=last;pl.listaMax=lv.length
  }finally{closeBk(ob)}}
function cuReadLibro(xl,pl){
  var p=rp('dev'),ob,ws,v,r,x,sn=MES[FE.getMonth()],out=[];
  pl.lib=null;
  if(!p){pl.warn.push('Falta la ruta del libro de devoluciones (Conexion y archivos): no se revisaron las devoluciones.');return}
  if(!fso.FileExists(p)){pl.warn.push('No encuentro el libro de devoluciones: '+p);return}
  ob=openBook(xl,p,false);
  try{
    try{ws=findSheet(ob.wb,sn)}catch(e1){pl.warn.push('El libro de devoluciones no tiene la hoja '+sn+': no se revisaron las devoluciones.');return}
    v=rr(ws,'B5:L1004');
    for(r=0;r<v.length;r++){x=v[r];
      if(typeof x[0]==='number'&&Math.floor(x[0])===pl.fe&&!isEmp(x[3])&&typeof x[6]==='number'&&x[6]>0)
        out.push({fe:Math.floor(x[0]),hora:x[1],fp:x[2],nom:String(x[3]),loss:x[4],pct:x[5],monto:x[6],lugar:x[7],rep:x[8],mon:x[9],cm:x[10]})}
    pl.lib=out
  }finally{closeBk(ob)}}

function cuBuild(pl){
  var G=[],gix=cuIdx(),i,j,g,c,cix=cuIdx(),lix=cuIdx(),fi=0,sI=0,sR=0,simb=0,ignI=0,ignR=0,nn={i:0,r:0},cI=0,cR=0;
  function add(rows,tp){var q,y,nme,z;
    for(q=0;q<rows.length;q++){y=rows[q];
      if(typeof y[2]!=='number'||y[2]===0)continue;
      if(isEmp(y[4])||!String(y[4]).replace(/\s/g,'')){if(tp==='I')nn.i+=y[2];else nn.r+=y[2];continue}
      nme=String(y[4]).replace(/^\s+|\s+$/g,'');z=cuFindIdx(gix,nme);
      if(z<0){z=G.length;G.push({n:nme,ing:0,ret:0,mesa:'',ign:isIgn(nme),ti:0,tr:0,sim:false,c:null});cuAddIdx(gix,nme,z)}
      if(tp==='I')G[z].ing+=y[2];else G[z].ret+=y[2];
      if(!G[z].mesa&&y[1])G[z].mesa=String(y[1])}}
  add(pl.ri,'I');add(pl.rt,'R');
  for(i=0;i<pl.cards.length;i++)cuAddIdx(cix,pl.cards[i].nm,i);
  for(i=0;i<pl.lista.length;i++)cuAddIdx(lix,pl.lista[i],i);
  pl.G=G;pl.nuevos=[];pl.fix=[];pl.addLista=[];pl.simb=[];pl.stray=[];pl.nCli=0;pl.nConIng=0;
  for(i=0;i<G.length;i++){g=G[i];
    if(g.ign){ignI+=g.ing;ignR+=g.ret;continue}
    pl.nCli++;if(g.ing>0)pl.nConIng++;
    g.ti=g.ing;g.tr=g.ret;g.sim=(g.ing===0&&g.ret>0);
    if(g.sim){g.ti=CU_SIMB;simb+=CU_SIMB;pl.simb.push(g)}
    sI+=g.ti;sR+=g.tr;
    j=cuFindIdx(cix,g.n);
    if(j>=0){c=pl.cards[j];
      if(c.used)pl.warn.push('Dos clientes del Informe coinciden con la ficha de '+c.nm+' ('+g.n+'): revisalos a mano.');
      c.used=true;g.c=c;
      if(c.ing!==g.ti||c.ret!==g.tr)pl.fix.push(g)}
    else{
      if(fi>=pl.free.length)throw new Error('no hay tarjetas libres en DETALLE para '+g.n);
      fi++;pl.nuevos.push(g)}
    if(cuFindIdx(lix,g.n)<0)pl.addLista.push(g)}
  for(j=0;j<pl.cards.length;j++){c=pl.cards[j];cI+=c.ing;cR+=c.ret;
    if(!c.used&&(c.ing||c.ret))pl.stray.push(c)}
  pl.exp={i:sI,r:sR};pl.ign={i:ignI,r:ignR};pl.nn=nn;pl.simbT=simb;pl.rc={i:cI,r:cR};
  pl.dvMiss=[];pl.dvExtra=[];pl.dvFree=[];pl.dvSum={lib:0,inf:0,libN:0,infN:0};
  if(pl.lib){var iR=[],x,L,f,y,v;
    if(pl.dvInf){v=pl.dvInf.rows;
      for(i=0;i<v.length;i++){x=v[i];
        if(!isEmp(x[3])&&typeof x[6]==='number')iR.push({nom:String(x[3]),fp:nm(x[2]),monto:x[6],u:false});
        if(isEmp(x[3])&&isEmp(x[4]))pl.dvFree.push(pl.dvInf.hr+1+i)}}
    for(i=0;i<pl.lib.length;i++){L=pl.lib[i];f=-1;pl.dvSum.lib+=L.monto;
      for(j=0;j<iR.length;j++){y=iR[j];
        if(!y.u&&Math.floor(y.fp)===Math.floor(nm(L.fp))&&Math.abs(y.monto-L.monto)<1&&sameName(y.nom,L.nom)){f=j;break}}
      if(f>=0)iR[f].u=true;else pl.dvMiss.push(L)}
    for(j=0;j<iR.length;j++){pl.dvSum.inf+=iR[j].monto;if(!iR[j].u)pl.dvExtra.push(iR[j])}
    pl.dvSum.libN=pl.lib.length;pl.dvSum.infN=iR.length;
    if(pl.dvMiss.length&&!pl.dvInf)pl.warn.push('No pude leer la hoja DEVOLUCIONES del Informe: no se pueden agregar las devoluciones que faltan.');
    else if(pl.dvMiss.length>pl.dvFree.length)pl.warn.push('La hoja DEVOLUCIONES del Informe no tiene filas libres para todas las que faltan.')}
  pl.pend=pl.nuevos.length+pl.fix.length+pl.addLista.length+pl.dvMiss.length}
function cuJobAnalyze(){
  var xl=null,pl={err:'',warn:[],fe:ser(FE),dia:FE.getDate()};
  try{
    xl=xlStart();
    cuReadInf(xl,pl);cuReadRc(xl,pl);cuReadLibro(xl,pl);cuBuild(pl)
  }catch(e){pl.err=e.message}
  finally{xlQuit(xl)}
  CU.plan=pl}

function cuRows(a,fn,mx){var h='',i;mx=mx||40;
  for(i=0;i<a.length&&i<mx;i++)h+='<tr>'+fn(a[i])+'</tr>';
  if(a.length>mx)h+='<tr><td colspan="4" class="hint">... y '+(a.length-mx)+' mas</td></tr>';
  return '<table class="t">'+h+'</table>'}
function cuMoneyCell(v){return '<td class="n">'+m0(v)+'</td>'}
function cuDraw(){
  var pl=CU.plan,h='',dI,dR,ok,i,nNewIng=0,nNewSim=0,d=CU.done;
  if(!pl)return;
  if(CU.note)h+=CU.note;
  if(pl.err){$('cuBody').innerHTML=h+'<div class="dn" style="font-size:1rem">No pude revisar: '+esc(pl.err)+'</div>';$('cuGo').style.display='none';return}
  dI=pl.rc.i-pl.exp.i;dR=pl.rc.r-pl.exp.r;
  ok=(pl.pend===0&&dI===0&&dR===0&&!pl.stray.length);
  for(i=0;i<pl.nuevos.length;i++){if(pl.nuevos[i].sim)nNewSim++;else nNewIng++}
  if(d){
    h+='<div class="cubx up"><b>Lo que se aplico</b><br>Clientes nuevos en el Rating Card: <b>'+d.nNew+'</b> ('+d.nNewIng+' con ingreso, '+d.nNewSim+' solo retiro con ingreso de '+m0(CU_SIMB)+')'+
       '<br>Fichas corregidas: <b>'+d.nFix+'</b> &middot; Agregados a la LISTA DE CLIENTES: <b>'+d.nLista+'</b> &middot; Devoluciones agregadas al Informe: <b>'+d.nDev+'</b>';
    if(d.names.length)h+='<br><span class="hint">Nuevos: '+esc(d.names.join(', '))+'</span>';
    h+='</div>'}
  if(ok)h+='<div class="cubx up" style="border-color:#5fd39b"><b>TODO CUADRA</b> &middot; Informe, Rating Card y devoluciones coinciden.</div>';
  else if(pl.pend>0)h+='<div class="cubx dn" style="border-color:#e0b84f"><b>Hay '+pl.pend+' cosa(s) por cuadrar.</b> Revisa el detalle y presiona <b>Aplicar cambios</b> (Enter).</div>';
  else h+='<div class="cubx dn" style="border-color:#a63d3d"><b>No hay nada que aplicar, pero los totales no coinciden:</b> revisa abajo (clientes que estan en el Rating Card y no en el Informe).</div>';
  h+='<h2>Totales del dia '+fmtF(FE)+'</h2><table class="t"><tr><th></th><th>Informe</th><th>No van al rating*</th><th>Ingreso simbolico</th><th>Esperado en Rating Card</th><th>Rating Card hoy</th><th>Diferencia</th></tr>'+
     '<tr><td>Ingresos</td>'+cuMoneyCell(pl.totI)+cuMoneyCell(pl.ign.i+pl.nn.i)+'<td class="n">'+(pl.simbT?'+ '+m0(pl.simbT):'-')+'</td>'+cuMoneyCell(pl.exp.i)+cuMoneyCell(pl.rc.i)+'<td class="n '+(dI?'dn':'up')+'">'+(dI?mS(dI):'0')+'</td></tr>'+
     '<tr><td>Retiros</td>'+cuMoneyCell(pl.totR)+cuMoneyCell(pl.ign.r+pl.nn.r)+'<td class="n">-</td>'+cuMoneyCell(pl.exp.r)+cuMoneyCell(pl.rc.r)+'<td class="n '+(dR?'dn':'up')+'">'+(dR?mS(dR):'0')+'</td></tr></table>';
  h+='<div class="hint">* Clientes de la lista de ignorados ('+m0(pl.ign.i)+' ing. / '+m0(pl.ign.r)+' ret.) y renglones sin nombre ('+m0(pl.nn.i)+' ing. / '+m0(pl.nn.r)+' ret.). Esperado = Informe - lo que no va al rating + ingreso simbolico de '+m0(CU_SIMB)+' por cada cliente que solo tiene retiros ('+pl.simb.length+' cliente(s)).</div>';
  h+='<div class="hint">Clientes en el Informe: <b>'+pl.nCli+'</b> ('+pl.nConIng+' con ingreso, '+pl.simb.length+' solo con retiro).</div>';
  if(pl.nuevos.length){
    h+='<h2>Clientes nuevos para el Rating Card: '+pl.nuevos.length+' ('+nNewIng+' con ingreso, '+nNewSim+' solo retiro &rarr; ingreso de '+m0(CU_SIMB)+')</h2>'+
      cuRows(pl.nuevos,function(g){return '<td>'+esc(g.n)+'</td>'+cuMoneyCell(g.ti)+cuMoneyCell(g.tr)+'<td class="hint">'+(g.sim?'ingreso simbolico':'')+'</td>'})}
  if(pl.fix.length){
    h+='<h2>Fichas que no coinciden con el Informe: '+pl.fix.length+'</h2>'+
      cuRows(pl.fix,function(g){return '<td>'+esc(g.n)+'</td><td class="n">Ingreso '+m0(g.c.ing)+' &rarr; <b>'+m0(g.ti)+'</b></td><td class="n">Retiro '+m0(g.c.ret)+' &rarr; <b>'+m0(g.tr)+'</b></td><td class="hint">'+(g.sim?'ingreso simbolico':'')+'</td>'})}
  if(pl.addLista.length){
    h+='<h2>Faltan en la LISTA DE CLIENTES: '+pl.addLista.length+'</h2><div class="hint" style="margin-top:0">'+esc(pl.addLista.slice(0,60).map(function(g){return g.n}).join(', '))+(pl.addLista.length>60?' ... y '+(pl.addLista.length-60)+' mas':'')+'</div>'}
  if(pl.stray.length){
    h+='<h2 class="dn">En el Rating Card con movimiento hoy, pero NO estan en el Informe: '+pl.stray.length+' (no se cambian)</h2>'+
      cuRows(pl.stray,function(c){return '<td>'+esc(c.nm)+'</td>'+cuMoneyCell(c.ing)+cuMoneyCell(c.ret)+'<td class="hint">revisalo a mano</td>'})}
  if(pl.lib){
    h+='<h2>Devoluciones del dia</h2><table class="t"><tr><th></th><th>Cantidad</th><th>Monto</th></tr>'+
       '<tr><td>Libro de devoluciones (hoja '+MES[FE.getMonth()]+')</td><td class="n">'+pl.dvSum.libN+'</td>'+cuMoneyCell(pl.dvSum.lib)+'</tr>'+
       '<tr><td>Informe (hoja DEVOLUCIONES)</td><td class="n">'+pl.dvSum.infN+'</td>'+cuMoneyCell(pl.dvSum.inf)+'</tr></table>';
    if(pl.dvMiss.length)h+='<h2 class="dn">Faltan en el Informe: '+pl.dvMiss.length+'</h2>'+
      cuRows(pl.dvMiss,function(x){return '<td>'+esc(x.nom)+'</td><td class="n">perdida del '+cuDate(nm(x.fp))+'</td>'+cuMoneyCell(x.monto)+'<td class="hint">'+esc(x.lugar||'')+'</td>'});
    else h+='<div class="hint up">No falta ninguna devolucion en el Informe.</div>';
    if(pl.dvExtra.length)h+='<h2>En el Informe pero no en el libro: '+pl.dvExtra.length+' (no se cambian)</h2>'+
      cuRows(pl.dvExtra,function(x){return '<td>'+esc(x.nom)+'</td><td class="n">perdida del '+cuDate(x.fp)+'</td>'+cuMoneyCell(x.monto)+'<td></td>'})}
  for(i=0;i<pl.warn.length;i++)h+='<div class="dn" style="margin-top:0.5rem">'+esc(pl.warn[i])+'</div>';
  $('cuBody').innerHTML=h;
  $('cuGo').style.display=(pl.pend>0)?'':'none'}

function cuPut(c,v,fmt){if(v===null||v===undefined||v==='')return;c.Value2=v;if(fmt)dvFmt(c,fmt)}
function cuPutDev(ws,row,bc,e){
  var c=function(k){return ws.Cells(row,bc+k)},h=c(6),a=false;
  cuPut(c(0),e.fe,'dd/mm/yyyy');
  if(typeof e.hora==='number')cuPut(c(1),e.hora,'hh:mm');
  if(typeof e.fp==='number')cuPut(c(2),e.fp,'dd/mm/yyyy');
  c(3).Value=e.nom;
  if(typeof e.loss==='number')cuPut(c(4),e.loss,'$#,##0');
  if(typeof e.pct==='number')cuPut(c(5),e.pct,'0%');
  try{a=(h.HasFormula===true)}catch(x){}
  if(!a)h.Value2=e.monto;
  dvFmt(h,'$#,##0');
  if(!isEmp(e.lugar))c(7).Value=String(e.lugar);
  if(!isEmp(e.rep))c(8).Value=String(e.rep);
  if(!isEmp(e.mon))c(9).Value=String(e.mon);
  if(!isEmp(e.cm))c(10).Value=String(e.cm);
  if(String(c(3).Value)!==e.nom)throw new Error('no quedo escrito en la fila '+row+' de DEVOLUCIONES (hoja protegida?)')}
function cuJobApply(pl,R){
  var xl=null,pr=rp('rc'),pi=rp('inf'),ob,wb,wsD,wsL,wsC,i,g,cell,ln,fi,ix,k,b,fr,col,r,cols=[2,10,18],tx,v,free,ws,bc,hr;
  try{
    xl=xlStart();
    if(pl.nuevos.length||pl.fix.length||pl.addLista.length){
      ob=openBook(xl,pr,true);wb=ob.wb;
      try{
        if(wb.ReadOnly)throw new Error('el Rating Card esta abierto como solo lectura en otro lado');
        wsD=findSheet(wb,'DETALLE');wsL=findSheet(wb,null,['LISTA','CLIENTE']);wsC=findSheet(wb,'RATING CARD');
        ln=pl.listaLast;
        for(i=0;i<pl.addLista.length;i++){g=pl.addLista[i];
          if(ln+1>=pl.listaMax)throw new Error('la LISTA DE CLIENTES esta llena');
          ln++;cell=wsL.Cells(2+ln,3);
          if(!isEmp(cell.Value2))throw new Error('la fila '+(2+ln)+' de la LISTA DE CLIENTES ya tiene datos; presiona Revisar de nuevo');
          R.wrote=true;cell.Value=g.n.toUpperCase();
          if(isEmp(cell.Value2))throw new Error('no quedo escrito en la LISTA DE CLIENTES (hoja protegida?)');
          R.nLista++}
        fi=0;
        for(i=0;i<pl.nuevos.length;i++){g=pl.nuevos[i];
          do{if(fi>=pl.free.length)throw new Error('no hay tarjetas libres en DETALLE');
            ix=pl.free[fi++];k=Math.floor(ix/3);b=ix%3;fr=5+k*35;col=cols[b]}while(cellTxt(wsD,fr,col)!=='');
          R.wrote=true;wsD.Cells(fr,col).Value=g.n.toUpperCase();
          r=fr+1+pl.dia;
          wsD.Cells(r,col+1).Value=g.ti;wsD.Cells(r,col+2).Value=g.tr;
          if(Math.abs(nm(wsD.Cells(r,col+1).Value2)-g.ti)>0.001||Math.abs(nm(wsD.Cells(r,col+2).Value2)-g.tr)>0.001)throw new Error('no quedo escrito en DETALLE fila '+r+' ('+g.n+')');
          tx=juegoTxt(g.mesa);
          if(tx&&cellTxt(wsC,5+ix,9)==='')wsC.Cells(5+ix,9).Value=tx;
          R.nNew++}
        for(i=0;i<pl.fix.length;i++){g=pl.fix[i];
          fr=5+g.c.k*35;col=cols[g.c.b];r=fr+1+pl.dia;
          if(!sameName(cellTxt(wsD,fr,col),g.n))throw new Error('la ficha de '+g.n+' cambio de lugar en el Rating Card; presiona Revisar de nuevo');
          R.wrote=true;wsD.Cells(r,col+1).Value=g.ti;wsD.Cells(r,col+2).Value=g.tr;
          if(Math.abs(nm(wsD.Cells(r,col+1).Value2)-g.ti)>0.001||Math.abs(nm(wsD.Cells(r,col+2).Value2)-g.tr)>0.001)throw new Error('no quedo escrito en DETALLE fila '+r+' ('+g.n+')');
          R.nFix++}
        ob.app.Calculate();wb.Save();
      }finally{closeBk(ob)}}
    if(pl.dvMiss.length&&pl.dvInf){
      ob=openBook(xl,pi,true);wb=ob.wb;
      try{
        if(wb.ReadOnly)throw new Error('el Informe esta abierto como solo lectura (otro equipo o copia oculta de Excel)');
        ws=findSheet(wb,'DEVOLUCIONES');hr=pl.dvInf.hr;bc=pl.dvInf.bc;
        v=rr(ws,colName(bc+3)+(hr+1)+':'+colName(bc+4)+(hr+600));free=[];
        for(i=0;i<v.length;i++)if(isEmp(v[i][0])&&isEmp(v[i][1]))free.push(hr+1+i);
        if(free.length<pl.dvMiss.length)throw new Error('no hay filas libres en la hoja DEVOLUCIONES');
        for(i=0;i<pl.dvMiss.length;i++){R.wrote=true;cuPutDev(ws,free[i],bc,pl.dvMiss[i]);R.nDev++}
        ob.app.Calculate();wb.Save();
      }finally{closeBk(ob)}}
  }catch(e){R.err=e.message}
  finally{xlQuit(xl)}}
function cuApply(){
  var pl=CU.plan;
  if(!pl||pl.err||CU.busy||CU.wr||!pl.pend)return;
  CU.wr=true;$('cuGo').style.display='none';
  $('cuBody').innerHTML='<div class="hint" style="font-size:1rem">Escribiendo en el Rating Card y en el Informe... no cierres el programa.</div>';
  jobRun(function(){
    var R={err:'',wrote:false,nNew:0,nFix:0,nLista:0,nDev:0},i,g,k,f,j,left;
    cuJobApply(pl,R);
    if(R.err&&!R.wrote&&/solo lectura/i.test(R.err)&&!pl.rty){pl.rty=1;if(killOrphans()>0){R.err='';cuJobApply(pl,R)}}
    CU.wr=false;
    if(R.err){
      CU.done=null;
      CU.note='<div class="cubx dn" style="border-color:#a63d3d">'+(R.wrote?'<b>REVISA:</b> se escribio algo pero fallo despues ('+esc(R.err)+'). Abajo se volvio a leer todo; lo que ya quedo escrito no se repite.':'<b>NO se escribio nada:</b> '+esc(R.err))+'</div>'}
    else{
      CU.note='';
      g={nNew:R.nNew,nNewIng:0,nNewSim:0,nFix:R.nFix,nLista:R.nLista,nDev:R.nDev,names:[]};
      for(i=0;i<pl.nuevos.length;i++){if(pl.nuevos[i].sim)g.nNewSim++;else g.nNewIng++;g.names.push(pl.nuevos[i].n)}
      CU.done=g;
      try{if(RS.clOk)for(i=0;i<pl.addLista.length;i++){k=nkey(pl.addLista[i].n);f=false;
          for(j=0;j<RS.cl.length;j++)if(RS.cl[j].k===k){f=true;break}
          if(!f){RS.cl.push({n:pl.addLista[i].n,k:k});RS.clH=lhash(RS.cl);if(srv())ntPub('st',{k:'a',n:pl.addLista[i].n})}}}catch(e1){}
      try{if(RS.rcp&&RS.rcp.length){left=[];for(i=0;i<RS.rcp.length;i++)if(RS.rcp[i].dia!==FE.getDate())left.push(RS.rcp[i]);
          RS.rcp=left;CFG.rcp=left;cfgSave();regRender()}}catch(e2){}}
    cuJobAnalyze();cuDraw()})}

/* ---- Inicializacion ---- */
window.onload=function(){
  function startInit(){
    try{var aw=screen.availWidth,ah=screen.availHeight,ww=Math.min(aw,Math.max(Math.min(900,aw),Math.round(aw*.85))),wh=Math.min(ah,Math.max(Math.min(600,ah),Math.round(ah*.9)));window.resizeTo(ww,wh);window.moveTo(Math.round((aw-ww)/2),Math.round((ah-wh)/2))}catch(e){}
    fit();
    FE=fechaOp();initState();cfgLoad();selBar();regBind();render();showView('reg');
    if(!CFG.nt.mode)CFG.nt.mode='cli'; // Forzar rol cliente si está vacío
    tfaGate(function(){lockShow(CFG.pw&&CFG.pw.h?'ask':'set',arranque)});
  }
  if(window.PLATFORM&&window.PLATFORM.readyPromise){
    window.PLATFORM.readyPromise.then(startInit);
  }else{
    startInit();
  }
};
function arranque(){
  titleSet();almStart();
  if(!CFG.nt.mode)CFG.nt.mode='cli';
  if(needRole()){$('rl').style.display='flex';return}
  if(cli()){clCacheLoad();regRender();if(CFG.nt.room){setStat('Conectando con el servidor...');ntStart()}else cfgOpen();monOpen(true);return}
  if(srv()){if(otherServer()){dupStop();return}lockWrite();ledTrim();if(ntSrvAuto())setTimeout(ntStart,2000);else ntStart()}
  if(CFG.pat.ban||CFG.pat.jp||CFG.pat.inf)sync(true);else cfgOpen();
  regInit();monOpen(true);
};
