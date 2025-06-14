// DTF RIP Pro - Main Application Script

// Import modules
import { setupNavigation } from './modules/navigation.js';
import { setupTheme } from './modules/theme.js';
import { setupJobManagement } from './modules/job-management.js';
import { setupPrinterManagement } from './modules/printer-management.js';
import { setupColorProfiles } from './modules/color-profiles.js';
import { setupSettings } from './modules/settings.js';
import { setupModals } from './modules/modals.js';
import { setupSocketConnection } from './modules/socket-connection.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('DTF RIP Pro - Initializing application...');
  
  // Set up socket connection
  const socket = setupSocketConnection();
  
  // Set up UI components
  setupNavigation();
  setupTheme();
  setupModals();
  
  // Set up feature modules
  setupJobManagement(socket);
  setupPrinterManagement(socket);
  setupColorProfiles(socket);
  setupSettings();
  
  console.log('DTF RIP Pro - Application initialized');
});
