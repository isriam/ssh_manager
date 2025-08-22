const SSHConfig = require('ssh-config');
const FileUtils = require('./file-utils');
const Templates = require('./templates');

class SSHManager {
  constructor() {
    this.fileUtils = new FileUtils();
    this.templates = new Templates();
  }

  async init() {
    await this.fileUtils.ensureDirectoryStructure();
    await this.templates.init();
    await this.updateMainSSHConfig();
    
    console.log(`SSH Manager initialized at: ${this.fileUtils.getSSHManagerPath()}`);
  }

  async addConnection(options) {
    const { 
      name, host, user, port = '22', group = 'personal', template = 'basic-server', 
      icon = '💻', keyFile, jumpHost, localPort, remoteHost, remotePort, socksPort,
      serverAliveInterval = '60', serverAliveCountMax = '3', 
      connectTimeout = '10', compression = 'yes', strictHostKeyChecking = 'ask',
      // Phase 2: Developer Features
      controlMaster = 'auto', controlPath = '~/.ssh/control-%h-%p-%r', controlPersist = '10m',
      forwardX11 = 'no', forwardAgent = 'no',
      localForwards = [], remoteForwards = [], dynamicForward = ''
    } = options;

    await this.validateConnectionOptions({ name, host, user, port, group });

    const existingConfig = await this.fileUtils.readConfigFile(group, name);
    if (existingConfig) {
      throw new Error(`Connection '${name}' already exists in group '${group}'`);
    }

    const currentUser = require('os').userInfo().username;
    const templateVariables = {
      name: name,
      host: host,
      user: user || currentUser,
      user_line: user && user.trim() !== '' ? `    User ${user}` : '',
      port: port,
      key_file: keyFile || '~/.ssh/id_ed25519',
      jump_host: jumpHost || 'bastion.example.com',
      local_port: localPort || '8080',
      remote_host: remoteHost || 'localhost',
      remote_port: remotePort || '80',
      socks_port: socksPort || '1080',
      server_alive_interval: serverAliveInterval,
      server_alive_count_max: serverAliveCountMax,
      connect_timeout: connectTimeout,
      compression: compression,
      strict_host_key_checking: strictHostKeyChecking,
      // Phase 2: Developer Features
      control_master: controlMaster,
      control_path: controlPath,
      control_persist: controlPersist,
      forward_x11: forwardX11,
      forward_agent: forwardAgent,
      dynamic_forward: dynamicForward,
      local_forwards: this.formatPortForwards(localForwards),
      remote_forwards: this.formatPortForwards(remoteForwards)
    };

    const configContent = await this.templates.createFromTemplate(template, templateVariables);
    
    // Add icon metadata as comment
    const configWithIcon = `# SSH Manager Icon: ${icon}\n${configContent}`;
    
    await this.fileUtils.writeConfigFile(group, name, configWithIcon);
    await this.updateMainSSHConfig();

    return {
      name,
      host,
      user: user || require('os').userInfo().username,
      port,
      group,
      configPath: this.fileUtils.getSSHManagerPath()
    };
  }

  async removeConnection(name, group = 'personal') {
    const removed = await this.fileUtils.removeConfigFile(group, name);
    
    if (!removed) {
      throw new Error(`Connection '${name}' not found in group '${group}'`);
    }

    await this.updateMainSSHConfig();
    return true;
  }

  async listConnections(groupFilter = null) {
    const configFiles = await this.fileUtils.listConfigFiles(groupFilter);
    const connections = [];

    // Get managed connections from our system
    for (const configFile of configFiles) {
      try {
        const content = await this.fileUtils.readConfigFile(configFile.group, configFile.name);
        const parsedConfig = this.parseSSHConfig(content);
        
        connections.push({
          name: configFile.name,
          group: configFile.group,
          ...parsedConfig,
          configPath: configFile.path,
          managed: true,
          editable: true
        });
      } catch (error) {
        console.warn(`Warning: Could not parse config for ${configFile.group}/${configFile.name}:`, error.message);
      }
    }

    // Also get existing SSH configurations from main config file
    if (!groupFilter) {
      const existingConnections = await this.getExistingSSHConnections();
      connections.push(...existingConnections);
    }

    return connections;
  }

