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
    const { name, host, user, port = '22', group = 'personal', template = 'basic-server', keyFile } = options;

    this.validateConnectionOptions({ name, host, user, port, group });

    const existingConfig = await this.fileUtils.readConfigFile(group, name);
    if (existingConfig) {
      throw new Error(`Connection '${name}' already exists in group '${group}'`);
    }

    const templateVariables = {
      name: name,
      host: host,
      user: user || 'root',
      port: port,
      key_file: keyFile || '~/.ssh/id_rsa'
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

  validateConnectionOptions({ name, host, user: _user, port, group }) {
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

    if (group && !['work', 'personal', 'projects'].includes(group)) {
      errors.push('Group must be one of: work, personal, projects');
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

  async testConnection(name, group = 'personal') {
    const content = await this.fileUtils.readConfigFile(group, name);
    
    if (!content) {
      throw new Error(`Connection '${name}' not found in group '${group}'`);
    }

    const config = this.parseSSHConfig(content);
    
    const SSH = require('node-ssh');
    const ssh = new SSH();

    try {
      await ssh.connect({
        host: config.host,
        username: config.user,
        port: parseInt(config.port),
        privateKey: config.keyFile.replace('~', require('os').homedir()),
        readyTimeout: 5000
      });

      ssh.dispose();
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = SSHManager;