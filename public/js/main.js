// Main JavaScript for DTF RIP Pro

// Connect to Socket.IO server
const socket = io();

// DOM Elements
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');
const modals = document.querySelectorAll('.modal');
const modalCloseButtons = document.querySelectorAll('.modal-close');
const toastContainer = document.getElementById('toast-container');

// Navigation
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Get section ID from data attribute
    const sectionId = link.getAttribute('data-section');
    
    // Hide all sections
    sections.forEach(section => {
      section.classList.add('hidden');
      section.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
      selectedSection.classList.remove('hidden');
      selectedSection.classList.add('active');
    }
    
    // Update active link
    navLinks.forEach(navLink => {
      navLink.classList.remove('active');
    });
    link.classList.add('active');
  });
});

// Modal Handling
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

// Close modal when clicking close button
modalCloseButtons.forEach(button => {
  button.addEventListener('click', () => {
    const modal = button.closest('.modal');
    closeModal(modal);
  });
});

// Close modal when clicking outside
modals.forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });
});

// New Job Button
document.getElementById('btn-new-job').addEventListener('click', () => {
  openModal('new-job-modal');
});

document.getElementById('btn-new-job-2').addEventListener('click', () => {
  openModal('new-job-modal');
});

// Add Printer Button
document.getElementById('btn-add-printer').addEventListener('click', () => {
  openModal('add-printer-modal');
});

// Add Color Profile Button
document.getElementById('btn-add-profile').addEventListener('click', () => {
  openModal('add-profile-modal');
});

// File Input Display
document.getElementById('job-file').addEventListener('change', (e) => {
  const fileName = e.target.files[0]?.name || 'Select a file';
  document.getElementById('file-name-display').textContent = fileName;
});

// Toast Notifications
function showToast(message, type = 'info', duration = 5000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '';
  switch (type) {
    case 'success':
      icon = '<i class="fas fa-check-circle mr-2"></i>';
      break;
    case 'error':
      icon = '<i class="fas fa-exclamation-circle mr-2"></i>';
      break;
    case 'warning':
      icon = '<i class="fas fa-exclamation-triangle mr-2"></i>';
      break;
    default:
      icon = '<i class="fas fa-info-circle mr-2"></i>';
  }
  
  toast.innerHTML = `
    <div class="flex justify-between items-start">
      <div class="flex items-center">
        ${icon}
        <span>${message}</span>
      </div>
      <button class="text-gray-400 hover:text-gray-600 ml-2 toast-close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Close button
  const closeButton = toast.querySelector('.toast-close');
  closeButton.addEventListener('click', () => {
    toast.remove();
  });
  
  // Auto remove after duration
  setTimeout(() => {
    toast.remove();
  }, duration);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Format status badge
function formatStatusBadge(status) {
  let icon = '';
  switch (status) {
    case 'pending':
      icon = '<i class="fas fa-clock mr-1"></i>';
      break;
    case 'processing':
      icon = '<i class="fas fa-spinner fa-spin mr-1"></i>';
      break;
    case 'ready':
      icon = '<i class="fas fa-check mr-1"></i>';
      break;
    case 'printing':
      icon = '<i class="fas fa-print mr-1"></i>';
      break;
    case 'completed':
      icon = '<i class="fas fa-check-circle mr-1"></i>';
      break;
    case 'error':
      icon = '<i class="fas fa-exclamation-circle mr-1"></i>';
      break;
    default:
      icon = '<i class="fas fa-question-circle mr-1"></i>';
  }
  
  return `<span class="status-badge ${status}">${icon}${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

// Format progress bar
function formatProgressBar(progress, status) {
  return `
    <div class="progress-bar">
      <div class="progress-bar-fill ${status}" style="width: ${progress}%"></div>
    </div>
  `;
}

// API Functions
// Get all jobs
async function fetchJobs() {
  try {
    const response = await fetch('/api/jobs');
    const data = await response.json();
    return data.jobs;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    showToast('Failed to fetch jobs', 'error');
    return [];
  }
}

// Get all printers
async function fetchPrinters() {
  try {
    const response = await fetch('/api/printers');
    const data = await response.json();
    return data.printers;
  } catch (error) {
    console.error('Error fetching printers:', error);
    showToast('Failed to fetch printers', 'error');
    return [];
  }
}

// Get all color profiles
async function fetchColorProfiles() {
  try {
    const response = await fetch('/api/color-profiles');
    const data = await response.json();
    return data.profiles;
  } catch (error) {
    console.error('Error fetching color profiles:', error);
    showToast('Failed to fetch color profiles', 'error');
    return [];
  }
}

// Create a new job
async function createJob(jobData) {
  try {
    const formData = new FormData();
    formData.append('file', jobData.file);
    
    // Upload file first
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const uploadData = await uploadResponse.json();
    
    if (!uploadData.success) {
      throw new Error(uploadData.error || 'Failed to upload file');
    }
    
    // Create job with uploaded file
    const jobResponse = await fetch('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: jobData.name,
        fileId: uploadData.file.id,
        fileName: uploadData.file.name,
        printer: jobData.printer,
        colorProfile: jobData.colorProfile
      })
    });
    
    const jobResult = await jobResponse.json();
    
    if (!jobResult.success) {
      throw new Error(jobResult.error || 'Failed to create job');
    }
    
    return jobResult.job;
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }
}

