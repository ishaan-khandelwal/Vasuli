const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { put } = require('@vercel/blob');
const { authMiddleware } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { isProduction } = require('../utils/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
  },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(null, true);
    }
    const error = new Error('Only JPEG, PNG, and WebP images are allowed.');
    error.statusCode = 400;
    return cb(error);
  },
});

/**
 * The declared MIME type is client-controlled, so the real type is derived from the file's
 * magic bytes. The stored extension comes from this, never from the uploaded file name.
 */
const detectImageType = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: '.jpg', contentType: 'image/jpeg' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { extension: '.png', contentType: 'image/png' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { extension: '.webp', contentType: 'image/webp' };
  }
  return null;
};

router.use(authMiddleware);

router.post('/proof', uploadLimiter, upload.single('proof'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No proof image provided.' });
    }

    const type = detectImageType(req.file.buffer);
    if (!type) {
      return res.status(400).json({ message: 'The uploaded file is not a valid JPEG, PNG, or WebP image.' });
    }

    // Unguessable name: the blob URL is public, so it must not be enumerable.
    const objectName = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${type.extension}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`proofs/${req.user.id}/${objectName}`, req.file.buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: type.contentType,
      });

      return res.json({ ok: true, url: blob.url });
    }

    // Serverless filesystems are ephemeral, so production must use blob storage.
    if (isProduction()) {
      return res.status(500).json({ message: 'File storage is not configured.' });
    }

    // Local development fallback only.
    const uploadsDir = path.join(__dirname, '../../uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, objectName), req.file.buffer);

    const host = req.get('host') || 'localhost:5000';
    return res.json({ ok: true, url: `${req.protocol}://${host}/uploads/${objectName}` });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
