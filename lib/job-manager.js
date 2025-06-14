/**
 * Job Manager Module
 * 
 * Manages print jobs, job queue, and job history.
 * Handles job creation, status updates, and deletion.
 */

const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import required modules
const ripEngine = require('./rip-engine');
const printerManager = require('./printer-manager');

class JobManager extends EventEmitter {
  constructor() {
    super();
    this.jobs = [];
    this.jobsDir = path.join(__dirname, '../jobs');
    this.configPath = path.join(__dirname, '../config/jobs.json');
    this.init();
  }

  /**
   * Initialize the job manager
   */
  init() {
    try {
      // Ensure directories exist
      fs.ensureDirSync(this.jobsDir);
      fs.ensureDirSync(path.dirname(this.configPath));
      
      // Load job history if file exists
      if (fs.existsSync(this.configPath)) {
        this.jobs = fs.readJsonSync(this.configPath);
      } else {
        // Create empty job history
        this.jobs = [];
        this.saveConfig();
      }
    } catch (error) {
      console.error('Job manager initialization error:', error);
    }
  }

  /**
   * Save job history to file
   */
  saveConfig() {
    try {
      fs.writeJsonSync(this.configPath, this.jobs, { spaces: 2 });
    } catch (error) {
      console.error('Error saving job history:', error);
    }
  }

  /**
   * Get all jobs
   * @returns {Array} - List of jobs
   */
  getAllJobs() {
    return this.jobs;
  }

  /**
   * Get a job by ID
   * @param {string} id - Job ID
   * @returns {Object|null} - Job object or null if not found
   */
  getJob(id) {
    return this.jobs.find(job => job.id === id) || null;
  }

