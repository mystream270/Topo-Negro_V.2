# PROTOCOLO DE COMUNICACIÓN NTFY
**Sistema:** Cierre de Fichas - Capri GDL  
**Canal:** Servidor ntfy (HTTP/HTTPS y WebSocket)  
**Tópicos base:** `{room}` (ejemplo: `cierre-xyz123`)

---

## 1. TOPOLOGÍA DE TÓPICOS

El sistema utiliza dos tópicos ntfy derivados de la variable `CFG.nt.room`:

1. **`{room}-cmd`** (Comandos / Peticiones):
   * **Escucha:** El Servidor (PC Windows).
   * **Publican:** Los Clientes (Terminales / App Android).
2. **`{room}-st`** (Estado / Respuestas):
   * **Escucha:** Los Clientes (Terminales / App Android).
   * **Publica:** El Servidor (PC Windows).

*Función de construcción de tópicos:*
```javascript
function ntTopic(k) {
  return String(CFG.nt.room).replace(/[^A-Za-z0-9_-]/g, '-') + '-' + k;
}
// k = 'cmd' => '{room}-cmd'
// k = 'st'  => '{room}-st'
```

---

## 2. FORMATO GENERAL DE LOS MENSAJES

Todos los mensajes se transmiten en formato JSON plano como cuerpo de una petición `POST` HTTP al endpoint `/{topico}`:
```http
POST /cierre-demo-cmd HTTP/1.1
Host: 192.168.1.10:8080
Content-Type: application/json

{"k": "...", ...}
```
En WebSocket, ntfy encapsula el mensaje en un evento:
```json
{
  "event": "message",
  "topic": "cierre-demo-cmd",
  "time": 1775836800,
  "message": "{\"k\":\"...\", ...}"
}
```

---

## 3. CATÁLOGO COMPLETO DE MENSAJES (CAMPO `k`)

### 3.1. CLIENTE A SERVIDOR (Publicados en `{room}-cmd`)

#### A. Consulta de Estado Completo (`k: "q"`)
* **Emisor:** Cliente al iniciar o al forzar actualización.
* **Payload:**
```json
{
  "k": "q",
  "n": "Caja 1"
}
```

#### B. Envío de Fichas / Propina / Acumulado de Mesas (`k: "w"`)
* **Emisor:** Cliente (`clientFlush()`).
* **Regla de fragmentación:** Máximo 18 items por paquete.
* **Payload:**
```json
{
  "k": "w",
  "id": "Caja 1-1775836800000-0",
  "n": "Caja 1",
  "w": [
    { "f": "ban", "s": "Dia 10", "a": "C42", "v": 15 },
    { "f": "inf", "s": "PROPINAS", "a": "C13", "v": 250 },
    { "f": "jp",  "s": "OCTUBRE", "a": "C24", "v": 1500 }
  ]
}
```
*Donde:*
  * `f`: Archivo (`ban` = Banco, `inf` = Informe, `jp` = Jackpot).
  * `s`: Nombre de hoja.
  * `a`: Dirección de celda Excel (ej. `C42`).
  * `v`: Valor numérico o `null` si se borra.

#### C. Solicitud de Lista de Clientes (`k: "ql"`)
* **Emisor:** Cliente (`regAskList()`).
* **Payload:**
```json
{
  "k": "ql",
  "n": "Caja 1",
  "h": "a4f89b-1250"
}
```
*Donde `h` es el hash de la lista local (si ya la tiene) para no reenviar si no cambió.*

#### D. Registro de Movimiento Ingreso/Retiro (`k: "t"`)
* **Emisor:** Cliente (`regSendTx()`).
* **Payload:**
```json
{
  "k": "t",
  "id": "Caja 1-1775836800000-482",
  "n": "Caja 1",
  "x": {
    "t": "I",
    "tk": "Ticket",
    "nom": "Juan Perez Gonzalez",
    "monto": 25000,
    "mesa": "BJ1",
    "sup": "Karina Arroyo",
    "mon": "Omar",
    "h": "14:35:10",
    "fe": "2026-10-10"
  }
}
```

#### E. Consulta de Historial de Movimientos (`k: "hq"`)
* **Emisor:** Cliente (`histRefresh()`).
* **Payload:**
```json
{
  "k": "hq",
  "id": "Caja 1-hq-1775836800000-123",
  "n": "Caja 1",
  "fresh": true
}
```

