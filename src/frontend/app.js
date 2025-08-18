let allConnections = [];
let allGroups = [];
let selectedConnection = null;
let draggedConnection = null;

// App state management for view modes
const AppState = {
  viewMode: 'full', // 'full' | 'compact'
  selectedConnection: null,
  
  setViewMode(mode) {
    this.viewMode = mode;
    this.updateLayout();
    this.saveState();
  },
  
  setSelectedConnection(connection) {
    this.selectedConnection = connection;
    this.updateCompactActions();
  },
  
  updateLayout() {
    const container = document.querySelector('.app-container');
    const compactLayout = document.getElementById('compact-layout');
    
    if (this.viewMode === 'compact') {
      container.classList.add('compact-mode');
      compactLayout.style.display = 'flex';
      this.resizeWindow(400, 600);
      this.populateCompactLayout();
    } else {
      container.classList.remove('compact-mode');
      compactLayout.style.display = 'none';
      this.resizeWindow(1200, 800);
    }
  },
  
  populateCompactLayout() {
    // Copy connection tree to compact layout
    const originalTree = document.getElementById('groups-tree');
    const compactTree = document.getElementById('groups-tree-compact');
    if (originalTree && compactTree) {
      compactTree.innerHTML = originalTree.innerHTML;
    }
    
    // Reinitialize menu system for compact layout
    setupMenuDropdowns();
  },
  
  updateCompactActions() {
    // Handle both original and embedded compact buttons
    const connectBtns = [
      document.getElementById('compact-connect-btn'),
      document.getElementById('compact-connect-btn-embedded')
    ];
    const detailsBtns = [
      document.getElementById('compact-details-btn'), 
      document.getElementById('compact-details-btn-embedded')
    ];
    const editBtns = [
      document.getElementById('compact-edit-btn'),
      document.getElementById('compact-edit-btn-embedded')
    ];
    const infoElements = document.querySelectorAll('.compact-connection-text');
    
    if (this.selectedConnection && this.viewMode === 'compact') {
      connectBtns.forEach(btn => btn && (btn.disabled = false));
      detailsBtns.forEach(btn => btn && (btn.disabled = false));
      editBtns.forEach(btn => btn && (btn.disabled = false));
      
      const displayText = `${this.selectedConnection.user}@${this.selectedConnection.host}:${this.selectedConnection.port}`;
      infoElements.forEach(el => {
        el.textContent = displayText;
        el.classList.add('has-selection');
      });
    } else {
      connectBtns.forEach(btn => btn && (btn.disabled = true));
      detailsBtns.forEach(btn => btn && (btn.disabled = true));
      editBtns.forEach(btn => btn && (btn.disabled = true));
      
      infoElements.forEach(el => {
        el.textContent = 'Select a connection';
        el.classList.remove('has-selection');
      });
    }
  },
  
  resizeWindow(width, height) {
    if (window.electronAPI && window.electronAPI.window) {
      window.electronAPI.window.resize(width, height);
    } else {
      // Fallback for web/development mode
      console.log(`Would resize to ${width}x${height}`);
    }
  },
  
  saveState() {
    localStorage.setItem('ssh-manager-view-mode', this.viewMode);
  },
  
  loadState() {
    const savedMode = localStorage.getItem('ssh-manager-view-mode');
    if (savedMode) {
      this.viewMode = savedMode;
      this.updateLayout();
    }
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  initializeEventListeners();
  await loadGroups();
  await loadConnections();
  await loadTemplates();
  initializeDragAndDrop();
  
  // Load saved view mode
  AppState.loadState();
});

function initializeEventListeners() {
  document.getElementById('add-connection-btn').addEventListener('click', showAddConnectionForm);
  document.getElementById('search-input').addEventListener('input', filterConnections);
  document.getElementById('add-connection-form').addEventListener('submit', handleAddConnection);
  document.getElementById('edit-connection-form').addEventListener('submit', handleEditConnection);
  
  document.getElementById('add-group-btn').addEventListener('click', showAddGroupForm);
  document.getElementById('add-group-form').addEventListener('submit', handleAddGroup);
  document.getElementById('edit-group-form').addEventListener('submit', handleEditGroup);


  // Add template change listener for edit form
  document.getElementById('edit-template').addEventListener('change', handleEditTemplateChange);
  
  // Menu system event listeners
  initializeMenuSystem();
  
  // Compact mode button listeners (both original and embedded)
  const compactConnectHandler = () => {
    if (AppState.selectedConnection) {
      connectToServer(AppState.selectedConnection.name, AppState.selectedConnection.group);
    }
  };
  
  const compactDetailsHandler = () => {
    AppState.setViewMode('full');
    if (AppState.selectedConnection) {
      selectConnection(AppState.selectedConnection.name, AppState.selectedConnection.group);
    }
  };
  
  const compactEditHandler = () => {
    AppState.setViewMode('full');
    if (AppState.selectedConnection) {
      editConnection(AppState.selectedConnection.name, AppState.selectedConnection.group);
    }
  };
  
  // Add listeners to both sets of buttons
  document.getElementById('compact-connect-btn')?.addEventListener('click', compactConnectHandler);
  document.getElementById('compact-connect-btn-embedded')?.addEventListener('click', compactConnectHandler);
  
  document.getElementById('compact-details-btn')?.addEventListener('click', compactDetailsHandler);
  document.getElementById('compact-details-btn-embedded')?.addEventListener('click', compactDetailsHandler);
  
  document.getElementById('compact-edit-btn')?.addEventListener('click', compactEditHandler);
  document.getElementById('compact-edit-btn-embedded')?.addEventListener('click', compactEditHandler);
  
  // Phase 2: Dynamic port forward management
  document.getElementById('add-local-forward').addEventListener('click', addLocalForwardRow);
  document.getElementById('add-edit-local-forward').addEventListener('click', addEditLocalForwardRow);
}

