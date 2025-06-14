// Socket Connection Module

/**
 * Set up Socket.IO connection
 * @returns {Object} - Socket.io connection
 */
export function setupSocketConnection() {
  // Connect to Socket.IO server
  const socket = io();
  
  // Connection event handlers
  socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    updateConnectionStatus(false);
  });
  
  // Update connection status in UI
  function updateConnectionStatus(connected) {
    const statusIndicators = document.querySelectorAll('.status-indicators .status-item');
    
    statusIndicators.forEach(indicator => {
      const label = indicator.querySelector('.label');
      const status = indicator.querySelector('.status');
      
      if (label && label.textContent.includes('RIP Engine')) {
        if (connected) {
          status.className = 'status online';
          status.innerHTML = '<i class="fas fa-circle"></i> Online';
        } else {
          status.className = 'status offline';
          status.innerHTML = '<i class="fas fa-circle"></i> Offline';
        }
      }
    });
  }
  
  return socket;
}
