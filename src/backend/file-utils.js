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
      path.join(this.sshManagerDir, 'config', 'work'),
      path.join(this.sshManagerDir, 'config', 'personal'),
      path.join(this.sshManagerDir, 'config', 'projects'),
      path.join(this.sshManagerDir, 'keys'),
      path.join(this.sshManagerDir, 'keys', 'work'),
      path.join(this.sshManagerDir, 'keys', 'personal'),
      path.join(this.sshManagerDir, 'keys', 'projects'),
      path.join(this.sshManagerDir, 'templates'),
      path.join(this.sshManagerDir, 'backups'),
      path.join(this.sshManagerDir, 'backups', 'config-backups')
    ];

    for (const dir of directories) {
      await fs.ensureDir(dir);
    }

    await fs.ensureDir(this.sshDir);
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

    const groups = group ? [group] : ['work', 'personal', 'projects'];
    
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
}

module.exports = FileUtils;