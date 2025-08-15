#!/usr/bin/env node

/**
 * SSH Manager Post-Install Script
 * 
 * This script runs after npm install -g ssh-manager
 * Sets up the SSH Manager environment and optionally installs desktop integration
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');

async function postInstall() {
  console.log('🔧 Setting up SSH Manager...');
  
  try {
    // Initialize SSH Manager (creates directory structure)
    const SSHManager = require('../src/backend/ssh-manager');
    const manager = new SSHManager();
    await manager.init();
    
    console.log('✅ SSH Manager directory structure created');
    console.log(`📁 Location: ${manager.fileUtils.getSSHManagerPath()}`);
    
    // Platform-specific setup
    const platform = os.platform();
    
    if (platform === 'darwin') {
      console.log('');
      console.log('🍎 macOS Setup:');
      console.log('• SSH Manager CLI is available globally as "ssh-manager"');
      console.log('• To create desktop shortcut: ssh-manager create-shortcut');
      console.log('• Build desktop app: npm run build (for development)');
      
    } else if (platform === 'linux') {
      console.log('');
      console.log('🐧 Linux Setup:');
      console.log('• SSH Manager CLI is available globally as "ssh-manager"');
      console.log('• To create desktop shortcut: ssh-manager create-shortcut');
      console.log('• Build desktop app: npm run build (for development)');
      
    } else if (platform === 'win32') {
      console.log('');
      console.log('🪟 Windows Setup:');
      console.log('• SSH Manager CLI is available globally as "ssh-manager"');
      console.log('• Desktop integration available after building installer');
      console.log('• Build desktop app: npm run build');
    }
    
    console.log('');
    console.log('📚 Quick Start:');
    console.log('• View help: ssh-manager --help');
    console.log('• Add connection: ssh-manager add -n myserver -h example.com -u user');
    console.log('• List connections: ssh-manager list');
    console.log('• Initialize GUI: ssh-manager create-shortcut');
    console.log('');
    console.log('🎉 SSH Manager is ready to use!');
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    console.log('');
    console.log('Manual setup:');
    console.log('• Run: ssh-manager init');
    console.log('• Then: ssh-manager --help');
  }
}

// Only run if this script is executed directly (not required)
if (require.main === module) {
  postInstall().catch(error => {
    console.error('Post-install failed:', error.message);
    process.exit(1);
  });
}

module.exports = postInstall;