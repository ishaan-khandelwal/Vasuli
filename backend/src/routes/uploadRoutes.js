const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { put } = require('@vercel/blob');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

router.use(authMiddleware);

router.post('/proof', upload.single('proof'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No proof image provided.' });
    }

    const extension = path.extname(req.file.originalname) || '.jpg';
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(16).slice(2, 8);
    const filename = `proofs/${req.user.id}/${timestamp}-${randomSuffix}${extension}`;

    // Production environment requires Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, req.file.buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: req.file.mimetype,
      });

      return res.json({
        ok: true,
        url: blob.url,
      });
    }

    // In production without token, fail fast rather than writing to ephemeral serverless filesystem
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        message: 'Storage configuration error: BLOB_READ_WRITE_TOKEN is missing in production.',
      });
    }

    // Local development fallback only
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localFilename = `${timestamp}-${randomSuffix}${extension}`;
    fs.writeFileSync(path.join(uploadsDir, localFilename), req.file.buffer);

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const url = `${protocol}://${host}/uploads/${localFilename}`;

    return res.json({
      ok: true,
      url,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
