#!/usr/bin/env node
'use strict';
/*
 * Claude Stats — réplica local del panel de uso de Claude Code.
 * Lee los registros de ~/.claude/projects, guarda un historial propio
 * y sirve la página en http://127.0.0.1:4747. Sin dependencias.
 */
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const readline = require('readline');
const { exec } = require('child_process');

// ---- Configuración -------------------------------------------------------
const PORT = Number(process.env.CLAUDE_STATS_PORT) || 4747;
const HOST = '127.0.0.1';
const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const PROJECT_DIRS = [
  path.join(CONFIG_DIR, 'projects'),
  path.join(os.homedir(), '.config', 'claude', 'projects'),
];
const LEDGER_DIR = path.join(CONFIG_DIR, 'claude-stats');
const LEDGER_FILE = path.join(LEDGER_DIR, 'days.json');
const CACHE_MS = 20000;
const NO_OPEN = process.argv.includes('--no-open');
const URL_APP = `http://${HOST}:${PORT}`;

// Nombre del saludo: CLAUDE_STATS_NAME, o si no el nombre de la cuenta de Claude
// (como el panel original). De ~/.claude.json solo se lee ese campo.
function userName() {
  if (process.env.CLAUDE_STATS_NAME) return process.env.CLAUDE_STATS_NAME;
  const file = process.env.CLAUDE_CONFIG_DIR ? path.join(CONFIG_DIR, '.claude.json') : path.join(os.homedir(), '.claude.json');
  try {
    const name = JSON.parse(fs.readFileSync(file, 'utf8')).oauthAccount?.displayName;
    return typeof name === 'string' ? name.trim() : '';
  } catch { return ''; }
}

// ---- Utilidades ----------------------------------------------------------
function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function listJsonl(dir, out = []) {
  let entries;
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await listJsonl(p, out);
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}

const GAP_MS = 5 * 60 * 1000; // pausas de más de 5 min no cuentan como tiempo activo

function newDay() {
  return { tokens: 0, messages: 0, minutes: 0, sessions: new Set(), hours: new Array(24).fill(0), models: {}, projects: {} };
}

function newProject() {
  return { tokens: 0, messages: 0, minutes: 0, sessions: new Set(), hours: new Array(24).fill(0), models: {} };
}

// Nombre del proyecto: último tramo del cwd; si no hay, la carpeta del registro.
function projectFromPath(file) {
  for (const root of PROJECT_DIRS) {
    const rel = path.relative(root, file);
    if (!rel.startsWith('..')) {
      const enc = rel.split(path.sep)[0];
      return enc.split('-').filter(Boolean).pop() || enc;
    }
  }
  return 'Otro';
}

// ---- Lectura de registros ------------------------------------------------
// Primera pasada: junta los mensajes de cada sesión. Una sesión reanudada
// queda repartida en varios archivos, por eso el proyecto y el tiempo activo
// se calculan después, con todos sus mensajes ordenados.
async function parseFile(file, sessions, seen) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  const fallback = projectFromPath(file);
  for await (const line of rl) {
    if (!line || line.charCodeAt(0) !== 123) continue; // '{'
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.type !== 'user' && e.type !== 'assistant') continue;
    if (!e.timestamp) continue;
    const t = new Date(e.timestamp);
    if (isNaN(t)) continue;

    // Las sesiones reanudadas copian el historial: se descartan duplicados.
    if (e.uuid) {
      if (seen.uuids.has(e.uuid)) continue;
      seen.uuids.add(e.uuid);
    }

    const sid = e.sessionId || `archivo:${file}`;
    const s = sessions.get(sid) || { id: e.sessionId, cwd: null, cwdAt: Infinity, fallback, events: [] };
    sessions.set(sid, s);
    // El proyecto sale del cwd más antiguo de la sesión, en cualquiera de sus archivos.
    if (e.cwd && t < s.cwdAt) { s.cwd = String(e.cwd); s.cwdAt = +t; }

    const ev = { t, tok: 0, model: null };
    const msg = e.message;
    if (e.type === 'assistant' && msg && msg.usage) {
      // Una respuesta se escribe en varias líneas con el mismo id y uso.
      const id = msg.id ? `${msg.id}:${e.requestId || ''}` : null;
      if (!id || !seen.msgs.has(id)) {
        if (id) seen.msgs.add(id);
        const u = msg.usage;
        ev.tok = (u.input_tokens || 0) + (u.output_tokens || 0) +
          (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
        if (msg.model && msg.model !== '<synthetic>') ev.model = msg.model;
      }
    }
    s.events.push(ev);
  }
}

