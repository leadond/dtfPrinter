/**
 * RIP Engine Module
 * 
 * Handles the core RIP (Raster Image Processing) functionality for DTF printing.
 * Processes images, applies color separation, and prepares print-ready output.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const Jimp = require('jimp');
const colorConvert = require('color-convert');
const pdfjsLib = require('pdfjs-dist');

// Configure PDF.js worker
const PDFJS_WORKER_PATH = path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.js');
if (fs.existsSync(PDFJS_WORKER_PATH)) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${PDFJS_WORKER_PATH}`;
}

// Output directory for processed files
const OUTPUT_DIR = path.join(__dirname, '../jobs');
fs.ensureDirSync(OUTPUT_DIR);

/**
 * Process an image for DTF printing
 * @param {Object} options - Processing options
 * @param {string} options.filePath - Path to the input file
 * @param {string} options.colorProfile - Color profile to use
 * @param {Object} options.settings - Additional processing settings
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} - Processed job information
 */
async function processImage(options, progressCallback = () => {}) {
  const { filePath, colorProfile, settings = {} } = options;
  const jobId = uuidv4();
  const jobDir = path.join(OUTPUT_DIR, jobId);
  
  try {
    // Create job directory
    fs.ensureDirSync(jobDir);
    
    // Update progress
    progressCallback({ status: 'processing', progress: 10, message: 'Analyzing input file' });
    
    // Determine file type and process accordingly
    const fileExt = path.extname(filePath).toLowerCase();
    let imageBuffer;
    
    if (fileExt === '.pdf') {
      // Process PDF file
      imageBuffer = await processPdf(filePath, progressCallback);
    } else {
      // Process raster image
      imageBuffer = await fs.readFile(filePath);
    }
    
    // Update progress
    progressCallback({ status: 'processing', progress: 30, message: 'Applying color separation' });
    
    // Apply color separation based on the selected profile
    const separatedLayers = await applySeparation(imageBuffer, colorProfile, settings);
    
    // Update progress
    progressCallback({ status: 'processing', progress: 60, message: 'Generating white underbase' });
    
    // Generate white underbase layer
    const whiteLayer = await generateWhiteLayer(imageBuffer, settings);
    
    // Save processed layers
    progressCallback({ status: 'processing', progress: 80, message: 'Saving processed files' });
    
    const outputFiles = await saveProcessedLayers(jobDir, {
      ...separatedLayers,
      white: whiteLayer
    });
    
    // Create preview image
    const previewPath = path.join(jobDir, 'preview.png');
    await sharp(imageBuffer)
      .resize(800, 800, { fit: 'inside' })
      .toFile(previewPath);
    
    // Update progress
    progressCallback({ status: 'complete', progress: 100, message: 'Processing complete' });
    
    return {
      id: jobId,
      outputDir: jobDir,
      outputFiles,
      previewUrl: `/jobs/${jobId}/preview.png`
    };
  } catch (error) {
    console.error('RIP processing error:', error);
    progressCallback({ status: 'error', message: error.message });
    throw error;
  }
}

/**
 * Process a PDF file and convert to image
 * @param {string} pdfPath - Path to PDF file
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<Buffer>} - Image buffer
 */
