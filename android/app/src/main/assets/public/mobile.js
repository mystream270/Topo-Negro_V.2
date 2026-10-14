/**
 * mobile.js - Lógica y adaptación exclusiva para Cliente Móvil Android
 * Cierre de Fichas - Capri GDL
 * Implementación de Fase C: Diseño móvil adaptativo (<700px) y pantallas anchas
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
      // 3. Indicador de red (#net)
      '#net .up { color: #5fd39b !important; }',
      '#net .dn { color: #ff7a6b !important; }',
      // 4. En modal de configuración (#cf): ocultar enlace a cambiar rol
      '#cf .hint a[onclick*="roleOpen"] { display: none !important; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ==========================================================================
     C6. TIPOGRAFÍA ADAPTATIVA Y CONTROL DE ESCALA (A− / A+)
     ========================================================================== */
  var FONT_FACTORS = [0.85, 1.0, 1.15, 1.3, 1.5];
  var currentFactorIndex = 1; // 1.0 por defecto

  function loadFontFactor() {
    try {
      var saved = localStorage.getItem('cierre_font_scale');
      if (saved) {
        var num = parseFloat(saved);
        var idx = FONT_FACTORS.indexOf(num);
        if (idx >= 0) currentFactorIndex = idx;
      } else if (window.CFG && window.CFG.fontScale) {
        var idx2 = FONT_FACTORS.indexOf(window.CFG.fontScale);
        if (idx2 >= 0) currentFactorIndex = idx2;
      }
    } catch (e) {}
  }

  function applyAdaptiveFontSize() {
    var w = window.innerWidth || document.documentElement.clientWidth || 1280;
    var basePx;
    if (w >= 900) {
      basePx = 16; // Exactamente 16px en pantallas >= 900px (TV box)
    } else {
      // Teléfono vertical: clamp(17px, 4.5vw, 21px)
      var calc = w * 0.045;
      basePx = Math.min(21, Math.max(17, calc));
    }
    var factor = FONT_FACTORS[currentFactorIndex];
    var finalPx = Math.round(basePx * factor * 10) / 10;
    document.documentElement.style.fontSize = finalPx + 'px';
    if (window.RFP !== undefined) {
      window.RFP = finalPx;
    }
    updateFontScaleUI();
  }

  function saveFontFactor(idx) {
    currentFactorIndex = Math.max(0, Math.min(FONT_FACTORS.length - 1, idx));
    var val = FONT_FACTORS[currentFactorIndex];
    try {
      localStorage.setItem('cierre_font_scale', String(val));
      if (window.CFG) {
        window.CFG.fontScale = val;
        if (typeof window.cfgSave === 'function') window.cfgSave();
      }
    } catch (e) {}
    applyAdaptiveFontSize();
  }

  function updateFontScaleUI() {
    var lbl = document.getElementById('masFontVal');
    if (lbl) {
      lbl.textContent = Math.round(FONT_FACTORS[currentFactorIndex] * 100) + '%';
    }
  }

  /* ==========================================================================
     C2. HOJA "MÁS" (BOTTOM SHEET) Y GESTIÓN DE NODOS DEL DOM
     ========================================================================== */
  var sheetBackdrop = null;
  var isCompactModeActive = false;
  var movedNodesRegistry = []; // Almacena { node, parent, nextSibling }

  function createMasSheetDOM() {
    if (document.getElementById('mMasSheetBackdrop')) return;

    var bd = document.createElement('div');
    bd.id = 'mMasSheetBackdrop';
    bd.className = 'mas-backdrop';
    bd.style.display = 'none';

    bd.innerHTML = [
      '<div id="mMasSheet" class="mas-sheet">',
      '  <div class="mas-header">',
      '    <h3 id="masSheetTitle">Más opciones</h3>',
      '    <span class="b mas-close-btn" id="masCloseBtn" title="Cerrar">✕</span>',
      '  </div>',
      '  <div class="mas-font-row">',
      '    <span>Tamaño de letra:</span>',
      '    <div style="display:flex;align-items:center;gap:0.4rem;">',
      '      <span class="b" id="masFontDec" title="Reducir fuente">A−</span>',
      '      <span id="masFontVal" class="mas-font-val">100%</span>',
      '      <span class="b" id="masFontInc" title="Aumentar fuente">A+</span>',
      '    </div>',
      '  </div>',
      '  <div id="masContentReg" style="display:none">',
      '    <div class="mas-sec-title">Acciones</div>',
      '    <div id="masGridRegAcc" class="mas-grid"></div>',
      '    <div class="mas-sec-title">Ajustes</div>',
      '    <div id="masGridRegAdj" class="mas-grid"></div>',
      '  </div>',
      '  <div id="masContentCierre" style="display:none">',
      '    <div class="mas-sec-title">Cierre</div>',
      '    <div id="masGridCierreOp" class="mas-grid"></div>',
      '    <div class="mas-sec-title">Mesas</div>',
      '    <div id="masGridCierreMes" class="mas-grid"></div>',
      '    <div class="mas-sec-title">Ajustes</div>',
      '    <div id="masGridCierreAdj" class="mas-grid"></div>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(bd);
    sheetBackdrop = bd;

    // Listeners del sheet
    bd.addEventListener('click', function(e) {
      if (e.target === bd) {
        closeMasSheet();
      }
    });

    var closeBtn = document.getElementById('masCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeMasSheet);
    }

    var fontDec = document.getElementById('masFontDec');
    if (fontDec) {
      fontDec.addEventListener('click', function() {
        saveFontFactor(currentFactorIndex - 1);
      });
    }

    var fontInc = document.getElementById('masFontInc');
    if (fontInc) {
      fontInc.addEventListener('click', function() {
        saveFontFactor(currentFactorIndex + 1);
      });
    }

    // Al tocar cualquier botón del sheet, cerrar el sheet después de ejecutar la acción
    bd.addEventListener('click', function(e) {
      var btn = e.target.closest('.b');
      if (btn && btn.id !== 'masFontDec' && btn.id !== 'masFontInc' && btn.id !== 'masCloseBtn') {
        setTimeout(closeMasSheet, 100);
      }
    });
  }

  function isMasSheetOpen() {
    return sheetBackdrop && sheetBackdrop.style.display !== 'none';
  }

  function openMasSheet(view) {
    if (!sheetBackdrop) createMasSheetDOM();
    updateFontScaleUI();

    var regCont = document.getElementById('masContentReg');
    var cieCont = document.getElementById('masContentCierre');
    var title = document.getElementById('masSheetTitle');

    if (view === 'reg') {
      if (regCont) regCont.style.display = 'block';
      if (cieCont) cieCont.style.display = 'none';
      if (title) title.textContent = 'Registro · Más';
    } else {
      if (regCont) regCont.style.display = 'none';
      if (cieCont) cieCont.style.display = 'block';
      if (title) title.textContent = 'Cierre · Más';
    }

    sheetBackdrop.style.display = 'flex';
  }

  function closeMasSheet() {
    if (sheetBackdrop) {
      sheetBackdrop.style.display = 'none';
    }
  }

  // Mover nodo registrando su ubicación original para restitución fiel
  function moveNodeTo(node, targetContainer) {
    if (!node || !targetContainer) return;
    movedNodesRegistry.push({
      node: node,
      parent: node.parentNode,
      nextSibling: node.nextSibling
    });
    targetContainer.appendChild(node);
  }

  function restoreMovedNodes() {
    for (var i = movedNodesRegistry.length - 1; i >= 0; i--) {
      var item = movedNodesRegistry[i];
      if (item.node && item.parent) {
        if (item.nextSibling && item.nextSibling.parentNode === item.parent) {
          item.parent.insertBefore(item.node, item.nextSibling);
        } else {
          item.parent.appendChild(item.node);
        }
      }
    }
    movedNodesRegistry = [];
  }

  function setupCompactBars() {
    if (!sheetBackdrop) createMasSheetDOM();

    var barReg = document.querySelector('#vReg .bar');
    var barCierre = document.querySelector('#vCierre .bar');
    if (!barReg || !barCierre) return;

    var gRegAcc = document.getElementById('masGridRegAcc');
    var gRegAdj = document.getElementById('masGridRegAdj');
    var gCieOp = document.getElementById('masGridCierreOp');
    var gCieMes = document.getElementById('masGridCierreMes');
    var gCieAdj = document.getElementById('masGridCierreAdj');

    // 1. Registro: Botones a la hoja "Más"
    // Acciones: Score WhatsApp primero, Actualizar totales, Aforo
    var btnScoreR = barReg.querySelector('span[onclick*="scoreOpen"]');
    var btnTotR = barReg.querySelector('span[onclick*="regTotRefresh"]');
    var btnAfR = barReg.querySelector('span[onclick*="afStart"]');
    moveNodeTo(btnScoreR, gRegAcc);
    moveNodeTo(btnTotR, gRegAcc);
    moveNodeTo(btnAfR, gRegAcc);

    // Ajustes: Alarmas, Sonido, Conexión y archivos
    var btnAlmR = barReg.querySelector('span[onclick*="almCfgOpen"]');
    var btnSndR = document.getElementById('sndB1');
    var btnCfgR = barReg.querySelector('span[onclick*="cfgOpen"]');
    moveNodeTo(btnAlmR, gRegAdj);
    moveNodeTo(btnSndR, gRegAdj);
    moveNodeTo(btnCfgR, gRegAdj);

    // Botón "☰ Más" para Registro
    var btnMasReg = document.getElementById('btnMasReg');
    if (!btnMasReg) {
      btnMasReg = document.createElement('span');
      btnMasReg.id = 'btnMasReg';
      btnMasReg.className = 'btn-mas-trigger';
      btnMasReg.innerHTML = '&#9776; M&aacute;s';
      btnMasReg.onclick = function() { openMasSheet('reg'); };
      barReg.appendChild(btnMasReg);
    }
    btnMasReg.style.display = '';

    // 2. Cierre: Botones a la hoja "Más"
    // Cierre: Cierre, Score WhatsApp, Fichas no negociables, Cartas, Cajas
    var btnCierreC = barCierre.querySelector('span[onclick*="cierreMail"]');
    var btnScoreC = barCierre.querySelector('span[onclick*="scoreOpen"]');
    var btnFnnC = barCierre.querySelector('span[onclick*="fnnOpen"]');
    var btnCtC = barCierre.querySelector('span[onclick*="cartasOpen"]');
    var btnCjC = barCierre.querySelector('span[onclick*="cajasOpen"]');
    moveNodeTo(btnCierreC, gCieOp);
    moveNodeTo(btnScoreC, gCieOp);
    moveNodeTo(btnFnnC, gCieOp);
    moveNodeTo(btnCtC, gCieOp);
    moveNodeTo(btnCjC, gCieOp);

    // Mesas: Seleccionar varias (#selb), Reset del día
    var selb = document.getElementById('selb');
    var btnResetC = barCierre.querySelector('span[onclick*="resetDia"]');
    moveNodeTo(selb, gCieMes);
    moveNodeTo(btnResetC, gCieMes);

    // Ajustes: Aforo, Alarmas, Sonido, Conexión
    var btnAfC = barCierre.querySelector('span[onclick*="afStart"]');
    var btnAlmC = barCierre.querySelector('span[onclick*="almCfgOpen"]');
    var btnSndC = document.getElementById('sndB2');
    var btnCfgC = document.getElementById('btnCfg') || barCierre.querySelector('span[onclick*="cfgOpen"]');
    moveNodeTo(btnAfC, gCieAdj);
    moveNodeTo(btnAlmC, gCieAdj);
    moveNodeTo(btnSndC, gCieAdj);
    moveNodeTo(btnCfgC, gCieAdj);

    // Botón "☰ Más" para Cierre
    var btnMasCie = document.getElementById('btnMasCierre');
    if (!btnMasCie) {
      btnMasCie = document.createElement('span');
      btnMasCie.id = 'btnMasCierre';
      btnMasCie.className = 'btn-mas-trigger';
      btnMasCie.innerHTML = '&#9776; M&aacute;s';
      btnMasCie.onclick = function() { openMasSheet('cierre'); };
      barCierre.appendChild(btnMasCie);
    }
    btnMasCie.style.display = '';
  }

  function teardownCompactBars() {
    restoreMovedNodes();
    var btnMasReg = document.getElementById('btnMasReg');
    if (btnMasReg) btnMasReg.style.display = 'none';
    var btnMasCie = document.getElementById('btnMasCierre');
    if (btnMasCie) btnMasCie.style.display = 'none';
    closeMasSheet();
  }

  /* ==========================================================================
     C3. BOTONES DE TIPO (.tpr) EN MODO COMPACTO
     ========================================================================== */
  var tpDropdownBackdrop = null;
  var tpObserver = null;
  var suppressNextClick = false;

  function createTpDropdownDOM() {
    if (document.getElementById('mTpDropdownBackdrop')) return;

    var bd = document.createElement('div');
    bd.id = 'mTpDropdownBackdrop';
    bd.className = 'tp-dropdown-backdrop';
    bd.style.display = 'none';

    bd.innerHTML = [
      '<div class="tp-dropdown-menu">',
      '  <div class="b tp dev" data-tipo="D">DEVOLUCION &nbsp;(F4)</div>',
      '  <div class="b tp jp" data-tipo="J">JACKPOT &nbsp;(F5)</div>',
      '  <div class="b tp pr" data-tipo="P">PREMIO &nbsp;(F6)</div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(bd);
    tpDropdownBackdrop = bd;

    bd.addEventListener('click', function(e) {
      if (e.target === bd) {
        closeTpDropdown();
        return;
      }
      var item = e.target.closest('[data-tipo]');
      if (item) {
        var t = item.getAttribute('data-tipo');
        if (typeof window.setTipo === 'function') {
          window.setTipo(t);
        }
        markTpHintShown();
        closeTpDropdown();
      }
    });
  }

  function isTpDropdownOpen() {
    return tpDropdownBackdrop && tpDropdownBackdrop.style.display !== 'none';
  }

  function openTpDropdown() {
    if (!tpDropdownBackdrop) createTpDropdownDOM();
    tpDropdownBackdrop.style.display = 'flex';
  }

  function closeTpDropdown() {
    if (tpDropdownBackdrop) {
      tpDropdownBackdrop.style.display = 'none';
    }
  }

  function markTpHintShown() {
    try {
      localStorage.setItem('cierre_tp_hint_shown', '1');
      var h = document.getElementById('tpLongPressHint');
      if (h) h.style.display = 'none';
    } catch (e) {}
  }

  function setupTipoButtonsCompact() {
    var tpr = document.querySelector('.tpr');
    if (!tpr) return;

    createTpDropdownDOM();

    // 1. Crear o mostrar botón MÁS ▾
    var moreBtn = document.getElementById('tpMoreBtn');
    if (!moreBtn) {
      moreBtn = document.createElement('span');
      moreBtn.id = 'tpMoreBtn';
      moreBtn.className = 'b';
      moreBtn.textContent = 'MÁS ▾';
      moreBtn.onclick = function() {
        openTpDropdown();
      };
      tpr.appendChild(moreBtn);
    }
    moreBtn.style.display = '';

    // 2. Mostrar pista discreta la primera vez si no se ha mostrado
    try {
      if (!localStorage.getItem('cierre_tp_hint_shown')) {
        var hintEl = document.getElementById('tpLongPressHint');
        if (!hintEl) {
          hintEl = document.createElement('div');
          hintEl.id = 'tpLongPressHint';
          hintEl.className = 'hint';
          hintEl.textContent = 'Mantén presionado para más';
          tpr.parentNode.insertBefore(hintEl, tpr.nextSibling);
        }
        hintEl.style.display = '';
      }
    } catch (e) {}

    // 3. Soporte para clic sostenido (500 ms) en INGRESO (#tI) y RETIRO (#tR)
    ['tI', 'tR'].forEach(function(id) {
      var btn = document.getElementById(id);
      if (!btn || btn._hasLongPressAttached) return;
      btn._hasLongPressAttached = true;

      var pressTimer = null;
      var startX = 0, startY = 0;

      function startPress(e) {
        if (e.touches && e.touches.length > 1) return;
        if (e.touches) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }
        clearTimeout(pressTimer);
        pressTimer = setTimeout(function() {
          suppressNextClick = true;
          markTpHintShown();
          openTpDropdown();
          var capHaptics = getCapPlugin('Haptics');
          if (capHaptics && typeof capHaptics.impact === 'function') {
            try { capHaptics.impact({ style: 'Medium' }); } catch (x) {}
          } else if (navigator.vibrate) {
            try { navigator.vibrate(40); } catch (x) {}
          }
        }, 500);
      }

      function cancelPress(e) {
        clearTimeout(pressTimer);
      }

      function checkMove(e) {
        if (e.touches && e.touches.length) {
          var dx = Math.abs(e.touches[0].clientX - startX);
          var dy = Math.abs(e.touches[0].clientY - startY);
          if (dx > 10 || dy > 10) {
            clearTimeout(pressTimer);
          }
        }
      }

      btn.addEventListener('touchstart', startPress, { passive: true });
      btn.addEventListener('touchend', cancelPress, { passive: true });
      btn.addEventListener('touchcancel', cancelPress, { passive: true });
      btn.addEventListener('touchmove', checkMove, { passive: true });

      btn.addEventListener('mousedown', startPress);
      btn.addEventListener('mouseup', cancelPress);
      btn.addEventListener('mouseleave', cancelPress);

      btn.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      });

      // Interceptar click normal si se disparó el long-press
      btn.addEventListener('click', function(e) {
        if (suppressNextClick) {
          e.preventDefault();
          e.stopPropagation();
          suppressNextClick = false;
          return false;
        }
      }, true);
    });

    // 4. MutationObserver para sincronizar el estado activo (.on) con el tercer botón
    syncTipoMoreButtonState();
    if (!tpObserver && window.MutationObserver) {
      tpObserver = new MutationObserver(function() {
        syncTipoMoreButtonState();
      });
      tpObserver.observe(tpr, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }
  }

  function syncTipoMoreButtonState() {
    var moreBtn = document.getElementById('tpMoreBtn');
    if (!moreBtn) return;

    var tD = document.getElementById('tD');
    var tJ = document.getElementById('tJ');
    var tP = document.getElementById('tP');

    if (tD && tD.classList.contains('on')) {
      moreBtn.textContent = 'DEVOLUCION';
      moreBtn.className = 'b tp dev on';
    } else if (tJ && tJ.classList.contains('on')) {
      moreBtn.textContent = 'JACKPOT';
      moreBtn.className = 'b tp jp on';
    } else if (tP && tP.classList.contains('on')) {
      moreBtn.textContent = 'PREMIO';
      moreBtn.className = 'b tp pr on';
    } else {
      moreBtn.textContent = 'MÁS ▾';
      moreBtn.className = 'b';
    }
  }

  function teardownTipoButtons() {
    var moreBtn = document.getElementById('tpMoreBtn');
    if (moreBtn) moreBtn.style.display = 'none';
    var hintEl = document.getElementById('tpLongPressHint');
    if (hintEl) hintEl.style.display = 'none';
    closeTpDropdown();
  }

  /* ==========================================================================
     RESPONSIVE MANAGER: ALTERNAR ENTRE MODO COMPACTO Y PANTALLA ANCHA (700px)
     ========================================================================== */
  function updateResponsiveLayout() {
    applyAdaptiveFontSize();
    var w = window.innerWidth || document.documentElement.clientWidth || 1280;
    var shouldBeCompact = w < 700;

    if (shouldBeCompact && !isCompactModeActive) {
      isCompactModeActive = true;
      setupCompactBars();
      setupTipoButtonsCompact();
    } else if (!shouldBeCompact && isCompactModeActive) {
      isCompactModeActive = false;
      teardownCompactBars();
      teardownTipoButtons();
    }
  }

  window.addEventListener('resize', updateResponsiveLayout);
  window.addEventListener('orientationchange', function() {
    setTimeout(updateResponsiveLayout, 100);
  });

  // Reemplazar fit() de app.js con la fórmula adaptativa requerida en C6
  window.fit = applyAdaptiveFontSize;

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
      if (now - lastReconnectAt < 5000) {
        return;
      }

      var elapsedMs = hiddenAt ? (now - hiddenAt) : 0;
      hiddenAt = null;

      if (elapsedMs > 10000) {
        console.log('[MOBILE] Más de 10 s en segundo plano (' + Math.round(elapsedMs / 1000) + 's). Forzando ntStart()...');
        if (typeof window.ntStart === 'function') {
          lastReconnectAt = Date.now();
          window.ntStart();
        }
        return;
      }

      var ws = window.NT ? window.NT.ws : null;
      var hasWsActive = ws && (ws.readyState === 0 || ws.readyState === 1);
      var hasPollActive = window.NT && window.NT.poll !== null;

      if (!hasWsActive && !hasPollActive) {
        console.log('[MOBILE] Conexión inactiva tras breve pausa. Reconectando con ntStart()...');
        if (typeof window.ntStart === 'function') {
          lastReconnectAt = Date.now();
          window.ntStart();
        }
      }
    } catch (e) {
      console.warn('[MOBILE] Error en checkAndReconnect:', e);
    }
  }

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      markBackground();
    } else {
      checkAndReconnect();
    }
  });

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
    // 0. Si la hoja "Más" está abierta, cerrarla
    if (isMasSheetOpen()) {
      closeMasSheet();
      return;
    }

    // 0b. Si el dropdown de tipos está abierto, cerrarlo
    if (isTpDropdownOpen()) {
      closeTpDropdown();
      return;
    }

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
  var NUMERIC_INPUT_IDS = [
    'amV', 'heM', 'scF', 'afV', 'hsAmt', 'prF', 'jeAmt',
    'fn0', 'fn1', 'fn2', 'fn3', 'fn4', 'fn5',
    'ct0', 'ct1', 'ct2', 'ct3', 'ct4', 'ct5', 'ct6', 'ct7',
    'dvL', 'dvP', 'dvM', 'cjRs'
  ];

  function applyMobileInputModes(container) {
    var root = container || document;
    for (var i = 0; i < NUMERIC_INPUT_IDS.length; i++) {
      var el = root.getElementById ? root.getElementById(NUMERIC_INPUT_IDS[i]) : document.getElementById(NUMERIC_INPUT_IDS[i]);
      if (el && el.tagName === 'INPUT') {
        el.setAttribute('inputmode', 'numeric');
        el.setAttribute('pattern', '[0-9]*');
        el.setAttribute('autocomplete', 'off');
      }
    }

    var winInputs = (root.querySelectorAll ? root.querySelectorAll('.win input') : []);
    for (var j = 0; j < winInputs.length; j++) {
      winInputs[j].setAttribute('inputmode', 'numeric');
      winInputs[j].setAttribute('pattern', '[0-9]*');
      winInputs[j].setAttribute('autocomplete', 'off');
    }
  }

  function initInputModeObserver() {
    applyMobileInputModes();
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

  function initDragDisabler() {
    var origMove = document.onmousemove;
    document.onmousemove = function(e) {
      if (window.innerWidth < 700) {
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
    loadFontFactor();
    initKeepAwake();
    initInputModeObserver();
    initDragDisabler();
    createMasSheetDOM();
    updateResponsiveLayout();
    console.log('[MOBILE] Módulo móvil Fase C inicializado con éxito.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobile);
  } else {
    initMobile();
  }

})();