async function refreshAll() {
  await loadGroups();
  await loadConnections();
}

// Menu System Functions
function initializeMenuSystem() {
  // Initialize menus after DOM is ready - will be called again when compact layout is populated
  setupMenuDropdowns();
}

function setupMenuDropdowns() {
  // Menu dropdown toggle functionality (handles both regular and compact menus)
  document.querySelectorAll('.menu-item').forEach(menuItem => {
    const menuLabel = menuItem.querySelector('.menu-label');
    const dropdown = menuItem.querySelector('.dropdown-menu');
    
    if (!menuLabel || !dropdown) return;
    
    // Remove existing listeners to avoid duplicates
    menuLabel.removeEventListener('click', handleMenuClick);
    menuLabel.addEventListener('click', handleMenuClick);
    
    function handleMenuClick(e) {
      e.stopPropagation();
      
      // Close other dropdowns
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu !== dropdown) {
          menu.classList.remove('show');
          menu.parentElement.classList.remove('active');
        }
      });
      
      // Toggle current dropdown
      dropdown.classList.toggle('show');
      menuItem.classList.toggle('active');
    }
  });
  
  // Menu option click handlers (remove existing first to avoid duplicates)
  document.querySelectorAll('.menu-option').forEach(option => {
    // Remove existing listener if present
    option.removeEventListener('click', handleMenuOptionClick);
    option.addEventListener('click', handleMenuOptionClick);
  });
  
  function handleMenuOptionClick(e) {
    const action = this.dataset.action;
    handleMenuAction(action);
    
    // Close all dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      menu.classList.remove('show');
      menu.parentElement.classList.remove('active');
    });
  }
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      menu.classList.remove('show');
      menu.parentElement.classList.remove('active');
    });
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'n':
          e.preventDefault();
          handleMenuAction('add-connection');
          break;
        case 'e':
          e.preventDefault();
          handleMenuAction('export-connections');
          break;
        case 'o':
          e.preventDefault();
          handleMenuAction('import-connections');
          break;
        case '1':
          e.preventDefault();
          handleMenuAction('compact-mode');
          break;
        case '2':
          e.preventDefault();
          handleMenuAction('full-mode');
          break;
        case 'r':
          e.preventDefault();
          handleMenuAction('refresh');
          break;
      }
    }
  });
}

function handleMenuAction(action) {
  switch(action) {
    case 'add-connection':
      // Switch to full mode for adding connections
      if (AppState.viewMode === 'compact') {
        AppState.setViewMode('full');
      }
      showAddConnectionForm();
      break;
      
    case 'export-connections':
      backupConfigs();
      break;
      
    case 'import-connections':
      // TODO: Implement import functionality
      showError('Import functionality coming soon!');
      break;
      
    case 'settings':
      // TODO: Implement settings
      showError('Settings coming soon!');
      break;
      
    case 'compact-mode':
      AppState.setViewMode('compact');
      break;
      
    case 'full-mode':
      AppState.setViewMode('full');
      break;
      
    case 'refresh':
      refreshAll();
      break;
      
    default:
      console.log('Unknown menu action:', action);
  }
}

function initializeDragAndDrop() {
  // Initialize drop zones on group headers
  document.querySelectorAll('.tree-node-header').forEach(header => {
    // Remove existing listeners to avoid duplicates
    header.removeEventListener('dragover', handleDragOver);
    header.removeEventListener('drop', handleDrop);
    header.removeEventListener('dragleave', handleDragLeave);
    
    // Add drop zone functionality
    header.classList.add('drop-zone');
    header.addEventListener('dragover', handleDragOver);
    header.addEventListener('drop', handleDrop);
    header.addEventListener('dragleave', handleDragLeave);
  });
  
  // Ensure all connection items are properly draggable
  document.querySelectorAll('.connection-tree-item').forEach(item => {
    if (!item.draggable) {
      item.draggable = true;
    }
  });
}

async function loadGroups() {
  try {
    const result = await window.electronAPI.ssh.getGroups();
    
    if (result.success) {
      allGroups = result.data;
      renderGroupTree();
    } else {
      showError('Failed to load groups: ' + result.error);
    }
  } catch (error) {
    showError('Failed to load groups: ' + error.message);
  }
}

async function loadConnections() {
  try {
    setStatus('Loading connections...');
    const result = await window.electronAPI.ssh.listConnections();
    
    if (result.success) {
      allConnections = result.data;
      renderTreeConnections();
      updateConnectionCount();
      setStatus('Ready');
    } else {
      setStatus('Error loading connections: ' + result.error);
      showError('Failed to load connections: ' + result.error);
    }
  } catch (error) {
    setStatus('Error: ' + error.message);
    showError('Failed to load connections: ' + error.message);
  }
}