async function processPdf(pdfPath, progressCallback) {
  try {
    // Load the PDF file
    const data = new Uint8Array(await fs.readFile(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    // Get the first page
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    
    // Prepare canvas for rendering
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // Convert canvas to image buffer
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Use sharp to create an image buffer
    const buffer = await sharp(imageData.data, {
      raw: {
        width: canvas.width,
        height: canvas.height,
        channels: 4
      }
    }).png().toBuffer();
    
    return buffer;
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error('Failed to process PDF file');
  }
}

/**
 * Apply color separation based on the selected profile
 * @param {Buffer} imageBuffer - Input image buffer
 * @param {string} profileName - Color profile name
 * @param {Object} settings - Processing settings
 * @returns {Promise<Object>} - Separated color layers
 */
async function applySeparation(imageBuffer, profileName, settings) {
  try {
    // Load image with Jimp for pixel-level manipulation
    const image = await Jimp.read(imageBuffer);
    
    // Create separate CMYK channels
    const width = image.getWidth();
    const height = image.getHeight();
    
    const cyanImage = new Jimp(width, height);
    const magentaImage = new Jimp(width, height);
    const yellowImage = new Jimp(width, height);
    const blackImage = new Jimp(width, height);
    
    // Process each pixel
    image.scan(0, 0, width, height, function(x, y, idx) {
      // Get RGB values
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      const a = this.bitmap.data[idx + 3];
      
      // Skip transparent pixels
      if (a === 0) return;
      
      // Convert RGB to CMYK
      const cmyk = colorConvert.rgb.cmyk(r, g, b);
      const [c, m, yVal, k] = cmyk; // Changed 'y' to 'yVal' to avoid parameter redeclaration
      
      // Apply any profile-specific adjustments
      // This would be expanded based on actual color profiles
      let adjustedC = c;
      let adjustedM = m;
      let adjustedY = yVal; // Using yVal instead of y
      let adjustedK = k;
      
      if (profileName === 'vivid') {
        // Example: Enhance saturation for vivid profile
        adjustedC = Math.min(100, c * 1.1);
        adjustedM = Math.min(100, m * 1.1);
        adjustedY = Math.min(100, yVal * 1.1); // Using yVal instead of y
      } else if (profileName === 'muted') {
        // Example: Reduce saturation for muted profile
        adjustedC = c * 0.9;
        adjustedM = m * 0.9;
        adjustedY = yVal * 0.9; // Using yVal instead of y
      }
      
      // Set pixel values in each channel image
      // Convert CMYK percentages (0-100) to grayscale values (0-255)
      const cValue = Math.floor((adjustedC / 100) * 255);
      const mValue = Math.floor((adjustedM / 100) * 255);
      const yValue = Math.floor((adjustedY / 100) * 255);
      const kValue = Math.floor((adjustedK / 100) * 255);
      
      // Set grayscale values in each channel image
      cyanImage.setPixelColor(Jimp.rgbaToInt(cValue, cValue, cValue, a), x, y);
      magentaImage.setPixelColor(Jimp.rgbaToInt(mValue, mValue, mValue, a), x, y);
      yellowImage.setPixelColor(Jimp.rgbaToInt(yValue, yValue, yValue, a), x, y);
      blackImage.setPixelColor(Jimp.rgbaToInt(kValue, kValue, kValue, a), x, y);
    });
    
    // Convert Jimp images to buffers
    const cyanBuffer = await cyanImage.getBufferAsync(Jimp.MIME_PNG);
    const magentaBuffer = await magentaImage.getBufferAsync(Jimp.MIME_PNG);
    const yellowBuffer = await yellowImage.getBufferAsync(Jimp.MIME_PNG);
    const blackBuffer = await blackImage.getBufferAsync(Jimp.MIME_PNG);
    
    return {
      cyan: cyanBuffer,
      magenta: magentaBuffer,
      yellow: yellowBuffer,
      black: blackBuffer
    };
  } catch (error) {
    console.error('Color separation error:', error);
    throw new Error('Failed to apply color separation');
  }
}

/**
 * Generate white underbase layer
 * @param {Buffer} imageBuffer - Input image buffer
 * @param {Object} settings - Processing settings
 * @returns {Promise<Buffer>} - White layer buffer
 */
async function generateWhiteLayer(imageBuffer, settings) {
  try {
    // Load image with Jimp for pixel-level manipulation
    const image = await Jimp.read(imageBuffer);
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Create white layer image
    const whiteImage = new Jimp(width, height);
    
    // Process each pixel
    image.scan(0, 0, width, height, function(x, y, idx) {
      // Get alpha value
      const a = this.bitmap.data[idx + 3];
      
      // Skip fully transparent pixels
      if (a === 0) return;
      
      // Calculate white intensity based on alpha and settings
      const whiteIntensity = Math.floor((a / 255) * 255);
      
      // Set white pixel (grayscale)
      whiteImage.setPixelColor(Jimp.rgbaToInt(whiteIntensity, whiteIntensity, whiteIntensity, a), x, y);
    });
    
    // Apply any white layer adjustments from settings
    if (settings.whiteExpansion && settings.whiteExpansion > 0) {
      // Expand white layer by dilating
      for (let i = 0; i < settings.whiteExpansion; i++) {
        whiteImage.blur(1);
      }
    }
    
    // Convert to buffer
    const whiteBuffer = await whiteImage.getBufferAsync(Jimp.MIME_PNG);
    return whiteBuffer;
  } catch (error) {
    console.error('White layer generation error:', error);
    throw new Error('Failed to generate white layer');
  }
}

/**
 * Save processed layers to output directory
 * @param {string} outputDir - Output directory
 * @param {Object} layers - Color layers
 * @returns {Promise<Object>} - Paths to output files
 */
async function saveProcessedLayers(outputDir, layers) {
  const outputFiles = {};
  
  for (const [name, buffer] of Object.entries(layers)) {
    const outputPath = path.join(outputDir, `${name}.png`);
    await fs.writeFile(outputPath, buffer);
    outputFiles[name] = `/jobs/${path.basename(outputDir)}/${name}.png`;
  }
  
  return outputFiles;
}

module.exports = {
  processImage,
  applySeparation,
  generateWhiteLayer
};
