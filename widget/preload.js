'use strict';
// Puente entre la página (/?widget=1) y la ventana de Electron.
// La página lo ve como window.widgetApp.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetApp', {
  // 'drag' mueve la ventana con el cursor, 'resize' cambia su tamaño y 'stop'
  // termina; 'stop' responde true si el cursor se movió (para no tomarlo como clic).
  mover: (modo) => ipcRenderer.invoke('mover', modo),
  panel: () => ipcRenderer.send('panel'),
  menu: () => ipcRenderer.send('menu'),
  // El idioma cambió en la página: Electron actualiza el menú y la otra ventana.
  idioma: (lang) => ipcRenderer.send('idioma', lang),
});