async function loadTemplates() {
  try {
    const result = await window.electronAPI.ssh.getTemplates();
    if (result.success) {
      const templateSelect = document.getElementById('template');
      templateSelect.innerHTML = '';
      
      result.data.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        templateSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
}

function updateGroupDropdown() {
  const groupSelect = document.getElementById('group');
  groupSelect.innerHTML = '';
  
  allGroups.forEach(groupName => {
    const option = document.createElement('option');
    option.value = groupName;
    option.textContent = groupName.charAt(0).toUpperCase() + groupName.slice(1);
    groupSelect.appendChild(option);
  });
}

function renderGroupTree() {
  const container = document.getElementById('groups-tree');
  container.innerHTML = '';
  
  allGroups.forEach(groupName => {
    const groupNode = createGroupNode(groupName);
    container.appendChild(groupNode);
  });
}

function renderTreeConnections() {
  allGroups.forEach(group => {
    const container = document.querySelector(`[data-group="${group}"].tree-children`);
    if (!container) return;
    
    const connections = allConnections.filter(conn => conn.group === group);
    
    container.innerHTML = '';
    
    if (connections.length === 0) {
      container.classList.add('empty');
    } else {
      container.classList.remove('empty');
      
      connections.forEach(connection => {
        const item = createConnectionTreeItem(connection);
        container.appendChild(item);
      });
    }
  });
  
  // Initialize drag and drop after rendering all connections
  initializeDragAndDrop();
  
  if (selectedConnection) {
    selectConnection(selectedConnection.name, selectedConnection.group);
  }
}

function createGroupNode(groupName) {
  const groupNode = document.createElement('div');
  groupNode.className = 'tree-node group-node expanded';
  groupNode.dataset.group = groupName;
  
  const groupIcon = getGroupIcon(groupName);
  const connectionCount = allConnections.filter(c => c.group === groupName).length;
  const canDelete = connectionCount === 0 && groupName !== 'existing';
  const isExistingGroup = groupName === 'existing';
  
  groupNode.innerHTML = `
    <div class="tree-node-header drop-zone ${isExistingGroup ? 'readonly-group' : ''}">
      <span class="tree-toggle">▼</span>
      <span class="group-icon">${groupIcon}</span>
      <span class="group-name">${groupName}${isExistingGroup ? ' (Read-Only)' : ''}</span>
      <div class="group-actions">
        ${!isExistingGroup ? `<button class="group-action-btn edit" title="Rename Group" onclick="showEditGroupForm('${groupName}')">✏️</button>` : ''}
        ${!isExistingGroup ? `<button class="group-action-btn delete" title="Delete Group" onclick="deleteGroup('${groupName}')" ${!canDelete ? 'disabled' : ''}>🗑️</button>` : ''}
      </div>
    </div>
    <div class="tree-children" data-group="${groupName}"></div>
  `;
  
  const toggle = groupNode.querySelector('.tree-toggle');
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleGroup(groupNode);
  });
  
  return groupNode;
}

function getGroupIcon(groupName) {
  const icons = {
    'work': '💼',
    'personal': '🏠', 
    'projects': '🚀',
    'clients': '👥',
    'servers': '🖥️',
    'testing': '🧪',
    'production': '🏭',
    'development': '🔧',
    'existing': '📋'
  };
  return icons[groupName] || '📁';
}

function createConnectionTreeItem(connection) {
  const item = document.createElement('div');
  const isExisting = !connection.managed;
  item.className = `connection-tree-item ${isExisting ? 'readonly-connection' : ''}`;
  item.draggable = true; // Allow both existing and managed connections to be dragged
  item.dataset.name = connection.name;
  item.dataset.group = connection.group;
  item.dataset.isExisting = isExisting;
  
  const icon = isExisting ? '🔒' : '🖥️';
  const nameDisplay = isExisting ? `${connection.name} (Read-Only)` : connection.name;
  
  item.innerHTML = `
    <span class="connection-icon">${icon}</span>
    <span class="connection-name">${nameDisplay}</span>
    <span class="connection-details-mini">${connection.user}@${connection.host}</span>
  `;
  
  // Add event listeners
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    selectConnection(connection.name, connection.group);
  });
  
  // Only add drag functionality to managed connections
  if (!isExisting) {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
    item.setAttribute('draggable', 'true');
  }
  
  return item;
}

