# INVENTARIO TÉCNICO Y CLASIFICACIÓN DE DEPENDENCIAS
**Proyecto:** Migración Cliente Móvil Android - Cierre de Fichas (Capri GDL)  
**Fuente:** `cierre_fichas.hta` / `cierre_fichas.txt` (~4,750 líneas)  
**Fase 1:** Auditoría Exhaustiva

---

## 1. TABLA GENERAL DE FUNCIONES Y DEPENDENCIAS

| Función / Bloque | Línea aprox. | Dependencia de Windows / Entorno | Modo de Uso | Acción Android (Eliminar / Reemplazar / Mantener) |
|---|---|---|---|---|
| `$(i)` | 240 | Ninguna (DOM getElementById) | Ambos | Mantener |
| `f`, `mny`, `esc`, `pad`, `fmtF`, `ser` | 241-247 | Ninguna (Matemáticas, fechas) | Ambos | Mantener |
| `setStat` | 248 | Ninguna (DOM) | Ambos | Mantener |
| `fechaOp`, `moveDay`, `initState` | 251-255 | Ninguna (Lógica de fecha operativa 06:00) | Ambos | Mantener |
| `base`, `cfgPath` | 258-259 | `location.pathname` rutas Windows con `\` | Ambos | Reemplazar (vía `platform.js` / localStorage) |
| `fso` (variable global) | 245 | `new ActiveXObject("Scripting.FileSystemObject")` | Ambos (original) | Eliminar (sustituir por persistencia web) |
| `cfgLoad` | 260 | `fso.FileExists`, `fso.OpenTextFile` | Ambos | Reemplazar (localStorage / Capacitor Preferences) |
| `cfgSave` | 261 | `fso.CreateTextFile` | Ambos | Reemplazar (localStorage / Capacitor Preferences) |
| `resolve`, `rp`, `tok`, `pick` | 262-269 | Rutas de archivos Excel en disco | Servidor / Cfg | Eliminar en cliente (solo relevante si srv) |
| `roleOpen`, `setRole`, `needRole` | 270-276 | DOM / Configuración de rol | Ambos | Adaptar (Fijar modo cliente `cli` por defecto) |
| `cfgRows`, `ntTest`, `cfgOpen`, `cfgClose` | 277-308 | DOM / UI configuración ntfy / paths | Ambos | Adaptar (Ocultar selección de Excel en cli) |
| `rr` | 311-317 | `ws.Range().Value2`, `VBArray` (ActiveX Excel) | Servidor | Eliminar en cliente |
| `nm`, `lastRow`, `isJL`, `totIR`, `n1`, `rd`, `dayBlocks` | 318-326 | Excel Cells, Formulas, VBArray | Servidor | Eliminar en cliente |
| `readBan`, `readInf`, `jpSheet`, `jdate`, `jpRow`, `readJp` | 327-360 | Manipulación de Workbooks y hojas Excel | Servidor | Eliminar en cliente |
| `qW`, `schedule` | 361-362 | Cola de escritura pendiente | Ambos | Mantener / Adaptar |
| `isLocked`, `enableEdit`, `killOrphans`, `openBook`, `doFile` | 363-408 | Excel Process, ProtectedView, WMI `winmgmts`, fso | Servidor | Eliminar en cliente |
| `sync` | 409-432 | Orquestador de sync con Excel | Ambos | Mantener rama `cli()` (`clientFlush()`), eliminar rama `srv()` |
| `nSum`, `localT27`, `hasPend`, `applyRead` | 433-442 | Cálculos de UI y actualización de matriz | Ambos | Mantener |
| `SID`, `lockFile`, `ledgerFile`, `lockRead`, `lockWrite`, `otherServer`, `lockFree`, `dupStop`, `ledFind`, `claimTx`, `ledTrim` | 446-467 | FSO temporal, locks de archivo Windows, ledger anti-dup servidor | Servidor | Eliminar en cliente (cliente no procesa ledger) |
| `window.onunload` | 468 | Libera lock del servidor | Servidor | Eliminar en cliente |
| `cli`, `srv` | 469-470 | Comprobación de rol | Ambos | Mantener (retorna `cli() = true`, `srv() = false`) |
| `NTFY_DIR`, `ntDirFind`, `ntDirPick`, `ntDirInfo`, `ntSrvAuto` | 472-500 | `Shell.Application`, `WScript.Shell`, `ntfy.exe` ejecución local Windows | Servidor | Eliminar en cliente |
| `ntBase`, `ntTopic`, `netSet`, `ntPub` | 501-510 | XMLHttpRequest a servidor ntfy | Ambos | Mantener (Capa de red) |
| `ntStop`, `ntStart`, `ntConnect`, `ntPollMode`, `ntMsg` | 511-546 | WebSocket / Long polling ntfy | Ambos | Mantener (Capa de red) |
| `okItem`, `srvMsg` | 548-557 | Manejo de mensajes entrantes del servidor | Servidor | Eliminar en cliente |
| `errMsgs`, `buildSnap`, `pubSnap` | 558-571 | Empaquetado y emisión de estado en chunks | Servidor | Eliminar en cliente |
| `clientFlush` | 573-581 | Envío de lotes de cambios del cliente al servidor | Cliente | Mantener (Crucial para el APK) |
| `cliMsg` | 582-588 | Desempaquetado de chunks `ASM` recibidos | Cliente | Mantener (Crucial para el APK) |
| `applySnap` | 589-601 | Aplicación de datos snapshot recibidos de Excel | Cliente | Mantener (Crucial para el APK) |
| `reapply` | 602-610 | Reaplicación de cambios locales no confirmados | Cliente | Mantener |
| `fit`, `clampWins`, `window.onresize`, `winPos` | 614-627 | Dimensionamiento dinámico rem y ventanas | Ambos | Adaptar para viewport móvil / touch |
| `sumc`, `dif`, `inUse`, `visible`, `kt`, `titleSet`, `render`, `card` | 629-680 | Renderizado vista CIERRE | Ambos | Mantener / Adaptar UI |
| `WIN`, `ban`, `chipAddr`, `rowsFor`, `nWin`, `selCount`, `selBar`, `selToggle`, `tap`, `abrirSel`, `front`, `abrir`, `inp`, `pintar`, `toggleAll`, `modal`, `refreshWins` | 682-747 | Modales flotantes de mesas | Ambos | Mantener / Adaptar a pantalla táctil |
| `HIST`, `REDO`, `getv`, `put`, `act`, `afterHist`, `undo`, `redo`, `setChip`, `setP`, `setA`, `bump`, `opList`, `sinOp`, `cero`, `bulk`, `resetDia`, `sinOpSel`, `ceroSel`, `listo`, `closeAll`, `dragStart` | 748-831 | Undo/Redo, Sin operación, captura de fichas, arrastre | Ambos | Mantener lógica, eliminar drag de escritorio o adaptar |
| `sha256`, `pwHash`, `pwSalt`, `pwOk`, `pwSave`, `lockShow`, `lkOpen`, `lkGo` | 845-900 | Criptografía JS y modal de contraseña local | Ambos | Mantener / Adaptar |
| `devId`, `devKey`, `devTrusted`, `devTrust`, `tfaCheck`, `tfaGate`, `tfaOk`, `tfaStart`, `tfaPoll` | 903-936 | `WScript.Network` (ComputerName, Domain, User), 2FA ntfy | Ambos | Reemplazar `devId` por UUID / Device ID web |
| `RG`, `m0`, `ovShown`, `ovOpen`, `nkey`, `cleanTxt`, `proper`, `sameName`, `isIgn`, `juegoTxt`, `showView`, `regFocus`, `setTipo`, `regMsg`, `regRender` | 945-1002 | Lógica de negocio de clientes, validaciones, tabs | Ambos | Mantener |
| `jobRun`, `jobNext`, `xlStart`, `xlQuit`, `closeBk`, `findSheet`, `cellTxt`, `isEmp`, `sumCli` | 1005-1033 | Cola de tareas Excel en servidor | Servidor | Eliminar en cliente |
| `regInit`, `jobLoadCl`, `regReloadList`, `regTotRefresh` | 1035-1065 | Carga de clientes desde Rating Card | Ambos | En cliente llamar `regAskList()`, quitar `jobLoadCl` |
| `lhash`, `clPath`, `clCacheSave`, `clCacheLoad`, `regAskList`, `pubClients`, `pubCfg` | 1070-1100 | Hash de lista, caché en archivo JSON, peticiones | Ambos | Reemplazar FSO en caché por localStorage |
| `txCheck`, `regSrvMsg`, `srvTx`, `srvScore`, `regPubRes` | 1102-1144 | Validación de transacciones y handlers servidor | Servidor | Eliminar en cliente |
| `regSendTx`, `regCliMsg` | 1145-1190 | Envío de ticket por cliente y recepción de respuestas | Cliente | Mantener (Crucial) |
| `phon`, `lev`, `sugScore`, `sugUpdate`, `sugDraw`, `sugFit`, `sugSel`, `sugHover`, `sugClear`, `sugClick`, `regEnter`, `newOk`, `newNo`, `regPickName`, `dvStart` | 1193-1285 | Autocompletado fonético inteligente de clientes | Ambos | Mantener intacto (Lógica pura JS) |
| `minTipo`, `amtParse`, `amtOpen`, `amtPrev`, `amtOk`, `mesaPick`, `amtCancel` | 1288-1307 | Captura de monto y selección | Ambos | Mantener |
| `pickOpen`, `pkDraw`, `pkClose`, `pkPick`, `pkMove`, `pitPick`, `regCancel` | 1310-1328 | Selector de mesa y Supervisor / Pit Boss | Ambos | Mantener |
| `regSave` | 1331-1337 | Dispatcher de guardado de transacción | Ambos | Mantener rama `cli()` (`regSendTx`), quitar `jobSave` |
| `jobSave`, `rcUpdate`, `regRetry` | 1338-1422 | Escritura directa en Informe y Rating Card | Servidor | Eliminar en cliente |
| `hsTxt`, `hsFmtH`, `hsBlock`, `hsBuild`, `histSet`, `hsPack`, `hsUnpack`, `hsPublish`, `hsCliPart` | 1433-1463 | Serialización y fragmentación de historial | Ambos | Mantener en cliente `hsCliPart`, `hsUnpack`, `histSet` |
| `jobHistRead`, `histRefresh`, `srvHistQ` | 1466-1502 | Petición y refresh de historial de movimientos | Ambos | En cliente mantiene delegación a red (`afCliReq('hq')`) |
| `hsSelItem`, `hsFixSel`, `hsSide`, `hsBarHtml`, `hsScore`, `hsHtml`, `hxPick`, `hsSay`, `heMsg`, `heMp`, `heTipo`, `heFill`, `hsEdit`, `heClose`, `hsInList`, `heSave`, `hsDel`, `heDelete`, `hsAskDel`, `hsRun`, `hsOpDone` | 1505-1596 | UI y modales de edición y eliminación de historial | Ambos | Mantener UI, delega ejecución a red en cliente |
| `nwMark`, `nwHas`, `nwDel`, `hsListDrop`, `rcClear`, `hsNoFormulas`, `hsShiftUp`, `hsCheckOp`, `jobHistOp`, `srvHistOp` | 1599-1707 | Manipulación de filas y Rating Card en eliminación | Servidor | Eliminar en cliente (salvo helpers locales de UI) |
| `CIERRE_TO`, `PARTE_TO`, `esRojo`, `colorCelda`, `fechaLarga`, `parteCuerpo`, `cmN`, `cmX`, `cmD`, `horaAmPm`, `txtPropinas`, `txtFichas`, `infFila`, `infPon`, `jobCierre` | 1718-1808 | Textos de cierre y formateo | Ambos / Srv | Mantener formateadores; eliminar `jobCierre` en cliente |
| `CI`, `cierreMark`, `ciHM`, `ciParse`, `ciNear`, `ciTxt`, `ciSel`, `ciVal`, `ciOpen`, `ciHpIn`, `ciClose`, `ciAddName`, `ciGo`, `cierreMail` | 1810-1860 | Ventana de Cierre e invocación de correos | Ambos | Mantener UI, delegar a servidor vía `afCliReq('cc')` |
| `ciHora`, `ciLab`, `ciKind`, `ciParseLine`, `ciBlank`, `CIERRE_SUB`, `ciSubRows`, `ciNombres`, `ciFinBit`, `ciEsFecha`, `ciOper`, `ciCheck` | 1868-1936 | Inserción de texto en celdas de Excel | Servidor | Eliminar en cliente |
| `FNN_D`, `CT_G`, `itDig`, `itNum`, `termTxt`, `txtFnn`, `txtCartas`, `infBusca`, `infDados`, `infPonTxt`, `jobInfTxt`, `infTxtFin`, `infTxtSend`, `srvInfTxt`, `parseCartas`, `jobInfRead`, `infLeerReq`, `srvInfQ`, `ctFill` | 1938-2070 | Captura de FNN y Cartas | Ambos | Mantener UI y envío (`infTxtSend`), eliminar jobs Excel |
| `CJ`, `cjL`, `cjAmt`, `cjRsClean`, `txtCajas`, `cajasOpen`, `cjClose`, `cjPick`, `cjBack`, `cjRender`, `cjVals`, `cjPv`, `cjGo`, `cajasSend`, `jobCajas`, `srvCajas` | 2073-2195 | Captura y envío de cierre de Cajas | Ambos | Mantener UI y envío (`cajasSend`), eliminar `jobCajas` |
| `inRow`, `fnnOpen`, `fnnVals`, `fnnPv`, `fnnClose`, `fnnGo`, `ctRow`, `cartasOpen`, `ctQ`, `ctT`, `ctPv`, `ctClose`, `ctGo` | 2201-2244 | Modales mFn y mCt | Ambos | Mantener UI cliente |
| `cierreFin`, `cierreGo`, `srvCierre` | 2246-2283 | Lanzamiento de Gmail vía WScript.Shell | Ambos / Srv | En cliente reemplazar `WScript.Shell.Run` por `window.open(url, '_system')` |
| `monOpen`, `monSet`, `monOk`, `monClose`, `cleanMon` | 2286-2300 | Modal de selección de Operador/Monitorista | Ambos | Mantener |
| `regCfgOpen`, `regCfgClose`, `lines`, `regCfgSave` | 2303-2315 | Configuración de montos y mesas | Ambos | En cliente alerta o modo sólo lectura |
| `mS`, `note`, `scoreOpen`, `scPrev`, `scClose`, `scGo`, `readAforo`, `topCliente`, `sumJL`, `topGanadores`, `buildScore`, `jobScore`, `txOpen`, `txClose`, `txCopy`, `waOpen` | 2318-2428 | Generación de Score de WhatsApp y clipboard | Ambos | Mantener UI/envío; eliminar `jobScore`; reemplazar `clipboardData` y URL schemes |
| `DVC`, `dvMin`, `dvPct`, `dvRound`, `dvAmt`, `rpFor`, `dvPrev`, `dvMonKey`, `dvNum`, `dvParseDate`, `dvCfgFill`, `dvCfgRead`, `dvClear`, `dvLookup`, `dvFindCard`, `dvReadCard`, `dvReadLibro`, `dvCollect`, `dvJobLookup`, `dvBuild`, `dvStTxt`, `dvTable`, `dvDraw`, `dvName`, `dvChips`, `dvPickDay`, `dvOpen`, `dvIn`, `dvKey`, `dvClose`, `dvMsg2`, `dvSave`, `dvFmt`, `dvPut`, `dvJobSave` | 2434-2665 | Lógica y modal de Devoluciones (F4) | Ambos / Srv | Mantener UI de cliente (`dvCliAsk`, `dvCliSave`), eliminar lectura/escritura Excel |
| `dvYmd`, `dvRid`, `dvPack`, `dvPubRes`, `dvPubErr`, `srvDvQ`, `jobDvQ`, `dvCheck`, `dvPubZ`, `srvDvSave`, `dvRemoteDone` | 2673-2748 | Manejo RPC de devoluciones en servidor | Servidor | Eliminar en cliente |
| `dvCliFail`, `dvCliAsk`, `dvUnpack`, `dvCliRes`, `dvCliSave`, `dvCliSaved` | 2750-2808 | Cliente RPC de Devoluciones | Cliente | Mantener (Crucial para F4 en Android) |
| `JPF`, `JP_JUG`, `jpMesas`, `jm`, `jpVals`, `jx`, `jpBarRender`, `jpPrize`, `jpCol`, `jpNum`, `jpMsg2`, `jpOpen`, `nkeyIn`, `jpIn`, `jpClose`, `jpSave`, `jpJobSave` | 2816-2926 | Franja fija y modal de pago de Jackpot (F5) | Ambos / Srv | Mantener UI cliente y cálculo franja; eliminar `jpJobSave` |
| `srvJp`, `jpRemoteDone`, `jpCliSave`, `jpCliDone` | 2931-2977 | RPC de pago de Jackpot | Ambos | Mantener `jpCliSave` y `jpCliDone` en cliente |
| `JE`, `jeMsg`, `jeOpen`, `jeClose`, `jeSave`, `jeDel`, `jeRun`, `jeDone`, `jpJobOp`, `jpCheckOp`, `srvJpOp` | 2981-3081 | Edición y eliminación de Jackpot | Ambos / Srv | Mantener UI de cliente, delegar vía `afCliReq('jo')` |
| `fcOpen`, `fcRefresh`, `fcClose`, `fcShow` | 3084-3118 | Modal de Ficha completa de cliente | Ambos | Mantener (usa datos recibidos en `DV.res`) |
| `HDB`, `HD`, `mnApply`, `hkey`, `colName`, `hdOpen`, `hdClose`, `hdPaste`, `hdNames`, `hdSaveNames`, `hdGuardar`, `hdFiles`, `hdBuild`, `hdScan`, `jobHdScan`, `hdApply`, `jobHdApply` | 3123-3243 | Edición masiva de encabezados en archivos Excel | Servidor | Eliminar en cliente |
| `abrirArchivo` | 3246-3252 | `WScript.Shell.Run` abrir Excel en Windows | Servidor | Eliminar en cliente |
| `regBind` | 3255-3305 | Listeners de teclado físico (F2..F6, Enter, Esc, Tab) | Ambos | Mantener (con soporte touch complementario) |
| `AP`, `apNowTxt`, `apHSet`, `apHin`, `apHFocus`, `apHParse`, `apTimeTxt`, `apMsg`, `apFind`, `jobApRead`, `jobApSave`, `apOpen`, `apClose`, `apLoad`, `apDraw`, `apPick`, `apMove`, `apLetter`, `apSave`, `apGo` | 3310-3404 | Registro de Ingreso/Salida de Jefaturas | Servidor | Exclusivo servidor en legacy (o puenteable por ntfy) |
| `PR`, `tm12`, `fmtS`, `prFol`, `prFull`, `prSheet`, `prCols`, `prRead`, `jobPrRead`, `jobPrSave`, `prMsg`, `prNow`, `prHSet`, `prHin`, `prFin`, `prNin`, `prHParse`, `prOpen`, `prClose`, `prVisSet`, `prLoad`, `prDraw`, `prPick`, `prDrawMove`, `prPitDraw`, `prPitPick`, `prPitMove`, `prRefocus`, `prEnter`, `prSave`, `prGo` | 3409-3540 | Ganador de rifa / Premios (F6) | Servidor | Exclusivo servidor en legacy |
| `AL_DEF`, `ALM`, `AFH`, `AF`, `AL`, `afIdxOf`, `afCur`, `afShort`, `afLbl`, `afDay`, `afDone`, `afMesas`, `afSheet`, `afHourOf`, `afRowMap`, `jobAfRead`, `jobAfSave`, `afStart`, `afOpen`, `afBegin`, `afGrid`, `afRender`, `afRead`, `afNext`, `afBack`, `afGo`, `afCorrect`, `afAfter`, `afSave`, `afSkip`, `afCancel`, `afClose` | 3546-3700 | Motor de Alarmas y flujo de Aforo | Ambos / Srv | Mantener UI de Aforo en cliente, delegar persistencia |
| `afAsk`, `afWrite`, `afCliReq`, `afCliDone`, `srvAfQ`, `srvAfSave` | 3704-3755 | RPC cliente/servidor para Aforo (`aq`/`as`) | Ambos | Mantener `afAsk`, `afWrite`, `afCliReq`, `afCliDone` |
| `waFirst`, `waDue`, `almScoreDone`, `snoozeCtl`, `almDraw`, `almShow`, `almHide`, `almSnooze`, `almWaGo`, `almAfCheck` | 3758-3796 | Controladores de alerta en pantalla de Aforo/Score | Ambos | Mantener |
| `almVoice`, `almSay`, `almPlay`, `almStopSnd`, `almSound`, `almBtns`, `almMuteToggle` | 3799-3826 | Reproducción de audio (`SAPI.SpVoice`, `WMPlayer.OCX`, `Audio`) | Ambos | Reemplazar por Web Speech API / Web Audio / Capacitor Audio |
| `almTick`, `almStart`, `almBlock`, `almCfgOpen`, `almCfgClose`, `almRead`, `almCfgTest`, `almCfgSave` | 3829-3914 | Scheduler de alarmas y configuración | Ambos | Mantener lógica, adaptar audio |
| `HSC`, `HS`, `txtOf`, `hsVals`, `hsFindInf`, `hsBlockPro`, `hsFindPro`, `jobHsRead`, `jobHsSave`, `hsMoney`, `hsNameI`, `hsMsg`, `hsDraw`, `hsPrev`, `hsPick`, `hsMove`, `hsLetter`, `hsIn`, `hsKey`, `hsLogDraw`, `hsLoad`, `hsOpen`, `hsFocus`, `hsClose`, `hsSave`, `hsNames`, `hsNamesClose`, `hsNamesSave`, `jobHsHeads` | 3920-4100 | Captura y prorrateo de propinas Hostess | Servidor | Exclusivo servidor en legacy |
| `CU`, `CU_SIMB`, `cuIdx`, `cuAddIdx`, `cuFindIdx`, `cuDate`, `cuReadInf`, `cuReadRc`, `cuReadLibro`, `cuBuild`, `cuJobAnalyze`, `cuRows`, `cuMoneyCell`, `cuDraw`, `cuOpen`, `cuRecheck`, `cuClose`, `cuPut`, `cuPutDev`, `cuJobApply`, `cuApply` | 4108-4330 | Cuadre contable multidocumento | Servidor | Exclusivo servidor (bloqueado en cliente por confirm) |
| `window.onload`, `arranque` | 4333-4352 | Inicialización, resizeTo, moveTo, arranque | Ambos | Reemplazar inicio y fijar rol `cli()` |

---

## 2. CLASIFICACIÓN DETALLADA DE SUBSISTEMAS Y APIS WINDOWS

### 2.1. ActiveXObject y WMI
* **`Excel.Application`:**
  * Apariciones: L.245, 368, 386, 412, 1018, 2397, 2529, 2879, 3034, 3180, 3338, 3450, 3622, 3968, 4192.
  * *Acción Android:* **Eliminar 100%**. Ningún intento de instanciación ni fallback simulado. El APK cliente envía comandos remotos por ntfy.
* **`Scripting.FileSystemObject`:**
  * Apariciones: L.245, 260, 261, 289, 364, 381, 447, 451, 454, 458, 461, 464, 477, 488, 492, 1020, 1076, 1083, 3815, 3894, etc.
  * *Acción Android:* **Eliminar 100%**. Sustituir operaciones de lectura/escritura de configuración por almacenamiento local estándar (`localStorage` / Capacitor Storage).
* **`WScript.Shell`:**
  * Apariciones: L.495 (arranque de ntfy local), L.904 (obtención de usuario de red), L.2263, L.2266 (lanzamiento de Gmail), L.2424 (lanzamiento de WhatsApp), L.3250 (abrir Excel).
  * *Acción Android:* **Eliminar 100%**. Reemplazar apertura de URLs por `window.open(url, '_blank')` o intent `window.location.href`.
* **`WScript.Network`:**
  * Apariciones: L.904 (`n.ComputerName`, `n.UserDomain + '\\' + n.UserName`).
  * *Acción Android:* **Reemplazar**. Usar identificador persistente en el dispositivo (`"Android-" + Math.random().toString(36).substring(2, 9)` o Capacitor Device Plugin).
* **`Shell.Application`:**
  * Apariciones: L.481 (`BrowseForFolder` para ubicar ntfy.exe).
  * *Acción Android:* **Eliminar 100%**.
* **`SAPI.SpVoice`:**
  * Apariciones: L.3800 (`new ActiveXObject('SAPI.SpVoice')`).
  * *Acción Android:* **Reemplazar**. Usar `window.speechSynthesis` (Web Speech API) nativa de WebView Android (`SpeechSynthesisUtterance`).
* **`WMPlayer.OCX`:**
  * Apariciones: L.3808 (`new ActiveXObject('WMPlayer.OCX')`).
  * *Acción Android:* **Reemplazar**. Usar HTML5 `new Audio(...)` con assets locales o síntesis de voz.
* **`GetObject('winmgmts:')`:**
  * Apariciones: L.373 (terminar procesos EXCEL.EXE huérfanos), L.479 (comprobar si corre ntfy.exe).
  * *Acción Android:* **Eliminar 100%**.

### 2.2. APIs de Ventana y Escritorio
* **`window.resizeTo`, `window.moveTo` (L.4334):**
  * Provocan excepción o son no-op en navegadores modernos y WebViews móviles.
  * *Acción Android:* **Eliminar**. La aplicación ocupa el 100% del viewport mediante viewport meta tag y CSS.
* **`screen.availWidth`, `screen.availHeight` (L.4334):**
  * Usado para centrar ventana en Windows.
  * *Acción Android:* **Eliminar**.
* **Arrastre de ventanas flotantes (`.win`, `.wt`, `dragStart`, `DR`, `document.onmousemove`, `document.onmouseup`, L.818-831):**
  * Diseñado para mouse con `offsetLeft`, `clientX`.
  * *Acción Android:* **Reemplazar / Adaptar**. En móvil las mesas abiertas se presentan como modales/hojas modales o con layout responsivo touch-friendly de ancho completo con scroll.

### 2.3. Persistencia
* **`cierre_config.json` (`cfgPath`, `cfgLoad`, `cfgSave`, L.259-261):**
  * Lee y escribe en disco vía FSO.
  * *Acción Android:* **Reemplazar**. Guardar en `localStorage.getItem('cierre_config')` / `localStorage.setItem(...)`.
* **`cierre_clientes.json` (`clPath`, `clCacheSave`, `clCacheLoad`, L.1072-1088):**
  * Caché de nombres de clientes para autocompletar offline.
  * *Acción Android:* **Reemplazar**. Guardar en `localStorage.getItem('cierre_clientes')`.
* **Lock Files (`cierre_srv_*.lock`, L.451-456):**
  * Control de concurrencia para que no haya dos servidores Windows con el mismo Excel.
  * *Acción Android:* **Eliminar**. El APK móvil nunca corre en modo servidor.
* **Transaction Ledger (`cierre_tx_*.log`, L.452, 458-466):**
  * Bitácora en disco local para evitar re-procesar transacciones.
  * *Acción Android:* **Eliminar en cliente** (el servidor Windows es quien mantiene su ledger).

### 2.4. Capa de Red (ntfy)
* **`ntBase`, `ntTopic` (L.501-502):** Formatea URL base y nombre de tópico (`{room}-cmd`, `{room}-st`).
* **`ntPub` (L.504-510):** Envío POST con JSON por `XMLHttpRequest`.
* **`ntStart`, `ntConnect`, `ntPollMode` (L.513-546):** Conexión WebSocket con fallback a long-poll (`/json?poll=1&since=...`).
* **`ntMsg` (L.538-546):** Router principal de eventos.
* **`srvMsg` (L.549):** Dispatcher de servidor.
* **`cliMsg` (L.582):** Dispatcher de cliente.
* **`clientFlush` (L.573):** Empaqueta cambios pendientes en lotes de 18 items (`k: 'w'`) o pide estado (`k: 'q'`).
* *Acción Android:* **Mantener intacto el protocolo**. La capa de red ntfy funciona directamente en WebView Android moderno (`fetch` / `XMLHttpRequest` / `WebSocket`).

### 2.5. Seguridad y Autenticación
* **`sha256`, `pwHash`, `pwSalt`, `pwOk`, `pwSave` (L.845-885):** Algoritmo SHA-256 en JS puro.
* **`lockShow`, `lkOpen`, `lkGo` (L.887-900):** Pantalla de bloqueo por contraseña.
* **`devId`, `devKey`, `devTrusted`, `devTrust` (L.903-911):** Identificación de terminal autorizada.
* **`tfaCheck`, `tfaGate`, `tfaOk`, `tfaStart`, `tfaPoll` (L.912-936):** Doble factor enviando notificación a canal `Gato_Negro_Sec`.
* *Acción Android:* **Mantener flujo criptográfico**, reemplazando únicamente `WScript.Network` en `devId()` por identificador web persistente.

### 2.6. Salidas Externas y Portapapeles
* **Gmail (`cierreGo`, L.2260-2270):** Construye URL `https://mail.google.com/mail/?view=cm&...` y llama `WScript.Shell.Run`.
  * *Acción Android:* Reemplazar por `window.open(url, '_blank')` o `mailto:` intent.
