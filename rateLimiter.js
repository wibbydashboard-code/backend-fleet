import rateLimit from 'express-rate-limit';

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
});

export const batchUploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5
});
