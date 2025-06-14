// Settings Module

/**
 * Set up settings functionality
 */
export function setupSettings() {
  // DOM elements
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const settingsForm = document.querySelector('.settings-container');
  
  // Range input elements
  const rangeInputs = document.querySelectorAll('.setting-item.range input[type="range"]');
  
  // Initialize
  function init() {
    // Set up event listeners
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    // Set up range input value display
    rangeInputs.forEach(input => {
      const valueDisplay = input.nextElementSibling;
      if (valueDisplay && valueDisplay.classList.contains('range-value')) {
        // Set initial value
        updateRangeValue(input, valueDisplay);
        
        // Update on input change
        input.addEventListener('input', () => {
          updateRangeValue(input, valueDisplay);
        });
      }
    });
    
    // Load saved settings
    loadSettings();
  }
  
  // Update range value display
  function updateRangeValue(input, display) {
    let value = input.value;
    
    // Add units if needed
    if (input.id === 'white-density' || input.id === 'processing-threads') {
      value = value;
    } else if (input.id === 'white-expansion') {
      value = value + 'px';
    } else {
      value = value;
    }
    
    // Update display
    display.textContent = value;
  }
  
  // Load settings from localStorage
  function loadSettings() {
    try {
      const savedSettings = localStorage.getItem('dtf-rip-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Apply settings to form elements
        Object.entries(settings).forEach(([key, value]) => {
          const element = document.getElementById(key);
          if (element) {
            if (element.type === 'checkbox') {
              element.checked = value;
            } else {
              element.value = value;
            }
            
            // Update range value displays
            if (element.type === 'range') {
              const valueDisplay = element.nextElementSibling;
              if (valueDisplay && valueDisplay.classList.contains('range-value')) {
                updateRangeValue(element, valueDisplay);
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  // Save settings to localStorage
  function saveSettings() {
    try {
      const settings = {};
      
      // Collect all form elements
      const formElements = document.querySelectorAll('.settings-panel input, .settings-panel select');
      
      formElements.forEach(element => {
        if (element.id) {
          if (element.type === 'checkbox') {
            settings[element.id] = element.checked;
          } else {
            settings[element.id] = element.value;
          }
        }
      });
      
      // Save to localStorage
      localStorage.setItem('dtf-rip-settings', JSON.stringify(settings));
      
      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings: ' + error.message);
    }
  }
  
  // Initialize the module
  init();
}