* **WhatsApp (`waOpen`, L.2420-2428):** Intenta `whatsapp://send?text=...` y fallback `https://wa.me/?text=...` vía `WScript.Shell.Run`.
  * *Acción Android:* Reemplazar por `window.location.href = url` o plugin Capacitor/Web.
* **Portapapeles (`txCopy`, L.2418):** `window.clipboardData.setData('Text', TXT)`.
  * *Acción Android:* Reemplazar por `navigator.clipboard.writeText(TXT)`.

---

## 3. SEPARACIÓN DE FUNCIONES POR ROL

### A) Funciones SOLO SERVIDOR (Omitir / Eliminar en APK Android)
* **Gestión de instancias y archivos locales:** `isLocked`, `enableEdit`, `killOrphans`, `openBook`, `doFile`, `lockFile`, `ledgerFile`, `lockRead`, `lockWrite`, `otherServer`, `lockFree`, `dupStop`, `ledFind`, `claimTx`, `ledTrim`.
* **Lanzador de servidor ntfy:** `ntDirFind`, `ntDirPick`, `ntDirInfo`, `ntSrvAuto`.
* **Procesamiento de peticiones cliente:** `srvMsg`, `srvTx`, `srvScore`, `srvDvQ`, `srvAfQ`, `srvJp`, `srvJpOp`, `srvAfSave`, `srvDvSave`, `srvHistQ`, `srvHistOp`, `srvCierre`, `srvInfTxt`, `srvInfQ`, `srvCajas`.
* **Generación de Snapshots hacia clientes:** `buildSnap`, `pubSnap`, `pubClients`, `pubCfg`, `regPubRes`, `dvPack`, `dvPubRes`, `dvPubErr`, `dvPubZ`, `hsPack`, `hsPublish`.
* **Automatización Excel Directa:** `rr`, `lastRow`, `totIR`, `n1`, `rd`, `dayBlocks`, `readBan`, `readInf`, `jpSheet`, `jdate`, `jpRow`, `readJp`, `sync` (rama Excel), `jobRun`, `jobNext`, `xlStart`, `xlQuit`, `closeBk`, `findSheet`, `cellTxt`, `jobLoadCl`, `regTotRefresh`, `jobSave`, `rcUpdate`, `rcClear`, `regRetry`, `jobHistRead`, `jobHistOp`, `jobCierre`, `ciHora`, `ciNombres`, `ciOper`, `jobInfTxt`, `jobInfRead`, `jobCajas`, `jobScore`, `readAforo`, `dvFindCard`, `dvReadCard`, `dvReadLibro`, `dvCollect`, `dvJobLookup`, `dvPut`, `dvJobSave`, `jpJobSave`, `jpJobOp`, `hdScan`, `jobHdScan`, `hdApply`, `jobHdApply`, `jobApRead`, `jobApSave`, `jobPrRead`, `jobPrSave`, `jobAfRead`, `jobAfSave`, `jobHsRead`, `jobHsSave`, `jobHsHeads`, `cuReadInf`, `cuReadRc`, `cuReadLibro`, `cuBuild`, `cuJobAnalyze`, `cuJobApply`.

