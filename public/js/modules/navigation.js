// Navigation Module

/**
 * Set up navigation between different views
 */
export function setupNavigation() {
  const navLinks = document.querySelectorAll('.main-nav a');
  const views = document.querySelectorAll('.view');
  
  // Handle navigation clicks
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Get the target view
      const targetView = link.getAttribute('data-view');
      
      // Update active link
      navLinks.forEach(navLink => navLink.classList.remove('active'));
      link.classList.add('active');
      
      // Show the target view
      views.forEach(view => {
        if (view.id === `${targetView}-view`) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });
    });
  });
  
  // Handle settings panel navigation
  const settingsTabs = document.querySelectorAll('.settings-sidebar a');
  const settingsPanels = document.querySelectorAll('.settings-panel');
  
  settingsTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Get the target panel
      const targetPanel = tab.getAttribute('href').substring(1);
      
      // Update active tab
      settingsTabs.forEach(settingsTab => settingsTab.classList.remove('active'));
      tab.classList.add('active');
      
      // Show the target panel
      settingsPanels.forEach(panel => {
        if (panel.id === targetPanel) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });
  
  // Handle "New Job" button clicks
  const newJobButtons = document.querySelectorAll('#new-job-btn, #jobs-new-btn');
  const newJobModal = document.getElementById('new-job-modal');
  
  newJobButtons.forEach(button => {
    button.addEventListener('click', () => {
      newJobModal.classList.add('active');
    });
  });
}
