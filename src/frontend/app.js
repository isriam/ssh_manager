let allConnections = [];
let allGroups = [];
let selectedConnection = null;
let draggedConnection = null;

document.addEventListener('DOMContentLoaded', async () => {
  initializeEventListeners();
  await loadGroups();
  await loadConnections();
  await loadTemplates();
  initializeDragAndDrop();
});

function initializeEventListeners() {
  document.getElementById('add-connection-btn').addEventListener('click', showAddConnectionForm);
  document.getElementById('refresh-btn').addEventListener('click', refreshAll);
  document.getElementById('search-input').addEventListener('input', filterConnections);
  document.getElementById('add-connection-form').addEventListener('submit', handleAddConnection);
  
  document.getElementById('add-group-btn').addEventListener('click', showAddGroupForm);
  document.getElementById('add-group-form').addEventListener('submit', handleAddGroup);
  document.getElementById('edit-group-form').addEventListener('submit', handleEditGroup);

  document.getElementById('test-all-btn').addEventListener('click', testAllConnections);
  document.getElementById('backup-btn').addEventListener('click', backupConfigs);
  document.getElementById('import-btn').addEventListener('click', importConfigs);
}

async function refreshAll() {
  await loadGroups();
  await loadConnections();
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
  const canDelete = connectionCount === 0;
  
  groupNode.innerHTML = `
    <div class="tree-node-header drop-zone">
      <span class="tree-toggle">▼</span>
      <span class="group-icon">${groupIcon}</span>
      <span class="group-name">${groupName}</span>
      <div class="group-actions">
        <button class="group-action-btn edit" title="Rename Group" onclick="showEditGroupForm('${groupName}')">✏️</button>
        <button class="group-action-btn delete" title="Delete Group" onclick="deleteGroup('${groupName}')" ${!canDelete ? 'disabled' : ''}>🗑️</button>
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
    'development': '🔧'
  };
  return icons[groupName] || '📁';
}

function createConnectionTreeItem(connection) {
  const item = document.createElement('div');
  item.className = 'connection-tree-item';
  item.draggable = true;
  item.dataset.name = connection.name;
  item.dataset.group = connection.group;
  
  item.innerHTML = `
    <span class="connection-icon">🖥️</span>
    <span class="connection-name">${connection.name}</span>
    <span class="connection-details-mini">${connection.user}@${connection.host}</span>
  `;
  
  // Add event listeners
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    selectConnection(connection.name, connection.group);
  });
  
  item.addEventListener('dragstart', handleDragStart);
  item.addEventListener('dragend', handleDragEnd);
  
  // Ensure draggable is properly set
  item.setAttribute('draggable', 'true');
  
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
    showConnectionDetails(selectedConnection);
  }
}

function showConnectionDetails(connection) {
  const container = document.getElementById('connection-details');
  
  container.innerHTML = `
    <div class="connection-detail-view active">
      <div class="detail-header">
        <div>
          <h3 class="detail-title">${connection.name}</h3>
          <span class="detail-group-badge">${connection.group}</span>
        </div>
      </div>
      
      <div class="detail-section">
        <h4>Connection Details</h4>
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
            <div class="detail-value">${connection.keyFile || '~/.ssh/id_rsa'}</div>
          </div>
        </div>
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
          <button class="btn btn-secondary" onclick="editConnection('${connection.name}', '${connection.group}')">
            ✏️ Edit
          </button>
          <button class="btn btn-secondary" onclick="deleteConnection('${connection.name}', '${connection.group}')">
            🗑️ Delete
          </button>
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
  if (draggedConnection && targetGroup !== draggedConnection.group) {
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
  
  if (targetGroup !== draggedConnection.group) {
    await moveConnectionToGroup(draggedConnection.name, draggedConnection.group, targetGroup);
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
  const options = {
    name: formData.get('name'),
    host: formData.get('host'),
    user: formData.get('user'),
    port: formData.get('port'),
    group: formData.get('group'),
    template: formData.get('template'),
    keyFile: formData.get('keyFile')
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

function connectToServer(name, _group) {
  setStatus(`Launching SSH connection to ${name}...`);
  showSuccess(`SSH connection to "${name}" would launch in terminal (feature coming in Phase 3)`);
}

function editConnection(name, _group) {
  showSuccess(`Edit functionality for "${name}" coming in Phase 3`);
}

async function testAllConnections() {
  setStatus('Testing all connections...');
  showSuccess('Bulk connection testing coming in Phase 3');
}

function backupConfigs() {
  setStatus('Creating backup...');
  showSuccess('Configuration backup functionality coming in Phase 3');
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

// Global function exports for HTML onclick handlers
window.showAddConnectionForm = showAddConnectionForm;
window.hideAddConnectionForm = hideAddConnectionForm;
window.showAddGroupForm = showAddGroupForm;
window.hideAddGroupForm = hideAddGroupForm;
window.showEditGroupForm = showEditGroupForm;
window.hideEditGroupForm = hideEditGroupForm;
window.deleteGroup = deleteGroup;
window.connectToServer = connectToServer;
window.testConnection = testConnection;
window.editConnection = editConnection;
window.deleteConnection = deleteConnection;