// Segunda pasada: reparte los mensajes de cada sesión por día y proyecto.
function aggregate(sessions, days) {
  for (const s of sessions.values()) {
    const pname = s.cwd ? path.basename(s.cwd.replace(/[\\/]+$/, '').replace(/\\/g, '/')) || s.fallback : s.fallback;
    s.events.sort((a, b) => a.t - b.t);
    let last = null;
    for (const ev of s.events) {
      const key = dayKey(ev.t);
      const day = days[key] || (days[key] = newDay());
      const proj = day.projects[pname] || (day.projects[pname] = newProject());
      day.messages++;
      proj.messages++;
      day.hours[ev.t.getHours()]++;
      proj.hours[ev.t.getHours()]++;
      if (s.id) { day.sessions.add(s.id); proj.sessions.add(s.id); }

      // Tiempo activo: suma los intervalos de hasta 5 minutos entre mensajes seguidos de la sesión.
      if (last !== null) {
        const gap = ev.t - last;
        if (gap > 0 && gap <= GAP_MS) { day.minutes += gap / 60000; proj.minutes += gap / 60000; }
      }
      last = ev.t;

      if (ev.tok || ev.model) {
        day.tokens += ev.tok;
        proj.tokens += ev.tok;
        if (ev.model) {
          for (const models of [day.models, proj.models]) {
            const m = models[ev.model] || (models[ev.model] = { tokens: 0, messages: 0 });
            m.tokens += ev.tok;
            m.messages++;
          }
        }
      }
    }
  }
}

async function readLogs() {
  const files = [];
  for (const d of PROJECT_DIRS) await listJsonl(d, files);
  const days = {};
  const sessions = new Map();
  const seen = { uuids: new Set(), msgs: new Set() };
  for (const f of files) {
    try { await parseFile(f, sessions, seen); } catch (err) { console.warn('No pude leer', f, err.message); }
  }
  aggregate(sessions, days);
  const out = {};
  for (const [k, d] of Object.entries(days)) {
    const projects = {};
    for (const [n, p] of Object.entries(d.projects)) {
      projects[n] = { ...p, minutes: Math.round(p.minutes * 10) / 10, sessions: [...p.sessions] };
    }
    out[k] = { ...d, minutes: Math.round(d.minutes * 10) / 10, sessions: [...d.sessions], projects };
  }
  return { days: out, files: files.length };
}

// ---- Historial propio (para no perder días borrados) ---------------------
async function readLedger() {
  try { return JSON.parse(await fsp.readFile(LEDGER_FILE, 'utf8')).days || {}; } catch { return {}; }
}

async function writeLedger(days) {
  await fsp.mkdir(LEDGER_DIR, { recursive: true });
  const tmp = LEDGER_FILE + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify({ version: 2, days }));
  await fsp.rename(tmp, LEDGER_FILE);
}

function merge(ledger, fromLogs) {
  const out = { ...ledger };
  for (const [k, d] of Object.entries(fromLogs)) {
    const old = ledger[k];
    // Si Claude Code ya borró parte de ese día, se conserva la versión más completa.
    if (!old || d.messages >= old.messages) out[k] = d;
  }
  return out;
}

