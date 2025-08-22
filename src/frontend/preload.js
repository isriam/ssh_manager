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
    getGroupsTree: () => ipcRenderer.invoke('ssh:get-groups-tree'),
    createGroup: (groupName, icon) => ipcRenderer.invoke('ssh:create-group', groupName, icon),
    renameGroup: (oldName, newName, icon) => ipcRenderer.invoke('ssh:rename-group', oldName, newName, icon),
    deleteGroup: (groupName) => ipcRenderer.invoke('ssh:delete-group', groupName),
    getGroupIcon: (groupPath) => ipcRenderer.invoke('ssh:get-group-icon', groupPath),
    updateGroupIcon: (groupPath, icon) => ipcRenderer.invoke('ssh:update-group-icon', groupPath, icon),
    getSSHCommand: (name, group) => ipcRenderer.invoke('ssh:get-ssh-command', name, group),
    verifyConfigIntegrity: () => ipcRenderer.invoke('ssh:verify-config-integrity'),
    connectToServer: (name, group) => ipcRenderer.invoke('ssh:connect-to-server', name, group),
    migrateExistingConnection: (connectionName, toGroup) => ipcRenderer.invoke('ssh:migrate-existing-connection', connectionName, toGroup),
    createBackup: (backupPath) => ipcRenderer.invoke('ssh:create-backup', backupPath)
  },
  dialog: {
    saveFile: (options) => ipcRenderer.invoke('dialog:save-file', options)
  },
  window: {
    resize: (width, height) => ipcRenderer.invoke('window:resize', width, height),
    resizeForEdit: () => ipcRenderer.invoke('window:resize-for-edit'),
    restoreSize: (originalSize) => ipcRenderer.invoke('window:restore-size', originalSize),
    openConnectionForm: (options) => ipcRenderer.invoke('window:open-connection-form', options),
    openConnectionDetails: (options) => ipcRenderer.invoke('window:open-connection-details', options),
    openEditModal: (connectionData) => ipcRenderer.invoke('window:open-edit-modal', connectionData),
    openAddModal: () => ipcRenderer.invoke('window:open-add-modal'),
    refreshMain: () => ipcRenderer.invoke('window:refresh-main')
  },
  app: {
    quit: () => ipcRenderer.invoke('app:quit')
  },
  ipc: {
    on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args))
  }
});