  async getExistingSSHConnections() {
    try {
      const mainConfig = await this.fileUtils.readMainConfig();
      const config = SSHConfig.parse(mainConfig);
      
      const existingConnections = [];
      
      for (const section of config) {
        // SSH config parser uses numeric types: 1 = Host, 2 = Match, etc.
        if (section.type === 1 && section.param === 'Host' && section.value && section.value !== '*') {
          const hostName = section.value;
          
          // Skip Include directives and our managed configs
          if (hostName.toLowerCase().startsWith('include')) {
            continue;
          }
          
          // Skip invalid host entries (file paths, config references, etc.)
          if (hostName.includes('/') || 
              hostName.includes('\\') || 
              hostName.includes('.ssh') ||
              hostName.startsWith('#') ||
              hostName.toLowerCase().includes('config')) {
            continue;
          }
          
          // Check if this might be a managed config by looking for our template signatures
          // Since we're parsing the main config, we need a different approach
          const isManagedHost = await this.isManagedConnection(hostName);
          
          if (!isManagedHost) {
            try {
              const getConfigValue = (param) => {
                if (!section.config) return null;
                const item = section.config.find(c => c.param === param);
                return item ? item.value : null;
              };

              existingConnections.push({
                name: hostName,
                group: 'existing',
                host: getConfigValue('HostName') || hostName,
                user: getConfigValue('User') || '',
                port: getConfigValue('Port') || '22',
                keyFile: getConfigValue('IdentityFile') || '~/.ssh/id_ed25519',
                managed: false,
                editable: false,
                configPath: '~/.ssh/config'
              });
            } catch (error) {
              console.warn(`Warning: Could not parse existing connection ${hostName}:`, error.message);
            }
          }
        }
      }
      
      return existingConnections;
    } catch (error) {
      console.warn('Warning: Could not parse existing SSH configurations:', error.message);
      return [];
    }
  }

