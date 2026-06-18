const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cvAPI', {
  load: () => ipcRenderer.invoke('cv:load'),
  save: (data) => ipcRenderer.invoke('cv:save', data),
  exportPdf: (defaultName) => ipcRenderer.invoke('cv:exportPdf', defaultName),
  pickDataDir: () => ipcRenderer.invoke('cv:pickDataDir'),
  import: () => ipcRenderer.invoke('cv:import'),
  export: (defaultName, content) => ipcRenderer.invoke('cv:export', defaultName, content),
  profilesList: () => ipcRenderer.invoke('cv:profiles:list'),
  profilesSwitch: (name) => ipcRenderer.invoke('cv:profiles:switch', name),
  profilesSaveAs: (name, data) => ipcRenderer.invoke('cv:profiles:saveAs', name, data),
  profilesRename: (oldName, newName) => ipcRenderer.invoke('cv:profiles:rename', oldName, newName),
  profilesDelete: (name) => ipcRenderer.invoke('cv:profiles:delete', name),
  getPaths: () => ipcRenderer.invoke('cv:getPaths'),
  fetchOrcid: (orcidId) => ipcRenderer.invoke('cv:fetchOrcid', orcidId),
  openExternal: (url) => ipcRenderer.invoke('cv:openExternal', url),
  onFlushHint: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('cv:hint-flush', listener);
    return () => ipcRenderer.removeListener('cv:hint-flush', listener);
  },
  // Main asks us to flush before the window closes; we ack when done.
  onFlushRequest: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('cv:flush-request', listener);
    return () => ipcRenderer.removeListener('cv:flush-request', listener);
  },
  flushAck: () => ipcRenderer.send('cv:flush-ack'),
  onMenu: (cb) => {
    const listener = (_e, action) => cb(action);
    ipcRenderer.on('cv:menu', listener);
    return () => ipcRenderer.removeListener('cv:menu', listener);
  }
});
