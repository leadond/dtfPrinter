// Modals Module

/**
 * Set up modal functionality
 */
export function setupModals() {
  // DOM elements
  const modals = document.querySelectorAll('.modal');
  const closeButtons = document.querySelectorAll('.close-modal');
  
  // Initialize
  function init() {
    // Set up close buttons
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        if (modal) {
          modal.classList.remove('active');
        }
      });
    });
    
    // Close modal when clicking outside content
    modals.forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
    
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modals.forEach(modal => {
          if (modal.classList.contains('active')) {
            modal.classList.remove('active');
          }
        });
      }
    });
  }
  
  // Initialize the module
  init();
}
