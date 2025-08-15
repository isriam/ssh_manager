const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class FileUtils {
  constructor() {
    this.homeDir = os.homedir();
    this.sshManagerDir = path.join(this.homeDir, 'ssh_manager');
    this.sshDir = path.join(this.homeDir, '.ssh');
    this.sshConfigPath = path.join(this.sshDir, 'config');
  }

  async ensureDirectoryStructure() {
    const directories = [
      this.sshManagerDir,
      path.join(this.sshManagerDir, 'config'),
      path.join(this.sshManagerDir, 'keys'),
      path.join(this.sshManagerDir, 'templates'),
      path.join(this.sshManagerDir, 'backups'),
      path.join(this.sshManagerDir, 'backups', 'config-backups')
    ];

    for (const dir of directories) {
      await fs.ensureDir(dir);
    }

    await fs.ensureDir(this.sshDir);

    const defaultGroups = ['work', 'personal', 'projects'];
    for (const group of defaultGroups) {
      await this.createGroup(group);
    }
  }

  async writeConfigFile(group, name, content) {
    const configDir = path.join(this.sshManagerDir, 'config', group);
    const configPath = path.join(configDir, `${name}.conf`);
    
    await fs.ensureDir(configDir);
    await fs.writeFile(configPath, content, 'utf8');
    
    return configPath;
  }

  async readConfigFile(group, name) {
    const configPath = path.join(this.sshManagerDir, 'config', group, `${name}.conf`);
    
    if (await fs.pathExists(configPath)) {
      return await fs.readFile(configPath, 'utf8');
    }
    
    return null;
  }

  async removeConfigFile(group, name) {
    const configPath = path.join(this.sshManagerDir, 'config', group, `${name}.conf`);
    
    if (await fs.pathExists(configPath)) {
      await fs.remove(configPath);
      return true;
    }
    
    return false;
  }

  async listConfigFiles(group = null) {
    const configs = [];
    const configDir = path.join(this.sshManagerDir, 'config');
    
    if (!await fs.pathExists(configDir)) {
      return configs;
    }

    const groups = group ? [group] : await this.listGroups();
    
    for (const groupName of groups) {
      const groupDir = path.join(configDir, groupName);
      
      if (await fs.pathExists(groupDir)) {
        const files = await fs.readdir(groupDir);
        
        for (const file of files) {
          if (file.endsWith('.conf')) {
            const name = path.basename(file, '.conf');
            configs.push({
              group: groupName,
              name: name,
              path: path.join(groupDir, file)
            });
          }
        }
      }
    }
    
    return configs;
  }

  async backupMainConfig() {
    if (await fs.pathExists(this.sshConfigPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(
        this.sshManagerDir, 
        'backups', 
        'config-backups', 
        `ssh-config-${timestamp}.bak`
      );
      
      await fs.copy(this.sshConfigPath, backupPath);
      return backupPath;
    }
    
    return null;
  }

  async readMainConfig() {
    if (await fs.pathExists(this.sshConfigPath)) {
      return await fs.readFile(this.sshConfigPath, 'utf8');
    }
    
    return '';
  }

  async writeMainConfig(content) {
    await fs.ensureDir(this.sshDir);
    await fs.writeFile(this.sshConfigPath, content, 'utf8');
    
    if (process.platform !== 'win32') {
      await fs.chmod(this.sshConfigPath, 0o600);
    }
  }

  async writeTemplate(name, content) {
    const templatePath = path.join(this.sshManagerDir, 'templates', `${name}.conf`);
    await fs.writeFile(templatePath, content, 'utf8');
    return templatePath;
  }

  async readTemplate(name) {
    const templatePath = path.join(this.sshManagerDir, 'templates', `${name}.conf`);
    
    if (await fs.pathExists(templatePath)) {
      return await fs.readFile(templatePath, 'utf8');
    }
    
    return null;
  }

  async listTemplates() {
    const templatesDir = path.join(this.sshManagerDir, 'templates');
    const templates = [];
    
    if (await fs.pathExists(templatesDir)) {
      const files = await fs.readdir(templatesDir);
      
      for (const file of files) {
        if (file.endsWith('.conf')) {
          templates.push(path.basename(file, '.conf'));
        }
      }
    }
    
    return templates;
  }

  getSSHManagerPath() {
    return this.sshManagerDir;
  }

  getSSHConfigPath() {
    return this.sshConfigPath;
  }

  async listGroups() {
    const configDir = path.join(this.sshManagerDir, 'config');
    
    if (!await fs.pathExists(configDir)) {
      return [];
    }

    const items = await fs.readdir(configDir);
    const groups = [];

    for (const item of items) {
      const itemPath = path.join(configDir, item);
      const stat = await fs.stat(itemPath);
      if (stat.isDirectory()) {
        groups.push(item);
      }
    }

    return groups.sort();
  }

  async createGroup(groupName) {
    const configDir = path.join(this.sshManagerDir, 'config', groupName);
    const keysDir = path.join(this.sshManagerDir, 'keys', groupName);
    
    await fs.ensureDir(configDir);
    await fs.ensureDir(keysDir);
    
    return groupName;
  }

  async renameGroup(oldName, newName) {
    const oldConfigDir = path.join(this.sshManagerDir, 'config', oldName);
    const newConfigDir = path.join(this.sshManagerDir, 'config', newName);
    const oldKeysDir = path.join(this.sshManagerDir, 'keys', oldName);
    const newKeysDir = path.join(this.sshManagerDir, 'keys', newName);

    if (!await fs.pathExists(oldConfigDir)) {
      throw new Error(`Group '${oldName}' does not exist`);
    }

    if (await fs.pathExists(newConfigDir)) {
      throw new Error(`Group '${newName}' already exists`);
    }

    await fs.move(oldConfigDir, newConfigDir);
    
    if (await fs.pathExists(oldKeysDir)) {
      await fs.move(oldKeysDir, newKeysDir);
    } else {
      await fs.ensureDir(newKeysDir);
    }

    return newName;
  }

  async deleteGroup(groupName) {
    const configDir = path.join(this.sshManagerDir, 'config', groupName);
    const keysDir = path.join(this.sshManagerDir, 'keys', groupName);

    if (!await fs.pathExists(configDir)) {
      throw new Error(`Group '${groupName}' does not exist`);
    }

    const files = await fs.readdir(configDir);
    const configFiles = files.filter(file => file.endsWith('.conf'));
    
    if (configFiles.length > 0) {
      throw new Error(`Cannot delete group '${groupName}' because it contains ${configFiles.length} connection(s)`);
    }

    await fs.remove(configDir);
    
    if (await fs.pathExists(keysDir)) {
      await fs.remove(keysDir);
    }

    return groupName;
  }
}

module.exports = FileUtils;