// Job Management Module

/**
 * Set up job management functionality
 * @param {Object} socket - Socket.io connection
 */
export function setupJobManagement(socket) {
  // DOM elements
  const jobsList = document.getElementById('jobs-list');
  const recentJobsList = document.getElementById('recent-jobs-list');
  const statusFilter = document.getElementById('status-filter');
  const dateFilter = document.getElementById('date-filter');
  const searchBox = document.querySelector('.search-box input');
  
  // File upload handling
  const fileUploadArea = document.getElementById('file-upload-area');
  const fileInput = document.getElementById('job-file');
  const uploadPreview = document.getElementById('upload-preview');
  const previewImage = document.getElementById('preview-image');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  const removeFileBtn = document.getElementById('remove-file');
  
  // Form elements
  const newJobForm = document.getElementById('new-job-form');
  const jobNameInput = document.getElementById('job-name');
  const printerSelect = document.getElementById('job-printer');
  const profileSelect = document.getElementById('job-profile');
  const createJobBtn = document.getElementById('create-job');
  const cancelJobBtn = document.getElementById('cancel-job');
  
  // Modal
  const newJobModal = document.getElementById('new-job-modal');
  const closeModalBtn = document.querySelector('.close-modal');
  
  // State
  let jobs = [];
  let uploadedFile = null;
  
  // Initialize
  function init() {
    // Set up event listeners
    if (fileUploadArea) {
      fileUploadArea.addEventListener('click', () => fileInput.click());
      fileUploadArea.addEventListener('dragover', handleDragOver);
      fileUploadArea.addEventListener('dragleave', handleDragLeave);
      fileUploadArea.addEventListener('drop', handleFileDrop);
    }
    
    if (fileInput) {
      fileInput.addEventListener('change', handleFileSelect);
    }
    
    if (removeFileBtn) {
      removeFileBtn.addEventListener('click', removeFile);
    }
    
    if (createJobBtn) {
      createJobBtn.addEventListener('click', createJob);
    }
    
    if (cancelJobBtn) {
      cancelJobBtn.addEventListener('click', () => {
        newJobModal.classList.remove('active');
        resetJobForm();
      });
    }
    
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        newJobModal.classList.remove('active');
        resetJobForm();
      });
    }
    
    if (statusFilter) {
      statusFilter.addEventListener('change', filterJobs);
    }
    
    if (dateFilter) {
      dateFilter.addEventListener('change', filterJobs);
    }
    
    if (searchBox) {
      searchBox.addEventListener('input', filterJobs);
    }
    
    // Socket event listeners
    socket.on('init', (data) => {
      jobs = data.jobs || [];
      renderJobs();
      populatePrinterSelect(data.printers || []);
      populateProfileSelect(data.profiles || []);
    });
    
    socket.on('job:new', (job) => {
      jobs.unshift(job);
      renderJobs();
    });
    
    socket.on('job:update', (updatedJob) => {
      const index = jobs.findIndex(job => job.id === updatedJob.id);
      if (index !== -1) {
        jobs[index] = { ...jobs[index], ...updatedJob };
        renderJobs();
      }
    });
    
    socket.on('job:progress', (progress) => {
      const index = jobs.findIndex(job => job.id === progress.id);
      if (index !== -1) {
        jobs[index] = { ...jobs[index], ...progress };
        renderJobs();
      }
    });
    
    socket.on('job:delete', (data) => {
      jobs = jobs.filter(job => job.id !== data.id);
      renderJobs();
    });
  }
  
  // Render jobs list
  function renderJobs() {
    renderJobsList();
    renderRecentJobs();
  }
  
  // Render main jobs list
  function renderJobsList() {
    if (!jobsList) return;
    
    // Apply filters
    const filteredJobs = filterJobsList();
    
    if (filteredJobs.length === 0) {
      jobsList.innerHTML = `
        <div class="text-center mt-4 mb-4">
          <i class="fas fa-inbox fa-3x mb-2" style="color: var(--text-light);"></i>
          <p>No jobs found</p>
        </div>
      `;
      return;
    }
    
    jobsList.innerHTML = filteredJobs.map(job => `
      <div class="job-item" data-id="${job.id}">
        <div class="job-preview">
          <img src="${job.previewUrl || 'img/placeholder.png'}" alt="${job.name}">
        </div>
        <div class="job-details">
          <h4>${job.name}</h4>
          <div class="job-meta">
            <span class="status ${job.status}">
              ${getStatusIcon(job.status)} ${formatStatus(job.status)}
              ${job.progress !== undefined && job.progress < 100 ? `(${job.progress}%)` : ''}
            </span>
            <span class="time">${formatDate(job.createdAt)}</span>
          </div>
          ${job.error ? `<div class="error-message mt-1">${job.error}</div>` : ''}
        </div>
        <div class="job-actions">
          ${job.status === 'processed' ? `
            <button class="btn small print-job" data-id="${job.id}"><i class="fas fa-print"></i></button>
          ` : ''}
          <button class="btn small view-job" data-id="${job.id}"><i class="fas fa-eye"></i></button>
          <button class="btn small delete-job" data-id="${job.id}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.print-job').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jobId = e.currentTarget.getAttribute('data-id');
        printJob(jobId);
      });
    });
    
    document.querySelectorAll('.view-job').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jobId = e.currentTarget.getAttribute('data-id');
        viewJob(jobId);
      });
    });
    
    document.querySelectorAll('.delete-job').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jobId = e.currentTarget.getAttribute('data-id');
        deleteJob(jobId);
      });
    });
  }
  
  // Render recent jobs on dashboard
  function renderRecentJobs() {
    if (!recentJobsList) return;
    
    const recentJobs = jobs.slice(0, 3);
    
    if (recentJobs.length === 0) {
      recentJobsList.innerHTML = `
        <div class="text-center mt-2 mb-2">
          <p>No recent jobs</p>
        </div>
      `;
      return;
    }
    
    recentJobsList.innerHTML = recentJobs.map(job => `
      <div class="job-item" data-id="${job.id}">
        <div class="job-preview">
          <img src="${job.previewUrl || 'img/placeholder.png'}" alt="${job.name}">
        </div>
        <div class="job-details">
          <h4>${job.name}</h4>
          <div class="job-meta">
            <span class="status ${job.status}">
              ${getStatusIcon(job.status)} ${formatStatus(job.status)}
            </span>
            <span class="time">${formatDate(job.createdAt)}</span>
          </div>
        </div>
        <div class="job-actions">
          ${job.status === 'processed' ? `
            <button class="btn small print-job" data-id="${job.id}"><i class="fas fa-print"></i></button>
          ` : ''}
          <button class="btn small view-job" data-id="${job.id}"><i class="fas fa-eye"></i></button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners
    recentJobsList.querySelectorAll('.print-job').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jobId = e.currentTarget.getAttribute('data-id');
        printJob(jobId);
      });
    });
    
    recentJobsList.querySelectorAll('.view-job').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jobId = e.currentTarget.getAttribute('data-id');
        viewJob(jobId);
      });
    });
  }
  
  // Filter jobs based on current filter settings
  function filterJobsList() {
    if (!statusFilter || !dateFilter || !searchBox) return jobs;
    
    return jobs.filter(job => {
      // Status filter
      if (statusFilter.value !== 'all' && job.status !== statusFilter.value) {
        return false;
      }
      
      // Date filter
      if (dateFilter.value !== 'all') {
        const jobDate = new Date(job.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dateFilter.value === 'today') {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (jobDate < today || jobDate >= tomorrow) {
            return false;
          }
        } else if (dateFilter.value === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (jobDate < yesterday || jobDate >= today) {
            return false;
          }
        } else if (dateFilter.value === 'week') {
          const weekStart = new Date(today);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          if (jobDate < weekStart) {
            return false;
          }
        } else if (dateFilter.value === 'month') {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          if (jobDate < monthStart) {
            return false;
          }
        }
      }
      
      // Search filter
      const searchTerm = searchBox.value.toLowerCase();
      if (searchTerm && !job.name.toLowerCase().includes(searchTerm)) {
        return false;
      }
      
      return true;
    });
  }
  
  // Handle filter changes
  function filterJobs() {
    renderJobsList();
  }
  
  // Populate printer select dropdown
  function populatePrinterSelect(printers) {
    if (!printerSelect) return;
    
    printerSelect.innerHTML = '<option value="">Select a printer</option>';
    
    printers.forEach(printer => {
      const option = document.createElement('option');
      option.value = printer.id;
      option.textContent = printer.name;
      option.disabled = printer.status !== 'online';
      printerSelect.appendChild(option);
    });
  }
  
  // Populate color profile select dropdown
  function populateProfileSelect(profiles) {
    if (!profileSelect) return;
    
    profileSelect.innerHTML = '';
    
    profiles.forEach(profile => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name;
      profileSelect.appendChild(option);
    });
  }
  
  // Handle drag over event
  function handleDragOver(e) {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
  }
  
  // Handle drag leave event
  function handleDragLeave(e) {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
  }
  
  // Handle file drop event
  function handleFileDrop(e) {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }
  
  // Handle file select event
  function handleFileSelect(e) {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }
  
  // Process the selected file
  function handleFile(file) {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPG, PNG and PDF are allowed.');
      return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }
    
    // Store the file
    uploadedFile = file;
    
    // Update UI
    fileUploadArea.style.display = 'none';
    uploadPreview.style.display = 'flex';
    
    // Set file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImage.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF preview placeholder
      previewImage.src = 'img/pdf-icon.png';
    }
    
    // Set job name from filename if empty
    if (jobNameInput.value === '') {
      jobNameInput.value = file.name.split('.')[0];
    }
  }
  
  // Remove the uploaded file
  function removeFile() {
    uploadedFile = null;
    fileInput.value = '';
    uploadPreview.style.display = 'none';
    fileUploadArea.style.display = 'block';
  }
  
  // Create a new job
  function createJob() {
    if (!uploadedFile) {
      alert('Please select a file to upload.');
      return;
    }
    
    if (!jobNameInput.value) {
      alert('Please enter a job name.');
      return;
    }
    
    if (!printerSelect.value) {
      alert('Please select a printer.');
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', uploadedFile);
    
    // Show loading state
    createJobBtn.disabled = true;
    createJobBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    // Upload the file
    fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Create the job
        return fetch('/api/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: jobNameInput.value,
            fileId: data.file.id,
            fileName: uploadedFile.name,
            printer: printerSelect.value,
            colorProfile: profileSelect.value
          })
        });
      } else {
        throw new Error(data.error || 'Failed to upload file');
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Close modal and reset form
        newJobModal.classList.remove('active');
        resetJobForm();
        
        // Show success message
        alert('Job created successfully!');
      } else {
        throw new Error(data.error || 'Failed to create job');
      }
    })
    .catch(error => {
      console.error('Error creating job:', error);
      alert(`Error: ${error.message}`);
    })
    .finally(() => {
      // Reset button state
      createJobBtn.disabled = false;
      createJobBtn.innerHTML = 'Create Job';
    });
  }
  
  // Reset the job form
  function resetJobForm() {
    if (newJobForm) newJobForm.reset();
    if (uploadPreview) uploadPreview.style.display = 'none';
    if (fileUploadArea) fileUploadArea.style.display = 'block';
    uploadedFile = null;
  }
  
  // Print a job
  function printJob(jobId) {
    if (confirm('Send this job to the printer?')) {
      fetch(`/api/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'printing'
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Job sent to printer!');
        } else {
          throw new Error(data.error || 'Failed to print job');
        }
      })
      .catch(error => {
        console.error('Error printing job:', error);
        alert(`Error: ${error.message}`);
      });
    }
  }
  
  // View job details
  function viewJob(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    // For now, just show an alert with job details
    alert(`
      Job: ${job.name}
      Status: ${formatStatus(job.status)}
      Created: ${formatDate(job.createdAt)}
      Printer: ${job.printer}
      Color Profile: ${job.colorProfile}
    `);
    
    // In a real implementation, this would open a detailed job view
  }
  
  // Delete a job
  function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this job?')) {
      fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Job will be removed from the list via socket event
        } else {
          throw new Error(data.error || 'Failed to delete job');
        }
      })
      .catch(error => {
        console.error('Error deleting job:', error);
        alert(`Error: ${error.message}`);
      });
    }
  }
  
  // Helper: Format job status
  function formatStatus(status) {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'processed': return 'Processed';
      case 'printing': return 'Printing';
      case 'printed': return 'Printed';
      case 'error': return 'Error';
      default: return status;
    }
  }
  
  // Helper: Get status icon
  function getStatusIcon(status) {
    switch (status) {
      case 'pending': return '<i class="fas fa-clock"></i>';
      case 'processing': return '<i class="fas fa-spinner fa-spin"></i>';
      case 'processed': return '<i class="fas fa-check-circle"></i>';
      case 'printing': return '<i class="fas fa-print"></i>';
      case 'printed': return '<i class="fas fa-check-double"></i>';
      case 'error': return '<i class="fas fa-exclamation-circle"></i>';
      default: return '<i class="fas fa-circle"></i>';
    }
  }
  
  // Helper: Format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffMin < 1) {
      return 'Just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    } else if (diffDay < 7) {
      return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
  
  // Helper: Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
  }
  
  // Initialize the module
  init();
}
