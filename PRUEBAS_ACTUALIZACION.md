# Protocolo de Pruebas de Actualización (Cliente Móvil Capri GDL)

Este documento detalla los pasos de verificación y resultados esperados para validar las 3 fases de la actualización en el dispositivo móvil Android y en emulador / DevTools.

---

## FASE A: Mejoras del Servidor Portadas al Cliente

### Prueba A1: Cambio de día operativo a las 8:00 am (`fechaOp`)
- **Paso 1:** Abrir la consola de depuración en Chrome DevTools (o inspeccionar el WebView vía `chrome://inspect`).
- **Paso 2:** Simular las 07:59 am:
  ```javascript
  var RealDate = Date;
  Date = class extends RealDate {
    constructor(...args) {
      if (args.length) return new RealDate(...args);
      return new RealDate(2026, 9, 13, 7, 59, 0);
    }
  };
  console.log("07:59 am ->", fechaOp().toLocaleDateString('es-MX'));
  Date = RealDate;
  ```
- **Resultado esperado:** Devuelve la fecha de **ayer**.
- **Paso 3:** Simular las 08:00 am:
  ```javascript
  var RealDate = Date;
  Date = class extends RealDate {
    constructor(...args) {
      if (args.length) return new RealDate(...args);
      return new RealDate(2026, 9, 13, 8, 0, 0);
    }
  };
  console.log("08:00 am ->", fechaOp().toLocaleDateString('es-MX'));
  Date = RealDate;
  ```
- **Resultado esperado:** Devuelve la fecha de **hoy**.

### Prueba A2: Título editable en Registro (`#rgH1`) y persistencia
- **Paso 1:** En la pestaña **INGRESOS Y RETIROS**, tocar el título principal `Registro · Capri GDL`.
- **Paso 2:** Escribir un texto personalizado (ej. `Registro · Turno Nocturno`).
- **Paso 3:** Presionar Enter o tocar fuera del campo para desenfocar.
- **Paso 4:** Cambiar a la pestaña **CIERRE** y regresar a **INGRESOS Y RETIROS**.
- **Paso 5:** Cerrar la aplicación por completo y volver a abrirla.
- **Resultado esperado:** El nuevo título se conserva en pantalla y persiste en el archivo de configuración `cierre_config.json`.

### Prueba A3: Flechas de día de operación (`moveDay`)
- **Paso 1:** En la barra superior de Registro, tocar la flecha `←` junto a la fecha.
- **Resultado esperado:** La fecha retrocede un día y la vista se refresca.
- **Paso 2:** Tocar la flecha `→`.
- **Resultado esperado:** La fecha avanza al día siguiente y se sincroniza.

### Prueba A4: Formato de Score WhatsApp
- **Paso 1:** Tocar el botón **Score WhatsApp** (en la barra o en la hoja "Más").
- **Paso 2:** Capturar un monto de fichas en circulación y presionar Enter.
- **Resultado esperado:**
  - El texto generado incluye la línea `Hora: HH:MM` inmediatamente después del título.
  - El resultado de score muestra `*SCORE:* WIN $...` si es ganancia, `*SCORE:* LOSS -$...` si es pérdida, o `*SCORE:* $0` si la diferencia es cero.

### Prueba A5: Ficha completa y selección de día en rojo (`fcPickDay`)
- **Paso 1:** Buscar o seleccionar un cliente que tenga movimientos registrados con pérdida.
- **Paso 2:** Abrir **Ficha completa** (desde el diálogo de devolución o autocompletar).
- **Paso 3:** Observar la tabla de días: los días con resultado negativo (`res < 0`) aparecen en rojo y con cursor de selección.
- **Paso 4:** Tocar sobre una fila en rojo.
- **Resultado esperado:**
  - La ventana de ficha se cierra y se abre automáticamente el formulario de **Devolución**.
  - `FECHA DE PERDIDA` se llena con la fecha de ese día (ej. `05/10/2026`).
  - `PERDIDA ($)` se llena con el valor absoluto de la pérdida.
  - La fecha de entrega se mantiene como la fecha de **HOY**.
  - El foco se coloca en el campo `%` (Porcentaje).