#### F. Operación sobre Historial (Editar / Eliminar) (`k: "ho"`)
* **Emisor:** Cliente (`hsRun()`).
* **Payload:**
```json
{
  "k": "ho",
  "id": "Caja 1-ho-1775836800000-881",
  "n": "Caja 1",
  "a": "e",
  "t": "I",
  "row": 42,
  "exp": {
    "h": "14:35",
    "nom": "Juan Perez Gonzalez",
    "monto": 25000,
    "mesa": "BJ1"
  },
  "nw": {
    "t": "I",
    "nom": "Juan Perez Gonzalez",
    "monto": 30000,
    "mesa": "BJ1",
    "sup": "Karina Arroyo",
    "tk": "Ticket"
  }
}
```
*(Para eliminar: `a: "d"`, `nw: null`)*.

#### G. Consulta de Devoluciones de un Cliente (`k: "dq"`)
* **Emisor:** Cliente (`dvCliAsk()`).
* **Payload:**
```json
{
  "k": "dq",
  "id": "Caja 1-dq-1775836800000-345",
  "n": "Caja 1",
  "nom": "Juan Perez Gonzalez"
}
```

#### H. Guardar Pago de Devolución (`k: "dv"`)
* **Emisor:** Cliente (`dvCliSave()`).
* **Payload:**
```json
{
  "k": "dv",
  "id": "Caja 1-dv-1775836800000-981",
  "n": "Caja 1",
  "x": {
    "nom": "Juan Perez Gonzalez",
    "fe": "2026-10-10",
    "fp": "2026-10-09",
    "h": "15:20:00",
    "loss": 50000,
    "pct": 10,
    "monto": 5000,
    "lugar": "BJ1",
    "rep": "Karina Arroyo",
    "mon": "Omar",
    "cm": "Sin Novedad",
    "force": false
  }
}
```

#### I. Guardar Pago de Jackpot (`k: "jp"`)
* **Emisor:** Cliente (`jpCliSave()`).
* **Payload:**
```json
{
  "k": "jp",
  "id": "Caja 1-jp-1775836800000-512",
  "n": "Caja 1",
  "x": {
    "nom": "Roberto Gomez",
    "fe": "2026-10-10",
    "mesa": "BJMD",
    "jug": "FULL",
    "amt": 3500,
    "force": false
  }
}
```

#### J. Editar / Eliminar Pago de Jackpot (`k: "jo"`)
* **Emisor:** Cliente (`jeRun()`).
* **Payload:**
```json
{
  "k": "jo",
  "id": "Caja 1-jo-1775836800000-771",
  "n": "Caja 1",
  "a": "e",
  "row": 18,
  "exp": {
    "nom": "Roberto Gomez",
    "mesa": "BJMD",
    "jug": "FULL",
    "amt": 3500
  },
  "nw": {
    "nom": "Roberto Gomez Bolaños",
    "mesa": "BJMD",
    "jug": "FULL",
    "amt": 4000
  }
}
```

#### K. Consulta de Horas Pendientes de Aforo (`k: "aq"`)
* **Emisor:** Cliente (`afAsk()`).
* **Payload:**
```json
{
  "k": "aq",
  "id": "Caja 1-aq-1775836800000-201",
  "n": "Caja 1"
}
```

#### L. Guardar Aforo de una Hora (`k: "as"`)
* **Emisor:** Cliente (`afWrite()`).
* **Payload:**
```json
{
  "k": "as",
  "id": "Caja 1-as-1775836800000-992",
  "n": "Caja 1",
  "h": 14,
  "v": [3, 0, 5, 2, 4, 1, 0, 0, 2, 6, 0, 1, 0, 2, 1]
}
```

#### M. Generar Texto Score WhatsApp (`k: "sc"`)
* **Emisor:** Cliente (`scGo()`).
* **Payload:**
```json
{
  "k": "sc",
  "id": "Caja 1-s-1775836800000",
  "n": "Caja 1",
  "mode": "S",
  "f": 450000
}
```

#### N. Guardar Fichas No Negociables / Cartas (`k: "fn"` / `k: "ct"`)
* **Emisor:** Cliente (`infTxtSend()`).
* **Payload FNN:**
```json
{
  "k": "fn",
  "id": "Caja 1-fn-1775836800000-111",
  "n": "Caja 1",
  "q": [0, 5, 12, 4, 20, 0]
}
```
* **Payload Cartas:**
```json
{
  "k": "ct",
  "id": "Caja 1-ct-1775836800000-222",
  "n": "Caja 1",
  "q": [2, 2, 4, 4, 1, 1, 0, 0],
  "t": "ZZMZ",
  "serie": "A123",
  "color": "Rojo"
}
```

#### O. Guardar Cierre de Cajas (`k: "cj"`)
* **Emisor:** Cliente (`cajasSend()`).
* **Payload:**
```json
{
  "k": "cj",
  "id": "Caja 1-cj-1775836800000-333",
  "n": "Caja 1",
  "inf": true,
  "cj": "Maria Lopez",
  "ji": "Carlos Perez",
  "res": 150.50
}
```

