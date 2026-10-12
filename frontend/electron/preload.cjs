'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
// Narrow capability bridge: no Node.js, filesystem or unrestricted IPC in renderer.
contextBridge.exposeInMainWorld(
  'mewbookDesktop',
  Object.freeze({
    isDesktop: true,
    pathForFile: (file) => { try { return webUtils.getPathForFile(file) || ''; } catch { return ''; } },
    library: async (action, payload = {}) => {
      const r = await ipcRenderer.invoke('mewbook:library', action, payload);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onLibraryChanged: (callback) => {
      const fn = () => callback();
      ipcRenderer.on('mewbook:library-changed', fn);
      return () => ipcRenderer.removeListener('mewbook:library-changed', fn);
    },
    minimize: () => ipcRenderer.invoke('mewbook:window', 'minimize'),
    toggleMaximize: () => ipcRenderer.invoke('mewbook:window', 'maximize'),
    close: () => ipcRenderer.invoke('mewbook:window', 'close'),
    getWindowState: () => ipcRenderer.invoke('mewbook:window', 'state'),
    getAppInfo: () => ipcRenderer.invoke('mewbook:info'),
  }),
);
