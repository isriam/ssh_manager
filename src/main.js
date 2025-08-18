const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const SSHManager = require('./backend/ssh-manager');

let mainWindow;
let sshManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'frontend', 'preload.js')
    },
    title: 'SSH Manager',
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeSSHManager() {
  try {
    sshManager = new SSHManager();
    await sshManager.init();
    console.log('SSH Manager backend initialized');
  } catch (error) {
    console.error('Failed to initialize SSH Manager:', error);
  }
}

app.whenReady().then(async () => {
  app.setName('SSH Manager');
  await initializeSSHManager();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('SSH Manager shutting down...');
});

ipcMain.handle('ssh:add-connection', async (event, options) => {
  try {
    const result = await sshManager.addConnection(options);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:list-connections', async (event, groupFilter) => {
  try {
    const connections = await sshManager.listConnections(groupFilter);
    return { success: true, data: connections };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:remove-connection', async (event, name, group) => {
  try {
    await sshManager.removeConnection(name, group);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:update-connection', async (event, name, group, updates) => {
  try {
    await sshManager.updateConnection(name, group, updates);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:test-connection', async (event, name, group) => {
  try {
    const result = await sshManager.testConnection(name, group);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:get-templates', async () => {
  try {
    const templates = await sshManager.getTemplates();
    return { success: true, data: templates };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:get-groups', async () => {
  try {
    const groups = await sshManager.getGroups();
    return { success: true, data: groups };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:create-group', async (event, groupName) => {
  try {
    const result = await sshManager.createGroup(groupName);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:rename-group', async (event, oldName, newName) => {
  try {
    const result = await sshManager.renameGroup(oldName, newName);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:delete-group', async (event, groupName) => {
  try {
    const result = await sshManager.deleteGroup(groupName);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


ipcMain.handle('ssh:get-ssh-command', async (event, name, group) => {
  try {
    const result = await sshManager.getConnectionSSHCommand(name, group);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:verify-config-integrity', async () => {
  try {
    const result = await sshManager.verifySSHConfigIntegrity();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:connect-to-server', async (event, name, group) => {
  try {
    const result = await sshManager.connectToServer(name, group);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:migrate-existing-connection', async (event, connectionName, toGroup) => {
  try {
    const result = await sshManager.migrateExistingConnection(connectionName, toGroup);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:create-backup', async (event, backupPath) => {
  try {
    const result = await sshManager.createBackup(backupPath);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('dialog:save-file', async (event, options) => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('window:resize', async (event, width, height) => {
  try {
    if (mainWindow) {
      mainWindow.setSize(width, height);
      mainWindow.center();
      return { success: true };
    }
    return { success: false, error: 'No main window available' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});