#### P. Guardar Datos de Cierre de Sala (`k: "cc"`)
* **Emisor:** Cliente (`ciGo()`).
* **Payload:**
```json
{
  "k": "cc",
  "id": "Caja 1-cc-1775836800000-444",
  "n": "Caja 1",
  "pit": "Karina Arroyo",
  "sb": "Olga Brencel",
  "dl": "Pedro Diaz",
  "hp": "22:30",
  "hc": "03:00",
  "op": "Omar"
}
```

---

### 3.2. SERVIDOR A CLIENTES (Publicados en `{room}-st`)

#### A. Snapshot de Estado General en Chunks (`k: "s"`)
* **Emisor:** Servidor (`pubSnap()`).
* **Propósito:** Transmite estado completo (fichas, aperturas, jackpot, propinas, acumulados). Debido a límites de ntfy, se fracciona en trozos de 2,800 caracteres.
* **Payload:**
```json
{
  "k": "s",
  "i": 1775836805000,
  "n": 0,
  "m": 3,
  "d": "{\"fe\":\"2026-10-10\",\"V\":[[...]],\"ap\":[[...]],\"tot\":2500,...}"
}
```
*Donde `i` es timestamp de lote, `n` es índice (0-based), `m` es total de partes, y `d` es el trozo JSON ensamblado por el cliente en `cliMsg()`*.

#### B. Chunks de Lista de Clientes (`k: "c"`)
* **Emisor:** Servidor (`pubClients()`).
* **Formato:** Cadena separada por pipes `|` en chunks de 1,800 caracteres.
* **Payload:**
```json
{
  "k": "c",
  "i": 1775836806000,
  "n": 0,
  "m": 4,
  "d": "Juan Perez|Maria Garcia|Carlos Lopez|...",
  "h": "a4f89b-1250"
}
```

#### C. Confirmación de Lista al Día (`k: "cok"`)
* **Emisor:** Servidor cuando el hash `h` enviado por el cliente coincide con la lista del servidor.
```json
{
  "k": "cok",
  "h": "a4f89b-1250"
}
```

#### D. Cliente Nuevo Agregado Dinámicamente (`k: "a"`)
* **Emisor:** Servidor (`pubClients` / `jobSave` / `cuApply`).
```json
{
  "k": "a",
  "n": "Nuevo Cliente Perez"
}
```

#### E. Distribución de Configuración Global (`k: "g"`)
* **Emisor:** Servidor (`pubCfg()`).
* **Payload:**
```json
{
  "k": "g",
  "g": {
    "mi": 5000,
    "mr": 5000,
    "lim": 20000,
    "mesas": ["BJMD", "BJ2", "FB2", "FREE BET", "..."],
    "pit": ["Karina Arroyo", "Olga Brencel", "..."],
    "mn": ["BJMD", "BJ2", "..."],
    "dv": {
      "tiers": [[10000, 10], [100000, 12]],
      "rd": 50,
      "days": 3
    },
    "ci": {
      "dl": ["Pedro Diaz", "..."],
      "sb": ["Olga Brencel", "..."]
    }
  }
}
```

#### F. Totales de Ingresos y Retiros (`k: "v"`)
* **Emisor:** Servidor al cambiar o consultar totales.
```json
{
  "k": "v",
  "ti": 250000,
  "tr": 180000
}
```

#### G. Respuesta a Registro de Transacción (`k: "r"`)
* **Emisor:** Servidor (`regPubRes()`).
* **Payload:**
```json
{
  "k": "r",
  "id": "Caja 1-1775836800000-482",
  "ok": true,
  "msg": "",
  "rc": true,
  "ti": 275000,
  "tr": 180000
}
```

#### H. Fragmentos de Historial de Movimientos (`k: "hr"`)
* **Emisor:** Servidor (`hsPublish()`).
* **Payload:**
```json
{
  "k": "hr",
  "id": "Caja 1-hq-1775836800000-123",
  "n": 0,
  "m": 2,
  "d": "I|39|14:35|BJ1|25000|Ticket|Juan Perez|Karina;R|40|...",
  "ti": 275000,
  "tr": 180000
}
```

#### I. Respuesta de Operación Historial (`k: "hz"`)
* **Emisor:** Servidor (`srvHistOp()`).
```json
{
  "k": "hz",
  "id": "Caja 1-ho-1775836800000-881",
  "ok": true,
  "err": "",
  "msg": "Ingreso corregido: Juan Perez $25,000 -> Juan Perez $30,000 (BJ1)",
  "rc": true,
  "ti": 280000,
  "tr": 180000
}
```

#### J. Respuesta de Consulta de Devolución (`k: "dr"`)
* **Emisor:** Servidor (`dvPubRes()`). Chunks de 1,800 chars conteniendo el JSON empaquetado de la ficha del Rating Card.
```json
{
  "k": "dr",
  "id": "Caja 1-dq-1775836800000-345",
  "n": 0,
  "m": 1,
  "d": "{\"nom\":\"Juan Perez\",\"fe\":46305,\"r\":[[...]]}"
}
```

