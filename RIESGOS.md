# MATRIZ DE RIESGOS Y ESTRATEGIA DE MITIGACIÓN (FASE 1)
**Proyecto:** Migración Cliente Móvil Android - Cierre de Fichas (Capri GDL)

---

## 1. RESUMEN DE RIESGOS IDENTIFICADOS Y ALTERNATIVAS TÉCNICAS

| ID | Componente / API Legacy Windows | Impacto en Android | Alternativa Técnica en Android |
|---|---|---|---|
| **R-01** | `ActiveXObject("Excel.Application")` | **Crítico si se intentara ejecutar.** Android no tiene motor COM ni Office ActiveX. | **Arquitectura Cliente Puro:** El cliente móvil nunca toca Excel. Todas las acciones de negocio viajan como comandos ntfy (`cmd`) al servidor Windows existente, donde el Excel permanece intacto. |
| **R-02** | `ActiveXObject("Scripting.FileSystemObject")` | **Bloqueante** en WebView (`fso` no existe en Android). Rompe el arranque (`cfgLoad`, `cfgSave`, `clCacheLoad`). | **Capa `platform.js`:** Abstraer lectura y escritura a `localStorage` (o Capacitor Preferences). Proporcionar `platform.storage.get()` y `platform.storage.set()`. |
| **R-03** | `ActiveXObject("WScript.Shell")` | **Bloqueante** al ejecutar Gmail, WhatsApp o lanzar ejecutables. | **Web Intents & window.open:**<br>• WhatsApp: `window.location.href = "whatsapp://send?text=" + enc` con fallback a `https://wa.me/?text=...`<br>• Gmail: `window.open(url, '_blank')`<br>• Lanzamiento de ntfy.exe: Eliminado (el móvil se conecta a un servidor ntfy remoto/LAN ya en ejecución). |
| **R-04** | `ActiveXObject("SAPI.SpVoice")` y `WMPlayer.OCX` | **Bloqueante** en sistema de alarmas audibles (Aforo / Score). | **Web Speech API & Audio HTML5:**<br>• Voz: `window.speechSynthesis.speak(new SpeechSynthesisUtterance(texto))`<br>• Audio: `new Audio(assetUrl).play()` |
| **R-05** | `window.clipboardData.setData('Text', ...)` | **Incompatible** en navegadores modernos / Android WebView. | **Async Clipboard API:** `navigator.clipboard.writeText(texto)`. |
| **R-06** | `window.resizeTo` / `window.moveTo` / `screen.availWidth` | Error de ejecución o no-op en Android. | **Eliminar invocaciones:** Configurar `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">`. |
| **R-07** | Arrastre de Ventanas Flotantes (`.win`, `.wt`, `dragStart`, mouse events) | Experiencia deficiente o inoperable en pantallas táctiles verticales. | **Diseño Responsivo Touch:** Modales centrados con scroll interno, botones con objetivo táctil de al menos 48dp y adaptación automática de ancho. |
| **R-08** | Control de Duplicados en Windows (`.lock`, `.log` en disco temporal) | Incompatible en Android (no hay FSO para locks). | **Innecesario en Cliente:** El control de bloqueo de servidor y bitácora de reclamaciones (`claimTx`) reside exclusivamente en el PC Servidor. En Android sólo se requiere generar IDs únicos por transacción (`uuid` / `Date.now() + random`). |
| **R-09** | Atajos de Teclado Físico (`F2`, `F3`, `F4`, `F5`, `F6`, `Enter`, `Esc`) | Dispositivos móviles sin teclado físico por defecto. | **Garantizar acceso UI táctil completo:** En el HTA original ya existen botones táctiles en pantalla para todas las acciones (tabs de Ingreso/Retiro/Devolución/Jackpot, botón Listo, etc.). Mantener los listeners de `keydown` para terminales Android con teclado físico o lectores de códigos. |
| **R-10** | Tráfico de red ntfy HTTP (Cleartext) en Android 9+ | Android bloquea tráfico HTTP no cifrado por defecto (`CleartextTrafficPermitted = false`). | **Configuración AndroidManifest / Network Security Config:** Permitir `usesCleartextTraffic="true"` en `AndroidManifest.xml` para poder conectar a servidores ntfy locales (ej. `http://192.168.1.X:8080`). |

---

## 2. MODALES QUE REQUIEREN INTERACCIÓN REMOTA CON EL SERVIDOR

El HTA original tiene ~23 modales. Los que implican consulta o guardado en el servidor Windows a través del protocolo ntfy están perfectamente soportados sin necesidad de Excel en el dispositivo móvil:

1. **`mAmt` / `mPk` / `mNew` / `mMon`:** Lógica de entrada 100% en cliente. Envían el registro final mediante `k: "t"`.
2. **`mDv` (Devoluciones - F4):** Consulta Rating Card vía `k: "dq"`, recibe respuesta `k: "dr"` y guarda vía `k: "dv"`.
3. **`mJp` (Pago Jackpot - F5):** Lee valores del snapshot recibido del servidor y guarda vía `k: "jp"`.
4. **`mFc` (Ficha Completa):** Muestra los datos de la ficha recibida en la consulta `k: "dr"`.
5. **`mSc` / `mTx` (Score WhatsApp):** Solicita texto formateado vía `k: "sc"`, recibe `k: "x"` y copia/abre WhatsApp.
6. **`mAf` (Aforo):** Solicita horas pendientes vía `k: "aq"` y guarda cada hora vía `k: "as"`.
7. **`mHe` (Editar Movimiento):** Envía edición/eliminación vía `k: "ho"`.
8. **`mJe` (Editar Jackpot):** Envía edición/eliminación vía `k: "jo"`.
9. **`mFn` / `mCt` / `mCj` / `mCi`:** Envían datos de cierre al Informe vía `k: "fn"`, `k: "ct"`, `k: "cj"`, `k: "cc"`.

*Modales solo operativos en el servidor Windows original:*
* `mAp` (Horario jefaturas) y `mPr` (Rifas / Premios) en el legacy mostraban alerta si se abrían en cliente ("se captura en la PC servidor"). Se mantienen con la misma salvaguarda o se podrán puentear en fases posteriores si el usuario lo requiere.
* `mHd` (Encabezados de Excel) y `mCu` (Cuadre de Excel): Operaciones exclusivas de mantenimiento en PC servidor.