  /**
   * Create a new print job
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} - Created job
   */
  async createJob(jobData) {
    try {
      // Generate a unique job ID
      const jobId = jobData.id || uuidv4();
      
      // Create job object
      const job = {
        id: jobId,
        name: jobData.name || `Job ${jobId.substring(0, 8)}`,
        filePath: jobData.filePath,
        fileName: path.basename(jobData.filePath),
        printer: jobData.printer,
        colorProfile: jobData.colorProfile || 'standard',
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add job to list
      this.jobs.unshift(job);
      this.saveConfig();
      
      // Process the job
      this.processJob(job);
      
      return job;
    } catch (error) {
      console.error('Job creation error:', error);
      throw error;
    }
  }

  /**
   * Process a job
   * @param {Object} job - Job to process
   */
  async processJob(job) {
    try {
      // Update job status
      job.status = 'processing';
      job.progress = 0;
      job.updatedAt = new Date().toISOString();
      this.saveConfig();
      
      // Emit progress update
      this.emit('progress', {
        id: job.id,
        status: job.status,
        progress: job.progress
      });
      
      // Process the image using RIP engine
      const result = await ripEngine.processImage({
        filePath: job.filePath,
        colorProfile: job.colorProfile,
        settings: {}
      }, (progress) => {
        // Update job progress
        job.progress = progress.progress;
        job.status = progress.status;
        
        // Emit progress update
        this.emit('progress', {
          id: job.id,
          status: job.status,
          progress: job.progress,
          message: progress.message
        });
      });
      
      // Update job with processing results
      job.outputDir = result.outputDir;
      job.outputFiles = result.outputFiles;
      job.previewUrl = result.previewUrl;
      job.status = 'processed';
      job.progress = 100;
      job.updatedAt = new Date().toISOString();
      this.saveConfig();
      
      // Emit progress update
      this.emit('progress', {
        id: job.id,
        status: job.status,
        progress: job.progress,
        outputFiles: job.outputFiles,
        previewUrl: job.previewUrl
      });
      
      // If auto-print is enabled, send to printer
      if (job.autoPrint) {
        this.printJob(job.id);
      }
    } catch (error) {
      console.error('Job processing error:', error);
      
      // Update job status to error
      job.status = 'error';
      job.error = error.message;
      job.updatedAt = new Date().toISOString();
      this.saveConfig();
      
      // Emit error update
      this.emit('progress', {
        id: job.id,
        status: job.status,
        error: job.error
      });
    }
  }

  /**
   * Send a job to printer
   * @param {string} id - Job ID
   * @returns {Promise<Object>} - Print result
   */
  async printJob(id) {
    const job = this.getJob(id);
    if (!job) {
      throw new Error('Job not found');
    }
    
    if (job.status !== 'processed') {
      throw new Error('Job is not ready for printing');
    }
    
    try {
      // Update job status
      job.status = 'printing';
      job.updatedAt = new Date().toISOString();
      this.saveConfig();
      
      // Emit progress update
      this.emit('progress', {
        id: job.id,
        status: job.status
      });
      
      // Send job to printer
      const result = await printerManager.sendPrintJob(job.printer, {
        id: job.id,
        name: job.name,
        files: job.outputFiles
      });
      
      // Update job status
      job.status = 'printed';
      job.printResult = result;
      job.updatedAt = new Date().toISOString();
      this.saveConfig();
      
      // Emit progress update
      this.emit('progress', {
        id: job.id,
        status: job.status,
        printResult: job.printResult
      });
      
      return result;
    } catch (error) {
      console.error('Job printing error:', error);
      
      // Update job status to error
      job.status = 'error';
      job.error = error.message;
      job.updatedAt = new Date().toISOString();
      this.saveConfig();
      
      // Emit error update
      this.emit('progress', {
        id: job.id,
        status: job.status,
        error: job.error
      });
      
      throw error;
    }
  }

  /**
   * Update job status
   * @param {string} id - Job ID
   * @param {string} status - New status
   * @returns {Object|null} - Updated job or null if not found
   */
  updateJobStatus(id, status) {
    const job = this.getJob(id);
    if (!job) return null;
    
    // Update job status
    job.status = status;
    job.updatedAt = new Date().toISOString();
    this.saveConfig();
    
    // Emit progress update
    this.emit('progress', {
      id: job.id,
      status: job.status
    });
    
    return job;
  }

  /**
   * Delete a job
   * @param {string} id - Job ID
   * @returns {boolean} - Success status
   */
  deleteJob(id) {
    const index = this.jobs.findIndex(job => job.id === id);
    if (index === -1) return false;
    
    const job = this.jobs[index];
    
    // Remove job from list
    this.jobs.splice(index, 1);
    this.saveConfig();
    
    // Delete job directory if it exists
    if (job.outputDir && fs.existsSync(job.outputDir)) {
      fs.removeSync(job.outputDir);
    }
    
    return true;
  }

  /**
   * Clear job history
   * @param {Object} options - Clear options
   * @returns {number} - Number of jobs cleared
   */
  clearJobs(options = {}) {
    const { status, olderThan } = options;
    
    // Filter jobs to remove
    const jobsToRemove = this.jobs.filter(job => {
      // Filter by status if specified
      if (status && job.status !== status) {
        return false;
      }
      
      // Filter by age if specified
      if (olderThan) {
        const jobDate = new Date(job.createdAt);
        const cutoffDate = new Date(olderThan);
        if (jobDate >= cutoffDate) {
          return false;
        }
      }
      
      return true;
    });
    
    // Remove job directories
    jobsToRemove.forEach(job => {
      if (job.outputDir && fs.existsSync(job.outputDir)) {
        fs.removeSync(job.outputDir);
      }
    });
    
    // Remove jobs from list
    const jobIds = jobsToRemove.map(job => job.id);
    this.jobs = this.jobs.filter(job => !jobIds.includes(job.id));
    this.saveConfig();
    
    return jobsToRemove.length;
  }
}

// Create and export singleton instance
const jobManager = new JobManager();
module.exports = jobManager;
