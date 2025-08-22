let allConnections = [];
let allGroups = [];
let groupsTree = {}; // Nested group tree structure
let expandedGroups = new Set(); // Track expanded/collapsed states
let selectedConnection = null;
let draggedConnection = null;
let originalWindowSize = null;

document.addEventListener('DOMContentLoaded', async () => {
  initializeEventListeners();
  await loadGroupsInitial();
  await loadConnections();
  await loadTemplates();
  initializeDragAndDropDelegation();
  
  // Initialize menu system
  setupMenuSystem();
  
  // Listen for refresh requests from other windows
  window.electronAPI.ipc.on('refresh-connections', async () => {
    await loadGroups();
    await loadConnections();
  });
});

function initializeEventListeners() {
  document.getElementById('add-connection-form').addEventListener('submit', handleAddConnection);
  document.getElementById('edit-connection-form').addEventListener('submit', handleEditConnection);
  
  document.getElementById('add-group-btn').addEventListener('click', showAddGroupForm);
  document.getElementById('add-group-form').addEventListener('submit', handleAddGroup);
  document.getElementById('edit-group-form').addEventListener('submit', handleEditGroup);

  // Initialize tree event delegation
  setupTreeEventDelegation();

  // Add template change listener for edit form
  document.getElementById('edit-template').addEventListener('change', handleEditTemplateChange);
  
  // Action button listeners
  document.getElementById('connect-btn').addEventListener('click', handleConnect);
  document.getElementById('details-btn').addEventListener('click', handleDetails);
  document.getElementById('edit-btn').addEventListener('click', handleEdit);
  
  // Phase 2: Dynamic port forward management
  document.getElementById('add-local-forward').addEventListener('click', addLocalForwardRow);
  document.getElementById('add-edit-local-forward').addEventListener('click', addEditLocalForwardRow);
}

async function refreshAll() {
  await loadGroups();
  await loadConnections();
}

// Simplified event handling functions
function handleConnect() {
  if (selectedConnection) {
    connectToServer(selectedConnection.name, selectedConnection.group);
  }
}

function handleDetails() {
  if (selectedConnection) {
    openDetailsWindow(selectedConnection);
  }
}

function handleEdit() {
  if (selectedConnection) {
    openEditWindow(selectedConnection);
  }
}

// Inline action handlers for connection buttons
function handleConnectAction(name, group) {
  connectToServer(name, group);
}

function handleEditAction(name, group) {
  openEditWindow({ name, group });
}

async function handleDeleteAction(name, group) {
  if (confirm(`Are you sure you want to delete the connection "${name}"?`)) {
    try {
      setStatus('Deleting connection...');
      const result = await window.electronAPI.ssh.removeConnection(name, group);
      
      if (result.success) {
        await loadGroups();
        await loadConnections();
        setStatus('Connection deleted successfully');
        showSuccess(`Connection "${name}" deleted successfully!`);
        
        // Clear selection if deleted connection was selected
        if (selectedConnection && selectedConnection.name === name && selectedConnection.group === group) {
          selectedConnection = null;
          updateActionButtons();
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
}

// Setup simplified tree event delegation
function setupTreeEventDelegation() {
  const treeContainer = document.getElementById('groups-tree');
  if (!treeContainer) {
    console.warn('Tree container not found');
    return;
  }
  
  // Remove any existing listeners to avoid duplicates
  if (treeContainer._treeEventHandler) {
    treeContainer.removeEventListener('click', treeContainer._treeEventHandler);
  }
  
  // Create unified event handler
  const handleTreeActions = (e) => {
    if (e.target.matches('.group-action-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      const action = e.target.dataset.action;
      const groupPath = e.target.dataset.group;
      
      switch (action) {
        case 'add-subgroup':
          showAddSubgroupForm(groupPath);
          break;
        case 'add-connection':
          openAddConnectionWindow(groupPath);
          break;
        case 'edit-group':
          showEditGroupForm(groupPath);
          break;
        case 'delete-group':
          deleteGroup(groupPath);
          break;
        default:
          console.warn('Unknown tree action:', action);
      }
    }
    
    // Handle connection action buttons
    if (e.target.matches('.connect-action')) {
      e.preventDefault();
      e.stopPropagation();
      const { name, group } = e.target.dataset;
      handleConnectAction(name, group);
    }
    
    if (e.target.matches('.edit-action')) {
      e.preventDefault();
      e.stopPropagation();
      const { name, group } = e.target.dataset;
      handleEditAction(name, group);
    }
    
    if (e.target.matches('.delete-action')) {
      e.preventDefault();
      e.stopPropagation();
      const { name, group } = e.target.dataset;
      handleDeleteAction(name, group);
    }
  };
  
  // Store reference and add listener
  treeContainer._treeEventHandler = handleTreeActions;
  treeContainer.addEventListener('click', handleTreeActions);
  
  console.log('Tree event delegation setup complete');
}

// Simplified menu system
function setupMenuSystem() {
  // Setup menu dropdowns
  const menuItems = document.querySelectorAll('.menu-item');
  
  menuItems.forEach(menuItem => {
    const menuLabel = menuItem.querySelector('.menu-label');
    const dropdown = menuItem.querySelector('.dropdown-menu');
    
    if (menuLabel && dropdown) {
      menuLabel.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close other dropdowns
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
          if (menu !== dropdown) {
            menu.classList.remove('show');
            menu.parentElement.classList.remove('active');
          }
        });
        
        // Toggle current dropdown
        const isShowing = dropdown.classList.toggle('show');
        menuItem.classList.toggle('active', isShowing);
      });
    }
  });

  // Setup menu options
  document.querySelectorAll('.menu-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = option.dataset.action;
      handleMenuAction(action);
      closeAllDropdowns();
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-item')) {
      closeAllDropdowns();
    }
  });

  // Setup keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'n':
          e.preventDefault();
          openAddConnectionWindow();
          break;
        case 'e':
          e.preventDefault();
          handleMenuAction('export-connections');
          break;
        case 'o':
          e.preventDefault();
          handleMenuAction('import-connections');
          break;
        case 'r':
          e.preventDefault();
          handleMenuAction('refresh');
          break;
        case 'q':
          e.preventDefault();
          handleMenuAction('exit');
          break;
      }
    }
  });
}


