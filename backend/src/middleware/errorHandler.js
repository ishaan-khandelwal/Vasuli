const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  // Body-parser / multer / mongoose errors that are the client's fault.
  if (error.type === 'entity.too.large' || error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'The submitted data is too large.' });
  }

  if (error.type === 'entity.parse.failed' || error.name === 'CastError' || error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid request.' });
  }

  if (typeof error.code === 'string' && error.code.startsWith('LIMIT_')) {
    return res.status(400).json({ message: 'Invalid upload.' });
  }

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;

  if (statusCode >= 500) {
    console.error(error);
    // Never leak internal details (stack, DB hostnames, driver messages) to clients.
    return res.status(statusCode).json({ message: 'Something went wrong on the server.' });
  }

  return res.status(statusCode).json({ message: error.message || 'Invalid request.' });
};

module.exports = { errorHandler };
