/**
 * platform.js - Capa Shim de Compatibilidad Windows / HTA -> Android / Capacitor
 * Cierre de Fichas - Capri GDL
 */
(function() {
  'use strict';

  // Espacio de nombres de la plataforma
  window.PLATFORM = {
    ready: false,
    storageCache: {},
    deviceId: ''
  };

  // 1. Acceso a plugins de Capacitor si están disponibles en window.Capacitor.Plugins
  function getCapPlugin(name) {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) {
      return window.Capacitor.Plugins[name];
    }
    return null;
  }

  // 2. Rutas virtuales válidas
  window.base = function() {
    return 'C:\\cierre\\';
  };

  window.tmpDir = function() {
    return 'C:\\cierre\\tmp\\';
  };

  // 3. Normalizador de rutas a claves de almacenamiento
  function normalizeKey(path) {
    if (!path) return '';
    var k = String(path).replace(/\//g, '\\');
    var idx = k.lastIndexOf('\\');
    if (idx >= 0) {
      return k.substring(idx + 1).toLowerCase();
    }
    return k.toLowerCase();
  }

  // 4. Persistencia en segundo plano
  function persistKey(key, val) {
    var pref = getCapPlugin('Preferences');
    if (pref && typeof pref.set === 'function') {
      try {
        pref.set({ key: key, value: val });
      } catch (e) {
        console.warn('Error guardando en Preferences:', e);
      }
    }
    try {
      localStorage.setItem('cierre_fso_' + key, val);
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }
  }

  function deletePersistedKey(key) {
    var pref = getCapPlugin('Preferences');
    if (pref && typeof pref.remove === 'function') {
      try {
        pref.remove({ key: key });
      } catch (e) {}
    }
    try {
      localStorage.removeItem('cierre_fso_' + key);
    } catch (e) {}
  }

  // 5. TextStream Shim para FSO (ReadAll, Write, WriteLine, Close)
  function FakeTextStream(key, content, mode) {
    this._key = key;
    this._content = String(content || '');
    this._mode = mode || 1; // 1 = ForReading, 2 = ForWriting, 8 = ForAppending
    this._pointer = 0;
    this._closed = false;
  }

  FakeTextStream.prototype.ReadAll = function() {
    if (this._closed) throw new Error('Stream cerrado');
    return this._content;
  };

  FakeTextStream.prototype.ReadLine = function() {
    if (this._closed) throw new Error('Stream cerrado');
    var nextN = this._content.indexOf('\n', this._pointer);
    var line;
    if (nextN >= 0) {
      line = this._content.substring(this._pointer, nextN).replace(/\r$/, '');
      this._pointer = nextN + 1;
    } else {
      line = this._content.substring(this._pointer).replace(/\r$/, '');
      this._pointer = this._content.length;
    }
    return line;
  };

  FakeTextStream.prototype.Write = function(str) {
    if (this._closed) throw new Error('Stream cerrado');
    if (this._mode === 8) {
      this._content += String(str);
    } else {
      this._content = String(str);
    }
    PLATFORM.storageCache[this._key] = this._content;
    persistKey(this._key, this._content);
  };

  FakeTextStream.prototype.WriteLine = function(str) {
    this.Write((str !== undefined ? String(str) : '') + '\r\n');
  };

  FakeTextStream.prototype.Close = function() {
    this._closed = true;
  };

  // 6. FileSystemObject Shim
  function FakeFSO() {}

  FakeFSO.prototype.FileExists = function(path) {
    var k = normalizeKey(path);
    return Object.prototype.hasOwnProperty.call(PLATFORM.storageCache, k);
  };

  FakeFSO.prototype.OpenTextFile = function(path, iomode, create) {
    var k = normalizeKey(path);
    var mode = iomode || 1;
    var exists = this.FileExists(path);

    if (!exists) {
      if (create) {
        PLATFORM.storageCache[k] = '';
        persistKey(k, '');
      } else {
        throw new Error('Archivo no encontrado: ' + path);
      }
    }
    var current = PLATFORM.storageCache[k] || '';
    return new FakeTextStream(k, current, mode);
  };

  FakeFSO.prototype.CreateTextFile = function(path, overwrite) {
    var k = normalizeKey(path);
    if (!overwrite && this.FileExists(path)) {
      throw new Error('El archivo ya existe: ' + path);
    }
    PLATFORM.storageCache[k] = '';
    persistKey(k, '');
    return new FakeTextStream(k, '', 8);
  };

  FakeFSO.prototype.DeleteFile = function(path) {
    var k = normalizeKey(path);
    delete PLATFORM.storageCache[k];
    deletePersistedKey(k);
  };

  FakeFSO.prototype.GetFile = function(path) {
    var k = normalizeKey(path);
    var content = PLATFORM.storageCache[k] || '';
    return {
      Size: content.length,
      Path: path
    };
  };

  FakeFSO.prototype.GetSpecialFolder = function(type) {
    return {
      Path: 'C:\\cierre\\tmp'
    };
  };

  FakeFSO.prototype.GetFileName = function(path) {
    if (!path) return '';
    var s = String(path).replace(/\//g, '\\');
    var i = s.lastIndexOf('\\');
    return i >= 0 ? s.substring(i + 1) : s;
  };

  // 7. WScript.Network Shim
  function FakeWScriptNetwork() {
    this.ComputerName = PLATFORM.deviceId || 'ANDROID-CLIENT';
    this.UserDomain = 'ANDROID';
    this.UserName = 'MOVIL';
  }

  // 8. WScript.Shell Shim
  function FakeWScriptShell() {
    this.CurrentDirectory = 'C:\\cierre';
  }

  FakeWScriptShell.prototype.Run = function(cmd) {
    console.log('[PLATFORM] WScript.Shell.Run ejecutando:', cmd);
    var str = String(cmd || '').trim();

    // Eliminar comillas externas si existen
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      str = str.slice(1, -1);
    }

    // Comprobar URLs web, esquemas whatsapp://, mailto:, https:
    if (/^(https?:\/\/|whatsapp:\/\/|mailto:)/i.test(str)) {
      var appLauncher = getCapPlugin('AppLauncher');
      if (appLauncher && typeof appLauncher.openUrl === 'function') {
        appLauncher.openUrl({ url: str }).catch(function() {
          if (typeof window.open === 'function') window.open(str, '_system');
        });
      } else if (typeof window.open === 'function') {
        window.open(str, '_system');
      } else {
        console.log('[PLATFORM] Open URL:', str);
      }
      return 0;
    }

    // Comandos de Windows locales
    if (/ntfy\.exe/i.test(str)) {
      console.warn('[PLATFORM] ntfy.exe local no aplica en Android. Se utiliza conexión remota.');
      return 0;
    }

    console.warn('[PLATFORM] Comando o archivo local no disponible en Android: ' + str);
    return 0;
  };

  // 9. SAPI.SpVoice Shim
  function FakeSpVoice() {
    this._voices = [
      {
        GetDescription: function() { return 'Voz en Español (Android)'; }
      }
    ];
    this.Voice = this._voices[0];
  }

  FakeSpVoice.prototype.GetVoices = function() {
    var v = this._voices;
    return {
      Count: v.length,
      Item: function(i) { return v[i] || v[0]; }
    };
  };

  FakeSpVoice.prototype.Speak = function(text, flags) {
    var str = (text !== null && text !== undefined) ? String(text) : '';
    var fl = Number(flags) || 0;
    var tts = getCapPlugin('TextToSpeech');

    // 1) Si el texto está vacío, callar/detener la voz de inmediato
    if (!str) {
      if (tts && typeof tts.stop === 'function') {
        tts.stop().catch(function() {});
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    // 2) Si tiene el bit 2 activo (flags & 2), detener lo anterior antes de hablar
    if (fl & 2) {
      if (tts && typeof tts.stop === 'function') {
        tts.stop().catch(function() {});
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }

    // 3) Reproducir el texto
    if (tts && typeof tts.speak === 'function') {
      tts.speak({
        text: str,
        lang: 'es-MX',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient'
      }).catch(function(err) {
        console.warn('TTS plugin error, usando fallback speechSynthesis:', err);
        if (window.speechSynthesis) {
          var u = new SpeechSynthesisUtterance(str);
          u.lang = 'es-MX';
          window.speechSynthesis.speak(u);
        }
      });
      return;
    }

    if (window.speechSynthesis) {
      var utt = new SpeechSynthesisUtterance(str);
      utt.lang = 'es-MX';
      window.speechSynthesis.speak(utt);
    }
  };

  // 10. WMPlayer.OCX Shim
  function FakeWMPlayer() {
    this._audio = null;
    this.settings = {
      volume: 100
    };
    this.URL = '';
    var self = this;
    this.controls = {
      play: function() {
        if (!self.URL) return;
        try {
          if (self._audio) {
            self._audio.pause();
          }
          self._audio = new Audio(self.URL);
          self._audio.volume = Math.max(0, Math.min(1, (self.settings.volume || 100) / 100));
          self._audio.play().catch(function(e) {
            console.warn('Audio play error:', e);
          });
        } catch (e) {
          console.warn('Error inicializando audio:', e);
        }
      },
      stop: function() {
        if (self._audio) {
          try {
            self._audio.pause();
            self._audio.currentTime = 0;
          } catch (e) {}
        }
      }
    };
  }

  // 11. ActiveXObject Dispatcher
  window.ActiveXObject = function(progId) {
    var id = String(progId || '').trim();
    if (/Scripting\.FileSystemObject/i.test(id)) {
      return new FakeFSO();
    }
    if (/WScript\.Shell/i.test(id)) {
      return new FakeWScriptShell();
    }
    if (/WScript\.Network/i.test(id)) {
      return new FakeWScriptNetwork();
    }
    if (/SAPI\.SpVoice/i.test(id)) {
      return new FakeSpVoice();
    }
    if (/WMPlayer\.OCX/i.test(id)) {
      return new FakeWMPlayer();
    }
    if (/Excel\.Application/i.test(id)) {
      throw new Error('Excel.Application: No disponible en Android. Esta terminal funciona como Cliente.');
    }
    if (/Shell\.Application/i.test(id)) {
      throw new Error('Shell.Application: No disponible en Android.');
    }
    throw new Error('ActiveXObject no implementado: ' + id);
  };

  // 12. GetObject Dispatcher
  window.GetObject = function(path, progId) {
    if (typeof path === 'string' && /winmgmts/i.test(path)) {
      throw new Error('WMI / winmgmts: No disponible en Android.');
    }
    throw new Error('GetObject: No disponible en Android. Esta terminal funciona como Cliente.');
  };

  // 13. Shim de Portapapeles
  if (!window.clipboardData) {
    window.clipboardData = {
      setData: function(format, data) {
        var str = String(data || '');
        var clip = getCapPlugin('Clipboard');
        if (clip && typeof clip.write === 'function') {
          clip.write({ string: str });
        } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(str);
        }
        return true;
      },
      getData: function() {
        return '';
      }
    };
  }

  // 14. Inicialización asíncrona de la plataforma al cargar el documento
  var initPromise = (async function initPlatform() {
    try {
      // Cargar Preferences a la caché en memoria
      var pref = getCapPlugin('Preferences');
      if (pref && typeof pref.keys === 'function') {
        var res = await pref.keys();
        if (res && res.keys) {
          for (var i = 0; i < res.keys.length; i++) {
            var k = res.keys[i];
            var valObj = await pref.get({ key: k });
            if (valObj && valObj.value !== null) {
              PLATFORM.storageCache[k] = valObj.value;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error inicializando Preferences:', e);
    }

    // Sincronizar con localStorage como respaldo
    try {
      for (var j = 0; j < localStorage.length; j++) {
        var lk = localStorage.key(j);
        if (lk && lk.indexOf('cierre_fso_') === 0) {
          var fsoKey = lk.substring('cierre_fso_'.length);
          if (!PLATFORM.storageCache[fsoKey]) {
            PLATFORM.storageCache[fsoKey] = localStorage.getItem(lk);
          }
        }
      }
    } catch (e) {
      console.warn('Error sincronizando localStorage:', e);
    }

    // Obtener o generar Device ID persistente
    var devId = PLATFORM.storageCache['cierre_device_id'];
    if (!devId) {
      devId = 'ANDROID-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      PLATFORM.storageCache['cierre_device_id'] = devId;
      persistKey('cierre_device_id', devId);
    }
    PLATFORM.deviceId = devId;

    PLATFORM.ready = true;
    console.log('[PLATFORM] Capa Shim lista. Device ID:', PLATFORM.deviceId);
  })();

  PLATFORM.readyPromise = initPromise;

})();