// Window functions (using existing modals for now, will be converted to popups later)
async function openAddConnectionWindow(preSelectedGroup = null) {
  showAddConnectionForm(preSelectedGroup);
}

async function openEditWindow(connection) {
  editConnection(connection.name, connection.group);
}

async function openDetailsWindow(connection) {
  // For now, show an alert with basic details (will be replaced with popup window)
  const details = [
    `Connection: ${connection.name}`,
    `Host: ${connection.user}@${connection.host}:${connection.port}`,
    `Group: ${connection.group}`,
    `Key: ${connection.keyFile || '~/.ssh/id_ed25519'}`,
    `Source: ${connection.configPath || 'SSH Manager'}`,
    `Managed: ${connection.managed ? 'Yes' : 'No (Read-Only)'}`
  ].join('\n\n');
  
  const action = confirm(`${details}\n\n--- Quick Actions ---\n\nClick OK to connect, Cancel to close`);
  if (action) {
    connectToServer(connection.name, connection.group);
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.classList.remove('show');
    menu.parentElement.classList.remove('active');
  });
}




function handleMenuAction(action) {
  switch(action) {
    case 'add-connection':
      openAddConnectionWindow();
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
      
    case 'refresh':
      refreshAll();
      break;
      
    case 'exit':
      window.electronAPI.app.quit();
      break;
      
    default:
      console.log('Unknown menu action:', action);
  }
}

function initializeDragAndDrop() {
  // Initialize drop zones on group headers in both trees
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
  
  // Ensure all connection items are properly draggable in both trees
  document.querySelectorAll('.connection-tree-item').forEach(item => {
    if (!item.draggable) {
      item.draggable = true;
    }
  });
}

// Enhanced function to initialize drag and drop with event delegation
function initializeDragAndDropDelegation() {
  const treeContainer = document.getElementById('groups-tree');
  if (!treeContainer) return;
  
  // Remove existing delegation listener if it exists
  if (treeContainer._dragEventHandler) {
    treeContainer.removeEventListener('dragover', treeContainer._dragEventHandler);
    treeContainer.removeEventListener('drop', treeContainer._dragEventHandler);
    treeContainer.removeEventListener('dragleave', treeContainer._dragEventHandler);
  }
  
  // Create unified drag event handler using event delegation
  const handleDragEvents = (e) => {
    const header = e.target.closest('.tree-node-header');
    if (!header) return;
    
    if (e.type === 'dragover') {
      handleDragOver.call(header, e);
    } else if (e.type === 'drop') {
      handleDrop.call(header, e);
    } else if (e.type === 'dragleave') {
      handleDragLeave.call(header, e);
    }
  };
  
  // Store reference and add delegation listeners
  treeContainer._dragEventHandler = handleDragEvents;
  treeContainer.addEventListener('dragover', handleDragEvents);
  treeContainer.addEventListener('drop', handleDragEvents);
  treeContainer.addEventListener('dragleave', handleDragEvents);
  
  // Also ensure existing and future connection items are draggable
  initializeDragAndDrop();
  
  // Set up delegation for dynamically created connection draggability
  const makeDynamicConnectionsDraggable = () => {
    document.querySelectorAll('.connection-tree-item:not([draggable])').forEach(item => {
      const isExisting = item.dataset.isExisting === 'true';
      if (!isExisting) {
        item.draggable = true;
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
      }
    });
  };
  
  // Use a MutationObserver to detect new connection items
  const observer = new MutationObserver(makeDynamicConnectionsDraggable);
  observer.observe(treeContainer, { 
    childList: true, 
    subtree: true,
    attributes: false 
  });
  
  // Initial setup for existing items
  makeDynamicConnectionsDraggable();
}

