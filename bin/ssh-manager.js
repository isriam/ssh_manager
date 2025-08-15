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
  .action(() => {
    console.log('Desktop shortcut creation will be implemented in Phase 4');
  });

program
  .command('add')
  .description('Add a new SSH configuration')
  .requiredOption('-n, --name <name>', 'Connection name')
  .requiredOption('-h, --host <host>', 'Remote host')
  .option('-u, --user <username>', 'Username')
  .option('-p, --port <port>', 'Port number', '22')
  .option('-g, --group <group>', 'Group folder (work/personal/projects)', 'personal')
  .action(async (options) => {
    try {
      const manager = new SSHManager();
      await manager.addConnection(options);
      console.log(`SSH connection '${options.name}' added successfully!`);
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