// Junta proyectos cuyo nombre solo cambia en mayúsculas/minúsculas
// (ej. "miapp" y "MiApp"). Gana el nombre con más tiempo.
// Se aplica solo a la respuesta: days.json guarda los nombres originales.
function mergeProjectCase(days) {
  const total = {};
  for (const d of Object.values(days)) {
    for (const [n, p] of Object.entries(d.projects || {})) total[n] = (total[n] || 0) + (p.minutes || 0);
  }
  const best = {};
  for (const [n, m] of Object.entries(total)) {
    const k = n.toLowerCase();
    if (!(k in best) || m > total[best[k]]) best[k] = n;
  }
  const out = {};
  for (const [key, d] of Object.entries(days)) {
    if (!d.projects) { out[key] = d; continue; }
    const projects = {};
    for (const [n, p] of Object.entries(d.projects)) {
      const name = best[n.toLowerCase()];
      const q = projects[name];
      if (!q) {
        projects[name] = { ...p, sessions: [...(p.sessions || [])], hours: p.hours && [...p.hours], models: p.models && JSON.parse(JSON.stringify(p.models)) };
        continue;
      }
      q.tokens += p.tokens || 0;
      q.messages += p.messages || 0;
      q.minutes = Math.round((q.minutes + (p.minutes || 0)) * 10) / 10;
      for (const s of p.sessions || []) if (!q.sessions.includes(s)) q.sessions.push(s);
      // hours y models pueden faltar en días guardados por versiones antiguas.
      if (p.hours) q.hours = (q.hours || new Array(24).fill(0)).map((v, i) => v + (p.hours[i] || 0));
      if (p.models) {
        q.models = q.models || {};
        for (const [m, v] of Object.entries(p.models)) {
          const t = q.models[m] || (q.models[m] = { tokens: 0, messages: 0 });
          t.tokens += v.tokens || 0; t.messages += v.messages || 0;
        }
      }
    }
    out[key] = { ...d, projects };
  }
  return out;
}

let cache = null;
let cacheAt = 0;
let pending = null;

async function getStats() {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  if (pending) return pending;
  pending = (async () => {
    const [ledger, logs] = await Promise.all([readLedger(), readLogs()]);
    const days = merge(ledger, logs.days);
    try { await writeLedger(days); } catch (err) { console.warn('No pude guardar el historial:', err.message); }
    cache = { name: userName(), days: mergeProjectCase(days), files: logs.files, source: PROJECT_DIRS[0], generatedAt: new Date().toISOString() };
    cacheAt = Date.now();
    return cache;
  })();
  try { return await pending; } finally { pending = null; }
}

// ---- Servidor ------------------------------------------------------------
const INDEX = path.join(__dirname, 'index.html');
const MANIFEST = {
  name: 'Claude Stats', short_name: 'Claude Stats', start_url: '/', display: 'standalone',
  background_color: '#2b2d31', theme_color: '#2b2d31',
  icons: [{ src: '/icono.png', sizes: '256x256', type: 'image/png' }],
};
const STATIC = {
  '/icono.png': ['icono.png', 'image/png'],
  '/favicon.ico': ['icono.ico', 'image/x-icon'],
  '/manifest.webmanifest': [null, 'application/manifest+json'],
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/' || req.url.startsWith('/?')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(await fsp.readFile(INDEX));
    } else if (STATIC[req.url]) {
      // Íconos y manifiesto: Edge los usa para la ventana y la barra de tareas.
      const [file, type] = STATIC[req.url];
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'max-age=86400' });
      res.end(file ? await fsp.readFile(path.join(__dirname, file)) : JSON.stringify(MANIFEST));
    } else if (req.url.startsWith('/api/stats')) {
      if (req.url.includes('refresh=1')) cacheAt = 0;
      const data = await getStats();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    } else {
      res.writeHead(404); res.end();
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

function openWindow() {
  if (NO_OPEN) return;
  if (process.platform === 'win32') {
    // Ventana propia, sin barra del navegador (modo app de Edge).
    exec(`start "" msedge --app=${URL_APP} --window-size=980,720`, (err) => {
      if (err) exec(`start "" ${URL_APP}`);
    });
  } else if (process.platform === 'darwin') {
    exec(`open ${URL_APP}`);
  } else {
    exec(`xdg-open ${URL_APP}`);
  }
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // Ya está corriendo: solo abre otra ventana.
    console.log('Claude Stats ya está abierto, abriendo ventana…');
    openWindow();
    setTimeout(() => process.exit(0), 1500);
  } else {
    console.error(err);
    process.exit(1);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Claude Stats en ${URL_APP}`);
  console.log(`Leyendo registros de: ${PROJECT_DIRS[0]}`);
  getStats().then((s) => console.log(`Listo: ${Object.keys(s.days).length} días con actividad, ${s.files} archivos.`))
    .catch((e) => console.warn(e.message));
  openWindow();
});