// Initialize sidebar resizer functionality
function initializeSidebarResizer() {
  const splitter = document.getElementById('sidebar-splitter');
  const sidebar = document.querySelector('.sidebar');
  
  if (!splitter || !sidebar) {
    return; // Elements not found, probably in compact mode
  }
  
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  // Mouse down on splitter
  splitter.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = parseInt(getComputedStyle(sidebar).getPropertyValue('width'));
    
    splitter.classList.add('dragging');
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });
  
  // Mouse move - resize sidebar
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;
    
    // Constrain to min/max widths
    const minWidth = 200;
    const maxWidth = Math.min(600, window.innerWidth * 0.6); // Max 60% of window width
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    sidebar.style.width = constrainedWidth + 'px';
    
    e.preventDefault();
  });
  
  // Mouse up - stop resizing
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      splitter.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Save the width to localStorage for persistence
      const currentWidth = parseInt(getComputedStyle(sidebar).getPropertyValue('width'));
      localStorage.setItem('sidebarWidth', currentWidth);
    }
  });
  
  // Restore saved width on app load
  const savedWidth = localStorage.getItem('sidebarWidth');
  if (savedWidth) {
    const width = parseInt(savedWidth);
    const minWidth = 200;
    const maxWidth = 600;
    if (width >= minWidth && width <= maxWidth) {
      sidebar.style.width = width + 'px';
    }
  }
}

// Reset sidebar width to default
function resetSidebarWidth() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.style.width = '250px'; // Default width
    localStorage.setItem('sidebarWidth', '250');
  }
}

// Tree state persistence functions
function saveTreeState() {
  const treeState = Array.from(expandedGroups);
  localStorage.setItem('treeExpandedGroups', JSON.stringify(treeState));
}

function loadTreeState() {
  const saved = localStorage.getItem('treeExpandedGroups');
  if (saved) {
    try {
      const treeState = JSON.parse(saved);
      expandedGroups.clear();
      treeState.forEach(groupPath => expandedGroups.add(groupPath));
      return true; // Successfully loaded saved state
    } catch (error) {
      console.warn('Failed to parse saved tree state:', error);
    }
  }
  return false; // No saved state or failed to load
}

// Initialize which groups should be expanded by default
function initializeExpandedGroups(preserveExistingState = false) {
  // If preserving state, keep the current expandedGroups as-is
  if (preserveExistingState) {
    return;
  }
  
  // Try to load saved tree state first
  if (loadTreeState()) {
    return; // Successfully loaded saved state
  }
  
  // No saved state, use defaults
  expandedGroups.clear();
  
  // Expand all groups by default for better UX
  // Users can collapse them if they want
  allGroups.forEach(groupPath => {
    expandedGroups.add(groupPath);
  });
  
  // Alternative approach: only expand groups that have connections or child groups
  // (Uncomment this section if you prefer a more conservative approach)
  /*
  allGroups.forEach(groupPath => {
    // Check if this group has connections
    const hasConnections = allConnections.some(conn => conn.group === groupPath);
    
    // Check if this group has child groups (is a parent)
    const hasChildGroups = allGroups.some(otherGroup => 
      otherGroup !== groupPath && otherGroup.startsWith(groupPath + '/')
    );
    
    if (hasConnections || hasChildGroups) {
      expandedGroups.add(groupPath);
    }
  });
  */
}

