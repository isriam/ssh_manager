const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ssh: {
    addConnection: (options) => ipcRenderer.invoke('ssh:add-connection', options),
    listConnections: (groupFilter) => ipcRenderer.invoke('ssh:list-connections', groupFilter),
    removeConnection: (name, group) => ipcRenderer.invoke('ssh:remove-connection', name, group),
    updateConnection: (name, group, updates) => ipcRenderer.invoke('ssh:update-connection', name, group, updates),
    testConnection: (name, group) => ipcRenderer.invoke('ssh:test-connection', name, group),
    getTemplates: () => ipcRenderer.invoke('ssh:get-templates'),
    getGroups: () => ipcRenderer.invoke('ssh:get-groups'),
    createGroup: (groupName) => ipcRenderer.invoke('ssh:create-group', groupName),
    renameGroup: (oldName, newName) => ipcRenderer.invoke('ssh:rename-group', oldName, newName),
    deleteGroup: (groupName) => ipcRenderer.invoke('ssh:delete-group', groupName)
  }
});