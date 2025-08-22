const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const SSHManager = require('./backend/ssh-manager');

let mainWindow;
let editWindow;
let addWindow;
let sshManager;

const WINDOW_STATE_FILE = path.join(os.homedir(), '.ssh-manager-window-state.json');

function saveWindowState() {
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized
    };
    
    try {
      fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Failed to save window state:', error);
    }
  }
}

function loadWindowState() {
  try {
    if (fs.existsSync(WINDOW_STATE_FILE)) {
      const data = fs.readFileSync(WINDOW_STATE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load window state:', error);
  }
  
  // Return default window state
  return {
    width: 400,
    height: 800,
    isMaximized: false
  };
}

function createWindow() {
  const windowState = loadWindowState();
  
  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 350,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'frontend', 'preload.js')
    },
    title: 'SSH Manager',
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon.png'),
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Show window and restore maximized state
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (windowState.isMaximized) {
      mainWindow.maximize();
    }
  });

  // Save window state on resize and move
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  mainWindow.on('closed', () => {
    if (editWindow) {
      editWindow.close();
    }
    mainWindow = null;
  });
}

function createEditWindow(connectionData) {
  if (editWindow) {
    editWindow.focus();
    return;
  }

  editWindow = new BrowserWindow({
    width: 800,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'frontend', 'preload.js')
    },
    title: 'Edit SSH Connection',
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon.png')
  });

  editWindow.loadFile(path.join(__dirname, 'frontend', 'edit-window.html'));

  editWindow.on('closed', () => {
    editWindow = null;
  });

  // Send connection data to edit window when ready
  editWindow.webContents.once('dom-ready', () => {
    editWindow.webContents.send('connection-data', connectionData);
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
  saveWindowState();
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

ipcMain.handle('ssh:get-groups-tree', async () => {
  try {
    const groupsTree = await sshManager.getGroupsTree();
    return { success: true, data: groupsTree };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:get-group-icon', async (event, groupPath) => {
  try {
    const result = await sshManager.getGroupIcon(groupPath);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:update-group-icon', async (event, groupPath, icon) => {
  try {
    await sshManager.updateGroupIcon(groupPath, icon);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:create-group', async (event, groupName, icon) => {
  try {
    const result = await sshManager.createGroup(groupName, icon);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh:rename-group', async (event, oldName, newName, newIcon) => {
  try {
    const result = await sshManager.renameGroup(oldName, newName, newIcon);
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

ipcMain.handle('window:resize-for-edit', async (event) => {
  try {
    if (mainWindow) {
      // Store original size
      const [width, height] = mainWindow.getSize();
      const originalSize = { width, height };
      
      // Resize to accommodate edit modal
      mainWindow.setSize(900, 800);
      mainWindow.center();
      return { success: true, originalSize };
    }
    return { success: false, error: 'Window not available' };
  } catch (error) {
    console.error('Failed to resize window for edit:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('window:restore-size', async (event, originalSize) => {
  try {
    if (mainWindow && originalSize) {
      mainWindow.setSize(originalSize.width, originalSize.height);
      mainWindow.center();
      return { success: true };
    }
    return { success: false, error: 'Window or size not available' };
  } catch (error) {
    console.error('Failed to restore window size:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app:quit', async () => {
  try {
    app.quit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Window management handlers
ipcMain.handle('window:open-connection-form', async (_event, _options) => {
  try {
    return { success: true, message: 'Popup functionality will be implemented with existing modals for now' };
  } catch (error) {
    console.error('Failed to open connection form:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('window:open-connection-details', async (_event, _options) => {
  try {
    return { success: true, message: 'Popup functionality will be implemented with existing modals for now' };
  } catch (error) {
    console.error('Failed to open connection details:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('window:open-edit-window', async (event, connectionData) => {
  try {
    createEditWindow(connectionData);
    return { success: true };
  } catch (error) {
    console.error('Failed to open edit window:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('window:open-edit-modal', async (event, connectionData) => {
  try {
    if (editWindow) {
      editWindow.focus();
      return { success: true };
    }

    editWindow = new BrowserWindow({
      width: 600,
      height: 600,
      resizable: false,
      parent: mainWindow,
      modal: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'frontend', 'preload.js')
      },
      title: 'Edit SSH Connection'
    });

    editWindow.loadFile(path.join(__dirname, 'frontend', 'edit-standalone.html'));

    editWindow.once('ready-to-show', () => {
      editWindow.show();
      // Send connection data to the window
      editWindow.webContents.send('connection-data', connectionData);
    });

    editWindow.on('closed', () => {
      editWindow = null;
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to open edit modal:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('window:open-add-modal', async (event) => {
  try {
    if (addWindow) {
      addWindow.focus();
      return { success: true };
    }

    addWindow = new BrowserWindow({
      width: 600,
      height: 600,
      resizable: false,
      parent: mainWindow,
      modal: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'frontend', 'preload.js')
      },
      title: 'Add SSH Connection'
    });

    addWindow.loadFile(path.join(__dirname, 'frontend', 'add-standalone.html'));

    addWindow.once('ready-to-show', () => {
      addWindow.show();
    });

    addWindow.on('closed', () => {
      addWindow = null;
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to open add modal:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('window:refresh-main', async (_event) => {
  try {
    if (mainWindow) {
      mainWindow.webContents.send('refresh-connections');
      return { success: true };
    }
    return { success: false, error: 'Main window not available' };
  } catch (error) {
    console.error('Failed to refresh main window:', error);
    return { success: false, error: error.message };
  }
});