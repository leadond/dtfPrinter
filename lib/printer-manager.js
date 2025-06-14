/**
 * Printer Manager Module
 * 
 * Handles printer discovery, configuration, and communication.
 * Manages printer status and capabilities.
 */

const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');

class PrinterManager extends EventEmitter {
  constructor() {
    super();
    this.printers = [];
    this.configPath = path.join(__dirname, '../config/printers.json');
    this.init();
  }

  /**
   * Initialize the printer manager
   */
  init() {
    try {
      // Ensure config directory exists
      fs.ensureDirSync(path.dirname(this.configPath));
      
      // Load printer configurations if file exists
      if (fs.existsSync(this.configPath)) {
        this.printers = fs.readJsonSync(this.configPath);
      } else {
        // Create default printer configurations
        this.printers = [
          {
            id: 'printer1',
            name: 'DTF Printer 1',
            model: 'Epson L1800',
            type: 'DTF',
            status: 'offline',
            capabilities: {
              maxWidth: 329,
              maxHeight: 1200,
              resolution: 1440,
              colors: ['C', 'M', 'Y', 'K', 'W']
            },
            connection: {
              type: 'usb',
              port: 'auto'
            }
          },
          {
            id: 'printer2',
            name: 'DTF Printer 2',
            model: 'Epson L805',
            type: 'DTF',
            status: 'offline',
            capabilities: {
              maxWidth: 210,
              maxHeight: 1000,
              resolution: 1440,
              colors: ['C', 'M', 'Y', 'K', 'W']
            },
            connection: {
              type: 'network',
              address: '192.168.1.100'
            }
          }
        ];
        
        // Save default configurations
        this.saveConfig();
      }
      
      // Simulate printer status updates
      this.startStatusPolling();
    } catch (error) {
      console.error('Printer manager initialization error:', error);
    }
  }

  /**
   * Save printer configurations to file
   */
  saveConfig() {
    try {
      fs.writeJsonSync(this.configPath, this.printers, { spaces: 2 });
    } catch (error) {
      console.error('Error saving printer configurations:', error);
    }
  }

  /**
   * Get all configured printers
   * @returns {Array} - List of printers
   */
  getAllPrinters() {
    return this.printers;
  }

  /**
   * Get a printer by ID
   * @param {string} id - Printer ID
   * @returns {Object|null} - Printer object or null if not found
   */
  getPrinter(id) {
    return this.printers.find(printer => printer.id === id) || null;
  }

  /**
   * Get printer status
   * @param {string} id - Printer ID
   * @returns {Object|null} - Printer status or null if not found
   */
  getPrinterStatus(id) {
    const printer = this.getPrinter(id);
    if (!printer) return null;
    
    return {
      id: printer.id,
      name: printer.name,
      status: printer.status,
      inkLevels: printer.inkLevels || {
        C: 80,
        M: 75,
        Y: 90,
        K: 85,
        W: 60
      }
    };
  }

  /**
   * Add a new printer
   * @param {Object} printerConfig - Printer configuration
   * @returns {Object} - Added printer
   */
  addPrinter(printerConfig) {
    const newPrinter = {
      id: printerConfig.id || `printer${Date.now()}`,
      name: printerConfig.name || 'New Printer',
      model: printerConfig.model || 'Unknown',
      type: printerConfig.type || 'DTF',
      status: 'offline',
      capabilities: printerConfig.capabilities || {
        maxWidth: 329,
        maxHeight: 1200,
        resolution: 1440,
        colors: ['C', 'M', 'Y', 'K', 'W']
      },
      connection: printerConfig.connection || {
        type: 'usb',
        port: 'auto'
      }
    };
    
    this.printers.push(newPrinter);
    this.saveConfig();
    
    return newPrinter;
  }

  /**
   * Update printer configuration
   * @param {string} id - Printer ID
   * @param {Object} updates - Configuration updates
   * @returns {Object|null} - Updated printer or null if not found
   */
  updatePrinter(id, updates) {
    const index = this.printers.findIndex(printer => printer.id === id);
    if (index === -1) return null;
    
    // Update printer configuration
    this.printers[index] = {
      ...this.printers[index],
      ...updates,
      id // Ensure ID doesn't change
    };
    
    this.saveConfig();
    return this.printers[index];
  }

  /**
   * Remove a printer
   * @param {string} id - Printer ID
   * @returns {boolean} - Success status
   */
  removePrinter(id) {
    const index = this.printers.findIndex(printer => printer.id === id);
    if (index === -1) return false;
    
    this.printers.splice(index, 1);
    this.saveConfig();
    
    return true;
  }

  /**
   * Send a print job to a printer
   * @param {string} printerId - Printer ID
   * @param {Object} job - Print job
   * @returns {Promise<Object>} - Print result
   */
  async sendPrintJob(printerId, job) {
    const printer = this.getPrinter(printerId);
    if (!printer) {
      throw new Error('Printer not found');
    }
    
    if (printer.status !== 'online') {
      throw new Error('Printer is not online');
    }
    
    // Simulate print job processing
    return new Promise((resolve, reject) => {
      // Update printer status
      this.updatePrinter(printerId, { status: 'printing' });
      this.emit('status', { id: printerId, status: 'printing' });
      
      // Simulate print completion after a delay
      setTimeout(() => {
        this.updatePrinter(printerId, { status: 'online' });
        this.emit('status', { id: printerId, status: 'online' });
        
        resolve({
          success: true,
          jobId: `print-${Date.now()}`,
          printer: printerId,
          timestamp: new Date().toISOString()
        });
      }, 5000); // Simulate 5 seconds of printing
    });
  }

  /**
   * Start polling for printer status updates
   * Simulates real printer status changes
   */
  startStatusPolling() {
    // Simulate random status changes for demo purposes
    setInterval(() => {
      this.printers.forEach(printer => {
        // Randomly change printer status for demonstration
        if (Math.random() > 0.8) {
          const newStatus = Math.random() > 0.5 ? 'online' : 'offline';
          if (printer.status !== newStatus) {
            printer.status = newStatus;
            this.emit('status', {
              id: printer.id,
              status: newStatus
            });
          }
        }
        
        // Simulate ink level changes
        if (!printer.inkLevels) {
          printer.inkLevels = {
            C: 80,
            M: 75,
            Y: 90,
            K: 85,
            W: 60
          };
        }
        
        // Randomly decrease ink levels
        if (Math.random() > 0.7) {
          const color = ['C', 'M', 'Y', 'K', 'W'][Math.floor(Math.random() * 5)];
          printer.inkLevels[color] = Math.max(0, printer.inkLevels[color] - Math.floor(Math.random() * 5));
          
          this.emit('status', {
            id: printer.id,
            inkLevels: printer.inkLevels
          });
        }
      });
      
      // Save updated configurations
      this.saveConfig();
    }, 10000); // Check every 10 seconds
  }
}

// Create and export singleton instance
const printerManager = new PrinterManager();
module.exports = printerManager;
