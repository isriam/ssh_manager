# SSH Manager - Patch Notes v0.1.1

**Release Date**: August 15, 2025  
**Phase**: Phase 5 - Testing & Troubleshooting

## 🐛 Bug Fixes

### Fixed SSH Connection Testing
- **Fixed "SSH is not a constructor" error** in Test Connection functionality
  - Updated `node-ssh` import to use correct named export: `{ NodeSSH }`
  - Resolved compatibility issue with node-ssh v13.2.1
  - Test Connection now works properly for validating SSH configurations

### Fixed Private Key Authentication
- **Resolved "Cannot parse privateKey: Unsupported key format" error**
  - Enhanced private key handling to read key file content instead of passing file path
  - Added proper file existence validation before attempting to read SSH keys
  - Implemented graceful fallback for authentication when key reading fails
  - Better error messages for key-related issues

## ✨ UI/UX Improvements

### Enhanced Source File Panel Display
- **Improved source file path display** in session settings
  - Fixed cramped text wrapping for long file paths
  - Added dedicated `.source-path` styling with proper text handling
  - Source file panel now spans full width of details section
  - Added scrollable container for extremely long paths
  - Better visual distinction with enhanced monospace font styling

### Terminal Window Focus Enhancement
- **Terminal now comes to front** when connecting to sessions
  - Enhanced AppleScript on macOS to activate Terminal and bring it to foreground
  - Added window positioning improvements for Linux terminals
  - Added maximization flag for Windows cmd terminals
  - Eliminated issue where terminal started minimized or in background

### Streamlined Connection Experience
- **Removed redundant popup notification** when connecting to sessions
  - Eliminated annoying alert popup that appeared on successful connections
  - Terminal coming to front now provides primary feedback
  - Kept status bar message for subtle confirmation
  - Maintained error popups for important troubleshooting information

## 🔧 Technical Improvements

### Authentication Enhancements
- Added SSH key file existence validation
- Improved error handling for different authentication methods
- Enhanced connection options with proper timeout settings
- Better fallback mechanisms for various SSH key formats

### Code Quality
- Improved CSS organization with specific classes for file path display
- Enhanced JavaScript error handling in connection methods
- Better AppleScript implementation for cross-platform terminal launching
- Optimized grid layout for connection detail panels

## 📋 Understanding the Features

### Test Connection vs Connect
- **🔍 Test Connection**: Validates SSH configuration and credentials without opening terminal
  - Checks SSH config syntax
  - Verifies key file accessibility  
  - Tests actual connectivity using node-ssh
  - Returns detailed status without launching terminal session

- **🚀 Connect**: Launches interactive SSH session in system terminal
  - First validates connection using Test Connection
  - Opens terminal window with SSH command
  - Brings terminal to foreground for immediate use
  - No popup interruption - smooth workflow

## 🎯 What's Next

These improvements complete Phase 5 (Testing & Troubleshooting) of the SSH Manager development roadmap. The application now provides a robust, user-friendly experience for managing SSH connections with proper error handling and intuitive terminal integration.

---

**Full Changelog**: [v0.1.0...v0.1.1](https://github.com/isriam/ssh_manager/compare/v0.1.0...v0.1.1)