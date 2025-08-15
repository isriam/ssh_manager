#!/usr/bin/env node

/**
 * SSH Manager Pre-Uninstall Script
 * 
 * This script runs before npm uninstall -g ssh-manager
 * Optionally cleans up SSH Manager files and shortcuts
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const readline = require('readline');

async function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function preUninstall() {
  console.log('🗑️  SSH Manager Uninstall');
  console.log('');
  
  try {
    const platform = os.platform();
    const homeDir = os.homedir();
    const sshManagerPath = path.join(homeDir, 'ssh_manager');
    
    // Check if SSH Manager directory exists
    const hasData = await fs.pathExists(sshManagerPath);
    
    if (hasData) {
      console.log('📁 SSH Manager data found at:', sshManagerPath);
      console.log('');
      console.log('This directory contains:');
      console.log('• SSH configurations');
      console.log('• SSH keys');
      console.log('• Templates');
      console.log('• Backups');
      console.log('');
      
      const keepData = await askQuestion('Keep SSH Manager data? (y/N): ');
      
      if (keepData === 'y' || keepData === 'yes') {
        console.log('✅ SSH Manager data will be preserved');
        console.log(`📁 Data location: ${sshManagerPath}`);
      } else {
        const confirm = await askQuestion('⚠️  Are you sure you want to delete all SSH Manager data? (y/N): ');
        
        if (confirm === 'y' || confirm === 'yes') {
          await fs.remove(sshManagerPath);
          console.log('🗑️  SSH Manager data removed');
        } else {
          console.log('✅ SSH Manager data preserved');
        }
      }
    }
    
    // Clean up shortcuts
    if (platform === 'darwin') {
      const desktopShortcut = path.join(homeDir, 'Desktop', 'SSH Manager.app');
      if (await fs.pathExists(desktopShortcut)) {
        await fs.remove(desktopShortcut);
        console.log('🗑️  Desktop shortcut removed');
      }
      
    } else if (platform === 'linux') {
      const desktopFile = path.join(homeDir, 'Desktop', 'ssh-manager.desktop');
      const applicationsFile = path.join(homeDir, '.local', 'share', 'applications', 'ssh-manager.desktop');
      
      if (await fs.pathExists(desktopFile)) {
        await fs.remove(desktopFile);
        console.log('🗑️  Desktop shortcut removed');
      }
      
      if (await fs.pathExists(applicationsFile)) {
        await fs.remove(applicationsFile);
        console.log('🗑️  Applications menu entry removed');
      }
    }
    
    console.log('');
    console.log('✅ SSH Manager uninstall cleanup completed');
    console.log('Thank you for using SSH Manager! 👋');
    
  } catch (error) {
    console.error('❌ Error during uninstall cleanup:', error.message);
    console.log('You may need to manually remove shortcuts and data');
  }
}

// Only run if this script is executed directly (not required)
if (require.main === module) {
  preUninstall().catch(error => {
    console.error('Pre-uninstall failed:', error.message);
    process.exit(1);
  });
}

module.exports = preUninstall;