### Prueba A6: Manejo robusto de errores (`errMsg`)
- **Paso 1:** En consola ejecutar:
  ```javascript
  console.log(errMsg(new Error("Fallo de prueba")));
  console.log(errMsg("Error en texto plano"));
  console.log(errMsg({ description: "Error COM de Windows" }));
  console.log(errMsg(null));
  ```
- **Resultado esperado:**
  - Devuelve `"Fallo de prueba"`, `"Error en texto plano"`, `"Error COM de Windows"`, `"error sin descripcion"` respectivamente.
  - Ninguna llamada produce recursión o excepciones no controladas.

---

## FASE B: Autenticación y Verificación de Dispositivo (2FA)

### Prueba B1: Confirmación de diagnóstico al arrancar
- **Paso 1:** Abrir la consola de depuración en arranque.
- **Paso 2:** Filtrar por `[FASE-B-DIAG]`.
- **Resultado esperado:**
  - `PLATFORM.ready: true` (la capa asíncrona de almacenamiento ya resolvió antes de ejecutar `app.js`).
  - `devId(): ANDROID-XXXXXXXX / ANDROID\MOVIL` (el ID coincide con el identificador único persistente, sin el respaldo provisional `ANDROID-CLIENT`).
  - `CFG.dsalt`: Cadena salt hexadecimal persistida en `cierre_config.json`.
  - `CFG.dev.length`: Número entero >= 1 (conserva la lista de dispositivos autorizados).

### Prueba B2 y B3: No repetición de 2FA tras autorizar
- **Paso 1:** En un dispositivo nuevo o con caché limpia, iniciar la app e introducir la contraseña / autorizar por 2FA una vez.
- **Paso 2:** Verificar en consola que `cierre_device_id` se guardó en `Preferences` y `localStorage`.
- **Paso 3:** Salir de la app y cerrarla desde la vista de aplicaciones recientes (swipe out).
- **Paso 4:** Reabrir la app (intento 1): **No debe pedir 2FA**.
- **Paso 5:** Cerrar y reabrir (intento 2): **No debe pedir 2FA**.
- **Paso 6:** Cerrar y reabrir (intento 3): **No debe pedir 2FA**.
- **Paso 7:** Rotar la pantalla entre vertical y horizontal: la app no recarga ni solicita 2FA.
- **Paso 8:** Reiniciar el teléfono y abrir la app: la huella de confianza se mantiene y entra directamente.

---

## FASE C: Diseño Móvil Adaptativo (< 700 px) y Pantallas Anchas

### Prueba C1: Franja de Jackpot (`.jpb`)
- **Paso 1:** Visualizar la app en pantalla vertical (< 700 px).
- **Resultado esperado:** Franja de Jackpot compacta en una sola fila baja, con tipografía adaptada y scroll táctil horizontal sin barra visible.
- **Paso 2:** Abrir una mesa de juego (`.win`) o cualquier modal (`.ov`).
- **Resultado esperado:** La franja de Jackpot queda detrás de la ventana/modal (`z-index: 1 !important`), sin traslaparse sobre los botones ni el contenido.

### Prueba C2: Barra superior compacta y Hoja "Más"
- **Paso 1 (Registro):** En ancho < 700 px, la barra superior muestra únicamente:
  - Título editable (`#rgH1`).
  - Día de operación con flechas `←` y `→`.
  - Chip de Operador (`.opc`).
  - Botón `☰ Más`.
- **Paso 2:** Tocar `☰ Más`.
- **Resultado esperado:** Sube una hoja desde abajo con fondo oscuro translúcido:
  - Selector de tamaño de letra `A−` / `A+`.
  - Sección **Acciones**: `Score WhatsApp` (primero), `Actualizar totales`, `Aforo`.
  - Sección **Ajustes**: `Alarmas...`, `Sonido`, `Conexión y archivos...`.
  - Todos los botones tienen altura mínima de 48 px distribuidos en 2 columnas.
- **Paso 3 (Cierre):** Cambiar a la vista CIERRE. Tocar `☰ Más`.
- **Resultado esperado:**
  - Sección **Cierre**: `Cierre`, `Score WhatsApp`, `Fichas no negociables`, `Cartas`, `Cajas`.
  - Sección **Mesas**: `Seleccionar varias`, `Reset del día` (estilo peligroso).
  - Sección **Ajustes**: `Aforo`, `Alarmas...`, `Sonido`, `Conexión`.
