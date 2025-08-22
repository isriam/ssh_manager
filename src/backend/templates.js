const FileUtils = require('./file-utils');

class Templates {
  constructor() {
    this.fileUtils = new FileUtils();
    this.defaultTemplates = {
      'basic-server': {
        name: 'Basic Server',
        description: 'Simple SSH connection with username and host',
        content: `# Basic SSH Connection
Host {{name}}
    HostName {{host}}
{{user_line}}
    Port {{port}}
    IdentityFile {{key_file}}
    
    # Phase 1: Essential Connection Settings
    ServerAliveInterval {{server_alive_interval}}
    ServerAliveCountMax {{server_alive_count_max}}
    ConnectTimeout {{connect_timeout}}
    Compression {{compression}}
    StrictHostKeyChecking {{strict_host_key_checking}}
    
    # Phase 2: Developer Features
    ControlMaster {{control_master}}
    ControlPath {{control_path}}
    ControlPersist {{control_persist}}
    ForwardX11 {{forward_x11}}
    ForwardAgent {{forward_agent}}
`
      },
      'jump-host': {
        name: 'Jump Host',
        description: 'SSH connection through a bastion/jump host',
        content: `# Jump Host Configuration
Host {{name}}
    HostName {{host}}
{{user_line}}
    Port {{port}}
    ProxyJump {{jump_host}}
    IdentityFile {{key_file}}
    
    # Phase 1: Essential Connection Settings
    ServerAliveInterval {{server_alive_interval}}
    ServerAliveCountMax {{server_alive_count_max}}
    ConnectTimeout {{connect_timeout}}
    Compression {{compression}}
    StrictHostKeyChecking {{strict_host_key_checking}}
    
    # Phase 2: Developer Features
    ControlMaster {{control_master}}
    ControlPath {{control_path}}
    ControlPersist {{control_persist}}
    ForwardX11 {{forward_x11}}
    ForwardAgent {{forward_agent}}
`
      },
      'port-forward': {
        name: 'Port Forwarding',
        description: 'SSH with local port forwarding',
        content: `# Port Forwarding Configuration
Host {{name}}
    HostName {{host}}
{{user_line}}
    Port {{port}}
    LocalForward {{local_port}} {{remote_host}}:{{remote_port}}
    IdentityFile {{key_file}}
    
    # Phase 1: Essential Connection Settings
    ServerAliveInterval {{server_alive_interval}}
    ServerAliveCountMax {{server_alive_count_max}}
    ConnectTimeout {{connect_timeout}}
    Compression {{compression}}
    StrictHostKeyChecking {{strict_host_key_checking}}
    
    # Phase 2: Developer Features
    ControlMaster {{control_master}}
    ControlPath {{control_path}}
    ControlPersist {{control_persist}}
    ForwardX11 {{forward_x11}}
    ForwardAgent {{forward_agent}}
`
      },
      'tunnel': {
        name: 'SSH Tunnel',
        description: 'Dynamic port forwarding (SOCKS proxy)',
        content: `# SSH Tunnel Configuration
Host {{name}}
    HostName {{host}}
{{user_line}}
    Port {{port}}
    DynamicForward {{socks_port}}
    IdentityFile {{key_file}}
    
    # Phase 1: Essential Connection Settings
    ServerAliveInterval {{server_alive_interval}}
    ServerAliveCountMax {{server_alive_count_max}}
    ConnectTimeout {{connect_timeout}}
    Compression {{compression}}
    StrictHostKeyChecking {{strict_host_key_checking}}
    
    # Phase 2: Developer Features
    ControlMaster {{control_master}}
    ControlPath {{control_path}}
    ControlPersist {{control_persist}}
    ForwardX11 {{forward_x11}}
    ForwardAgent {{forward_agent}}
`
      },
      'aws-ec2': {
        name: 'AWS EC2 Instance',
        description: 'Common configuration for AWS EC2 instances',
        content: `# AWS EC2 Instance
Host {{name}}
    HostName {{host}}
    User ec2-user
    Port 22
    IdentityFile {{key_file}}
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    
    # Phase 1: Essential Connection Settings
    ServerAliveInterval {{server_alive_interval}}
    ServerAliveCountMax {{server_alive_count_max}}
    ConnectTimeout {{connect_timeout}}
    Compression {{compression}}
    
    # Phase 2: Developer Features
    ControlMaster {{control_master}}
    ControlPath {{control_path}}
    ControlPersist {{control_persist}}
    ForwardX11 {{forward_x11}}
    ForwardAgent {{forward_agent}}
`
      },
      'development': {
        name: 'Development Server',
        description: 'Development environment with common settings',
        content: `# Development Server
Host {{name}}
    HostName {{host}}
{{user_line}}
    Port {{port}}
    IdentityFile {{key_file}}
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    ForwardAgent yes
    
    # Phase 1: Essential Connection Settings
    ServerAliveInterval {{server_alive_interval}}
    ServerAliveCountMax {{server_alive_count_max}}
    ConnectTimeout {{connect_timeout}}
    Compression {{compression}}
    
    # Phase 2: Developer Features
    ControlMaster {{control_master}}
    ControlPath {{control_path}}
    ControlPersist {{control_persist}}
    ForwardX11 {{forward_x11}}
`
      },
      'developer': {
        name: 'Developer Workstation',
        description: 'Full developer setup with multiplexing, forwarding, and tunneling',
        content: `# Developer Workstation
Host {{name}}
    HostName {{host}}
    User {{user}}
    Port {{port}}
    IdentityFile {{key_file}}
    
    # Phase 1: Essential Connection Settings
    ServerAliveInterval {{server_alive_interval}}
    ServerAliveCountMax {{server_alive_count_max}}
    ConnectTimeout {{connect_timeout}}
    Compression {{compression}}
    StrictHostKeyChecking {{strict_host_key_checking}}
    
    # Phase 2: Full Developer Features
    ControlMaster {{control_master}}
    ControlPath {{control_path}}
    ControlPersist {{control_persist}}
    ForwardX11 {{forward_x11}}
    ForwardAgent {{forward_agent}}
    
    # Common developer port forwards
    LocalForward 3000 localhost:3000
    LocalForward 8080 localhost:8080
    LocalForward 5432 localhost:5432
`
      }
    };
  }

