// Color Profiles Module

/**
 * Set up color profile management functionality
 * @param {Object} socket - Socket.io connection
 */
export function setupColorProfiles(socket) {
  // DOM elements
  const profilesGrid = document.getElementById('profiles-grid');
  const addProfileBtn = document.getElementById('add-profile-btn');
  const importIccBtn = document.getElementById('import-icc-btn');
  
  // State
  let profiles = [];
  
  // Initialize
  function init() {
    // Set up event listeners
    if (addProfileBtn) {
      addProfileBtn.addEventListener('click', showAddProfileModal);
    }
    
    if (importIccBtn) {
      importIccBtn.addEventListener('click', showImportIccModal);
    }
    
    // Socket event listeners
    socket.on('init', (data) => {
      profiles = data.profiles || [];
      renderProfiles();
    });
  }
  
  // Render color profiles grid
  function renderProfiles() {
    if (!profilesGrid) return;
    
    if (profiles.length === 0) {
      profilesGrid.innerHTML = `
        <div class="text-center mt-4 mb-4">
          <i class="fas fa-palette fa-3x mb-2" style="color: var(--text-light);"></i>
          <p>No color profiles configured</p>
          <button class="btn primary mt-2" id="add-first-profile">
            <i class="fas fa-plus"></i> Add Your First Profile
          </button>
        </div>
      `;
      
      const addFirstProfileBtn = document.getElementById('add-first-profile');
      if (addFirstProfileBtn) {
        addFirstProfileBtn.addEventListener('click', showAddProfileModal);
      }
      
      return;
    }
    
    profilesGrid.innerHTML = profiles.map(profile => `
      <div class="profile-card" data-id="${profile.id}">
        <div class="profile-header">
          <h3>${profile.name}</h3>
          ${profile.id === 'standard' ? '<span class="badge">Default</span>' : ''}
        </div>
        
        <div class="profile-description">
          <p>${profile.description || 'No description'}</p>
        </div>
        
        <div class="profile-details">
          <div class="detail-item">
            <span class="label">Type:</span>
            <span>${profile.type.toUpperCase()}</span>
          </div>
          
          ${profile.iccFile ? `
            <div class="detail-item">
              <span class="label">ICC File:</span>
              <span>${profile.iccFile}</span>
            </div>
          ` : ''}
        </div>
        
        ${profile.settings ? `
          <div class="profile-settings">
            <h4>Settings</h4>
            <div class="settings-grid">
              ${Object.entries(profile.settings).map(([key, value]) => `
                <div class="setting-item">
                  <span class="label">${formatSettingName(key)}:</span>
                  <span>${formatSettingValue(key, value)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="profile-preview">
          <div class="color-preview">
            <div class="color-bar c" style="opacity: ${getColorIntensity(profile, 'c')}"></div>
            <div class="color-bar m" style="opacity: ${getColorIntensity(profile, 'm')}"></div>
            <div class="color-bar y" style="opacity: ${getColorIntensity(profile, 'y')}"></div>
            <div class="color-bar k" style="opacity: ${getColorIntensity(profile, 'k')}"></div>
          </div>
        </div>
        
        <div class="profile-actions">
          <button class="btn edit-profile" data-id="${profile.id}" ${profile.id === 'standard' ? 'disabled' : ''}>
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn duplicate-profile" data-id="${profile.id}">
            <i class="fas fa-copy"></i> Duplicate
          </button>
          <button class="btn danger remove-profile" data-id="${profile.id}" ${profile.id === 'standard' ? 'disabled' : ''}>
            <i class="fas fa-trash"></i> Remove
          </button>
        </div>
      </div>
    `).join('');
    
    // Add styles for profile cards
    const style = document.createElement('style');
    style.textContent = `
      .profile-card {
        background-color: var(--card-bg);
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-md);
        padding: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
      }
      
      .profile-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .profile-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }
      
      .badge {
        background-color: var(--primary-color);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: var(--border-radius-sm);
        font-size: 0.75rem;
        font-weight: 500;
      }
      
      .profile-description {
        color: var(--text-muted);
        font-size: 0.875rem;
      }
      
      .profile-details, .profile-settings {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }
      
      .profile-settings h4 {
        margin-bottom: var(--spacing-xs);
        font-size: 1rem;
        font-weight: 500;
      }
      
      .settings-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: var(--spacing-sm);
      }
      
      .detail-item, .setting-item {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }
      
      .detail-item .label, .setting-item .label {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-weight: 500;
      }
      
      .color-preview {
        display: flex;
        height: 20px;
        border-radius: var(--border-radius-sm);
        overflow: hidden;
      }
      
      .color-bar {
        flex: 1;
      }
      
      .color-bar.c {
        background-color: var(--ink-c);
      }
      
      .color-bar.m {
        background-color: var(--ink-m);
      }
      
      .color-bar.y {
        background-color: var(--ink-y);
      }
      
      .color-bar.k {
        background-color: var(--ink-k);
      }
      
      .profile-actions {
        display: flex;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-sm);
      }
      
      .profiles-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: var(--spacing-lg);
      }
    `;
    
    document.head.appendChild(style);
    
    // Add event listeners
    document.querySelectorAll('.edit-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.currentTarget.disabled) return;
        const profileId = e.currentTarget.getAttribute('data-id');
        editProfile(profileId);
      });
    });
    
    document.querySelectorAll('.duplicate-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const profileId = e.currentTarget.getAttribute('data-id');
        duplicateProfile(profileId);
      });
    });
    
    document.querySelectorAll('.remove-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.currentTarget.disabled) return;
        const profileId = e.currentTarget.getAttribute('data-id');
        removeProfile(profileId);
      });
    });
  }
  
  // Show add profile modal
  function showAddProfileModal() {
    // For now, just show an alert
    alert('Add Color Profile functionality will be implemented in a future update.');
    
    // In a real implementation, this would open a modal with a form to add a new profile
  }
  
  // Show import ICC profile modal
  function showImportIccModal() {
    // For now, just show an alert
    alert('Import ICC Profile functionality will be implemented in a future update.');
    
    // In a real implementation, this would open a modal with a form to import an ICC profile
  }
  
  // Edit profile
  function editProfile(profileId) {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    // For now, just show an alert with profile details
    alert(`
      Edit Profile: ${profile.name}
      Type: ${profile.type.toUpperCase()}
      Description: ${profile.description || 'No description'}
    `);
    
    // In a real implementation, this would open a modal with a form to edit the profile
  }
  
  // Duplicate profile
  function duplicateProfile(profileId) {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    // For now, just show an alert
    alert(`Profile "${profile.name}" will be duplicated in a future update.`);
    
    // In a real implementation, this would send a request to duplicate the profile
  }
  
  // Remove profile
  function removeProfile(profileId) {
    if (confirm('Are you sure you want to remove this color profile?')) {
      // For now, just show an alert
      alert('Remove Color Profile functionality will be implemented in a future update.');
      
      // In a real implementation, this would send a request to remove the profile
    }
  }
  
  // Helper: Format setting name
  function formatSettingName(key) {
    // Convert camelCase to Title Case with spaces
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  // Helper: Format setting value
  function formatSettingValue(key, value) {
    if (key.includes('Point') || key.includes('saturation') || key.includes('contrast') || key.includes('brightness')) {
      return `${value}%`;
    } else if (key === 'gamma') {
      return value.toFixed(1);
    } else {
      return value;
    }
  }
  
  // Helper: Get color intensity based on profile settings
  function getColorIntensity(profile, color) {
    if (!profile.settings) return 1;
    
    // Base intensity
    let intensity = 1;
    
    // Adjust based on saturation
    if (profile.settings.saturation) {
      intensity *= profile.settings.saturation / 100;
    }
    
    // Specific adjustments for each color
    if (color === 'c' && profile.id === 'muted') {
      intensity *= 0.9;
    } else if (color === 'm' && profile.id === 'vivid') {
      intensity *= 1.1;
    } else if (color === 'y' && profile.id === 'cotton-dark') {
      intensity *= 1.05;
    }
    
    // Clamp between 0.5 and 1 for visibility
    return Math.max(0.5, Math.min(1, intensity));
  }
  
  // Initialize the module
  init();
}