async function loadGroups() {
  try {
    // Load both flat groups (for backward compatibility) and tree structure
    const [groupsResult, treeResult] = await Promise.all([
      window.electronAPI.ssh.getGroups(),
      window.electronAPI.ssh.getGroupsTree?.() || Promise.resolve({ success: true, data: {} })
    ]);
    
    if (groupsResult.success) {
      allGroups = groupsResult.data;
      groupsTree = treeResult.success ? treeResult.data : {};
      
      // Initialize expanded groups - preserve existing state when reloading
      initializeExpandedGroups(true);
      
      renderGroupTree();
    } else {
      showError('Failed to load groups: ' + groupsResult.error);
    }
  } catch (error) {
    showError('Failed to load groups: ' + error.message);
  }
}

async function loadGroupsInitial() {
  try {
    // Load both flat groups (for backward compatibility) and tree structure
    const [groupsResult, treeResult] = await Promise.all([
      window.electronAPI.ssh.getGroups(),
      window.electronAPI.ssh.getGroupsTree?.() || Promise.resolve({ success: true, data: {} })
    ]);
    
    if (groupsResult.success) {
      allGroups = groupsResult.data;
      groupsTree = treeResult.success ? treeResult.data : {};
      
      // Initialize expanded groups - expand all on first load
      initializeExpandedGroups(false);
      
      renderGroupTree();
    } else {
      showError('Failed to load groups: ' + groupsResult.error);
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
      updateConnectionCount();
      
      // Render connections
      setTimeout(() => {
        renderTreeConnections();
      }, 100);
      
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
  
  
  // Check if we have nested group structure
  const hasNestedStructure = groupsTree && Object.keys(groupsTree).length > 0;
  
  if (hasNestedStructure) {
    // Use nested rendering for proper tree structure
    renderNestedGroupTree(container, groupsTree, 0);
  } else {
    // Fallback to flat structure
    allGroups.forEach(groupName => {
      const groupNode = createGroupNode(groupName, 0);
      container.appendChild(groupNode);
    });
  }
  
  // Re-setup event delegation after DOM changes
  setupTreeEventDelegation();
  
  // Note: Connections will be rendered separately when loadConnections() is called
}

/**
 * Render nested group tree recursively
 */
function renderNestedGroupTree(container, treeNodes, depth) {
  Object.values(treeNodes).forEach(node => {
    const groupNode = createNestedGroupNode(node, depth);
    container.appendChild(groupNode);
    
    // Always recursively render children if they exist (DOM structure needed for connections)
    if (Object.keys(node.children).length > 0) {
      const childrenContainer = groupNode.querySelector('.tree-children');
      renderNestedGroupTree(childrenContainer, node.children, depth + 1);
    }
  });
}

/**
 * Create a nested group node with tree-style UI
 */
function createNestedGroupNode(groupNode, depth) {
  const { name, fullPath, children } = groupNode;
  const hasChildren = Object.keys(children).length > 0;
  const isExpanded = expandedGroups.has(fullPath);
  const connectionCount = allConnections.filter(c => c.group === fullPath).length;
  const canDelete = connectionCount === 0 && !hasChildren && fullPath !== 'existing';
  const isExistingGroup = fullPath === 'existing';
  
  // Create the tree node element
  const treeNode = document.createElement('div');
  treeNode.className = `tree-node group-node nested-group depth-${depth} ${isExpanded ? 'expanded' : 'collapsed'}`;
  treeNode.dataset.group = fullPath;
  treeNode.dataset.depth = depth;
  
  // Calculate indentation - same for both modes
  const baseIndent = 20; // Same spacing for both modes
  const indentPx = Math.max(8, depth * baseIndent + 8); // Minimum 8px padding
  const groupIcon = getGroupIcon(name);
  
  // Progressive enhancement: Start with default icon, then update with custom
  getCustomGroupIcon(fullPath).then(customIcon => {
    const iconSpan = treeNode.querySelector('.group-icon');
    if (iconSpan && customIcon !== groupIcon) {
      iconSpan.textContent = customIcon;
    }
  });
  
  treeNode.innerHTML = `
    <div class="tree-node-header drop-zone ${isExistingGroup ? 'readonly-group' : ''}" style="padding-left: ${indentPx}px;">
      <span class="tree-toggle" data-group-path="${fullPath}">
        ${hasChildren ? (isExpanded ? '▼' : '▶') : '▶'}
      </span>
      <span class="group-icon">${groupIcon}</span>
      <span class="group-name" title="${fullPath}">${name}${isExistingGroup ? ' (Read-Only)' : ''}</span>
      <div class="group-actions">
        ${!isExistingGroup ? `<button class="group-action-btn" title="Add Subgroup" data-group="${fullPath}" data-action="add-subgroup">📁+</button>` : ''}
        ${!isExistingGroup ? `<button class="group-action-btn" title="Add Connection" data-group="${fullPath}" data-action="add-connection">🖥️+</button>` : ''}
        ${!isExistingGroup ? `<button class="group-action-btn" title="Rename Group" data-group="${fullPath}" data-action="edit-group">✏️</button>` : ''}
        ${!isExistingGroup ? `<button class="group-action-btn" title="Delete Group" data-group="${fullPath}" data-action="delete-group" ${!canDelete ? 'disabled' : ''}>🗑️</button>` : ''}
      </div>
    </div>
    <div class="tree-children" data-group="${fullPath}" style="display: ${isExpanded ? 'block' : 'none'};"></div>
  `;
  
  // Add click handler for toggle - ALL groups should be expandable, not just ones with children
  const toggle = treeNode.querySelector('.tree-toggle');
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNestedGroup(fullPath, treeNode);
  });
  
  return treeNode;
}