#### K. Confirmación / Resultado de Pago Devolución (`k: "dz"`)
* **Emisor:** Servidor (`dvPubZ()`).
```json
{
  "k": "dz",
  "id": "Caja 1-dv-1775836800000-981",
  "ok": true,
  "msg": "",
  "dup": false,
  "st": [
    ["Libro de devoluciones", 1, "hoja OCTUBRE, fila 12"],
    ["Informe (hoja DEVOLUCIONES)", 1, "fila 15"],
    ["Rating Card (ficha)", 1, "dia de entrega 10"]
  ]
}
```

#### L. Confirmación de Pago Jackpot (`k: "jz"`)
* **Emisor:** Servidor (`jpRemoteDone()`).
```json
{
  "k": "jz",
  "id": "Caja 1-jp-1775836800000-512",
  "ok": true,
  "res": "hoja OCTUBRE, fila 22, columna AJ"
}
```

#### M. Texto Generado de Score WhatsApp (`k: "x"`)
* **Emisor:** Servidor (`srvScore()`).
```json
{
  "k": "x",
  "id": "Caja 1-s-1775836800000",
  "ok": true,
  "txt": "Score mesas Capri\n\nMesas activas: 8\n...",
  "msg": ""
}
```

#### N. Respuestas Genéricas de Operaciones (`k: "az"`, `k: "cz"`)
* **`az`:** Respuesta a cambios en Jackpot o Aforo (`ok`, `err`, `msg`).
* **`cz`:** Respuesta a Cierre, Cartas, FNN o Cajas (`ok`, `err`, `row`, `warn`).

---

## 4. CICLO DE SINCRONIZACIÓN DEL CLIENTE

1. **Al iniciar (`arranque()`, `ntStart()`):**
   * El cliente conecta a `{room}-st` por WebSocket (fallback polling cada 15s).
   * Envía a `{room}-cmd` un mensaje `{ "k": "q", "n": CFG.nt.name }` solicitando el estado inicial.
   * Envía a `{room}-cmd` un `{ "k": "ql", "h": hashLocal }` solicitando la lista de clientes si cambió.
2. **Recepción continua:**
   * Recibe `{ "k": "s" }` (Snapshot) -> reconstruye en `cliMsg()` y aplica con `applySnap()`.
   * Preserva cambios locales no confirmados mediante `reapply()`.
3. **Envío de capturas de mesa:**
   * Se acumulan en `pend` (`qW`).
   * Al pulsar "Listo", `sync(true)` llama a `clientFlush()`.
   * Se envían en lotes de 18 elementos con `{ "k": "w" }`.
4. **Envío de registros y transacciones:**
   * Generan un ID único: `(CFG.nt.name || 'cli') + '-' + Date.now() + '-' + rand`.
   * Quedan en `RS.pendTx[id]` con timeout visual de 40s.
   * El servidor confirma con `{ "k": "r", "id": id, ... }`.

---

## 5. CONTROL DE CONCURRENCIA Y PREVENCIÓN DE DUPLICADOS

1. **En el Servidor:**
   * **Tabla en memoria `SEEN[id]`:** Descarta inmediatamente mensajes con ID ya recibido.
   * **Ledger persistente `cierre_tx_{room}.log` (`claimTx(id)`):** Garantiza que ninguna transacción se procese dos veces aunque el servidor se reinicie.
   * **Rechazo por desfase temporal:** Si `m._t` difiere en más de 300 segundos (5 minutos) respecto a la hora del servidor, el servidor la rechaza por vencimiento para evitar procesar ráfagas atrasadas.
2. **En el Cliente:**
   * Todo ID es único y prefijado por el nombre del terminal cliente.
   * Si no recibe `ack` o confirmación dentro de los timeouts (40s - 120s), muestra advertencia al usuario indicando que revise antes de reenviar para proteger la integridad contable.

---

## 6. TOLERANCIA A PÉRDIDA DE CONEXIÓN

* **WebSocket con reconexión:** `ntConnect()` reintenta cada 3 segundos. Si falla 3 veces consecutivas, conmuta a modo `ntPollMode()` con long-polling HTTP cada 15 segundos.
* **Caché Offline en Cliente:**
  * La lista de clientes se almacena localmente en `cierre_clientes.json` (en Android en `localStorage`). Si el cliente arranca sin red, el autocompletado fonético sigue funcionando con la última lista conocida.
* **Recuperación tras desconexión:**
  * Al reconectar, ntfy soporta el parámetro `?since={timestamp}`, descargando únicamente mensajes emitidos mientras estuvo fuera de línea.