### B) Funciones CLIENTE / UI (Conservar y Potenciar en APK Android)
* **Envío de comandos al servidor:** `clientFlush`, `regSendTx`, `dvCliAsk`, `dvCliSave`, `jpCliSave`, `afAsk`, `afWrite`, `afCliReq`, `infTxtSend`, `cajasSend`.
* **Recepción y aplicación de datos de red:** `cliMsg`, `applySnap`, `reapply`, `regCliMsg`, `dvCliRes`, `dvCliSaved`, `jpCliDone`, `afCliDone`, `hsCliPart`, `hsOpDone`.
* **Interfaz de Registro (vReg):** `regRender`, `sugScore`, `phon`, `lev`, `sugUpdate`, `sugDraw`, `sugFit`, `sugSel`, `sugHover`, `sugClear`, `sugClick`, `regEnter`, `newOk`, `newNo`, `regPickName`, `amtOpen`, `amtPrev`, `amtOk`, `mesaPick`, `pickOpen`, `pkDraw`, `pkClose`, `pkPick`, `pkMove`, `pitPick`, `regSave` (vía `regSendTx`).
* **Historial de Movimientos:** `hsSelItem`, `hsFixSel`, `hsSide`, `hsBarHtml`, `hsScore`, `hsHtml`, `hxPick`, `hsEdit`, `heSave`, `hsDel`, `heDelete`, `hsAskDel`, `hsRun`.
* **Modales de Operación:** `mDv` (Devoluciones), `mJp` (Pago Jackpot), `mFc` (Ficha completa), `mSc` (Score), `mTx` (Texto listo), `mMon` (Operador), `mAf` (Aforo por horas), `mFn` (Fichas No Negociables), `mCt` (Cartas), `mCj` (Cajas), `mCi` (Cierre).
* **Control de Cierre de Mesas (vCierre):** `render`, `sumc`, `dif`, `inUse`, `visible`, `tap`, `sinOp`, `cero`, `listo`, `undo`, `redo`, `setChip`, `setP`, `setA`, `bump`, `bulk`.

### C) Funciones COMPARTIDAS que requieren adaptación en `platform.js`
* `cfgLoad` / `cfgSave`: Redirigir de FSO a `localStorage`.
* `clCacheLoad` / `clCacheSave`: Redirigir de FSO a `localStorage`.
* `devId`: Reemplazar `WScript.Network` por identificador de dispositivo web.
* `txCopy`: Reemplazar `window.clipboardData` por `navigator.clipboard`.
* `waOpen`: Reemplazar `WScript.Shell.Run` por `window.location.href` o Intent.
* `cierreGo`: Reemplazar `WScript.Shell.Run` por `window.open`.
* `almSound` / `almSay` / `almPlay`: Reemplazar `SAPI.SpVoice` / `WMPlayer.OCX` por Web Speech API y HTML5 Audio.
* `arranque`: Forzar rol cliente `cli()`, conectar a ntfy automáticamente sin comprobaciones de servidor Windows.