  async init() {
    await this.createDefaultTemplates();
  }

  async createDefaultTemplates() {
    for (const [templateId, template] of Object.entries(this.defaultTemplates)) {
      const existingTemplate = await this.fileUtils.readTemplate(templateId);
      
      if (!existingTemplate) {
        await this.fileUtils.writeTemplate(templateId, template.content);
      }
    }
  }

  async getTemplate(name) {
    if (this.defaultTemplates[name]) {
      return this.defaultTemplates[name];
    }

    const content = await this.fileUtils.readTemplate(name);
    if (content) {
      return {
        name: name,
        description: 'Custom template',
        content: content
      };
    }

    return null;
  }

  async listTemplates() {
    const templates = [];
    
    for (const [templateId, template] of Object.entries(this.defaultTemplates)) {
      templates.push({
        id: templateId,
        name: template.name,
        description: template.description,
        isDefault: true
      });
    }

    const customTemplates = await this.fileUtils.listTemplates();
    for (const templateName of customTemplates) {
      if (!this.defaultTemplates[templateName]) {
        templates.push({
          id: templateName,
          name: templateName,
          description: 'Custom template',
          isDefault: false
        });
      }
    }

    return templates;
  }

  async createFromTemplate(templateName, variables) {
    const template = await this.getTemplate(templateName);
    
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    let content = template.content;

    const defaultVariables = {
      port: '22',
      key_file: '~/.ssh/id_rsa',
      local_port: '8080',
      remote_host: 'localhost',
      remote_port: '80',
      socks_port: '1080',
      jump_host: 'bastion.example.com'
    };

    const allVariables = { ...defaultVariables, ...variables };

    // Handle standard variable replacement
    for (const [key, value] of Object.entries(allVariables)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value || '');
    }

    // Phase 2: Handle dynamic content insertion
    content = this.handleDynamicContent(content, allVariables);

    return content;
  }

  handleDynamicContent(content, variables) {
    let result = content;

    // Add DynamicForward if specified
    if (variables.dynamic_forward && variables.dynamic_forward !== '') {
      const dynamicForwardLine = `\n    DynamicForward ${variables.dynamic_forward}`;
      result = result.replace(
        /(\n    # Phase 2: Developer Features[\s\S]*?ForwardAgent [^\n]+)/,
        `$1${dynamicForwardLine}`
      );
    }

    // Add LocalForward and RemoteForward lines if specified
    if (variables.local_forwards && variables.local_forwards !== '') {
      const localForwardsSection = `\n    ${variables.local_forwards}`;
      result = result.replace(
        /(\n    # Phase 2: Developer Features[\s\S]*?ForwardAgent [^\n]+)/,
        `$1${localForwardsSection}`
      );
    }

    if (variables.remote_forwards && variables.remote_forwards !== '') {
      const remoteForwardsSection = `\n    ${variables.remote_forwards}`;
      result = result.replace(
        /(\n    # Phase 2: Developer Features[\s\S]*?ForwardAgent [^\n]+)/,
        `$1${remoteForwardsSection}`
      );
    }

    return result;
  }

  async saveCustomTemplate(name, content, description = 'Custom template') {
    await this.fileUtils.writeTemplate(name, content);
    
    return {
      id: name,
      name: name,
      description: description,
      isDefault: false
    };
  }

  validateTemplate(content) {
    const errors = [];
    const warnings = [];

    if (!content.trim()) {
      errors.push('Template content cannot be empty');
      return { isValid: false, errors, warnings };
    }

    const lines = content.split('\n');
    let hasHost = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line.startsWith('#')) {
        continue;
      }

      if (line.startsWith('Host ')) {
        hasHost = true;
        const hostValue = line.substring(5).trim();
        
        if (!hostValue) {
          errors.push(`Line ${i + 1}: Host directive requires a value`);
        }
      }

      if (line.includes('{{') && line.includes('}}')) {
        const matches = line.match(/\{\{([^}]+)\}\}/g);
        if (matches) {
          for (const match of matches) {
            const variable = match.slice(2, -2);
            if (!variable) {
              warnings.push(`Line ${i + 1}: Empty template variable found`);
            }
          }
        }
      }
    }

    if (!hasHost) {
      errors.push('Template must contain at least one Host directive');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getTemplateVariables(content) {
    const variables = new Set();
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    
    if (matches) {
      for (const match of matches) {
        const variable = match.slice(2, -2).trim();
        if (variable) {
          variables.add(variable);
        }
      }
    }

    return Array.from(variables);
  }
}

module.exports = Templates;