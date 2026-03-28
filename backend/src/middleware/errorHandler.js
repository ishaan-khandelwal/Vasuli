const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Something went wrong on the server.';

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({ message });
};

module.exports = { errorHandler };
