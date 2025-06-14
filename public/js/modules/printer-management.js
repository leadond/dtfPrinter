// Printer Management Module

/**
 * Set up printer management functionality
 * @param {Object} socket - Socket.io connection
 */
export function setupPrinterManagement(socket) {
  // DOM elements
  const printersGrid = document.getElementById('printers-grid');
  const printerStatusList = document.getElementById('printer-status-list');
  const addPrinterBtn = document.getElementById('add-printer-btn');
  
  // State
  let printers = [];
  
  // Initialize
  function init() {
    // Set up event listeners
    if (addPrinterBtn) {
      addPrinterBtn.addEventListener('click', showAddPrinterModal);
    }
    
    // Socket event listeners
    socket.on('init', (data) => {
      printers = data.printers || [];
      renderPrinters();
      renderPrinterStatus();
    });
    
    socket.on('printer:status', (data) => {
      const index = printers.findIndex(printer => printer.id === data.id);
      if (index !== -1) {
        // Update printer status
        if (data.status) {
          printers[index].status = data.status;
        }
        
        // Update ink levels if provided
        if (data.inkLevels) {
          printers[index].inkLevels = data.inkLevels;
        }
        
        renderPrinters();
        renderPrinterStatus();
      }
    });
  }
  
  // Render printers grid
  function renderPrinters() {
    if (!printersGrid) return;
    
    if (printers.length === 0) {
      printersGrid.innerHTML = `
        <div class="text-center mt-4 mb-4">
          <i class="fas fa-print fa-3x mb-2" style="color: var(--text-light);"></i>
          <p>No printers configured</p>
          <button class="btn primary mt-2" id="add-first-printer">
            <i class="fas fa-plus"></i> Add Your First Printer
          </button>
        </div>
      `;
      
      const addFirstPrinterBtn = document.getElementById('add-first-printer');
      if (addFirstPrinterBtn) {
        addFirstPrinterBtn.addEventListener('click', showAddPrinterModal);
      }
      
      return;
    }
    
    printersGrid.innerHTML = printers.map(printer => `
      <div class="printer-card" data-id="${printer.id}">
        <div class="printer-header">
          <h3>${printer.name}</h3>
          <span class="status ${printer.status}">
            <i class="fas fa-circle"></i> ${formatStatus(printer.status)}
          </span>
        </div>
        
        <div class="printer-details">
          <div class="detail-item">
            <span class="label">Model:</span>
            <span>${printer.model}</span>
          </div>
          <div class="detail-item">
            <span class="label">Type:</span>
            <span>${printer.type}</span>
          </div>
          <div class="detail-item">
            <span class="label">Connection:</span>
            <span>${formatConnection(printer.connection)}</span>
          </div>
        </div>
        
        ${printer.inkLevels ? `
          <div class="ink-levels">
            <h4>Ink Levels</h4>
            <div class="ink-level-grid">
              ${Object.entries(printer.inkLevels).map(([color, level]) => `
                <div class="ink-level">
                  <span class="color ${color.toLowerCase()}"></span>
                  <div class="level-bar">
                    <div class="level-fill" style="width: ${level}%"></div>
                  </div>
                  <span class="percentage">${level}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="printer-capabilities">
          <h4>Capabilities</h4>
          <div class="capabilities-grid">
            <div class="capability">
              <i class="fas fa-ruler-combined"></i>
              <span>${printer.capabilities.maxWidth} × ${printer.capabilities.maxHeight} mm</span>
            </div>
            <div class="capability">
              <i class="fas fa-tachometer-alt"></i>
              <span>${printer.capabilities.resolution} DPI</span>
            </div>
            <div class="capability">
              <i class="fas fa-palette"></i>
              <span>${printer.capabilities.colors.join(', ')}</span>
            </div>
          </div>
        </div>
        
        <div class="printer-actions">
          <button class="btn edit-printer" data-id="${printer.id}">
            <i class="fas fa-edit"></i> Edit
          </button>
          ${printer.status === 'offline' ? `
            <button class="btn reconnect-printer" data-id="${printer.id}">
              <i class="fas fa-sync-alt"></i> Reconnect
            </button>
          ` : ''}
          <button class="btn danger remove-printer" data-id="${printer.id}">
            <i class="fas fa-trash"></i> Remove
          </button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.edit-printer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const printerId = e.currentTarget.getAttribute('data-id');
        editPrinter(printerId);
      });
    });
    
    document.querySelectorAll('.reconnect-printer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const printerId = e.currentTarget.getAttribute('data-id');
        reconnectPrinter(printerId);
      });
    });
    
    document.querySelectorAll('.remove-printer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const printerId = e.currentTarget.getAttribute('data-id');
        removePrinter(printerId);
      });
    });
  }
  
  // Render printer status on dashboard
  function renderPrinterStatus() {
    if (!printerStatusList) return;
    
    if (printers.length === 0) {
      printerStatusList.innerHTML = `
        <div class="text-center mt-2 mb-2">
          <p>No printers configured</p>
        </div>
      `;
      return;
    }
    
    printerStatusList.innerHTML = printers.map(printer => `
      <div class="printer-item">
        <div class="printer-info">
          <h4>${printer.name}</h4>
          <span class="status ${printer.status}"><i class="fas fa-circle"></i> ${formatStatus(printer.status)}</span>
        </div>
        ${printer.status === 'online' && printer.inkLevels ? `
          <div class="ink-levels">
            ${Object.entries(printer.inkLevels).map(([color, level]) => `
              <div class="ink-level">
                <span class="color ${color.toLowerCase()}"></span>
                <div class="level-bar">
                  <div class="level-fill" style="width: ${level}%"></div>
                </div>
                <span class="percentage">${level}%</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="printer-actions">
            <button class="btn small reconnect-printer" data-id="${printer.id}">
              <i class="fas fa-sync-alt"></i> Reconnect
            </button>
          </div>
        `}
      </div>
    `).join('');
    
    // Add event listeners
    printerStatusList.querySelectorAll('.reconnect-printer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const printerId = e.currentTarget.getAttribute('data-id');
        reconnectPrinter(printerId);
      });
    });
  }
  
  // Show add printer modal
  function showAddPrinterModal() {
    // For now, just show an alert
    alert('Add Printer functionality will be implemented in a future update.');
    
    // In a real implementation, this would open a modal with a form to add a new printer
  }
  
  // Edit printer
  function editPrinter(printerId) {
    const printer = printers.find(p => p.id === printerId);
    if (!printer) return;
    
    // For now, just show an alert with printer details
    alert(`
      Edit Printer: ${printer.name}
      Model: ${printer.model}
      Type: ${printer.type}
      Connection: ${formatConnection(printer.connection)}
    `);
    
    // In a real implementation, this would open a modal with a form to edit the printer
  }
  
  // Reconnect printer
  function reconnectPrinter(printerId) {
    // Simulate reconnection
    fetch(`/api/printers/${printerId}/status`, {
      method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
      alert(`Attempting to reconnect to ${data.name}...`);
      
      // In a real implementation, this would trigger a reconnection attempt
      // For now, we'll just simulate a status change after a delay
      setTimeout(() => {
        socket.emit('printer:status', {
          id: printerId,
          status: Math.random() > 0.3 ? 'online' : 'offline'
        });
      }, 2000);
    })
    .catch(error => {
      console.error('Error reconnecting printer:', error);
      alert(`Error: ${error.message}`);
    });
  }
  
  // Remove printer
  function removePrinter(printerId) {
    if (confirm('Are you sure you want to remove this printer?')) {
      // For now, just show an alert
      alert('Remove Printer functionality will be implemented in a future update.');
      
      // In a real implementation, this would send a request to remove the printer
    }
  }
  
  // Helper: Format printer status
  function formatStatus(status) {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'printing': return 'Printing';
      case 'error': return 'Error';
      default: return status;
    }
  }
  
  // Helper: Format connection info
  function formatConnection(connection) {
    if (connection.type === 'usb') {
      return `USB ${connection.port !== 'auto' ? `(${connection.port})` : ''}`;
    } else if (connection.type === 'network') {
      return `Network (${connection.address})`;
    } else {
      return connection.type;
    }
  }
  
  // Initialize the module
  init();
}
