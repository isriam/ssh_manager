#!/usr/bin/env node

const { Command } = require('commander');
const SSHManager = require('../src/backend/ssh-manager');

const program = new Command();

program
  .name('ssh-manager')
  .description('Cross-platform GUI application for managing SSH configurations')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize SSH Manager folder structure')
  .action(async () => {
    try {
      const manager = new SSHManager();
      await manager.init();
      console.log('SSH Manager initialized successfully!');
      console.log('Folder structure created at ~/ssh_manager/');
    } catch (error) {
      console.error('Error initializing SSH Manager:', error.message);
      process.exit(1);
    }
  });

program
  .command('create-shortcut')
  .description('Create desktop shortcut for SSH Manager')
  .action(async () => {
    try {
      const os = require('os');
      const path = require('path');
      const fs = require('fs-extra');
      
      const platform = os.platform();
      const homeDir = os.homedir();
      
      if (platform === 'darwin') {
        // macOS - Create symlink in Applications folder
        const appPath = '/Applications/SSH Manager.app';
        const desktopPath = path.join(homeDir, 'Desktop', 'SSH Manager.app');
        
        // Check if app exists in Applications (from Electron build)
        if (await fs.pathExists(appPath)) {
          // Create desktop shortcut
          if (await fs.pathExists(desktopPath)) {
            await fs.remove(desktopPath);
          }
          
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);
          
          await execAsync(`ln -sf "${appPath}" "${desktopPath}"`);
          console.log('✅ Desktop shortcut created successfully!');
          console.log(`📱 SSH Manager is now available on your Desktop`);
        } else {
          // App not in Applications - provide manual installation instructions
          console.log('📋 SSH Manager App Installation:');
          console.log('1. Build the app: npm run build');
          console.log('2. Copy "dist/mac/SSH Manager.app" to /Applications/');
          console.log('3. Run this command again to create desktop shortcut');
          console.log('');
          console.log('Or manually drag the app from dist/mac/ to Applications folder');
        }
        
      } else if (platform === 'linux') {
        // Linux - Create .desktop file
        const desktopFile = path.join(homeDir, 'Desktop', 'ssh-manager.desktop');
        const applicationsDir = path.join(homeDir, '.local', 'share', 'applications');
        const applicationsFile = path.join(applicationsDir, 'ssh-manager.desktop');
        
        await fs.ensureDir(path.dirname(applicationsFile));
        
        const desktopEntry = `[Desktop Entry]
Version=1.0
Name=SSH Manager
Comment=Cross-platform SSH configuration manager
Exec=ssh-manager
Icon=ssh-manager
Terminal=false
Type=Application
Categories=Network;Development;
StartupWMClass=SSH Manager`;
        
        // Create desktop shortcut
        await fs.writeFile(desktopFile, desktopEntry);
        await fs.chmod(desktopFile, 0o755);
        
        // Create applications entry
        await fs.writeFile(applicationsFile, desktopEntry);
        
        console.log('✅ Desktop shortcut created successfully!');
        console.log('📱 SSH Manager is now available on your Desktop and Applications menu');
        
      } else if (platform === 'win32') {
        // Windows - Create .lnk file (requires additional tools)
        console.log('🪟 Windows shortcut creation:');
        console.log('After installing SSH Manager via installer (npm run build):');
        console.log('1. Right-click on Desktop → New → Shortcut');
        console.log('2. Browse to SSH Manager executable');
        console.log('3. Name it "SSH Manager"');
        console.log('');
        console.log('Or run the NSIS installer which creates shortcuts automatically');
        
      } else {
        console.log(`❌ Unsupported platform: ${platform}`);
        console.log('Supported platforms: macOS, Linux, Windows');
      }
      
    } catch (error) {
      console.error('❌ Error creating desktop shortcut:', error.message);
      process.exit(1);
    }
  });

program
  .command('add')
  .description('Add a new SSH configuration')
  .requiredOption('-n, --name <name>', 'Connection name')
  .requiredOption('-h, --host <host>', 'Remote host')
  .option('-u, --user <username>', 'Username')
  .option('-p, --port <port>', 'Port number', '22')
  .option('-g, --group <group>', 'Group folder (work/personal/projects)', 'personal')
  .option('-t, --template <template>', 'Configuration template (basic-server, jump-host, port-forward, tunnel, aws-ec2, development)', 'basic-server')
  .option('-k, --key-file <keyFile>', 'SSH private key file path', '~/.ssh/id_rsa')
  .option('-j, --jump-host <jumpHost>', 'Jump/bastion host for ProxyJump')
  .option('--local-port <localPort>', 'Local port for port forwarding')
  .option('--remote-host <remoteHost>', 'Remote host for port forwarding', 'localhost')
  .option('--remote-port <remotePort>', 'Remote port for port forwarding')
  .option('--socks-port <socksPort>', 'SOCKS proxy port for tunneling')
  .action(async (options) => {
    try {
      const manager = new SSHManager();
      await manager.addConnection(options);
      console.log(`SSH connection '${options.name}' added successfully using template '${options.template}'!`);
    } catch (error) {
      console.error('Error adding SSH connection:', error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all SSH configurations')
  .option('-g, --group <group>', 'Filter by group')
  .action(async (options) => {
    try {
      const manager = new SSHManager();
      const connections = await manager.listConnections(options.group);
      
      if (connections.length === 0) {
        console.log('No SSH connections found.');
        return;
      }
      
      console.log('\nSSH Connections:');
      connections.forEach(conn => {
        console.log(`  ${conn.group}/${conn.name} -> ${conn.user}@${conn.host}:${conn.port}`);
      });
    } catch (error) {
      console.error('Error listing SSH connections:', error.message);
      process.exit(1);
    }
  });

program
  .command('remove')
  .description('Remove an SSH configuration')
  .requiredOption('-n, --name <name>', 'Connection name')
  .option('-g, --group <group>', 'Group folder', 'personal')
  .action(async (options) => {
    try {
      const manager = new SSHManager();
      await manager.removeConnection(options.name, options.group);
      console.log(`SSH connection '${options.name}' removed successfully!`);
    } catch (error) {
      console.error('Error removing SSH connection:', error.message);
      process.exit(1);
    }
  });

program.parse();