// Update job status
async function updateJobStatus(jobId, status) {
  try {
    const response = await fetch(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update job status');
    }
    
    return data.job;
  } catch (error) {
    console.error('Error updating job status:', error);
    throw error;
  }
}

// Delete a job
async function deleteJob(jobId) {
  try {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete job');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
}

// Add a printer
async function addPrinter(printerData) {
  try {
    // In a real implementation, this would make an API call
    // For now, we'll just emit a socket event to simulate adding a printer
    socket.emit('printer:add', printerData);
    return true;
  } catch (error) {
    console.error('Error adding printer:', error);
    throw error;
  }
}

// Add a color profile
async function addColorProfile(profileData) {
  try {
    // In a real implementation, this would make an API call
    // For now, we'll just emit a socket event to simulate adding a profile
    socket.emit('profile:add', profileData);
    return true;
  } catch (error) {
    console.error('Error adding color profile:', error);
    throw error;
  }
}

// UI Update Functions
// Update jobs table
function updateJobsTable(jobs) {
  const jobsTable = document.getElementById('jobs-table');
  const recentJobsTable = document.getElementById('recent-jobs-table');
  
  if (!jobs || jobs.length === 0) {
    jobsTable.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No jobs found</td></tr>';
    recentJobsTable.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No recent jobs</td></tr>';
    return;
  }
  
  // Update jobs table
  let jobsHtml = '';
  jobs.forEach(job => {
    jobsHtml += `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap">
          ${job.previewUrl ? `<img src="${job.previewUrl}" alt="Preview" class="h-12 w-12 object-cover rounded">` : 
          '<div class="h-12 w-12 bg-gray-200 rounded flex items-center justify-center"><i class="fas fa-image text-gray-400"></i></div>'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="font-medium text-gray-900">${job.name}</div>
          <div class="text-sm text-gray-500">${job.fileName}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${formatStatusBadge(job.status)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${job.printer}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${formatProgressBar(job.progress, job.status)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${formatDate(job.createdAt)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button class="text-blue-600 hover:text-blue-900 mr-2 btn-view-job" data-job-id="${job.id}">
            <i class="fas fa-eye"></i>
          </button>
          ${job.status === 'ready' ? `
            <button class="text-green-600 hover:text-green-900 mr-2 btn-print-job" data-job-id="${job.id}">
              <i class="fas fa-print"></i>
            </button>
          ` : ''}
          <button class="text-red-600 hover:text-red-900 btn-delete-job" data-job-id="${job.id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
  jobsTable.innerHTML = jobsHtml;
  
  // Add event listeners to job action buttons
  document.querySelectorAll('.btn-view-job').forEach(button => {
    button.addEventListener('click', () => {
      const jobId = button.getAttribute('data-job-id');
      viewJobDetails(jobId);
    });
  });
  
  document.querySelectorAll('.btn-print-job').forEach(button => {
    button.addEventListener('click', async () => {
      const jobId = button.getAttribute('data-job-id');
      try {
        await updateJobStatus(jobId, 'printing');
        showToast('Job sent to printer', 'success');
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
  
  document.querySelectorAll('.btn-delete-job').forEach(button => {
    button.addEventListener('click', async () => {
      const jobId = button.getAttribute('data-job-id');
      if (confirm('Are you sure you want to delete this job?')) {
        try {
          await deleteJob(jobId);
          showToast('Job deleted successfully', 'success');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
  });
  
  // Update recent jobs table (show only the 5 most recent)
  const recentJobs = [...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  
  let recentJobsHtml = '';
  recentJobs.forEach(job => {
    recentJobsHtml += `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="font-medium text-gray-900">${job.name}</div>
          <div class="text-sm text-gray-500">${job.fileName}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${formatStatusBadge(job.status)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${job.printer}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${formatDate(job.createdAt)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button class="text-blue-600 hover:text-blue-900 btn-view-job" data-job-id="${job.id}">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `;
  });
  
  if (recentJobs.length === 0) {
    recentJobsHtml = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No recent jobs</td></tr>';
  }
  
  recentJobsTable.innerHTML = recentJobsHtml;
  
  // Add event listeners to recent job view buttons
  document.querySelectorAll('#recent-jobs-table .btn-view-job').forEach(button => {
    button.addEventListener('click', () => {
      const jobId = button.getAttribute('data-job-id');
      viewJobDetails(jobId);
    });
  });
  
  // Update job counts
  const activeJobs = jobs.filter(job => ['pending', 'processing', 'ready', 'printing'].includes(job.status));
  const completedToday = jobs.filter(job => {
    if (job.status !== 'completed') return false;
    const today = new Date();
    const jobDate = new Date(job.updatedAt);
    return today.toDateString() === jobDate.toDateString();
  });
  
  document.getElementById('active-jobs-count').textContent = activeJobs.length;
  document.getElementById('completed-jobs-count').textContent = completedToday.length;
}

// Update printers grid
function updatePrintersGrid(printers) {
  const printersGrid = document.getElementById('printers-grid');
  const printerSelect = document.getElementById('job-printer');
  
  if (!printers || printers.length === 0) {
    printersGrid.innerHTML = '<div class="col-span-2 bg-white rounded-lg shadow-md p-6 text-center text-gray-500">No printers found</div>';
    printerSelect.innerHTML = '<option value="">No printers available</option>';
    return;
  }
  
  // Update printers grid
  let printersHtml = '';
  printers.forEach(printer => {
    const statusClass = printer.connected ? (printer.status === 'error' ? 'error' : 'online') : 'offline';
    const statusText = printer.connected ? (printer.status === 'error' ? 'Error' : 'Online') : 'Offline';
    
    printersHtml += `
      <div class="printer-card">
        <div class="printer-header ${statusClass}">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold">${printer.name}</h3>
            <span class="text-xs font-medium px-2 py-1 bg-white bg-opacity-20 rounded-full">${statusText}</span>
          </div>
          <div class="text-sm opacity-80">${printer.model}</div>
        </div>
        <div class="printer-body">
          <div class="grid grid-cols-2 gap-2 mb-4">
            <div>
              <div class="text-xs text-gray-500">IP Address</div>
              <div class="font-medium">${printer.ipAddress}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Port</div>
              <div class="font-medium">${printer.port}</div>
            </div>
          </div>
          
          <div class="mb-4">
            <div class="text-xs text-gray-500 mb-1">Ink Levels</div>
            <div class="space-y-2">
              <div class="flex items-center">
                <span class="w-12 text-xs text-gray-600">Cyan</span>
                <div class="flex-grow bg-gray-200 rounded-full h-2 ml-2">
                  <div class="bg-cyan-500 h-2 rounded-full" style="width: ${printer.inkLevels?.cyan || 0}%"></div>
                </div>
              </div>
              <div class="flex items-center">
                <span class="w-12 text-xs text-gray-600">Magenta</span>
                <div class="flex-grow bg-gray-200 rounded-full h-2 ml-2">
                  <div class="bg-pink-500 h-2 rounded-full" style="width: ${printer.inkLevels?.magenta || 0}%"></div>
                </div>
              </div>
              <div class="flex items-center">
                <span class="w-12 text-xs text-gray-600">Yellow</span>
                <div class="flex-grow bg-gray-200 rounded-full h-2 ml-2">
                  <div class="bg-yellow-500 h-2 rounded-full" style="width: ${printer.inkLevels?.yellow || 0}%"></div>
                </div>
              </div>
              <div class="flex items-center">
                <span class="w-12 text-xs text-gray-600">Black</span>
                <div class="flex-grow bg-gray-200 rounded-full h-2 ml-2">
                  <div class="bg-gray-800 h-2 rounded-full" style="width: ${printer.inkLevels?.black || 0}%"></div>
                </div>
              </div>
              <div class="flex items-center">
                <span class="w-12 text-xs text-gray-600">White</span>
                <div class="flex-grow bg-gray-200 rounded-full h-2 ml-2">
                  <div class="bg-gray-400 h-2 rounded-full" style="width: ${printer.inkLevels?.white || 0}%"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex justify-between">
            <button class="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded btn-printer-settings" data-printer-id="${printer.id}">
              <i class="fas fa-cog mr-1"></i> Settings
            </button>
            ${printer.connected ? `
              <button class="text-sm px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded btn-disconnect-printer" data-printer-id="${printer.id}">
                <i class="fas fa-unlink mr-1"></i> Disconnect
              </button>
            ` : `
              <button class="text-sm px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded btn-connect-printer" data-printer-id="${printer.id}">
                <i class="fas fa-link mr-1"></i> Connect
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  });
  
  printersGrid.innerHTML = printersHtml;
  
  // Update printer select in new job form
  let printerOptions = '<option value="">Select a printer</option>';
  printers.forEach(printer => {
    const disabled = !printer.connected;
    printerOptions += `<option value="${printer.id}" ${disabled ? 'disabled' : ''}>${printer.name} ${disabled ? '(Offline)' : ''}</option>`;
  });
  printerSelect.innerHTML = printerOptions;
  
  // Update active printer count
  const activePrinters = printers.filter(printer => printer.connected);
  document.getElementById('active-printers-count').textContent = activePrinters.length;
  
  // Update printer status on dashboard
  if (activePrinters.length > 0) {
    const mainPrinter = activePrinters[0];
    document.getElementById('printer-status').textContent = mainPrinter.status.charAt(0).toUpperCase() + mainPrinter.status.slice(1);
    document.getElementById('printer-status').className = `text-sm font-medium px-2 py-1 rounded-full ${getStatusColorClass(mainPrinter.status)}`;
    document.getElementById('active-printer-name').textContent = mainPrinter.name;
  } else {
    document.getElementById('printer-status').textContent = 'No Printer';
    document.getElementById('printer-status').className = 'text-sm font-medium px-2 py-1 bg-gray-100 text-gray-500 rounded-full';
    document.getElementById('active-printer-name').textContent = 'No printer connected';
  }
  
  // Add event listeners to printer buttons
  document.querySelectorAll('.btn-connect-printer').forEach(button => {
    button.addEventListener('click', () => {
      const printerId = button.getAttribute('data-printer-id');
      socket.emit('printer:connect', { id: printerId });
    });
  });
  
  document.querySelectorAll('.btn-disconnect-printer').forEach(button => {
    button.addEventListener('click', () => {
      const printerId = button.getAttribute('data-printer-id');
      socket.emit('printer:disconnect', { id: printerId });
    });
  });
}

// Update color profiles grid
function updateProfilesGrid(profiles) {
  const profilesGrid = document.getElementById('profiles-grid');
  const profileSelect = document.getElementById('job-color-profile');
  
  if (!profiles || profiles.length === 0) {
    profilesGrid.innerHTML = '<div class="col-span-3 bg-white rounded-lg shadow-md p-6 text-center text-gray-500">No color profiles found</div>';
    profileSelect.innerHTML = '<option value="">Default</option>';
    return;
  }
  
  // Update profiles grid
  let profilesHtml = '';
  profiles.forEach(profile => {
    profilesHtml += `
      <div class="profile-card">
        <div class="profile-header">
          <h3 class="text-lg font-bold">${profile.name}</h3>
          <div class="text-sm opacity-80">${profile.type.toUpperCase()}</div>
        </div>
        <div class="profile-body">
          <p class="text-sm text-gray-600 mb-4">${profile.description || 'No description'}</p>
          
          <div class="grid grid-cols-2 gap-2 mb-4">
            <div>
              <div class="text-xs text-gray-500">Ink Limit</div>
              <div class="font-medium">${profile.settings.inkLimit}%</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Black Generation</div>
              <div class="font-medium">${profile.settings.blackGeneration.charAt(0).toUpperCase() + profile.settings.blackGeneration.slice(1)}</div>
            </div>
          </div>
          
          <div class="flex justify-between">
            <button class="text-sm px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded btn-edit-profile" data-profile-id="${profile.id}">
              <i class="fas fa-edit mr-1"></i> Edit
            </button>
            ${['standard', 'vivid', 'muted'].includes(profile.id) ? '' : `
              <button class="text-sm px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded btn-delete-profile" data-profile-id="${profile.id}">
                <i class="fas fa-trash mr-1"></i> Delete
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  });
  
  profilesGrid.innerHTML = profilesHtml;
  
  // Update profile select in new job form
  let profileOptions = '<option value="">Default</option>';
  profiles.forEach(profile => {
    profileOptions += `<option value="${profile.id}">${profile.name}</option>`;
  });
  profileSelect.innerHTML = profileOptions;
  
  // Update color profiles count
  document.getElementById('color-profiles-count').textContent = profiles.length;
}

// Get status color class
function getStatusColorClass(status) {
  switch (status) {
    case 'idle':
      return 'bg-green-100 text-green-800';
    case 'printing':
      return 'bg-blue-100 text-blue-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// View job details
function viewJobDetails(jobId) {
  // Find job in global state
  const job = window.appState.jobs.find(j => j.id === jobId);
  
  if (!job) {
    showToast('Job not found', 'error');
    return;
  }
  
  // Update modal with job details
  document.getElementById('job-details-title').textContent = job.name;
  document.getElementById('job-details-status').textContent = job.status.charAt(0).toUpperCase() + job.status.slice(1);
  document.getElementById('job-details-printer').textContent = job.printer;
  document.getElementById('job-details-profile').textContent = job.colorProfile || 'Standard';
  document.getElementById('job-details-created').textContent = formatDate(job.createdAt);
  document.getElementById('job-details-filename').textContent = job.fileName;
  
  // Set preview image
  if (job.previewUrl) {
    document.getElementById('job-preview-image').src = job.previewUrl;
    document.getElementById('job-preview-image').style.display = 'block';
  } else {
    document.getElementById('job-preview-image').style.display = 'none';
  }
  
  // Set color separation images
  if (job.outputFiles) {
    if (job.outputFiles.cyan) {
      document.getElementById('job-cyan-image').src = job.outputFiles.cyan;
      document.getElementById('job-cyan-image').style.display = 'block';
    } else {
      document.getElementById('job-cyan-image').style.display = 'none';
    }
    
    if (job.outputFiles.magenta) {
      document.getElementById('job-magenta-image').src = job.outputFiles.magenta;
      document.getElementById('job-magenta-image').style.display = 'block';
    } else {
      document.getElementById('job-magenta-image').style.display = 'none';
    }
    
    if (job.outputFiles.yellow) {
      document.getElementById('job-yellow-image').src = job.outputFiles.yellow;
      document.getElementById('job-yellow-image').style.display = 'block';
    } else {
      document.getElementById('job-yellow-image').style.display = 'none';
    }
    
    if (job.outputFiles.black) {
      document.getElementById('job-black-image').src = job.outputFiles.black;
      document.getElementById('job-black-image').style.display = 'block';
    } else {
      document.getElementById('job-black-image').style.display = 'none';
    }
    
    if (job.outputFiles.white) {
      document.getElementById('job-white-image').src = job.outputFiles.white;
      document.getElementById('job-white-image').style.display = 'block';
    } else {
      document.getElementById('job-white-image').style.display = 'none';
    }
  } else {
    document.getElementById('job-cyan-image').style.display = 'none';
    document.getElementById('job-magenta-image').style.display = 'none';
    document.getElementById('job-yellow-image').style.display = 'none';
    document.getElementById('job-black-image').style.display = 'none';
    document.getElementById('job-white-image').style.display = 'none';
  }
  
  // Configure action buttons
  const printButton = document.getElementById('btn-print-job');
  const cancelButton = document.getElementById('btn-cancel-job');
  
  if (job.status === 'ready') {
    printButton.style.display = 'block';
    printButton.onclick = async () => {
      try {
        await updateJobStatus(jobId, 'printing');
        closeModal(document.getElementById('job-details-modal'));
        showToast('Job sent to printer', 'success');
      } catch (error) {
        showToast(error.message, 'error');
      }
    };
  } else {
    printButton.style.display = 'none';
  }
  
  if (['pending', 'processing', 'ready'].includes(job.status)) {
    cancelButton.style.display = 'block';
    cancelButton.onclick = async () => {
      if (confirm('Are you sure you want to cancel this job?')) {
        try {
          await deleteJob(jobId);
          closeModal(document.getElementById('job-details-modal'));
          showToast('Job cancelled successfully', 'success');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    };
  } else {
    cancelButton.style.display = 'none';
  }
  
  // Open modal
  openModal('job-details-modal');
}

// Form Submissions
// New Job Form
document.getElementById('new-job-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('job-name').value;
  const fileInput = document.getElementById('job-file');
  const printer = document.getElementById('job-printer').value;
  const colorProfile = document.getElementById('job-color-profile').value;
  
  if (!name || !fileInput.files[0] || !printer) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  try {
    await createJob({
      name,
      file: fileInput.files[0],
      printer,
      colorProfile
    });
    
    // Reset form
    e.target.reset();
    document.getElementById('file-name-display').textContent = 'Select a file';
    
    // Close modal
    closeModal(document.getElementById('new-job-modal'));
    
    showToast('Job created successfully', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// Add Printer Form
document.getElementById('add-printer-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('printer-name').value;
  const model = document.getElementById('printer-model').value;
  const ipAddress = document.getElementById('printer-ip').value;
  const port = document.getElementById('printer-port').value;
  const whiteInk = document.getElementById('printer-white-ink').checked;
  const cmyk = document.getElementById('printer-cmyk').checked;
  
  if (!name || !model || !ipAddress || !port) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  try {
    await addPrinter({
      name,
      model,
      ipAddress,
      port: parseInt(port),
      capabilities: {
        whiteInk,
        cmykSupport: cmyk
      }
    });
    
    // Reset form
    e.target.reset();
    
    // Close modal
    closeModal(document.getElementById('add-printer-modal'));
    
    showToast('Printer added successfully', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// Add Color Profile Form
document.getElementById('add-profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('profile-name').value;
  const description = document.getElementById('profile-description').value;
  const inkLimit = document.getElementById('profile-ink-limit').value;
  const blackGeneration = document.getElementById('profile-black-generation').value;
  const whiteUnderbase = document.querySelector('input[name="white-underbase"]:checked').value === 'true';
  
  if (!name) {
    showToast('Please enter a profile name', 'error');
    return;
  }
  
  // Get color adjustments
  const colorAdjustments = {
    cyan: {
      brightness: parseInt(document.getElementById('cyan-brightness').value),
      contrast: parseInt(document.getElementById('cyan-contrast').value),
      saturation: parseInt(document.getElementById('cyan-saturation').value)
    },
    magenta: {
      brightness: parseInt(document.getElementById('magenta-brightness').value),
      contrast: parseInt(document.getElementById('magenta-contrast').value),
      saturation: parseInt(document.getElementById('magenta-saturation').value)
    },
    yellow: {
      brightness: parseInt(document.getElementById('yellow-brightness').value),
      contrast: parseInt(document.getElementById('yellow-contrast').value),
      saturation: parseInt(document.getElementById('yellow-saturation').value)
    },
    black: {
      brightness: parseInt(document.getElementById('black-brightness').value),
      contrast: parseInt(document.getElementById('black-contrast').value),
      saturation: parseInt(document.getElementById('black-saturation').value)
    }
  };
  
  try {
    await addColorProfile({
      name,
      description,
      type: 'dtf',
      settings: {
        inkLimit: parseInt(inkLimit),
        blackGeneration,
        whiteUnderbase,
        colorAdjustments
      }
    });
    
    // Reset form
    e.target.reset();
    
    // Close modal
    closeModal(document.getElementById('add-profile-modal'));
    
    showToast('Color profile created successfully', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// Socket.IO Event Handlers
// Initialize app with data from server
socket.on('init', (data) => {
  // Store data in global state
  window.appState = {
    jobs: data.jobs || [],
    printers: data.printers || [],
    profiles: data.profiles || []
  };
  
  // Update UI
  updateJobsTable(data.jobs);
  updatePrintersGrid(data.printers);
  updateProfilesGrid(data.profiles);
  
  // Update last update time
  document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
});

// Job events
socket.on('job:new', (job) => {
  // Add job to global state
  window.appState.jobs.push(job);
  
  // Update UI
  updateJobsTable(window.appState.jobs);
  
  // Show notification
  showToast(`New job created: ${job.name}`, 'info');
  
  // Update last update time
  document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
});

socket.on('job:update', (job) => {
  // Update job in global state
  const index = window.appState.jobs.findIndex(j => j.id === job.id);
  if (index !== -1) {
    window.appState.jobs[index] = job;
  }
  
  // Update UI
  updateJobsTable(window.appState.jobs);
  
  // Show notification for completed jobs
  if (job.status === 'completed') {
    showToast(`Job completed: ${job.name}`, 'success');
  } else if (job.status === 'error') {
    showToast(`Job error: ${job.name}`, 'error');
  }
  
  // Update last update time
  document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
});

socket.on('job:delete', (data) => {
  // Remove job from global state
  window.appState.jobs = window.appState.jobs.filter(job => job.id !== data.id);
  
  // Update UI
  updateJobsTable(window.appState.jobs);
  
  // Update last update time
  document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
});

socket.on('job:progress', (data) => {
  // Update job progress in global state
  const job = window.appState.jobs.find(j => j.id === data.id);
  if (job) {
    job.progress = data.progress;
    job.status = data.status;
    if (data.message) job.message = data.message;
    if (data.error) job.error = data.error;
  }
  
  // Update UI
  updateJobsTable(window.appState.jobs);
  
  // Update last update time
  document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
});

// Printer events
socket.on('printer:status', (data) => {
  // Update printer status in global state
  const printer = window.appState.printers.find(p => p.id === data.id);
  if (printer) {
    printer.status = data.status;
    printer.connected = data.connected;
    if (data.inkLevels) printer.inkLevels = data.inkLevels;
  }
  
  // Update UI
  updatePrintersGrid(window.appState.printers);
  
  // Show notification for printer errors
  if (data.status === 'error') {
    const printerName = printer ? printer.name : 'Unknown printer';
    showToast(`Printer error: ${printerName}`, 'error');
  }
  
  // Update last update time
  document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
});

// Initialize global state
window.appState = {
  jobs: [],
  printers: [],
  profiles: []
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Set current date for history filter
  document.getElementById('history-date-filter').valueAsDate = new Date();
  
  // Update last update time
  document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
});