function selectConnection(name, group) {
  document.querySelectorAll('.connection-tree-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  const item = document.querySelector(`[data-name="${name}"][data-group="${group}"]`);
  if (item) {
    item.classList.add('selected');
    selectedConnection = allConnections.find(c => c.name === name && c.group === group);
    
    // Update app state for compact mode
    AppState.setSelectedConnection(selectedConnection);
    
    // Show details in full mode
    if (AppState.viewMode === 'full') {
      showConnectionDetails(selectedConnection);
    }
  }
}

function showConnectionDetails(connection) {
  const container = document.getElementById('connection-details');
  const isExisting = !connection.managed;
  const statusBadge = isExisting ? '<span class="readonly-badge">Read-Only</span>' : '';
  
  container.innerHTML = `
    <div class="connection-detail-view active">
      <div class="detail-header">
        <div>
          <h3 class="detail-title">${connection.name}</h3>
          <span class="detail-group-badge">${connection.group}</span>
          ${statusBadge}
        </div>
      </div>
      
      <div class="detail-section">
        <h4>Connection Details</h4>
        ${isExisting ? '<p class="readonly-notice">⚠️ This is an existing SSH configuration from your ~/.ssh/config file. It can be used but not edited through SSH Manager.</p>' : ''}
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Hostname</div>
            <div class="detail-value">${connection.host}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Username</div>
            <div class="detail-value">${connection.user}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Port</div>
            <div class="detail-value">${connection.port}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">SSH Key</div>
            <div class="detail-value">${connection.keyFile || '~/.ssh/id_ed25519'}</div>
          </div>
          <div class="detail-item source-item">
            <div class="detail-label">Source</div>
            <div class="detail-value source-path">${connection.configPath}</div>
          </div>
        </div>
      </div>
      
      <div class="detail-section">
        <h4>Connection Settings</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Connect Timeout</div>
            <div class="detail-value">${connection.connectTimeout || '10'} seconds</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Keep-Alive Interval</div>
            <div class="detail-value">${connection.serverAliveInterval || '60'} seconds</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Keep-Alive Max Count</div>
            <div class="detail-value">${connection.serverAliveCountMax || '3'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Compression</div>
            <div class="detail-value">${connection.compression || 'yes'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Host Key Checking</div>
            <div class="detail-value">${connection.strictHostKeyChecking || 'ask'}</div>
          </div>
        </div>
      </div>
      
      <div class="detail-section">
        <h4>Developer Features</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Connection Multiplexing</div>
            <div class="detail-value">${connection.controlMaster || 'auto'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Persist Duration</div>
            <div class="detail-value">${connection.controlPersist || '10m'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">X11 Forwarding</div>
            <div class="detail-value">${connection.forwardX11 || 'no'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Agent Forwarding</div>
            <div class="detail-value">${connection.forwardAgent || 'no'}</div>
          </div>
          ${connection.dynamicForward ? `
          <div class="detail-item">
            <div class="detail-label">SOCKS Proxy Port</div>
            <div class="detail-value">${connection.dynamicForward}</div>
          </div>
          ` : ''}
        </div>
        
        ${connection.localForwards && connection.localForwards.length > 0 ? `
        <h5>Port Forwards</h5>
        <div class="port-forwards-list">
          ${connection.localForwards.map(f => 
            `<div class="port-forward-item">Local ${f.localPort} → ${f.remoteHost}:${f.remotePort}</div>`
          ).join('')}
        </div>
        ` : ''}
      </div>
      
      <div class="detail-section">
        <h4>Quick Actions</h4>
        <div class="detail-actions">
          <button class="btn btn-primary" onclick="connectToServer('${connection.name}', '${connection.group}')">
            🚀 Connect
          </button>
          <button class="btn btn-secondary" onclick="testConnection('${connection.name}', '${connection.group}')">
            🔍 Test Connection
          </button>
          ${isExisting ? `<button class="btn btn-secondary" onclick="showMigrateConnectionDialog('${connection.name}')">📁 Migrate to Group</button>` : ''}
          ${!isExisting ? `<button class="btn btn-secondary" onclick="editConnection('${connection.name}', '${connection.group}')">✏️ Edit</button>` : ''}
          ${!isExisting ? `<button class="btn btn-secondary" onclick="deleteConnection('${connection.name}', '${connection.group}')">🗑️ Delete</button>` : ''}
        </div>
      </div>
      
      <div class="detail-section">
        <h4>SSH Command</h4>
        <div class="detail-value">ssh ${connection.user}@${connection.host} -p ${connection.port}</div>
      </div>
    </div>
  `;
  
  document.getElementById('content-title').textContent = `${connection.name} (${connection.group})`;
}

function toggleGroup(groupNode) {
  groupNode.classList.toggle('collapsed');
}

function filterConnections() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  
  document.querySelectorAll('.connection-tree-item').forEach(item => {
    const name = item.dataset.name.toLowerCase();
    const details = item.textContent.toLowerCase();
    
    if (name.includes(searchTerm) || details.includes(searchTerm)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

function handleDragStart(e) {
  draggedConnection = {
    name: e.target.dataset.name,
    group: e.target.dataset.group
  };
  
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', e.target.dataset.name);
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedConnection = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  const targetGroup = e.currentTarget.closest('.tree-node').dataset.group;
  // Don't allow dropping to existing group or same group
  if (draggedConnection && targetGroup !== draggedConnection.group && targetGroup !== 'existing') {
    e.currentTarget.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  if (!draggedConnection) return;
  
  const targetGroup = e.currentTarget.closest('.tree-node').dataset.group;
  
  // Don't allow dropping to existing group or same group
  if (targetGroup !== draggedConnection.group && targetGroup !== 'existing') {
    const isExistingConnection = draggedConnection.group === 'existing' || draggedConnection.isExisting === 'true';
    
    if (isExistingConnection) {
      // Migrate existing connection to managed group
      await migrateExistingConnection(draggedConnection.name, targetGroup);
    } else {
      // Move managed connection between groups
      await moveConnectionToGroup(draggedConnection.name, draggedConnection.group, targetGroup);
    }
  }
}

async function migrateExistingConnection(connectionName, toGroup) {
  try {
    setStatus(`Migrating ${connectionName} to ${toGroup}...`);
    
    const result = await window.electronAPI.ssh.migrateExistingConnection(connectionName, toGroup);
    
    if (result.success) {
      await loadConnections();
      setStatus(`Migrated ${connectionName} to ${toGroup} successfully`);
      showSuccess(`Connection "${connectionName}" migrated to ${toGroup} group! The original entry in ~/.ssh/config has been commented out.`);
      
      // Select the newly migrated connection
      setTimeout(() => {
        selectConnection(connectionName, toGroup);
      }, 500);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    setStatus('Error migrating connection');
    showError('Failed to migrate connection: ' + error.message);
  }
}

async function moveConnectionToGroup(name, fromGroup, toGroup) {
  try {
    setStatus(`Moving ${name} to ${toGroup}...`);
    
    const connection = allConnections.find(c => c.name === name && c.group === fromGroup);
    if (!connection) {
      throw new Error('Connection not found');
    }
    
    await window.electronAPI.ssh.removeConnection(name, fromGroup);
    
    const newConnection = {
      name: name,
      host: connection.host,
      user: connection.user,
      port: connection.port,
      group: toGroup,
      keyFile: connection.keyFile
    };
    
    const result = await window.electronAPI.ssh.addConnection(newConnection);
    
    if (result.success) {
      await loadConnections();
      setStatus(`Moved ${name} to ${toGroup} successfully`);
      showSuccess(`Connection "${name}" moved to ${toGroup} group!`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    setStatus('Error moving connection');
    showError('Failed to move connection: ' + error.message);
    await loadConnections();
  }
}

function updateConnectionCount() {
  const total = allConnections.length;
  document.getElementById('connection-count').textContent = `${total} connection${total !== 1 ? 's' : ''}`;
}

function showAddConnectionForm() {
  updateGroupDropdown();
  document.getElementById('add-connection-modal').classList.add('active');
  document.getElementById('connection-name').focus();
}

function hideAddConnectionForm() {
  document.getElementById('add-connection-modal').classList.remove('active');
  document.getElementById('add-connection-form').reset();
}

async function handleAddConnection(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  
  // Validate Phase 1 fields
  const connectTimeout = parseInt(formData.get('connectTimeout'));
  const serverAliveInterval = parseInt(formData.get('serverAliveInterval'));
  const serverAliveCountMax = parseInt(formData.get('serverAliveCountMax'));
  
  if (connectTimeout < 1 || connectTimeout > 300) {
    showError('Connect timeout must be between 1 and 300 seconds');
    return;
  }
  
  if (serverAliveInterval < 0 || serverAliveInterval > 3600) {
    showError('Keep-alive interval must be between 0 and 3600 seconds');
    return;
  }
  
  if (serverAliveCountMax < 1 || serverAliveCountMax > 10) {
    showError('Keep-alive max count must be between 1 and 10');
    return;
  }

  // Validate Phase 2 fields
  const phase2Errors = validatePhase2Fields(formData);
  if (phase2Errors.length > 0) {
    showError(phase2Errors.join('; '));
    return;
  }

  const options = {
    name: formData.get('name'),
    host: formData.get('host'),
    user: formData.get('user'),
    port: formData.get('port'),
    group: formData.get('group'),
    template: formData.get('template'),
    keyFile: formData.get('keyFile'),
    // Phase 1: Connection Settings
    connectTimeout: formData.get('connectTimeout'),
    serverAliveInterval: formData.get('serverAliveInterval'),
    serverAliveCountMax: formData.get('serverAliveCountMax'),
    compression: formData.get('compression'),
    strictHostKeyChecking: formData.get('strictHostKeyChecking'),
    // Phase 2: Developer Features
    controlMaster: formData.get('controlMaster'),
    controlPersist: formData.get('controlPersist'),
    forwardX11: formData.get('forwardX11'),
    forwardAgent: formData.get('forwardAgent'),
    dynamicForward: formData.get('dynamicForward'),
    localForwards: getLocalForwards()
  };
  
  try {
    setStatus('Adding connection...');
    const result = await window.electronAPI.ssh.addConnection(options);
    
    if (result.success) {
      hideAddConnectionForm();
      await loadConnections();
      setStatus('Connection added successfully');
      showSuccess(`Connection "${options.name}" added successfully!`);
      
      setTimeout(() => {
        selectConnection(options.name, options.group);
      }, 100);
    } else {
      setStatus('Error adding connection');
      showError('Failed to add connection: ' + result.error);
    }
  } catch (error) {
    setStatus('Error: ' + error.message);
    showError('Failed to add connection: ' + error.message);
  }
}

async function deleteConnection(name, group) {
  if (!confirm(`Are you sure you want to delete the connection "${name}"?`)) {
    return;
  }
  
  try {
    setStatus('Deleting connection...');
    const result = await window.electronAPI.ssh.removeConnection(name, group);
    
    if (result.success) {
      await loadConnections();
      setStatus('Connection deleted successfully');
      showSuccess(`Connection "${name}" deleted successfully!`);
      
      if (selectedConnection && selectedConnection.name === name) {
        selectedConnection = null;
        document.getElementById('connection-details').innerHTML = `
          <div class="welcome-state">
            <div class="welcome-icon">🔗</div>
            <h3>Connection Deleted</h3>
            <p>Select another connection from the sidebar to view details.</p>
          </div>
        `;
        document.getElementById('content-title').textContent = 'Connection Details';
      }
    } else {
      setStatus('Error deleting connection');
      showError('Failed to delete connection: ' + result.error);
    }
  } catch (error) {
    setStatus('Error: ' + error.message);
    showError('Failed to delete connection: ' + error.message);
  }
}

async function testConnection(name, group) {
  try {
    setStatus(`Testing connection to ${name}...`);
    const result = await window.electronAPI.ssh.testConnection(name, group);
    
    if (result.success) {
      if (result.data.success) {
        setStatus('Connection test successful');
        showSuccess(`Connection to "${name}" successful!`);
      } else {
        setStatus('Connection test failed');
        showError(`Connection to "${name}" failed: ${result.data.message}`);
      }
    } else {
      setStatus('Error testing connection');
      showError('Failed to test connection: ' + result.error);
    }
  } catch (error) {
    setStatus('Error: ' + error.message);
    showError('Failed to test connection: ' + error.message);
  }
}

async function connectToServer(name, group) {
  try {
    setStatus(`Launching SSH connection to ${name}...`);
    const result = await window.electronAPI.ssh.connectToServer(name, group);
    
    if (result.success) {
      setStatus('SSH connection launched successfully');
    } else {
      setStatus('Error launching SSH connection');
      showError('Failed to connect: ' + result.error);
    }
  } catch (error) {
    setStatus('Error: ' + error.message);
    showError('Failed to connect: ' + error.message);
  }
}

async function editConnection(name, group) {
  try {
    const connection = allConnections.find(c => c.name === name && c.group === group);
    if (!connection) {
      showError(`Connection '${name}' not found`);
      return;
    }

    // Populate the edit form with current values
    document.getElementById('edit-connection-original-name').value = name;
    document.getElementById('edit-connection-original-group').value = group;
    document.getElementById('edit-connection-name').value = name;
    document.getElementById('edit-host').value = connection.host;
    document.getElementById('edit-user').value = connection.user;
    document.getElementById('edit-port').value = connection.port;
    document.getElementById('edit-key-file').value = connection.keyFile || '~/.ssh/id_ed25519';
    
    // Populate Phase 1 settings
    document.getElementById('edit-connect-timeout').value = connection.connectTimeout || '10';
    document.getElementById('edit-server-alive-interval').value = connection.serverAliveInterval || '60';
    document.getElementById('edit-server-alive-count').value = connection.serverAliveCountMax || '3';
    document.getElementById('edit-compression').value = connection.compression || 'yes';
    document.getElementById('edit-strict-host-checking').value = connection.strictHostKeyChecking || 'ask';
    
    // Populate Phase 2 settings
    document.getElementById('edit-control-master').value = connection.controlMaster || 'auto';
    document.getElementById('edit-control-persist').value = connection.controlPersist || '10m';
    document.getElementById('edit-forward-x11').value = connection.forwardX11 || 'no';
    document.getElementById('edit-forward-agent').value = connection.forwardAgent || 'no';
    document.getElementById('edit-dynamic-forward').value = connection.dynamicForward || '';
    
    // Populate existing port forwards
    populateEditLocalForwards(connection.localForwards || []);

    // Update group dropdown and select current group
    updateEditGroupDropdown();
    document.getElementById('edit-group').value = group;

    // Detect template based on configuration (simple heuristic)
    const template = detectConnectionTemplate(connection);
    document.getElementById('edit-template').value = template;
    
    // Show/hide advanced options based on template
    handleEditTemplateChange();

    // Show the edit modal
    document.getElementById('edit-connection-modal').classList.add('active');
    document.getElementById('edit-connection-name').focus();
  } catch (error) {
    showError('Failed to load connection for editing: ' + error.message);
  }
}

function detectConnectionTemplate(connection) {
  // Read SSH config content to detect template type
  // This is a simple heuristic based on common patterns
  if (connection.configPath) {
    // Check for ProxyJump directive
    if (connection.configPath.includes('ProxyJump') || connection.configPath.includes('jump')) {
      return 'jump-host';
    }
    // Check for AWS patterns
    if (connection.user === 'ec2-user' || connection.host.includes('amazonaws')) {
      return 'aws-ec2';
    }
    // Check for development patterns
    if (connection.host.includes('dev') || connection.host.includes('localhost')) {
      return 'development';
    }
  }
  
  // Default to basic-server
  return 'basic-server';
}

function updateEditGroupDropdown() {
  const groupSelect = document.getElementById('edit-group');
  groupSelect.innerHTML = '';
  
  allGroups.forEach(groupName => {
    const option = document.createElement('option');
    option.value = groupName;
    option.textContent = groupName.charAt(0).toUpperCase() + groupName.slice(1);
    groupSelect.appendChild(option);
  });
}

function handleEditTemplateChange() {
  const template = document.getElementById('edit-template').value;
  const jumpHostOptions = document.getElementById('edit-jump-host-options');
  
  if (template === 'jump-host') {
    jumpHostOptions.style.display = 'block';
  } else {
    jumpHostOptions.style.display = 'none';
  }
}

function showEditConnectionForm() {
  document.getElementById('edit-connection-modal').classList.add('active');
}

function hideEditConnectionForm() {
  document.getElementById('edit-connection-modal').classList.remove('active');
  document.getElementById('edit-connection-form').reset();
}

async function handleEditConnection(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const originalName = formData.get('originalName');
  const originalGroup = formData.get('originalGroup');
  
  const updates = {
    name: formData.get('name'),
    host: formData.get('host'),
    user: formData.get('user'),
    port: formData.get('port'),
    group: formData.get('group'),
    template: formData.get('template'),
    keyFile: formData.get('keyFile'),
    jumpHost: formData.get('jumpHost'),
    // Phase 1: Connection Settings
    connectTimeout: formData.get('connectTimeout'),
    serverAliveInterval: formData.get('serverAliveInterval'),
    serverAliveCountMax: formData.get('serverAliveCountMax'),
    compression: formData.get('compression'),
    strictHostKeyChecking: formData.get('strictHostKeyChecking'),
    // Phase 2: Developer Features
    controlMaster: formData.get('controlMaster'),
    controlPersist: formData.get('controlPersist'),
    forwardX11: formData.get('forwardX11'),
    forwardAgent: formData.get('forwardAgent'),
    dynamicForward: formData.get('dynamicForward'),
    localForwards: getEditLocalForwards()
  };
  
  try {
    setStatus('Updating connection...');
    
    // If name or group changed, we need to remove old and create new
    if (updates.name !== originalName || updates.group !== originalGroup) {
      // Remove old connection
      await window.electronAPI.ssh.removeConnection(originalName, originalGroup);
      
      // Create new connection with updated details
      const result = await window.electronAPI.ssh.addConnection(updates);
      
      if (!result.success) {
        throw new Error(result.error);
      }
    } else {
      // Just update existing connection
      const result = await window.electronAPI.ssh.updateConnection(originalName, originalGroup, updates);
      
      if (!result.success) {
        throw new Error(result.error);
      }
    }
    
    hideEditConnectionForm();
    await loadConnections();
    setStatus('Connection updated successfully');
    showSuccess(`Connection "${updates.name}" updated successfully!`);
    
    // Re-select the connection with its new name/group
    setTimeout(() => {
      selectConnection(updates.name, updates.group);
    }, 100);
    
  } catch (error) {
    setStatus('Error updating connection');
    showError('Failed to update connection: ' + error.message);
  }
}


async function backupConfigs() {
  try {
    setStatus('Preparing export...');
    
    // Generate default filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const defaultFilename = `ssh-manager-export-${timestamp}.zip`;
    
    // Show save dialog
    const saveResult = await window.electronAPI.dialog.saveFile({
      title: 'Export SSH Manager Configuration',
      defaultPath: defaultFilename,
      filters: [
        { name: 'ZIP Archive', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (saveResult.canceled) {
      setStatus('Export canceled');
      return;
    }
    
    setStatus('Creating export archive...');
    
    // Create the backup
    const result = await window.electronAPI.ssh.createBackup(saveResult.filePath);
    
    if (result.success) {
      const sizeKB = Math.round(result.data.size / 1024);
      setStatus(`Export created successfully: ${sizeKB} KB`);
      showSuccess(`✅ Export created successfully!\n\nFile: ${result.data.filePath}\nSize: ${sizeKB} KB\nCreated: ${new Date(result.data.timestamp).toLocaleString()}\n\nExport includes:\n• SSH Manager configurations\n• SSH config file backup\n• Connection metadata\n\nNote: SSH private keys are NOT included for security reasons`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    setStatus('Export failed');
    showError('Failed to create export: ' + error.message);
  }
}

function importConfigs() {
  setStatus('Importing configurations...');
  showSuccess('Configuration import functionality coming in Phase 3');
}

// Group Management Functions
function showAddGroupForm() {
  document.getElementById('add-group-modal').classList.add('active');
  document.getElementById('group-name').focus();
}

function hideAddGroupForm() {
  document.getElementById('add-group-modal').classList.remove('active');
  document.getElementById('add-group-form').reset();
}

function showEditGroupForm(groupName) {
  document.getElementById('edit-group-old-name').value = groupName;
  document.getElementById('edit-group-name').value = groupName;
  document.getElementById('edit-group-modal').classList.add('active');
  document.getElementById('edit-group-name').focus();
  document.getElementById('edit-group-name').select();
}

function hideEditGroupForm() {
  document.getElementById('edit-group-modal').classList.remove('active');
  document.getElementById('edit-group-form').reset();
}

async function handleAddGroup(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const groupName = formData.get('name').trim().toLowerCase();
  
  try {
    setStatus('Creating group...');
    const result = await window.electronAPI.ssh.createGroup(groupName);
    
    if (result.success) {
      hideAddGroupForm();
      await refreshAll();
      setStatus('Group created successfully');
      showSuccess(`Group "${groupName}" created successfully!`);
    } else {
      setStatus('Error creating group');
      showError('Failed to create group: ' + result.error);
    }
  } catch (error) {
    setStatus('Error: ' + error.message);
    showError('Failed to create group: ' + error.message);
  }
}

async function handleEditGroup(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const oldName = document.getElementById('edit-group-old-name').value;
  const newName = formData.get('name').trim().toLowerCase();
  
  if (oldName === newName) {
    hideEditGroupForm();
    return;
  }
  
  try {
    setStatus('Renaming group...');
    const result = await window.electronAPI.ssh.renameGroup(oldName, newName);
    
    if (result.success) {
      hideEditGroupForm();
      await refreshAll();
      setStatus('Group renamed successfully');
      showSuccess(`Group "${oldName}" renamed to "${newName}" successfully!`);
    } else {
      setStatus('Error renaming group');
      showError('Failed to rename group: ' + result.error);
    }
  } catch (error) {
    setStatus('Error: ' + error.message);
    showError('Failed to rename group: ' + error.message);
  }
}

async function deleteGroup(groupName) {
  const connectionCount = allConnections.filter(c => c.group === groupName).length;
  
  if (connectionCount > 0) {
    showError(`Cannot delete group "${groupName}" because it contains ${connectionCount} connection(s). Move or delete the connections first.`);
    return;
  }
  
  if (!confirm(`Are you sure you want to delete the group "${groupName}"?`)) {
    return;
  }
  
  try {
    setStatus('Deleting group...');
    const result = await window.electronAPI.ssh.deleteGroup(groupName);
    
    if (result.success) {
      await refreshAll();
      setStatus('Group deleted successfully');
      showSuccess(`Group "${groupName}" deleted successfully!`);
      
      if (selectedConnection && selectedConnection.group === groupName) {
        selectedConnection = null;
        document.getElementById('connection-details').innerHTML = `
          <div class="welcome-state">
            <div class="welcome-icon">🔗</div>
            <h3>Group Deleted</h3>
            <p>The selected connection's group was deleted. Select another connection from the sidebar.</p>
          </div>
        `;
        document.getElementById('content-title').textContent = 'Connection Details';
      }
    } else {
      setStatus('Error deleting group');
      showError('Failed to delete group: ' + result.error);
    }
  } catch (error) {
    setStatus('Error: ' + error.message);
    showError('Failed to delete group: ' + error.message);
  }
}

function setStatus(message) {
  document.getElementById('status-text').textContent = message;
}

function showSuccess(message) {
  alert('✅ ' + message);
}

function showError(message) {
  alert('❌ ' + message);
}

async function showMigrateConnectionDialog(connectionName) {
  // Get available groups (excluding 'existing')
  const managedGroups = allGroups.filter(group => group !== 'existing');
  
  if (managedGroups.length === 0) {
    showError('No groups available for migration. Please create a group first.');
    return;
  }
  
  // Create a simple modal for group selection
  const modalHtml = `
    <div class="modal-overlay" id="migrate-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Migrate Connection</h3>
        </div>
        <div class="modal-body">
          <p>Migrate "${connectionName}" to which group?</p>
          <p><small>This will copy the connection to the selected group and comment out the original entry in ~/.ssh/config</small></p>
          <select id="migrate-group-select" class="form-control">
            ${managedGroups.map(group => `<option value="${group}">${group}</option>`).join('')}
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="hideMigrateModal()">Cancel</button>
          <button class="btn btn-primary" onclick="confirmMigration('${connectionName}')">Migrate</button>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to DOM
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function hideMigrateModal() {
  const modal = document.getElementById('migrate-modal');
  if (modal) {
    modal.remove();
  }
}

async function confirmMigration(connectionName) {
  const selectedGroup = document.getElementById('migrate-group-select').value;
  hideMigrateModal();
  
  if (selectedGroup) {
    await migrateExistingConnection(connectionName, selectedGroup);
  }
}

// Global function exports for HTML onclick handlers
window.showAddConnectionForm = showAddConnectionForm;
window.hideAddConnectionForm = hideAddConnectionForm;
window.showAddGroupForm = showAddGroupForm;
window.hideAddGroupForm = hideAddGroupForm;
window.showEditGroupForm = showEditGroupForm;
window.hideEditGroupForm = hideEditGroupForm;
// Phase 2: Helper functions for developer features
function validatePhase2Fields(formData) {
  const errors = [];
  
  // Validate ControlPersist format (should be like "10m", "1h", "30s")
  const controlPersist = formData.get('controlPersist');
  if (controlPersist && !controlPersist.match(/^\d+[smh]$/)) {
    errors.push('Control persist must be in format like "10m", "1h", or "30s"');
  }
  
  // Validate dynamic forward port
  const dynamicForward = formData.get('dynamicForward');
  if (dynamicForward && (dynamicForward < 1 || dynamicForward > 65535)) {
    errors.push('SOCKS proxy port must be between 1 and 65535');
  }
  
  // Validate local forwards
  const localPorts = document.querySelectorAll('input[name="localPort[]"]');
  const remotePorts = document.querySelectorAll('input[name="remotePort[]"]');
  
  for (let i = 0; i < localPorts.length; i++) {
    const localPort = parseInt(localPorts[i].value);
    const remotePort = parseInt(remotePorts[i].value);
    
    if (localPorts[i].value && (localPort < 1 || localPort > 65535)) {
      errors.push(`Local port ${localPort} must be between 1 and 65535`);
    }
    
    if (remotePorts[i].value && (remotePort < 1 || remotePort > 65535)) {
      errors.push(`Remote port ${remotePort} must be between 1 and 65535`);
    }
  }
  
  return errors;
}

function getLocalForwards() {
  const forwards = [];
  const localPorts = document.querySelectorAll('input[name="localPort[]"]');
  const remoteHosts = document.querySelectorAll('input[name="remoteHost[]"]');
  const remotePorts = document.querySelectorAll('input[name="remotePort[]"]');
  
  for (let i = 0; i < localPorts.length; i++) {
    if (localPorts[i].value && remotePorts[i].value) {
      forwards.push({
        type: 'local',
        localPort: localPorts[i].value,
        remoteHost: remoteHosts[i].value || 'localhost',
        remotePort: remotePorts[i].value
      });
    }
  }
  
  return forwards;
}

function getEditLocalForwards() {
  const forwards = [];
  const localPorts = document.querySelectorAll('input[name="editLocalPort[]"]');
  const remoteHosts = document.querySelectorAll('input[name="editRemoteHost[]"]');
  const remotePorts = document.querySelectorAll('input[name="editRemotePort[]"]');
  
  for (let i = 0; i < localPorts.length; i++) {
    if (localPorts[i].value && remotePorts[i].value) {
      forwards.push({
        type: 'local',
        localPort: localPorts[i].value,
        remoteHost: remoteHosts[i].value || 'localhost',
        remotePort: remotePorts[i].value
      });
    }
  }
  
  return forwards;
}

function addLocalForwardRow() {
  const container = document.getElementById('local-forwards-container');
  const row = document.createElement('div');
  row.className = 'port-forward-row';
  row.innerHTML = `
    <input type="number" placeholder="Local Port" name="localPort[]" min="1" max="65535">
    <input type="text" placeholder="Remote Host" name="remoteHost[]" value="localhost">
    <input type="number" placeholder="Remote Port" name="remotePort[]" min="1" max="65535">
    <button type="button" class="btn-small btn-remove" onclick="removeForwardRow(this)">×</button>
  `;
  container.appendChild(row);
}

function addEditLocalForwardRow() {
  const container = document.getElementById('edit-local-forwards-container');
  const row = document.createElement('div');
  row.className = 'port-forward-row';
  row.innerHTML = `
    <input type="number" placeholder="Local Port" name="editLocalPort[]" min="1" max="65535">
    <input type="text" placeholder="Remote Host" name="editRemoteHost[]" value="localhost">
    <input type="number" placeholder="Remote Port" name="editRemotePort[]" min="1" max="65535">
    <button type="button" class="btn-small btn-remove" onclick="removeEditForwardRow(this)">×</button>
  `;
  container.appendChild(row);
}

function removeForwardRow(button) {
  button.parentElement.remove();
}

function removeEditForwardRow(button) {
  button.parentElement.remove();
}

function populateEditLocalForwards(forwards) {
  const container = document.getElementById('edit-local-forwards-container');
  
  // Clear existing rows except the first template row
  const rows = container.querySelectorAll('.port-forward-row');
  rows.forEach((row, index) => {
    if (index > 0) row.remove(); // Keep first row as template
  });
  
  // Clear the first row
  const firstRow = container.querySelector('.port-forward-row');
  const inputs = firstRow.querySelectorAll('input');
  inputs.forEach(input => input.value = '');
  
  // Populate with existing forwards
  forwards.forEach((forward, index) => {
    if (index === 0) {
      // Use the first existing row
      const inputs = firstRow.querySelectorAll('input');
      inputs[0].value = forward.localPort;
      inputs[1].value = forward.remoteHost;
      inputs[2].value = forward.remotePort;
    } else {
      // Add new rows for additional forwards
      addEditLocalForwardRow();
      const newRow = container.lastElementChild;
      const inputs = newRow.querySelectorAll('input');
      inputs[0].value = forward.localPort;
      inputs[1].value = forward.remoteHost;
      inputs[2].value = forward.remotePort;
    }
  });
}

window.showEditConnectionForm = showEditConnectionForm;
window.hideEditConnectionForm = hideEditConnectionForm;
window.deleteGroup = deleteGroup;
window.connectToServer = connectToServer;
window.testConnection = testConnection;
window.editConnection = editConnection;
window.showMigrateConnectionDialog = showMigrateConnectionDialog;
window.hideMigrateModal = hideMigrateModal;
window.confirmMigration = confirmMigration;
window.deleteConnection = deleteConnection;