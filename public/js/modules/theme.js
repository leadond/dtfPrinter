// Theme Module

/**
 * Set up theme switching functionality
 */
export function setupTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle.querySelector('i');
  const body = document.body;
  
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
  }
  
  // Handle theme toggle click
  themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-theme');
    
    // Update icon
    if (body.classList.contains('dark-theme')) {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
      localStorage.setItem('theme', 'dark');
    } else {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
      localStorage.setItem('theme', 'light');
    }
  });
  
  // Handle theme selection in settings
  const themeSelect = document.getElementById('app-theme');
  if (themeSelect) {
    // Set initial value
    themeSelect.value = savedTheme || 'light';
    
    themeSelect.addEventListener('change', () => {
      const selectedTheme = themeSelect.value;
      
      if (selectedTheme === 'dark') {
        body.classList.add('dark-theme');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
      } else if (selectedTheme === 'light') {
        body.classList.remove('dark-theme');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
      } else {
        // System default - check prefers-color-scheme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          body.classList.add('dark-theme');
          themeIcon.classList.remove('fa-moon');
          themeIcon.classList.add('fa-sun');
        } else {
          body.classList.remove('dark-theme');
          themeIcon.classList.remove('fa-sun');
          themeIcon.classList.add('fa-moon');
        }
        localStorage.setItem('theme', 'system');
      }
    });
  }
}