/**
 * Toggle expanded/collapsed state for nested groups
 */
function toggleNestedGroup(groupPath, groupNode) {
  const isExpanded = expandedGroups.has(groupPath);
  const childrenContainer = groupNode.querySelector('.tree-children');
  const toggle = groupNode.querySelector('.tree-toggle');
  
  if (isExpanded) {
    // Collapse
    expandedGroups.delete(groupPath);
    childrenContainer.style.display = 'none';
    childrenContainer.innerHTML = ''; // Clear children to save memory
    toggle.textContent = '▶';
    groupNode.classList.remove('expanded');
    groupNode.classList.add('collapsed');
    saveTreeState(); // Save state after collapse
  } else {
    // Expand
    expandedGroups.add(groupPath);
    childrenContainer.style.display = 'block';
    saveTreeState(); // Save state after expand
    
    // Find and render children
    const pathSegments = groupPath.split('/');
    let currentLevel = groupsTree;
    for (const segment of pathSegments) {
      if (currentLevel[segment]) {
        currentLevel = currentLevel[segment].children;
      }
    }
    
    renderNestedGroupTree(childrenContainer, currentLevel, groupNode.dataset.depth ? parseInt(groupNode.dataset.depth) + 1 : 1);
    
    toggle.textContent = '▼';
    groupNode.classList.remove('collapsed');
    groupNode.classList.add('expanded');
    
    // Note: Drag and drop is handled by event delegation, no need to re-initialize
  }
  
  // Re-render connections for this group
  renderConnectionsForGroup(groupPath);
}

function renderTreeConnections() {
  if (allConnections.length === 0) {
    return;
  }
  
  let totalConnectionsAdded = 0;
  
  // Get all unique group paths from actual connections, not just allGroups
  const connectionGroups = [...new Set(allConnections.map(conn => conn.group))];
  
  // Note: Connection containers will be created during renderNestedGroupTree
  // even for collapsed groups - no need to force expansion
  
  connectionGroups.forEach(group => {
    // Look for containers in both full mode and compact mode trees
    const containers = document.querySelectorAll(`[data-group="${group}"].tree-children`);
    
    containers.forEach(container => {
      const connections = allConnections.filter(conn => conn.group === group);
      
      // Clear existing connections but preserve any nested group nodes
      const existingConnections = container.querySelectorAll('.connection-tree-item');
      existingConnections.forEach(item => item.remove());
      
      if (connections.length === 0) {
        container.classList.add('empty');
      } else {
        container.classList.remove('empty');
        
        connections.forEach((connection, index) => {
          const groupDepth = getGroupDepth(group);
          const item = createConnectionTreeItem(connection, groupDepth);
          container.appendChild(item);
          totalConnectionsAdded++;
        });
      }
    });
  });
  
  // Note: Drag and drop is handled by event delegation
  
  if (selectedConnection) {
    selectConnection(selectedConnection.name, selectedConnection.group);
  }
}

/**
 * Render connections for a specific group (used by nested tree)
 */
function renderConnectionsForGroup(groupPath) {
  // Look for containers in both full mode and compact mode trees
  const containers = document.querySelectorAll(`[data-group="${groupPath}"].tree-children`);
  if (containers.length === 0) return;
  
  const connections = allConnections.filter(conn => conn.group === groupPath);
  
  containers.forEach(container => {
    // Clear existing connections (but keep nested groups)
    const connectionElements = container.querySelectorAll('.connection-tree-item');
    connectionElements.forEach(el => el.remove());
    
    connections.forEach(connection => {
      const groupDepth = getGroupDepth(groupPath);
      const connectionNode = createConnectionTreeItem(connection, groupDepth);
      container.appendChild(connectionNode);
    });
  });
  
  // Note: Drag and drop is handled by event delegation
}

