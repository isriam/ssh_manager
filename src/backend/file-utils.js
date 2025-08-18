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

  // Nested Groups - Path Parsing Utilities
  
  /**
   * Parse a group path into its components
   * @param {string} groupPath - Group path like 'work/company-a/dev'
   * @returns {object} - { segments: ['work', 'company-a', 'dev'], depth: 3, parent: 'work/company-a', name: 'dev' }
   */
  parseGroupPath(groupPath) {
    if (!groupPath || typeof groupPath !== 'string') {
      throw new Error('Group path must be a non-empty string');
    }

    // Normalize path - remove leading/trailing slashes, collapse multiple slashes
    const normalized = groupPath.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
    
    if (!normalized) {
      throw new Error('Group path cannot be empty after normalization');
    }

    const segments = normalized.split('/');
    const depth = segments.length;
    const name = segments[segments.length - 1];
    const parent = depth > 1 ? segments.slice(0, -1).join('/') : null;

    return {
      original: groupPath,
      normalized,
      segments,
      depth,
      name,
      parent
    };
  }

  /**
   * Get all parent paths for a given group path
   * @param {string} groupPath - Group path like 'work/company-a/dev'
   * @returns {string[]} - ['work', 'work/company-a']
   */
  getParentPaths(groupPath) {
    const parsed = this.parseGroupPath(groupPath);
    const parents = [];
    
    for (let i = 1; i < parsed.segments.length; i++) {
      parents.push(parsed.segments.slice(0, i).join('/'));
    }
    
    return parents;
  }

  /**
   * Check if a group path is valid
   * @param {string} groupPath - Group path to validate
   * @returns {boolean} - Whether the path is valid
   */
  isValidGroupPath(groupPath) {
    try {
      const parsed = this.parseGroupPath(groupPath);
      
      // Each segment must be valid
      for (const segment of parsed.segments) {
        if (!this.isValidGroupName(segment)) {
          return false;
        }
      }
      
      // Additional nested path validations
      if (parsed.depth > 10) { // Reasonable nesting limit
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a single group name (segment) is valid
   * @param {string} name - Single group name segment
   * @returns {boolean} - Whether the segment is valid
   */
  isValidGroupName(name) {
    if (!name || typeof name !== 'string') {
      return false;
    }
    
    // Allow letters, numbers, hyphens, underscores (but not slashes in individual segments)
    const validPattern = /^[a-z0-9][a-z0-9_-]*$/i;
    
    // Must be at least 2 characters and not too long
    return name.length >= 2 && name.length <= 50 && validPattern.test(name);
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

    // Recursively scan for all group directories
    const groups = await this._scanGroupsRecursively(configDir, '');
    return groups.sort();
  }

  /**
   * Recursively scan for group directories
   * @private
   */
  async _scanGroupsRecursively(baseDir, currentPath) {
    const groups = [];
    
    try {
      const items = await fs.readdir(baseDir);
      
      for (const item of items) {
        const itemPath = path.join(baseDir, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          const groupPath = currentPath ? `${currentPath}/${item}` : item;
          groups.push(groupPath);
          
          // Recursively scan subdirectories
          const subGroups = await this._scanGroupsRecursively(itemPath, groupPath);
          groups.push(...subGroups);
        }
      }
    } catch (error) {
      // If we can't read a directory, skip it but don't fail entirely
      console.warn(`Warning: Could not read directory ${baseDir}:`, error.message);
    }
    
    return groups;
  }

  /**
   * Get groups organized in a hierarchical tree structure
   * @returns {Object} Tree structure with nested groups
   */
  async getGroupsTree() {
    const allGroups = await this.listGroups();
    const tree = {};
    
    for (const groupPath of allGroups) {
      const parsed = this.parseGroupPath(groupPath);
      
      // Build tree structure
      let current = tree;
      for (let i = 0; i < parsed.segments.length; i++) {
        const segment = parsed.segments[i];
        const partialPath = parsed.segments.slice(0, i + 1).join('/');
        
        if (!current[segment]) {
          current[segment] = {
            name: segment,
            fullPath: partialPath,
            children: {},
            connections: []
          };
        }
        current = current[segment].children;
      }
    }
    
    return tree;
  }

  async createGroup(groupPath) {
    // Validate the group path
    if (!this.isValidGroupPath(groupPath)) {
      throw new Error(`Invalid group path: ${groupPath}`);
    }

    const parsed = this.parseGroupPath(groupPath);
    const normalizedPath = parsed.normalized;

    // Create nested directory structure
    const configDir = path.join(this.sshManagerDir, 'config', normalizedPath);
    const keysDir = path.join(this.sshManagerDir, 'keys', normalizedPath);
    
    // Ensure all parent directories exist first
    await fs.ensureDir(configDir);
    await fs.ensureDir(keysDir);
    
    return normalizedPath;
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