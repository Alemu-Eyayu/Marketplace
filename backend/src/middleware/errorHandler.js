'use strict';

/**
 * Global Express error handler with correlation ID support.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const correlationId = req.correlationId || require('crypto').randomUUID();

  let status = err.status || err.statusCode || 500;
  let message = err.message;

  // Handle multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = `File too large. Maximum size is ${Math.round(err.limit / 1024 / 1024)}MB.`;
  } else if (err.code === 'LIMIT_FILE_COUNT') {
    status = 413;
    message = `Too many files. Maximum is ${err.limit} files.`;
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    status = 400;
    message = 'Unexpected file field or too many files.';
  } else if (typeof err.code === 'string' && err.code.startsWith('LIMIT_')) {
    status = 413;
    message = 'File upload limit exceeded.';
  }

  const isOperational = status < 500;

  // Log 500s with full detail server-side only
  console.error(`[${correlationId}] ${req.method} ${req.path} → ${status}`);
  if (!isOperational) {
    console.error('Error:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error('Stack:', err.stack);
    }
  }

  res.status(status).json({
    success: false,
    correlationId,
    // In production, hide internal 500 error details from clients
    message: isOperational ? message : (process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : message),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