/**
 * Render connections in compact mode for all groups
 */

function createGroupNode(groupName, depth = 0) {
  const groupNode = document.createElement('div');
  groupNode.className = 'tree-node group-node expanded';
  groupNode.dataset.group = groupName;
  
  const groupIcon = getGroupIcon(groupName);
  const connectionCount = allConnections.filter(c => c.group === groupName).length;
  const canDelete = connectionCount === 0 && groupName !== 'existing';
  const isExistingGroup = groupName === 'existing';
  
  // Progressive enhancement: Start with default icon, then update with custom
  getCustomGroupIcon(groupName).then(customIcon => {
    const iconSpan = groupNode.querySelector('.group-icon');
    if (iconSpan && customIcon !== groupIcon) {
      iconSpan.textContent = customIcon;
    }
  });
  
  groupNode.innerHTML = `
    <div class="tree-node-header drop-zone ${isExistingGroup ? 'readonly-group' : ''}">
      <span class="tree-toggle">▼</span>
      <span class="group-icon">${groupIcon}</span>
      <span class="group-name">${groupName}${isExistingGroup ? ' (Read-Only)' : ''}</span>
      <div class="group-actions">
        ${!isExistingGroup ? `<button class="group-action-btn" title="Add Subgroup" data-group="${groupName}" data-action="add-subgroup">📁+</button>` : ''}
        ${!isExistingGroup ? `<button class="group-action-btn" title="Add Connection" data-group="${groupName}" data-action="add-connection">🖥️+</button>` : ''}
        ${!isExistingGroup ? `<button class="group-action-btn" title="Rename Group" data-group="${groupName}" data-action="edit-group">✏️</button>` : ''}
        ${!isExistingGroup ? `<button class="group-action-btn" title="Delete Group" data-group="${groupName}" data-action="delete-group" ${!canDelete ? 'disabled' : ''}>🗑️</button>` : ''}
      </div>
    </div>
    <div class="tree-children" data-group="${groupName}" style="display: block;"></div>
  `;
  
  const toggle = groupNode.querySelector('.tree-toggle');
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleGroup(groupNode);
  });
  
  return groupNode;
}

