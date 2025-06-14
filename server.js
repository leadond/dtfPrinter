const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Import our custom modules
const ripEngine = require('./lib/rip-engine');
const printerManager = require('./lib/printer-manager');
const colorProfileManager = require('./lib/color-profile-manager');
const jobManager = require('./lib/job-manager');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Create necessary directories
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const JOBS_DIR = path.join(__dirname, 'jobs');
const PROFILES_DIR = path.join(__dirname, 'profiles');

fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(JOBS_DIR);
fs.ensureDirSync(PROFILES_DIR);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG and PDF are allowed.'));
    }
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/jobs', express.static(JOBS_DIR));

// Parse JSON bodies
app.use(express.json());

// API Routes
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
      success: true,
      file: {
        id: path.parse(req.file.filename).name,
        name: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const { name, fileId, printer, colorProfile } = req.body;
    
    if (!name || !fileId || !printer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const filePath = path.join(UPLOAD_DIR, `${fileId}${path.extname(req.body.fileName || '.png')}`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const job = await jobManager.createJob({
      name,
      filePath,
      printer,
      colorProfile: colorProfile || 'standard'
    });
    
    // Notify all clients about the new job
    io.emit('job:new', job);
    
    res.json({ success: true, job });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jobs', (req, res) => {
  try {
    const jobs = jobManager.getAllJobs();
    res.json({ jobs });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/jobs/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const job = jobManager.updateJobStatus(id, status);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Notify all clients about the job update
    io.emit('job:update', job);
    
    res.json({ success: true, job });
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = jobManager.deleteJob(id);
    
    if (!result) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Notify all clients about the job deletion
    io.emit('job:delete', { id });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/printers', (req, res) => {
  try {
    const printers = printerManager.getAllPrinters();
    res.json({ printers });
  } catch (error) {
    console.error('Get printers error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/printers/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const status = printerManager.getPrinterStatus(id);
    
    if (!status) {
      return res.status(404).json({ error: 'Printer not found' });
    }
    
    res.json({ status });
  } catch (error) {
    console.error('Get printer status error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/color-profiles', (req, res) => {
  try {
    const profiles = colorProfileManager.getAllProfiles();
    res.json({ profiles });
  } catch (error) {
    console.error('Get color profiles error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send initial data to the client
  socket.emit('init', {
    jobs: jobManager.getAllJobs(),
    printers: printerManager.getAllPrinters(),
    profiles: colorProfileManager.getAllProfiles()
  });
  
  // Handle printer status updates
  printerManager.on('status', (data) => {
    socket.emit('printer:status', data);
  });
  
  // Handle job progress updates
  jobManager.on('progress', (data) => {
    socket.emit('job:progress', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Catch-all route to serve the main HTML file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`DTF RIP Pro server running on port ${PORT}`);
});
