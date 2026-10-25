'use strict';
/*
 * Claude Stats — widget de escritorio.
 * Ventana sin marco y transparente con http://127.0.0.1:4747/?widget=1, un ícono
 * en la bandeja del sistema y el panel completo en su propia ventana.
 * Si server.js no está corriendo, lo levanta (con el Node que trae Electron).
 */
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');

// ---- Configuración -------------------------------------------------------
const PORT = Number(process.env.CLAUDE_STATS_PORT) || 4747;
const URL_APP = `http://127.0.0.1:${PORT}`;
const RAIZ = path.join(__dirname, '..');
const ICONO = path.join(RAIZ, process.platform === 'win32' ? 'icono.ico' : 'icono.png');
// Los ajustes se guardan junto al historial de server.js.
const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const AJUSTES = path.join(CONFIG_DIR, 'claude-stats', 'widget.json');
const TAM = { width: 324, height: 200 }; // ~16 semanas de heatmap
const MIN = { width: 300, height: 130 }; // más angosto no caben las pestañas y el período

let widget = null, panel = null, tray = null, servidor = null;

// ---- Ajustes (posición, tamaño y "Siempre encima") -----------------------
function leerAjustes() {
  try { return JSON.parse(fs.readFileSync(AJUSTES, 'utf8')); } catch { return {}; }
}
let ajustes = leerAjustes();
let guardarT;
function guardar() {
  clearTimeout(guardarT);
  guardarT = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(AJUSTES), { recursive: true });
      fs.writeFileSync(AJUSTES, JSON.stringify(ajustes, null, 2));
    } catch (err) { console.warn('No pude guardar los ajustes:', err.message); }
  }, 300);
}
// Se guarda lo que se le pidió a la ventana, no lo que devuelve getBounds():
// con la pantalla al 125 %, Electron le suma 1 o 2 px cada vez y el widget
// crecería solo de a poco entre una apertura y otra.
let pedido = null;
function recordar(b) {
  pedido = b;
  Object.assign(ajustes, b);
  guardar();
}

// La posición guardada solo sirve si sigue cayendo dentro de alguna pantalla
// (por ejemplo, si se desconectó un monitor).
function boundsIniciales() {
  const b = { width: ajustes.width || TAM.width, height: ajustes.height || TAM.height, x: ajustes.x, y: ajustes.y };
  const visible = Number.isFinite(b.x) && Number.isFinite(b.y) && screen.getAllDisplays().some(({ workArea: a }) =>
    b.x < a.x + a.width - 40 && b.x + b.width > a.x + 40 && b.y > a.y - 20 && b.y < a.y + a.height - 40);
  if (!visible) {
    // Primera vez: abajo a la derecha de la pantalla principal.
    const a = screen.getPrimaryDisplay().workArea;
    b.x = a.x + a.width - b.width - 24;
    b.y = a.y + a.height - b.height - 24;
  }
  return b;
}

// ---- Servidor ------------------------------------------------------------
function responde() {
  return new Promise((ok) => {
    const req = http.get(URL_APP + '/manifest.webmanifest', (res) => { res.resume(); ok(res.statusCode === 200); });
    req.on('error', () => ok(false));
    req.setTimeout(1500, () => { req.destroy(); ok(false); });
  });
}

async function asegurarServidor() {
  if (await responde()) return;
  if (!servidor || servidor.exitCode !== null) {
    // Electron hace de Node con ELECTRON_RUN_AS_NODE: no hace falta tener Node instalado.
    servidor = spawn(process.execPath, [path.join(RAIZ, 'server.js'), '--no-open'], {
      cwd: RAIZ, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'ignore', windowsHide: true,
    });
    servidor.on('error', (err) => console.warn('No pude levantar server.js:', err.message));
  }
  for (let i = 0; i < 40; i++) { // hasta ~10 s
    await new Promise((ok) => setTimeout(ok, 250));
    if (await responde()) return;
  }
}