- **Paso 4:** Tocar fuera de la hoja, presionar el botón Atrás de Android, o seleccionar una opción.
- **Resultado esperado:** La hoja se cierra inmediatamente.
- **Paso 5:** Ampliar la ventana a >= 700 px (o girar a horizontal en tablet/PC).
- **Resultado esperado:** Todos los botones regresan a sus posiciones y orden original en la barra horizontal, sin clonación ni pérdida de funciones.

### Prueba C3: Botones de Tipo (`.tpr`) y Menú Flotante
- **Paso 1:** En modo compacto (< 700 px), la barra de tipos muestra:
  - Botón **INGRESO (F2)** expandido.
  - Botón **RETIRO (F3)** expandido.
  - Tercer botón **MÁS ▾**.
- **Paso 2:** Tocar el botón **MÁS ▾**.
- **Resultado esperado:** Se abre el menú flotante con `DEVOLUCION (F4)`, `JACKPOT (F5)` y `PREMIO (F6)` con sus respectivos colores.
- **Paso 3:** Seleccionar `DEVOLUCION (F4)`.
- **Resultado esperado:**
  - El menú se cierra y se activa el modo Devolución (`setTipo('D')`).
  - El tercer botón cambia su etiqueta a **DEVOLUCION** con fondo dorado y clase `.on`.
- **Paso 4:** Mantener presionado (clic sostenido por 500 ms) sobre el botón **INGRESO** o **RETIRO**.
- **Resultado esperado:**
  - Se abre el mismo menú flotante de tipos.
  - Al soltar el dedo NO se dispara un clic accidental de Ingreso/Retiro, ni se abre el menú contextual del navegador, ni se selecciona texto.
- **Paso 5:** Verificar que la pista *"Mantén presionado para más"* desaparece y no vuelve a mostrarse en aperturas futuras.

### Prueba C4: Pantalla de Cierre (< 700 px)
- **Paso 1:** Ir a la pestaña **CIERRE**.
- **Resultado esperado:**
  - Los indicadores clave (KPIs) se ordenan en filas de exactamente 2 columnas con tipografía grande y clara.
  - La cuadrícula de mesas se organiza en 2 columnas parejas; cada tarjeta (`.m`) muestra el nombre de la mesa (`.nm ~1rem`), fichas, valor, propina y acumulado con alto contraste y sin textos truncados.

### Prueba C5: Ventanas de Mesa (`.win`)
- **Paso 1:** Tocar cualquier mesa para abrir su ventana de captura.
- **Resultado esperado:**
  - La ventana ocupa la pantalla completa de forma limpia.
  - La fila inferior de totales (`.wtot`: Fichas, Valor, Dif., Propina) permanece fija en la base de la pantalla, siempre visible sin importar el scroll vertical de las denominaciones.
  - Los botones de incremento/decremento (`+` / `−`) y los campos de entrada numérica tienen al menos 48 px de altura para pulsación táctil cómoda.

### Prueba C6: Tipografía Adaptativa y Rotación
- **Paso 1 (Pantalla >= 900 px):** Probar en resolución TV box (1920x1080) o ventana de escritorio > 900 px.
- **Resultado esperado:** La fuente base de `<html>` es exactamente de **16 px**.
- **Paso 2 (Teléfonos 360 px - 412 px):** Comprobar en emulador o dispositivo móvil en vertical.
- **Resultado esperado:** La tipografía escala de forma continua (entre 17 px y 21 px) facilitando la lectura sin provocar desbordamientos horizontales de pantalla.
- **Paso 3:** Abrir la hoja "Más" y cambiar la escala con `A+` y `A−` (factores 0.85, 1.0, 1.15, 1.3, 1.5).
- **Resultado esperado:** La interfaz entera escala proporcionalmente; al cerrar y reabrir la app, el factor de escala seleccionado se mantiene guardado.
- **Paso 4:** Capturar valores en un formulario y rotar el teléfono 90 grados.
- **Resultado esperado:** La pantalla se adapta al nuevo ancho/alto sin recargar la página web y sin perder los datos ingresados.
