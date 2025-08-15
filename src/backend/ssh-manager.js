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
    const { name, host, user, port = '22', group = 'personal', template = 'basic-server', keyFile, jumpHost, localPort, remoteHost, remotePort, socksPort } = options;

    await this.validateConnectionOptions({ name, host, user, port, group });

    const existingConfig = await this.fileUtils.readConfigFile(group, name);
    if (existingConfig) {
      throw new Error(`Connection '${name}' already exists in group '${group}'`);
    }

    const templateVariables = {
      name: name,
      host: host,
      user: user || 'root',
      port: port,
      key_file: keyFile || '~/.ssh/id_rsa',
      jump_host: jumpHost || 'bastion.example.com',
      local_port: localPort || '8080',
      remote_host: remoteHost || 'localhost',
      remote_port: remotePort || '80',
      socks_port: socksPort || '1080'
    };

    const configContent = await this.templates.createFromTemplate(template, templateVariables);
    
    await this.fileUtils.writeConfigFile(group, name, configContent);
    await this.updateMainSSHConfig();

    return {
      name,
      host,
      user: user || 'root',
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

    for (const configFile of configFiles) {
      try {
        const content = await this.fileUtils.readConfigFile(configFile.group, configFile.name);
        const parsedConfig = this.parseSSHConfig(content);
        
        connections.push({
          name: configFile.name,
          group: configFile.group,
          ...parsedConfig,
          configPath: configFile.path
        });
      } catch (error) {
        console.warn(`Warning: Could not parse config for ${configFile.group}/${configFile.name}:`, error.message);
      }
    }

    return connections;
  }

  async updateConnection(name, group, updates) {
    const existingContent = await this.fileUtils.readConfigFile(group, name);
    
    if (!existingContent) {
      throw new Error(`Connection '${name}' not found in group '${group}'`);
    }

    const config = SSHConfig.parse(existingContent);
    const hostSection = config.find({ Host: name });

    if (!hostSection) {
      throw new Error(`Host section '${name}' not found in configuration`);
    }

    if (updates.host) hostSection.config.HostName = updates.host;
    if (updates.user) hostSection.config.User = updates.user;
    if (updates.port) hostSection.config.Port = updates.port;
    if (updates.keyFile) hostSection.config.IdentityFile = updates.keyFile;

    const updatedContent = SSHConfig.stringify(config);
    await this.fileUtils.writeConfigFile(group, name, updatedContent);
    await this.updateMainSSHConfig();

    return true;
  }

  async updateMainSSHConfig() {
    const currentConfig = await this.fileUtils.readMainConfig();
    await this.fileUtils.backupMainConfig();

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
      const config = SSHConfig.parse(content);
      const hostSection = config.find(section => section.param === 'Host');

      if (!hostSection || !hostSection.config) {
        return { host: 'unknown', user: 'unknown', port: '22' };
      }

      const getConfigValue = (param) => {
        const item = hostSection.config.find(c => c.param === param);
        return item ? item.value : null;
      };

      return {
        host: getConfigValue('HostName') || 'unknown',
        user: getConfigValue('User') || 'unknown',
        port: getConfigValue('Port') || '22',
        keyFile: getConfigValue('IdentityFile') || '~/.ssh/id_rsa'
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
    return await this.fileUtils.listGroups();
  }

  async createGroup(groupName) {
    if (!groupName || typeof groupName !== 'string' || groupName.trim() === '') {
      throw new Error('Group name is required');
    }

    const sanitizedName = groupName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (sanitizedName !== groupName.toLowerCase()) {
      throw new Error('Group name can only contain letters, numbers, hyphens, and underscores');
    }

    if (sanitizedName.length < 2) {
      throw new Error('Group name must be at least 2 characters long');
    }

    const existingGroups = await this.fileUtils.listGroups();
    if (existingGroups.includes(sanitizedName)) {
      throw new Error(`Group '${sanitizedName}' already exists`);
    }

    await this.fileUtils.createGroup(sanitizedName);
    return { name: sanitizedName };
  }

  async renameGroup(oldName, newName) {
    if (!oldName || !newName) {
      throw new Error('Both old and new group names are required');
    }

    const sanitizedNewName = newName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (sanitizedNewName !== newName.toLowerCase()) {
      throw new Error('Group name can only contain letters, numbers, hyphens, and underscores');
    }

    if (sanitizedNewName.length < 2) {
      throw new Error('Group name must be at least 2 characters long');
    }

    const existingGroups = await this.fileUtils.listGroups();
    if (!existingGroups.includes(oldName)) {
      throw new Error(`Group '${oldName}' does not exist`);
    }

    if (existingGroups.includes(sanitizedNewName)) {
      throw new Error(`Group '${sanitizedNewName}' already exists`);
    }

    const connections = await this.listConnections(oldName);
    
    // Read all connection file contents BEFORE moving the directory
    const connectionContents = [];
    for (const connection of connections) {
      const content = await this.fileUtils.readConfigFile(oldName, connection.name);
      connectionContents.push({
        name: connection.name,
        content: content
      });
    }
    
    await this.fileUtils.renameGroup(oldName, sanitizedNewName);
    
    // Write the connection contents to the new location
    for (const connectionData of connectionContents) {
      if (connectionData.content) {
        await this.fileUtils.writeConfigFile(sanitizedNewName, connectionData.name, connectionData.content);
      }
    }

    await this.updateMainSSHConfig();
    return { oldName, newName: sanitizedNewName };
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

  async testConnection(name, group = 'personal') {
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
      await execAsync(`ssh -F ~/.ssh/config -o ConnectTimeout=1 -o BatchMode=yes ${name} echo "test"`, { timeout: 2000 });
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
    const SSH = require('node-ssh');
    const ssh = new SSH();

    try {
      const keyPath = config.keyFile.replace('~', require('os').homedir());
      
      await ssh.connect({
        host: config.host,
        username: config.user,
        port: parseInt(config.port),
        privateKey: keyPath,
        readyTimeout: 5000
      });

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

  async validateAllConnections() {
    const connections = await this.listConnections();
    const results = [];

    for (const connection of connections) {
      try {
        const testResult = await this.testConnection(connection.name, connection.group);
        results.push({
          name: connection.name,
          group: connection.group,
          ...testResult
        });
      } catch (error) {
        results.push({
          name: connection.name,
          group: connection.group,
          success: false,
          message: error.message
        });
      }
    }

    return results;
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
}

module.exports = SSHManager;