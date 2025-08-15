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
    User {{user}}
    Port {{port}}
    IdentityFile {{key_file}}
`
      },
      'jump-host': {
        name: 'Jump Host',
        description: 'SSH connection through a bastion/jump host',
        content: `# Jump Host Configuration
Host {{name}}
    HostName {{host}}
    User {{user}}
    Port {{port}}
    ProxyJump {{jump_host}}
    IdentityFile {{key_file}}
`
      },
      'port-forward': {
        name: 'Port Forwarding',
        description: 'SSH with local port forwarding',
        content: `# Port Forwarding Configuration
Host {{name}}
    HostName {{host}}
    User {{user}}
    Port {{port}}
    LocalForward {{local_port}} {{remote_host}}:{{remote_port}}
    IdentityFile {{key_file}}
`
      },
      'tunnel': {
        name: 'SSH Tunnel',
        description: 'Dynamic port forwarding (SOCKS proxy)',
        content: `# SSH Tunnel Configuration
Host {{name}}
    HostName {{host}}
    User {{user}}
    Port {{port}}
    DynamicForward {{socks_port}}
    IdentityFile {{key_file}}
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
`
      },
      'development': {
        name: 'Development Server',
        description: 'Development environment with common settings',
        content: `# Development Server
Host {{name}}
    HostName {{host}}
    User {{user}}
    Port {{port}}
    IdentityFile {{key_file}}
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    ForwardAgent yes
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

    for (const [key, value] of Object.entries(allVariables)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    return content;
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