/**
 * mobile.js - Lógica y adaptación exclusiva para Cliente Móvil Android
 * Cierre de Fichas - Capri GDL
 * Se ejecuta DESPUÉS de app.js.
 */
(function() {
  'use strict';

  // Helper seguro para obtener plugins de Capacitor
  function getCapPlugin(name) {
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) {
        return window.Capacitor.Plugins[name];
      }
    } catch (e) {
      console.warn('[MOBILE] Error accediendo al plugin ' + name + ':', e);
    }
    return null;
  }

  /* ==========================================================================
     1. MODO CLIENTE LIMPIO: Ocultación visual de funciones exclusivas de Servidor
     ========================================================================== */

  // Inyección de CSS para ocultar SOLO lo que en modo cliente muestra "se hace en la PC servidor"
  function injectMobileStyles() {
    var style = document.createElement('style');
    style.id = 'mobile-clean-styles';
    style.innerHTML = [
      // 1. Selector de rol nunca debe mostrarse en móvil
      '#rl { display: none !important; }',
      // 2. Botones de acciones que en modo cliente alertan "se hace en la PC servidor"
      'span[onclick*="cuOpen"] { display: none !important; }',       // Cuadrar
      'span[onclick*="apOpen"] { display: none !important; }',       // Ingreso/salida personal
      'span[onclick*="hsOpen"] { display: none !important; }',       // Hostess
      'span[onclick*="prOpen"] { display: none !important; }',       // Premio F6 de la barra
      'span[onclick*="regCfgOpen"] { display: none !important; }',   // Configuración
      'span[onclick*="hdOpen"] { display: none !important; }',       // Encabezados de mesas
      // 3. Indicador de red (#net): colores de estado (el contenedor base está en mobile.css)
      '#net .up { color: #5fd39b !important; }',
      '#net .dn { color: #ff7a6b !important; }',
      // 4. En modal de configuración (#cf): ocultar enlace a cambiar rol
      '#cf .hint a[onclick*="roleOpen"] { display: none !important; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ==========================================================================
     2. RECONEXIÓN AL VOLVER DE SEGUNDO PLANO (Resume / VisibilityChange)
     ========================================================================== */

  var hiddenAt = null;
  var lastReconnectAt = 0;

  function markBackground() {
    hiddenAt = Date.now();
  }

  function checkAndReconnect() {
    try {
      if (!window.cli || !window.cli()) return;
      if (!window.CFG || !window.CFG.nt || !window.CFG.nt.room) return;

      var now = Date.now();
      // Si pasaron menos de 5000 ms desde la última llamada a ntStart(), no reiniciar de nuevo
      if (now - lastReconnectAt < 5000) {
        return;
      }

      var elapsedMs = hiddenAt ? (now - hiddenAt) : 0;
      hiddenAt = null;

      // Si pasaron más de 10 segundos en segundo plano, reconectar SIEMPRE
      if (elapsedMs > 10000) {
        console.log('[MOBILE] Más de 10 s en segundo plano (' + Math.round(elapsedMs / 1000) + 's). Forzando ntStart()...');
        if (typeof window.ntStart === 'function') {
          lastReconnectAt = Date.now();
          window.ntStart();
        }
        return;
      }

      // Si pasaron menos de 10 segundos, comprobación de estado de conexión:
      // readyState 0 (CONNECTING) y 1 (OPEN) se consideran conexión en curso o activa
      var ws = window.NT ? window.NT.ws : null;
      var hasWsActive = ws && (ws.readyState === 0 || ws.readyState === 1);
      var hasPollActive = window.NT && window.NT.poll !== null;

      if (!hasWsActive && !hasPollActive) {
        console.log('[MOBILE] Conexión inactiva tras breve pausa. Reconectando con ntStart()...');
        if (typeof window.ntStart === 'function') {
          lastReconnectAt = Date.now();
          window.ntStart();
        }
      } else {
        console.log('[MOBILE] Conexión activa o en curso mantenida tras pausa breve (<10s).');
      }
    } catch (e) {
      console.warn('[MOBILE] Error en checkAndReconnect:', e);
    }
  }

  // 1) Respaldo con visibilitychange web estándar
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      markBackground();
    } else {
      checkAndReconnect();
    }
  });

  // 2) Evento 'appStateChange' nativo de Capacitor App
  var appPlugin = getCapPlugin('App');
  if (appPlugin && typeof appPlugin.addListener === 'function') {
    try {
      appPlugin.addListener('appStateChange', function(state) {
        if (state) {
          if (!state.isActive) {
            markBackground();
          } else {
            checkAndReconnect();
          }
        }
      });
    } catch (e) {
      console.warn('[MOBILE] Error registrando listener de appStateChange:', e);
    }
  }

  /* ==========================================================================
     3. BOTÓN ATRÁS DE ANDROID (BackButton)
     ========================================================================== */

  function handleBackButton() {
    // 1. Buscar si hay ventanas flotantes de mesa abiertas (.win)
    if (window.WIN) {
      var topWin = -1;
      var topZ = 0;
      for (var k in window.WIN) {
        if (window.WIN[k] && window.WIN[k].el) {
          var z = parseInt(window.WIN[k].el.style.zIndex, 10) || 0;
          if (z >= topZ) {
            topZ = z;
            topWin = parseInt(k, 10);
          }
        }
      }
      if (topWin >= 0 && typeof window.listo === 'function') {
        console.log('[MOBILE] BackButton: cerrando ventana de mesa', topWin);
        window.listo(topWin);
        return;
      }
    }

    // 2. Mapeo ordenado de modales overlay (.ov) y sus funciones de cierre dedicadas
    var overlayCloseMap = [
      { id: 'mHe', fn: 'heClose' },
      { id: 'mDv', fn: 'dvClose' },
      { id: 'mJp', fn: 'jpClose' },
      { id: 'mFc', fn: 'fcClose' },
      { id: 'mAmt', fn: 'amtCancel' },
      { id: 'mPk', fn: 'pkClose' },
      { id: 'mNew', fn: 'newNo' },
      { id: 'mMon', fn: 'monClose' },
      { id: 'mRC', fn: 'regCfgClose' },
      { id: 'mSc', fn: 'scClose' },
      { id: 'mTx', fn: 'txClose' },
      { id: 'mHd', fn: 'hdClose' },
      { id: 'mAf', fn: 'afCancel' },
      { id: 'mAlc', fn: 'almCfgClose' },
      { id: 'mHs', fn: 'hsClose' },
      { id: 'mAp', fn: 'apClose' },
      { id: 'mPr', fn: 'prClose' },
      { id: 'mHn', fn: 'hsNamesClose' },
      { id: 'mCu', fn: 'cuClose' },
      { id: 'mCi', fn: 'ciClose' },
      { id: 'mFn', fn: 'fnnClose' },
      { id: 'mCt', fn: 'ctClose' },
      { id: 'mCj', fn: 'cjClose' },
      { id: 'mJe', fn: 'jeClose' },
      { id: 'cf', fn: 'cfgClose' }
    ];

    for (var i = 0; i < overlayCloseMap.length; i++) {
      var item = overlayCloseMap[i];
      var el = document.getElementById(item.id);
      if (el && el.style.display && el.style.display !== 'none') {
        console.log('[MOBILE] BackButton: cerrando modal', item.id);
        if (typeof window[item.fn] === 'function') {
          window[item.fn]();
        } else {
          el.style.display = 'none';
        }
        return;
      }
    }

    // 3. Revisar cualquier otro .ov visible
    var allOv = document.querySelectorAll('.ov');
    for (var j = 0; j < allOv.length; j++) {
      if (allOv[j].style.display && allOv[j].style.display !== 'none' && allOv[j].id !== 'lk') {
        allOv[j].style.display = 'none';
        return;
      }
    }

    // 4. Si no hay modal ni ventana abierta, confirmar salida
    if (confirm('¿Deseas salir de la aplicación Cierre de Fichas?')) {
      if (appPlugin && typeof appPlugin.exitApp === 'function') {
        appPlugin.exitApp();
      }
    }
  }

  if (appPlugin && typeof appPlugin.addListener === 'function') {
    try {
      appPlugin.addListener('backButton', function() {
        handleBackButton();
      });
    } catch (e) {
      console.warn('[MOBILE] Error registrando listener de backButton:', e);
    }
  }

  /* ==========================================================================
     4. PANTALLA ENCENDIDA DURANTE EL TURNO (KeepAwake)
     ========================================================================== */

  function initKeepAwake() {
    var keepAwake = getCapPlugin('KeepAwake');
    if (keepAwake && typeof keepAwake.keepAwake === 'function') {
      try {
        keepAwake.keepAwake().then(function() {
          console.log('[MOBILE] KeepAwake activado con éxito.');
        }).catch(function(err) {
          console.warn('[MOBILE] KeepAwake no disponible o rechazado:', err);
        });
      } catch (e) {
        console.warn('[MOBILE] Error ejecutando KeepAwake:', e);
      }
    }
  }

  /* ==========================================================================
     5. ASIGNACIÓN DE INPUTMODE PARA TECLADO NUMÉRICO Y CONTROL DE ARRASTRE
     ========================================================================== */

  // IDs de campos que reciben montos o cantidades numéricas (sin campos HH:MM como apH o prH)
  var NUMERIC_INPUT_IDS = [
    'amV', 'heM', 'scF', 'afV', 'hsAmt', 'prF', 'jeAmt',
    'cfMi', 'cfMr', 'cfLim', 'cfDvR', 'cfDvD', 'dvL', 'dvP', 'dvM', 'jpAmt'
  ];

  function applyMobileInputModes(root) {
    var scope = root || document;
    // 1. Por ID directo
    for (var i = 0; i < NUMERIC_INPUT_IDS.length; i++) {
      var el = document.getElementById(NUMERIC_INPUT_IDS[i]);
      if (el && !el.getAttribute('inputmode')) {
        el.setAttribute('inputmode', 'decimal');
      }
    }
    // 2. Todos los inputs dentro de filas de fichas/montos (.r input) y .win input usan decimal
    var rInputs = scope.querySelectorAll('.r input, .win input');
    for (var j = 0; j < rInputs.length; j++) {
      if (!rInputs[j].getAttribute('inputmode')) {
        rInputs[j].setAttribute('inputmode', 'decimal');
      }
    }
  }

  function initInputModeObserver() {
    applyMobileInputModes();
    // Observar inserciones dinámicas de modales y ventanas (.win)
    if (window.MutationObserver) {
      var obs = new MutationObserver(function(mutations) {
        for (var m = 0; m < mutations.length; m++) {
          if (mutations[m].addedNodes && mutations[m].addedNodes.length) {
            applyMobileInputModes(mutations[m].target);
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Desactivar arrastre (.wt) en pantallas de teléfono (<600px) anulando DR en mousemove
  function initDragDisabler() {
    var origMove = document.onmousemove;
    document.onmousemove = function(e) {
      if (window.innerWidth < 600) {
        window.DR = null;
        return;
      }
      if (typeof origMove === 'function') {
        origMove.call(this, e);
      }
    };
  }

  /* ==========================================================================
     6. INICIALIZACIÓN MÓVIL
     ========================================================================== */

  function initMobile() {
    injectMobileStyles();
    initKeepAwake();
    initInputModeObserver();
    initDragDisabler();
    console.log('[MOBILE] Módulo móvil inicializado.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobile);
  } else {
    initMobile();
  }

})();