function getGroupIcon(groupName, customIcon = null) {
  // If a custom icon is provided, use it
  if (customIcon) {
    return customIcon;
  }
  
  // Fall back to predefined icons based on name
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

// Cache for group icons to avoid repeated API calls
const groupIconCache = new Map();

function clearGroupIconCache() {
  groupIconCache.clear();
}

async function getCustomGroupIcon(groupName) {
  // Check cache first
  if (groupIconCache.has(groupName)) {
    return groupIconCache.get(groupName);
  }
  
  try {
    const result = await window.electronAPI.ssh.getGroupIcon(groupName);
    if (result.success) {
      const icon = result.data;
      groupIconCache.set(groupName, icon);
      return icon;
    }
  } catch (error) {
    console.error('Failed to get custom group icon:', error);
  }
  
  // Fall back to name-based icon
  const fallbackIcon = getGroupIcon(groupName);
  groupIconCache.set(groupName, fallbackIcon);
  return fallbackIcon;
}

function getGroupDepth(groupPath) {
  // Calculate depth based on forward slashes in the path
  // Top-level groups (like "work") have depth 0
  // Second-level groups (like "work/company-a") have depth 1
  // Third-level groups (like "work/company-a/dev") have depth 2
  return groupPath.split('/').length - 1;
}

function createConnectionTreeItem(connection, groupDepth = null) {
  const item = document.createElement('div');
  const isExisting = !connection.managed;
  item.className = `connection-tree-item ${isExisting ? 'readonly-connection' : ''}`;
  item.draggable = true; // Allow both existing and managed connections to be dragged
  item.dataset.name = connection.name;
  item.dataset.group = connection.group;
  item.dataset.isExisting = isExisting;
  
  // Calculate connection indentation based on group depth
  let connectionIndent = '';
  if (groupDepth !== null) {
    // Connections should be indented more than their parent group header
    // Group header: depth * 20 + 8, Connection: depth * 20 + 8 + 24 (extra indent for hierarchy)
    const baseIndent = 20;
    const connectionExtraIndent = 24; // Additional indent to show connections are children of groups
    const indentPx = Math.max(32, groupDepth * baseIndent + 8 + connectionExtraIndent);
    connectionIndent = `margin-left: ${indentPx}px;`;
  }
  
  const icon = isExisting ? '🔒' : (connection.icon || '🖥️');
  const nameDisplay = isExisting ? `${connection.name} (Read-Only)` : connection.name;
  
  item.style.cssText = connectionIndent;
  item.innerHTML = `
    <span class="connection-icon">${icon}</span>
    <span class="connection-name">${nameDisplay}</span>
    <span class="connection-details-mini">${connection.user}@${connection.host}</span>
    ${!isExisting ? `
    <span class="connection-actions">
      <button class="action-btn-mini connect-action" data-name="${connection.name}" data-group="${connection.group}" title="Connect">🚀</button>
      <button class="action-btn-mini edit-action" data-name="${connection.name}" data-group="${connection.group}" title="Edit">✏️</button>
      <button class="action-btn-mini delete-action" data-name="${connection.name}" data-group="${connection.group}" title="Delete">🗑️</button>
    </span>
    ` : ''}
  `;
  
  // Add event listeners
  item.addEventListener('click', (e) => {
    // Don't select connection if clicking on action buttons
    if (e.target.closest('.action-btn-mini')) {
      return;
    }
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
    
    // Update action buttons
    updateActionButtons();
  }
}

function updateActionButtons() {
  const connectBtn = document.getElementById('connect-btn');
  const detailsBtn = document.getElementById('details-btn');
  const editBtn = document.getElementById('edit-btn');
  const connectionText = document.querySelector('.connection-text');
  
  if (selectedConnection) {
    connectBtn.disabled = false;
    detailsBtn.disabled = false;
    editBtn.disabled = false;
    
    const displayText = `${selectedConnection.user}@${selectedConnection.host}:${selectedConnection.port}`;
    connectionText.textContent = displayText;
    connectionText.classList.add('has-selection');
  } else {
    connectBtn.disabled = true;
    detailsBtn.disabled = true;
    editBtn.disabled = true;
    
    connectionText.textContent = 'Select a connection';
    connectionText.classList.remove('has-selection');
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
  const groupPath = groupNode.dataset.group;
  const isExpanded = expandedGroups.has(groupPath);
  const childrenContainer = groupNode.querySelector('.tree-children');
  const toggle = groupNode.querySelector('.tree-toggle');
  
  if (isExpanded) {
    // Collapse
    expandedGroups.delete(groupPath);
    groupNode.classList.remove('expanded');
    groupNode.classList.add('collapsed');
    childrenContainer.style.display = 'none';
    toggle.textContent = '▶';
    saveTreeState(); // Save state after collapse
  } else {
    // Expand
    expandedGroups.add(groupPath);
    groupNode.classList.remove('collapsed');
    groupNode.classList.add('expanded');
    childrenContainer.style.display = 'block';
    toggle.textContent = '▼';
    saveTreeState(); // Save state after expand
  }
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
  
  // When using delegation, 'this' refers to the header element
  const header = this || e.target.closest('.tree-node-header');
  if (!header) return;
  
  const treeNode = header.closest('.tree-node');
  const targetGroup = treeNode ? treeNode.dataset.group : null;
  
  // Don't allow dropping to existing group or same group
  if (draggedConnection && targetGroup && targetGroup !== draggedConnection.group && targetGroup !== 'existing') {
    header.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  // When using delegation, 'this' refers to the header element
  const header = this || e.target.closest('.tree-node-header');
  if (header) {
    header.classList.remove('drag-over');
  }
}

async function handleDrop(e) {
  e.preventDefault();
  
  // When using delegation, 'this' refers to the header element
  const header = this || e.target.closest('.tree-node-header');
  if (!header) return;
  
  header.classList.remove('drag-over');
  
  if (!draggedConnection) return;
  
  const treeNode = header.closest('.tree-node');
  const targetGroup = treeNode ? treeNode.dataset.group : null;
  
  // Don't allow dropping to existing group or same group
  if (targetGroup && targetGroup !== draggedConnection.group && targetGroup !== 'existing') {
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
      // Reload both groups and connections to ensure nested groups are properly loaded
      await loadGroups();
      await loadConnections();
      
      // Expand the target group to show the migrated connection
      expandGroupPath(toGroup);
      
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
      // Reload both groups and connections to ensure nested groups are properly loaded
      await loadGroups();
      await loadConnections();
      
      // Expand the target group to show the moved connection
      expandGroupPath(toGroup);
      
      // Select the moved connection
      setTimeout(() => {
        selectConnection(name, toGroup);
      }, 500);
      
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

async function showAddConnectionForm(preSelectedGroup = null) {
  // Open add connection window instead of modal
  const result = await window.electronAPI.window.openAddModal();
  if (!result.success) {
    showError('Failed to open add connection window: ' + result.error);
  }
  return;
  
  // Old modal code - keep as fallback
  updateGroupDropdown();
  
  // Pre-select group if specified
  if (preSelectedGroup) {
    const groupSelect = document.getElementById('group');
    if (groupSelect) {
      groupSelect.value = preSelectedGroup;
    }
  }
  
  document.getElementById('add-connection-modal').classList.add('active');
  document.getElementById('connection-name').focus();
}

function showAddSubgroupForm(parentGroupPath = '') {
  // Use the existing add group modal instead of prompt
  const modal = document.getElementById('add-group-modal');
  const input = document.getElementById('group-name');
  const title = modal.querySelector('.modal-header h3');
  
  if (parentGroupPath) {
    title.textContent = `Add Subgroup to "${parentGroupPath}"`;
    input.value = `${parentGroupPath}/`;
    input.placeholder = `${parentGroupPath}/new-subgroup`;
    // Position cursor after the parent path
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, 100);
  } else {
    title.textContent = 'Add New Group';
    input.value = '';
    input.placeholder = 'e.g., work, clients/internal, servers/production';
    setTimeout(() => input.focus(), 100);
  }
  
  modal.classList.add('active');
}


function expandGroupPath(groupPath) {
  const pathParts = groupPath.split('/');
  
  // Expand all parent paths
  for (let i = 1; i <= pathParts.length; i++) {
    const partialPath = pathParts.slice(0, i).join('/');
    expandedGroups.add(partialPath);
  }
  
  // Save tree state after expanding
  saveTreeState();
  
  // Re-render to show expanded state
  renderGroupTree();
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
      await loadGroups();
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

    // Open edit window with connection data
    const result = await window.electronAPI.window.openEditModal(connection);
    if (!result.success) {
      showError('Failed to open edit window: ' + result.error);
    }
    return;

    // Old modal code - keep as fallback
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
    await loadGroups();
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

async function showEditGroupForm(groupName) {
  document.getElementById('edit-group-old-name').value = groupName;
  document.getElementById('edit-group-name').value = groupName;
  
  // Load and set current group icon
  try {
    const result = await window.electronAPI.ssh.getGroupIcon(groupName);
    if (result.success) {
      const currentIcon = result.data;
      const iconRadio = document.querySelector(`input[name="icon"][value="${currentIcon}"]`);
      if (iconRadio) {
        iconRadio.checked = true;
      }
    }
  } catch (error) {
    console.error('Failed to load group icon:', error);
  }
  
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
  const groupIcon = formData.get('icon') || '📁';
  
  try {
    setStatus('Creating group...');
    const result = await window.electronAPI.ssh.createGroup(groupName, groupIcon);
    
    if (result.success) {
      hideAddGroupForm();
      clearGroupIconCache();
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
  const newIcon = formData.get('icon') || '📁';
  
  try {
    setStatus('Updating group...');
    
    // Check if only icon is changing
    if (oldName === newName) {
      // Only update icon
      const result = await window.electronAPI.ssh.updateGroupIcon(oldName, newIcon);
      
      if (result.success) {
        hideEditGroupForm();
        clearGroupIconCache();
        await refreshAll();
        setStatus('Group icon updated successfully');
        showSuccess(`Group "${oldName}" icon updated successfully!`);
      } else {
        setStatus('Error updating group icon');
        showError('Failed to update group icon: ' + result.error);
      }
    } else {
      // Name is changing, use rename
      const result = await window.electronAPI.ssh.renameGroup(oldName, newName, newIcon);
      
      if (result.success) {
        hideEditGroupForm();
        clearGroupIconCache();
        await refreshAll();
        setStatus('Group updated successfully');
        showSuccess(`Group "${oldName}" updated successfully!`);
      } else {
        setStatus('Error renaming group');
        showError('Failed to rename group: ' + result.error);
      }
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

// Global function exports for HTML onclick handlers (keeping some for modal functions)
window.showAddConnectionForm = showAddConnectionForm;
window.hideAddConnectionForm = hideAddConnectionForm;
window.showAddGroupForm = showAddGroupForm;
window.hideAddGroupForm = hideAddGroupForm;
window.showEditGroupForm = showEditGroupForm;
window.hideEditGroupForm = hideEditGroupForm;
// Group action buttons now use event delegation instead of inline onclick
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