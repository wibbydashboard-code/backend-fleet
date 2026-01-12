import logger from './logger.js';

export function errorHandler(err, req, res, next) {
  logger.error(err);

  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
}
