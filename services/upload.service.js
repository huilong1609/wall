/**
 * File Upload Service
 * Handles file uploads for KYC documents and profile images
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const logger = require('../config/logger');

class FileUploadService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    this.allowedDocumentTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    
    this.directories = {
      kyc: 'kyc',
      avatars: 'avatars',
      documents: 'documents',
      temp: 'temp'
    };
  }

  /**
   * Initialize upload directories
   */
  async initialize() {
    try {
      for (const dir of Object.values(this.directories)) {
        const fullPath = path.join(this.uploadDir, dir);
        await fs.mkdir(fullPath, { recursive: true });
      }
      logger.info('File upload directories initialized');
    } catch (error) {
      logger.error('Failed to initialize upload directories:', error);
      throw error;
    }
  }

  /**
   * Generate unique filename
   */
  generateFilename(originalName, userId) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${userId}_${timestamp}_${random}${ext}`;
  }

  /**
   * Get multer storage configuration
   */
  getStorage(directory) {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(this.uploadDir, directory);
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const filename = this.generateFilename(file.originalname, req.user?.id || 'anonymous');
        cb(null, filename);
      }
    });
  }

  /**
   * File filter for images
   */
  imageFilter(req, file, cb) {
    if (this.allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
    }
  }

  /**
   * File filter for documents
   */
  documentFilter(req, file, cb) {
    if (this.allowedDocumentTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
    }
  }

  /**
   * Get multer middleware for avatar uploads
   */
  getAvatarUploader() {
    return multer({
      storage: this.getStorage(this.directories.avatars),
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB for avatars
      },
      fileFilter: this.imageFilter.bind(this)
    }).single('avatar');
  }

  /**
   * Get multer middleware for KYC document uploads
   */
  getKycUploader() {
    return multer({
      storage: this.getStorage(this.directories.kyc),
      limits: {
        fileSize: this.maxFileSize
      },
      fileFilter: this.documentFilter.bind(this)
    }).fields([
      { name: 'identity_front', maxCount: 1 },
      { name: 'identity_back', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
      { name: 'proof_of_address', maxCount: 1 }
    ]);
  }

  /**
   * Get multer middleware for general document uploads
   */
  getDocumentUploader() {
    return multer({
      storage: this.getStorage(this.directories.documents),
      limits: {
        fileSize: this.maxFileSize
      },
      fileFilter: this.documentFilter.bind(this)
    }).array('documents', 5);
  }

  /**
   * Process and optimize uploaded image
   */
  async processImage(filePath, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 85,
      format = 'jpeg'
    } = options;

    try {
      const outputPath = filePath.replace(path.extname(filePath), `_processed.${format}`);
      
      await sharp(filePath)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFormat(format, { quality })
        .toFile(outputPath);

      // Remove original if different from processed
      if (filePath !== outputPath) {
        await fs.unlink(filePath);
      }

      return outputPath;
    } catch (error) {
      logger.error('Image processing failed:', error);
      throw error;
    }
  }

  /**
   * Process avatar with specific dimensions
   */
  async processAvatar(filePath) {
    try {
      const outputPath = filePath.replace(path.extname(filePath), '_avatar.webp');
      
      await sharp(filePath)
        .resize(256, 256, {
          fit: 'cover',
          position: 'center'
        })
        .toFormat('webp', { quality: 90 })
        .toFile(outputPath);

      // Create thumbnail
      const thumbPath = filePath.replace(path.extname(filePath), '_thumb.webp');
      await sharp(filePath)
        .resize(64, 64, {
          fit: 'cover',
          position: 'center'
        })
        .toFormat('webp', { quality: 85 })
        .toFile(thumbPath);

      // Remove original
      await fs.unlink(filePath);

      return {
        avatar: outputPath,
        thumbnail: thumbPath
      };
    } catch (error) {
      logger.error('Avatar processing failed:', error);
      throw error;
    }
  }

  /**
   * Process KYC document
   */
  async processKycDocument(filePath, documentType) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      // If it's a PDF, just return the path
      if (ext === '.pdf') {
        return {
          path: filePath,
          type: 'pdf'
        };
      }

      // Process image
      const outputPath = await this.processImage(filePath, {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 90,
        format: 'jpeg'
      });

      return {
        path: outputPath,
        type: 'image'
      };
    } catch (error) {
      logger.error('KYC document processing failed:', error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.debug('File deleted:', filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('File deletion failed:', error);
        throw error;
      }
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(filePaths) {
    const results = [];
    for (const filePath of filePaths) {
      try {
        await this.deleteFile(filePath);
        results.push({ path: filePath, success: true });
      } catch (error) {
        results.push({ path: filePath, success: false, error: error.message });
      }
    }
    return results;
  }

  /**
   * Get file info
   */
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      return {
        path: filePath,
        filename: path.basename(filePath),
        size: stats.size,
        extension: ext,
        mimeType: this.getMimeType(ext),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get MIME type from extension
   */
  getMimeType(ext) {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Move file to permanent storage
   */
  async moveToStorage(tempPath, directory, newFilename = null) {
    try {
      const filename = newFilename || path.basename(tempPath);
      const destPath = path.join(this.uploadDir, directory, filename);
      
      await fs.rename(tempPath, destPath);
      
      return destPath;
    } catch (error) {
      logger.error('File move failed:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary files older than specified hours
   */
  async cleanupTempFiles(maxAgeHours = 24) {
    try {
      const tempDir = path.join(this.uploadDir, this.directories.temp);
      const files = await fs.readdir(tempDir);
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} temporary files`);
      return deletedCount;
    } catch (error) {
      logger.error('Temp file cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get URL for file
   */
  getFileUrl(filePath, baseUrl = '') {
    const relativePath = filePath.replace(this.uploadDir, '').replace(/^\//, '');
    return `${baseUrl}/uploads/${relativePath}`;
  }

  /**
   * Validate file signature (magic bytes)
   */
  async validateFileSignature(filePath) {
    try {
      const buffer = Buffer.alloc(8);
      const file = await fs.open(filePath, 'r');
      await file.read(buffer, 0, 8, 0);
      await file.close();

      // Check magic bytes
      const signatures = {
        jpeg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47],
        pdf: [0x25, 0x50, 0x44, 0x46],
        webp: [0x52, 0x49, 0x46, 0x46]
      };

      for (const [type, sig] of Object.entries(signatures)) {
        if (sig.every((byte, i) => buffer[i] === byte)) {
          return { valid: true, type };
        }
      }

      // Special check for WebP (RIFF....WEBP)
      if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') {
        return { valid: true, type: 'webp' };
      }

      return { valid: false, type: null };
    } catch (error) {
      logger.error('File signature validation failed:', error);
      return { valid: false, type: null, error: error.message };
    }
  }

  /**
   * Express middleware for handling upload errors
   */
  handleUploadError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum is 5 files.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    }
    
    if (err.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    next(err);
  }
}

module.exports = new FileUploadService();