// ---- Ventanas ------------------------------------------------------------
function crearWidget() {
  pedido = boundsIniciales();
  widget = new BrowserWindow({
    ...pedido, minWidth: MIN.width, minHeight: MIN.height,
    frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false,
    resizable: true, maximizable: false, fullscreenable: false, skipTaskbar: true,
    alwaysOnTop: !!ajustes.alwaysOnTop, show: false, icon: ICONO, title: 'Claude Stats',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  widget.setBounds(pedido); // al crearla queda unos px más grande; esto la acerca al tamaño pedido
  widget.loadURL(URL_APP + '/?widget=1');
  widget.once('ready-to-show', () => widget.show());
  // Si el servidor se cayó, lo vuelve a levantar y recarga.
  widget.webContents.on('did-fail-load', (_e, code, _desc, _url, principal) => {
    if (!principal || code === -3) return; // -3: carga cancelada
    setTimeout(() => asegurarServidor().then(() => widget && !widget.isDestroyed() && widget.loadURL(URL_APP + '/?widget=1')), 2000);
  });
  widget.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  widget.on('closed', () => { widget = null; });
}

function abrirPanel() {
  if (panel && !panel.isDestroyed()) {
    if (panel.isMinimized()) panel.restore();
    panel.show(); panel.focus();
    return;
  }
  panel = new BrowserWindow({
    width: 980, height: 720, minWidth: 420, minHeight: 360, show: false,
    backgroundColor: '#2b2d31', autoHideMenuBar: true, icon: ICONO, title: 'Claude Stats',
    // El mismo puente que el widget, para avisar cuando cambia el idioma.
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  panel.setMenu(null);
  panel.loadURL(URL_APP + '/');
  panel.once('ready-to-show', () => panel.show());
  panel.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  panel.on('closed', () => { panel = null; });
}

function alternarWidget() {
  if (!widget) return crearWidget();
  if (widget.isVisible()) widget.hide(); else { widget.show(); widget.focus(); }
  actualizarMenu();
}

// ---- Arrastrar y cambiar tamaño ------------------------------------------
// La página avisa al apretar el mouse; desde ahí la ventana sigue al cursor
// hasta que avisa que se soltó. Así el clic simple sigue sirviendo para abrir el panel.
let mov = null;
function terminarMovimiento() {
  if (!mov) return false;
  clearInterval(mov.timer);
  const p = screen.getCursorScreenPoint();
  const movido = mov.movido || Math.abs(p.x - mov.cursor.x) + Math.abs(p.y - mov.cursor.y) > 4;
  if (mov.movido) recordar(mov.ultimo);
  mov = null;
  return movido;
}
ipcMain.handle('mover', (_e, modo) => {
  const movido = terminarMovimiento();
  if (modo === 'stop' || !widget) return movido;
  const cursor = screen.getCursorScreenPoint();
  // Posición real de la ventana, pero el tamaño que se pidió (ver recordar()).
  const [x, y] = widget.getPosition();
  const b = { x, y, width: pedido.width, height: pedido.height };
  mov = { cursor, movido: false, ultimo: b };
  mov.timer = setInterval(() => {
    if (!widget || widget.isDestroyed()) return terminarMovimiento();
    const p = screen.getCursorScreenPoint();
    const dx = p.x - cursor.x, dy = p.y - cursor.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) mov.movido = true;
    if (!mov.movido) return;
    // setBounds con el tamaño fijo: en pantallas con escala, setPosition a veces lo agranda.
    mov.ultimo = modo === 'drag'
      ? { ...b, x: b.x + dx, y: b.y + dy }
      : { ...b, width: Math.max(MIN.width, b.width + dx), height: Math.max(MIN.height, b.height + dy) };
    widget.setBounds(mov.ultimo);
  }, 16);
  return false;
});
ipcMain.on('panel', abrirPanel);
ipcMain.on('menu', () => menu().popup({ window: widget }));

// ---- Idioma ---------------------------------------------------------------
// ajustes.lang: 'auto' (el del sistema), 'es' o 'en'. Las páginas guardan el suyo en
// localStorage, que el widget y el panel comparten; este solo sirve para el menú.
const M = {
  es: { panel: 'Abrir panel completo', hide: 'Ocultar widget', show: 'Mostrar widget', top: 'Siempre encima', start: 'Iniciar con Windows', lang: 'Idioma', auto: 'Automático', refresh: 'Actualizar datos', quit: 'Salir' },
  en: { panel: 'Open full panel', hide: 'Hide widget', show: 'Show widget', top: 'Always on top', start: 'Start with Windows', lang: 'Language', auto: 'Automatic', refresh: 'Refresh data', quit: 'Quit' },
};
const idiomaSistema = () => (app.getLocale().toLowerCase().startsWith('es') ? 'es' : 'en');
const idiomaMenu = () => (ajustes.lang === 'es' || ajustes.lang === 'en' ? ajustes.lang : idiomaSistema());
const ventanas = () => [widget, panel].filter((w) => w && !w.isDestroyed());

// Desde el menú de la bandeja: cambia el idioma en las dos ventanas al tiro.
function elegirIdioma(lang) {
  ajustes.lang = lang; guardar();
  const js = lang === 'auto'
    ? `try { localStorage.removeItem('lang') } catch {}; setLang('${idiomaSistema()}', false, false)`
    : `setLang('${lang}', true, false)`;
  for (const w of ventanas()) w.webContents.executeJavaScript(js).catch(() => {});
  actualizarMenu();
}
// Desde la página (selector bajo el panel): avisa a la otra ventana y al menú.
ipcMain.on('idioma', (e, lang) => {
  if (lang !== 'es' && lang !== 'en') return;
  ajustes.lang = lang; guardar();
  for (const w of ventanas()) if (w.webContents !== e.sender) w.webContents.executeJavaScript(`setLang('${lang}', false, false)`).catch(() => {});
  actualizarMenu();
});

// ---- Bandeja del sistema -------------------------------------------------
// En modo desarrollo hay que decirle a Windows que abra electron.exe con esta carpeta.
function opcionesInicio() {
  const base = { name: 'Claude Stats' };
  return app.isPackaged ? base : { ...base, path: process.execPath, args: [app.getAppPath()] };
}
// En Windows openAtLogin sale false aunque la entrada exista; launchItems sí la muestra.
function iniciaConWindows() {
  const s = app.getLoginItemSettings(opcionesInicio());
  return s.openAtLogin || (s.launchItems || []).some((i) => i.name === 'Claude Stats' && i.enabled);
}

function menu() {
  const m = M[idiomaMenu()];
  const lang = ajustes.lang === 'es' || ajustes.lang === 'en' ? ajustes.lang : 'auto';
  return Menu.buildFromTemplate([
    { label: m.panel, click: abrirPanel },
    { label: widget && widget.isVisible() ? m.hide : m.show, click: alternarWidget },
    { type: 'separator' },
    {
      label: m.top, type: 'checkbox', checked: !!ajustes.alwaysOnTop,
      click: (item) => {
        ajustes.alwaysOnTop = item.checked; guardar();
        if (widget) widget.setAlwaysOnTop(item.checked);
        actualizarMenu();
      },
    },
    {
      label: m.start, type: 'checkbox', checked: iniciaConWindows(),
      click: (item) => { app.setLoginItemSettings({ ...opcionesInicio(), openAtLogin: item.checked }); actualizarMenu(); },
    },
    {
      label: m.lang, submenu: [
        { label: m.auto, type: 'radio', checked: lang === 'auto', click: () => elegirIdioma('auto') },
        { label: 'Español', type: 'radio', checked: lang === 'es', click: () => elegirIdioma('es') },
        { label: 'English', type: 'radio', checked: lang === 'en', click: () => elegirIdioma('en') },
      ],
    },
    { type: 'separator' },
    { label: m.refresh, click: () => widget && widget.webContents.reload() },
    { label: m.quit, click: () => app.quit() },
  ]);
}
function actualizarMenu() { if (tray) tray.setContextMenu(menu()); }

// ---- Arranque ------------------------------------------------------------
// Una sola instancia: abrir el lanzador otra vez solo muestra el widget.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!widget) crearWidget();
    else { widget.show(); widget.focus(); }
    actualizarMenu();
  });

  app.whenReady().then(async () => {
    if (process.platform === 'win32') app.setAppUserModelId('cl.claudestats.widget');
    tray = new Tray(nativeImage.createFromPath(ICONO));
    tray.setToolTip('Claude Stats');
    tray.on('click', alternarWidget);
    actualizarMenu();
    await asegurarServidor();
    crearWidget();
  });

  // Cerrar el panel no cierra la app: sigue en la bandeja.
  app.on('window-all-closed', () => {});
  // Al salir se detiene el servidor solo si lo levantó el widget.
  app.on('before-quit', () => { terminarMovimiento(); if (servidor && servidor.exitCode === null) servidor.kill(); });
}