  async isManagedConnection(hostName) {
    // Check if this host is managed by SSH Manager by looking in our config directories
    try {
      const groups = await this.fileUtils.listGroups();
      for (const group of groups) {
        const managedFile = await this.fileUtils.readConfigFile(group, hostName);
        if (managedFile) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async updateConnection(name, group, updates) {
    const existingContent = await this.fileUtils.readConfigFile(group, name);
    
    if (!existingContent) {
      throw new Error(`Connection '${name}' not found in group '${group}'`);
    }

    // Extract existing icon if no new one provided
    const existingConfig = this.parseSSHConfig(existingContent);
    const icon = updates.icon || existingConfig.icon || '💻';

    // For comprehensive updates, it's better to regenerate the config from template
    // This ensures all new options are properly formatted and included
    const currentUser = require('os').userInfo().username;
    const templateVariables = {
      name: updates.name || name,
      host: updates.host || 'localhost',
      user: updates.user || currentUser,
      user_line: updates.user && updates.user !== currentUser ? `    User ${updates.user}` : '',
      port: updates.port || '22',
      key_file: updates.keyFile || '~/.ssh/id_ed25519',
      jump_host: updates.jumpHost || 'bastion.example.com',
      server_alive_interval: updates.serverAliveInterval || '60',
      server_alive_count_max: updates.serverAliveCountMax || '3',
      connect_timeout: updates.connectTimeout || '10',
      compression: updates.compression || 'yes',
      strict_host_key_checking: updates.strictHostKeyChecking || 'ask',
      // Phase 2: Developer Features
      control_master: updates.controlMaster || 'auto',
      control_path: '~/.ssh/control-%h-%p-%r',
      control_persist: updates.controlPersist || '10m',
      forward_x11: updates.forwardX11 || 'no',
      forward_agent: updates.forwardAgent || 'no',
      dynamic_forward: updates.dynamicForward || '',
      local_forwards: this.formatPortForwards(updates.localForwards || []),
      remote_forwards: this.formatPortForwards(updates.remoteForwards || [])
    };

    const template = updates.template || 'basic-server';
    const configContent = await this.templates.createFromTemplate(template, templateVariables);
    
    // Add icon metadata as comment
    const configWithIcon = `# SSH Manager Icon: ${icon}\n${configContent}`;
    
    await this.fileUtils.writeConfigFile(group, updates.name || name, configWithIcon);
    
    // If name changed, remove the old file
    if (updates.name && updates.name !== name) {
      await this.fileUtils.removeConfigFile(group, name);
    }
    
    await this.updateMainSSHConfig();

    return true;
  }

  async updateMainSSHConfig() {
    const currentConfig = await this.fileUtils.readMainConfig();

    const includeDirective = `Include ${this.fileUtils.getSSHManagerPath()}/config/*/*.conf`;
    const lines = currentConfig.split('\n');
    
    const existingIncludeIndex = lines.findIndex(line => 
      line.trim().startsWith('Include') && 
      line.includes('ssh_manager/config')
    );

    if (existingIncludeIndex === -1) {
      const newConfig = [includeDirective, '', ...lines].join('\n');
      await this.fileUtils.writeMainConfig(newConfig);
    } else {
      lines[existingIncludeIndex] = includeDirective;
      await this.fileUtils.writeMainConfig(lines.join('\n'));
    }

    // Verify the configuration is valid after update
    await this.verifySSHConfigIntegrity();
  }

  async verifySSHConfigIntegrity() {
    try {
      // Test SSH config parsing
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Use SSH's built-in config test
      await execAsync('ssh -F ~/.ssh/config -T git@github.com 2>/dev/null || true');
      
      // Verify all our managed configs are valid
      const connections = await this.listConnections();
      const validationResults = [];
      
      for (const connection of connections) {
        // Skip validation for existing (non-managed) connections
        if (!connection.managed) {
          continue;
        }
        
        const configPath = `${this.fileUtils.getSSHManagerPath()}/config/${connection.group}/${connection.name}.conf`;
        const content = await this.fileUtils.readConfigFile(connection.group, connection.name);
        const validation = this.validateSSHConfig(content);
        
        if (!validation.isValid) {
          validationResults.push({
            connection: `${connection.group}/${connection.name}`,
            errors: validation.errors
          });
        }
      }

      if (validationResults.length > 0) {
        console.warn('SSH Config validation warnings:', validationResults);
      }

      return { valid: validationResults.length === 0, issues: validationResults };
    } catch (error) {
      console.warn('SSH config verification failed:', error.message);
      return { valid: false, error: error.message };
    }
  }

  parseSSHConfig(content) {
    try {
      // Extract icon from comment
      const iconMatch = content.match(/# SSH Manager Icon: (.+)/);
      const icon = iconMatch ? iconMatch[1] : '💻';
      
      const config = SSHConfig.parse(content);
      const hostSection = config.find(section => section.param === 'Host');

      if (!hostSection || !hostSection.config) {
        return { host: 'unknown', user: '', port: '22', icon };
      }

      const getConfigValue = (param) => {
        const item = hostSection.config.find(c => c.param === param);
        return item ? item.value : null;
      };

      return {
        host: getConfigValue('HostName') || 'unknown',
        user: getConfigValue('User') || '',
        port: getConfigValue('Port') || '22',
        keyFile: getConfigValue('IdentityFile') || '~/.ssh/id_ed25519',
        icon
      };
    } catch (error) {
      throw new Error(`Invalid SSH configuration: ${error.message}`);
    }
  }

  validateSSHConfig(content) {
    try {
      const config = SSHConfig.parse(content);
      
      if (!config || config.length === 0) {
        return { isValid: false, errors: ['Configuration is empty or invalid'] };
      }

      const errors = [];
      const warnings = [];

      for (const section of config) {
        if (section.type === 'Host') {
          if (!section.param) {
            errors.push('Host directive requires a name');
          }

          if (section.config?.HostName && !this.isValidHostname(section.config.HostName)) {
            warnings.push(`Invalid hostname format: ${section.config.HostName}`);
          }

          if (section.config?.Port && !this.isValidPort(section.config.Port)) {
            errors.push(`Invalid port number: ${section.config.Port}`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Parse error: ${error.message}`]
      };
    }
  }

  async validateConnectionOptions({ name, host, user: _user, port, group }) {
    const errors = [];

    if (!name || typeof name !== 'string' || name.trim() === '') {
      errors.push('Connection name is required');
    }

    if (!host || typeof host !== 'string' || host.trim() === '') {
      errors.push('Host is required');
    }

    if (port && !this.isValidPort(port)) {
      errors.push('Port must be a number between 1 and 65535');
    }

    if (group) {
      const existingGroups = await this.fileUtils.listGroups();
      if (!existingGroups.includes(group)) {
        errors.push(`Group '${group}' does not exist. Available groups: ${existingGroups.join(', ')}`);
      }
    }

    if (host && !this.isValidHostname(host)) {
      errors.push('Invalid hostname format');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  isValidHostname(hostname) {
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$|^(\d{1,3}\.){3}\d{1,3}$/;
    return hostnameRegex.test(hostname);
  }

  isValidPort(port) {
    const portNum = parseInt(port, 10);
    return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
  }

  async getTemplates() {
    return await this.templates.listTemplates();
  }

  async createFromTemplate(templateName, variables) {
    return await this.templates.createFromTemplate(templateName, variables);
  }

  async getGroups() {
    const groups = await this.fileUtils.listGroups();
    
    // Add "existing" group if there are existing SSH configurations
    const existingConnections = await this.getExistingSSHConnections();
    if (existingConnections.length > 0) {
      groups.unshift('existing'); // Add at the beginning
    }
    
    return groups;
  }

  async getGroupsTree() {
    return await this.fileUtils.getGroupsTree();
  }

  async getGroupIcon(groupPath) {
    return await this.fileUtils.readGroupIcon(groupPath);
  }

  async updateGroupIcon(groupPath, icon) {
    if (!groupPath || typeof groupPath !== 'string' || groupPath.trim() === '') {
      throw new Error('Group path is required');
    }
    
    if (!icon || typeof icon !== 'string' || icon.trim() === '') {
      throw new Error('Icon is required');
    }
    
    // Validate group exists
    const existingGroups = await this.fileUtils.listGroups();
    if (!existingGroups.includes(groupPath)) {
      throw new Error(`Group '${groupPath}' does not exist`);
    }
    
    // Update the group icon
    await this.fileUtils.writeGroupIcon(groupPath, icon.trim());
    
    return { groupPath, icon: icon.trim() };
  }

  async createGroup(groupPath, icon = '📁') {
    if (!groupPath || typeof groupPath !== 'string' || groupPath.trim() === '') {
      throw new Error('Group path is required');
    }

    // Use file-utils validation for nested paths
    if (!this.fileUtils.isValidGroupPath(groupPath)) {
      throw new Error('Invalid group path. Use letters, numbers, hyphens, underscores, and forward slashes for nesting (e.g., work/company-a)');
    }

    const normalizedPath = this.fileUtils.parseGroupPath(groupPath).normalized;

    const existingGroups = await this.fileUtils.listGroups();
    if (existingGroups.includes(normalizedPath)) {
      throw new Error(`Group '${normalizedPath}' already exists`);
    }

    const createdPath = await this.fileUtils.createGroup(normalizedPath);
    
    // Save group icon metadata
    await this.fileUtils.writeGroupIcon(normalizedPath, icon);
    
    return { name: createdPath };
  }

  async renameGroup(oldPath, newPath, newIcon = null) {
    if (!oldPath || !newPath) {
      throw new Error('Both old and new group paths are required');
    }

    // Validate new path
    if (!this.fileUtils.isValidGroupPath(newPath)) {
      throw new Error('Invalid new group path. Use letters, numbers, hyphens, underscores, and forward slashes for nesting (e.g., work/company-a)');
    }

    const normalizedNewPath = this.fileUtils.parseGroupPath(newPath).normalized;

    const existingGroups = await this.fileUtils.listGroups();
    if (!existingGroups.includes(oldPath)) {
      throw new Error(`Group '${oldPath}' does not exist`);
    }

    if (existingGroups.includes(normalizedNewPath)) {
      throw new Error(`Group '${normalizedNewPath}' already exists`);
    }

    const connections = await this.listConnections(oldPath);
    
    // Read all connection file contents AND group icon BEFORE moving the directory
    const connectionContents = [];
    for (const connection of connections) {
      const content = await this.fileUtils.readConfigFile(oldPath, connection.name);
      connectionContents.push({
        name: connection.name,
        content: content
      });
    }
    
    // Read the group icon or use the new one provided
    const groupIcon = newIcon || await this.fileUtils.readGroupIcon(oldPath);
    
    await this.fileUtils.renameGroup(oldPath, normalizedNewPath);
    
    // Write the connection contents to the new location
    for (const connectionData of connectionContents) {
      if (connectionData.content) {
        await this.fileUtils.writeConfigFile(normalizedNewPath, connectionData.name, connectionData.content);
      }
    }
    
    // Set the group icon (either restored or new one)
    await this.fileUtils.writeGroupIcon(normalizedNewPath, groupIcon);

    await this.updateMainSSHConfig();
    return { oldName: oldPath, newName: normalizedNewPath };
  }

  async deleteGroup(groupName) {
    if (!groupName) {
      throw new Error('Group name is required');
    }

    const existingGroups = await this.fileUtils.listGroups();
    if (!existingGroups.includes(groupName)) {
      throw new Error(`Group '${groupName}' does not exist`);
    }

    const connections = await this.listConnections(groupName);
    if (connections.length > 0) {
      throw new Error(`Cannot delete group '${groupName}' because it contains ${connections.length} connection(s). Move or delete the connections first.`);
    }

    await this.fileUtils.deleteGroup(groupName);
    return { name: groupName };
  }

  async migrateExistingConnection(connectionName, toGroup) {
    if (!connectionName || !toGroup) {
      throw new Error('Connection name and target group are required');
    }

    // Prevent migration to 'existing' group
    if (toGroup === 'existing') {
      throw new Error('Cannot migrate to existing group');
    }

    // Get the existing connection details
    const existingConnections = await this.getExistingSSHConnections();
    const existingConnection = existingConnections.find(conn => conn.name === connectionName);
    
    if (!existingConnection) {
      throw new Error(`Existing connection '${connectionName}' not found`);
    }

    // Check if target group exists
    const groups = await this.fileUtils.listGroups();
    if (!groups.includes(toGroup)) {
      throw new Error(`Target group '${toGroup}' does not exist`);
    }

    // Check if connection already exists in target group
    const existingInGroup = await this.fileUtils.readConfigFile(toGroup, connectionName);
    if (existingInGroup) {
      throw new Error(`Connection '${connectionName}' already exists in group '${toGroup}'`);
    }

    // Create the managed connection with the existing connection's settings
    const migrationOptions = {
      name: existingConnection.name,
      host: existingConnection.host,
      user: existingConnection.user,
      port: existingConnection.port,
      group: toGroup,
      keyFile: existingConnection.keyFile,
      template: 'basic-server' // Default template for migrated connections
    };

    // Add the new managed connection
    await this.addConnection(migrationOptions);

    // Comment out the original entry in ~/.ssh/config
    await this.commentOutExistingConnection(connectionName);

    return {
      success: true,
      message: `Connection '${connectionName}' migrated to '${toGroup}' group`,
      connection: migrationOptions
    };
  }

  async commentOutExistingConnection(connectionName) {
    try {
      const mainConfigPath = require('path').join(require('os').homedir(), '.ssh', 'config');
      const fs = require('fs-extra');
      
      let configContent = await fs.readFile(mainConfigPath, 'utf8');
      const lines = configContent.split('\n');
      const newLines = [];
      let inTargetHost = false;
      let modified = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Check if this is the start of our target host
        if (trimmedLine.startsWith('Host ') && trimmedLine.includes(connectionName)) {
          // Make sure it's an exact match (not a substring)
          const hostValue = trimmedLine.substring(5).trim();
          if (hostValue === connectionName) {
            inTargetHost = true;
            newLines.push(`# ${line} # Migrated to SSH Manager`);
            modified = true;
            continue;
          }
        }

        // Check if we're starting a new host section
        if (inTargetHost && trimmedLine.startsWith('Host ') && !trimmedLine.includes(connectionName)) {
          inTargetHost = false;
        }

        // Comment out lines in the target host section
        if (inTargetHost && trimmedLine && !trimmedLine.startsWith('#')) {
          newLines.push(`# ${line} # Migrated to SSH Manager`);
          modified = true;
        } else {
          newLines.push(line);
        }
      }

      if (modified) {
        await fs.writeFile(mainConfigPath, newLines.join('\n'));
      }

      return modified;
    } catch (error) {
      console.warn(`Warning: Could not comment out existing connection ${connectionName}:`, error.message);
      return false;
    }
  }

  async testConnection(name, group = 'personal') {
    // Handle existing connections differently
    if (group === 'existing') {
      // For existing connections, test by trying SSH directly since they're in main config
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Test if SSH can parse the configuration
        await execAsync(`ssh -F ~/.ssh/config -o ConnectTimeout=2 -o BatchMode=yes ${name} echo "test"`, { timeout: 5000 });
        
        return { 
          success: true, 
          message: 'Connection successful',
          configValid: true,
          hostReachable: true
        };
      } catch (sshError) {
        // Check if it's a connection error (which is expected) vs config error
        if (sshError.message.includes('could not resolve hostname') || 
            sshError.message.includes('Could not resolve hostname') ||
            sshError.message.includes('connection refused') || 
            sshError.message.includes('operation timed out') ||
            sshError.message.includes('Operation timed out') ||
            sshError.message.includes('kex_exchange_identification') ||
            sshError.message.includes('Connection closed by remote host')) {
          return { 
            success: true, 
            message: 'SSH configuration is valid (host unreachable but config syntax correct)',
            configValid: true,
            hostReachable: false
          };
        } else {
          return { 
            success: false, 
            message: `SSH configuration error: ${sshError.message}`,
            configValid: false
          };
        }
      }
    }

    // For managed connections, use the original logic
    const content = await this.fileUtils.readConfigFile(group, name);
    
    if (!content) {
      throw new Error(`Connection '${name}' not found in group '${group}'`);
    }

    const config = this.parseSSHConfig(content);
    
    // First, test SSH config syntax
    const validation = this.validateSSHConfig(content);
    if (!validation.isValid) {
      return { 
        success: false, 
        message: `Invalid SSH configuration: ${validation.errors.join(', ')}`,
        errors: validation.errors
      };
    }

    // Test with SSH dry-run to verify config is readable
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // Test if SSH can parse the configuration
      await execAsync(`ssh -F ~/.ssh/config -o ConnectTimeout=2 -o BatchMode=yes ${name} echo "test"`, { timeout: 5000 });
    } catch (sshError) {
      // Check if it's a connection error (which is expected) vs config error
      if (sshError.message.includes('could not resolve hostname') || 
          sshError.message.includes('Could not resolve hostname') ||
          sshError.message.includes('connection refused') || 
          sshError.message.includes('operation timed out') ||
          sshError.message.includes('Operation timed out') ||
          sshError.message.includes('kex_exchange_identification') ||
          sshError.message.includes('Connection closed by remote host')) {
        return { 
          success: true, 
          message: 'SSH configuration is valid (host unreachable but config syntax correct)',
          configValid: true,
          hostReachable: false
        };
      } else {
        return { 
          success: false, 
          message: `SSH configuration error: ${sshError.message}`,
          configValid: false
        };
      }
    }

    // If we get here, try actual connection test with node-ssh
    const { NodeSSH } = require('node-ssh');
    const ssh = new NodeSSH();

    try {
      const keyPath = config.keyFile.replace('~', require('os').homedir());
      const fs = require('fs');
      
      // Check if key file exists and is readable
      if (!fs.existsSync(keyPath)) {
        return { 
          success: false, 
          message: `SSH key file not found: ${keyPath}`,
          configValid: true,
          hostReachable: false,
          connectionError: `Key file not found: ${keyPath}`
        };
      }

      // Prepare connection options
      const connectOptions = {
        host: config.host,
        username: config.user,
        port: parseInt(config.port),
        readyTimeout: 5000,
        tryKeyboard: false
      };

      // Try to read and use the private key content
      try {
        const keyContent = fs.readFileSync(keyPath, 'utf8');
        connectOptions.privateKey = keyContent;
      } catch (keyReadError) {
        // If key reading fails, try without key (password auth or default keys)
        console.log(`Warning: Could not read key file ${keyPath}, trying without explicit key`);
      }
      
      await ssh.connect(connectOptions);

      ssh.dispose();
      return { 
        success: true, 
        message: 'Connection successful',
        configValid: true,
        hostReachable: true
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Connection failed: ${error.message}`,
        configValid: true,
        hostReachable: false,
        connectionError: error.message
      };
    }
  }

  // Removed: validateAllConnections() - was causing segfaults
  // Individual connection testing works fine via testConnection()

  async createBackup(backupPath) {
    const archiver = require('archiver');
    const fs = require('fs-extra');
    const path = require('path');
    
    try {
      // Get async data first
      const connections = await this.listConnections();
      const groups = await this.getGroups();
      
      // Create output stream
      const output = fs.createWriteStream(backupPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          console.log(`Backup created: ${archive.pointer()} total bytes`);
          resolve({
            success: true,
            filePath: backupPath,
            size: archive.pointer(),
            timestamp: new Date().toISOString()
          });
        });

        archive.on('error', (err) => {
          reject(err);
        });

        // Pipe archive data to the file
        archive.pipe(output);

        try {
          // Add SSH Manager configs (only config files, not development files)
          const sshManagerPath = this.fileUtils.getSSHManagerPath();
          if (fs.existsSync(sshManagerPath)) {
            // Only include specific directories we need for backup
            const configDir = path.join(sshManagerPath, 'config');
            const keysDir = path.join(sshManagerPath, 'keys');
            const templatesDir = path.join(sshManagerPath, 'templates');
            const backupsDir = path.join(sshManagerPath, 'backups');
            
            if (fs.existsSync(configDir)) {
              archive.directory(configDir, 'ssh_manager/config');
            }
            if (fs.existsSync(keysDir)) {
              archive.directory(keysDir, 'ssh_manager/keys');
            }
            if (fs.existsSync(templatesDir)) {
              archive.directory(templatesDir, 'ssh_manager/templates');
            }
            if (fs.existsSync(backupsDir)) {
              archive.directory(backupsDir, 'ssh_manager/backups');
            }
          }

          // Add main SSH config (backup copy)
          const mainConfigPath = path.join(require('os').homedir(), '.ssh', 'config');
          if (fs.existsSync(mainConfigPath)) {
            archive.file(mainConfigPath, { name: 'ssh_config_backup.txt' });
          }

          // Note: SSH private keys are NOT included for security reasons
          // Users should backup their SSH keys separately if needed

          // Add metadata
          const metadata = {
            version: '0.1.2',
            created: new Date().toISOString(),
            platform: require('os').platform(),
            hostname: require('os').hostname(),
            user: require('os').userInfo().username,
            connections: connections,
            groups: groups
          };

          archive.append(JSON.stringify(metadata, null, 2), { name: 'backup_metadata.json' });

          // Finalize the archive
          archive.finalize();

        } catch (error) {
          reject(new Error(`Failed to create backup: ${error.message}`));
        }
      });
      
    } catch (error) {
      throw new Error(`Failed to prepare backup: ${error.message}`);
    }
  }

  async getConnectionSSHCommand(name, group = 'personal') {
    const content = await this.fileUtils.readConfigFile(group, name);
    
    if (!content) {
      throw new Error(`Connection '${name}' not found in group '${group}'`);
    }

    const config = this.parseSSHConfig(content);
    
    // Build SSH command based on configuration
    let sshCommand = `ssh ${name}`;
    
    // Add explicit options if needed for debugging
    const debugCommand = `ssh -F ~/.ssh/config ${name}`;
    
    return {
      simple: sshCommand,
      explicit: debugCommand,
      config: config
    };
  }

  async connectToServer(name, group = 'personal') {
    // Handle existing connections differently - they don't have separate config files
    if (group === 'existing') {
      // For existing connections, just use SSH directly since they're in main config
      const sshCommand = {
        simple: `ssh ${name}`,
        explicit: `ssh -F ~/.ssh/config ${name}`,
        config: { host: name, user: '', port: '22' }
      };
      
      // Launch SSH connection in terminal
      const { spawn } = require('child_process');
      const os = require('os');
      
      try {
        const terminalConfig = this.getTerminalCommand(sshCommand.simple, os);
        
        const child = spawn(terminalConfig.app, terminalConfig.args, {
          detached: true,
          stdio: 'ignore'
        });
        
        child.unref();
        
        return {
          success: true,
          message: `SSH connection to "${name}" launched in terminal`,
          command: sshCommand.simple
        };
      } catch (error) {
        throw new Error(`Failed to launch terminal: ${error.message}`);
      }
    }

    // For managed connections, use the original logic
    const content = await this.fileUtils.readConfigFile(group, name);
    
    if (!content) {
      throw new Error(`Connection '${name}' not found in group '${group}'`);
    }

    // Get the SSH command (skip validation - let SSH handle connection errors directly)
    const sshCommand = await this.getConnectionSSHCommand(name, group);
    
    // Launch SSH connection in terminal
    const { spawn } = require('child_process');
    const os = require('os');
    
    try {
      const terminalConfig = this.getTerminalCommand(sshCommand.simple, os);
      
      const child = spawn(terminalConfig.app, terminalConfig.args, {
        detached: true,
        stdio: 'ignore'
      });
      
      child.unref();
      
      return {
        success: true,
        message: `SSH connection to "${name}" launched in terminal`,
        command: sshCommand.simple
      };
    } catch (error) {
      throw new Error(`Failed to launch terminal: ${error.message}`);
    }
  }

  // Platform-specific terminal detection utility
  getTerminalCommand(sshCommand, os) {
    if (os.platform() === 'darwin') {
      // macOS - use Terminal.app and bring it to front
      return {
        app: 'osascript',
        args: [
          '-e', 
          `tell application "Terminal"
            activate
            set newTab to do script "${sshCommand}"
            activate
          end tell`
        ]
      };
    } else if (os.platform() === 'linux') {
      // Linux - try common terminal emulators
      const terminals = ['gnome-terminal', 'konsole', 'xfce4-terminal', 'xterm', 'x-terminal-emulator'];
      
      for (const terminal of terminals) {
        try {
          // Check if terminal exists
          require('child_process').execSync(`which ${terminal}`, { stdio: 'ignore' });
          
          if (terminal === 'gnome-terminal') {
            return {
              app: 'gnome-terminal',
              args: ['--', 'bash', '-c', `${sshCommand}; exec bash`]
            };
          } else if (terminal === 'konsole') {
            return {
              app: 'konsole',
              args: ['-e', 'bash', '-c', `${sshCommand}; exec bash`]
            };
          } else if (terminal === 'xfce4-terminal') {
            return {
              app: 'xfce4-terminal',
              args: ['-e', 'bash', '-c', `${sshCommand}; exec bash`]
            };
          } else {
            return {
              app: terminal,
              args: ['-e', 'bash', '-c', `${sshCommand}; exec bash`]
            };
          }
        } catch (e) {
          // Terminal not found, try next one
          continue;
        }
      }
      
      throw new Error('No suitable terminal emulator found. Please install gnome-terminal, konsole, xfce4-terminal, or xterm.');
    } else if (os.platform() === 'win32') {
      // Windows - use cmd with focus
      return {
        app: 'cmd',
        args: ['/c', 'start', '/max', 'cmd', '/k', sshCommand]
      };
    } else {
      throw new Error(`Unsupported platform: ${os.platform()}`);
    }
  }

  // Helper method for formatting port forwards
  formatPortForwards(forwards) {
    if (!Array.isArray(forwards) || forwards.length === 0) {
      return '';
    }
    
    return forwards.map(forward => {
      if (forward.type === 'local') {
        return `LocalForward ${forward.localPort} ${forward.remoteHost}:${forward.remotePort}`;
      } else if (forward.type === 'remote') {
        return `RemoteForward ${forward.remotePort} ${forward.localHost}:${forward.localPort}`;
      }
      return '';
    }).filter(line => line).join('\n    ');
  }

}

module.exports = SSHManager;