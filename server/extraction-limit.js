const { rateLimit } = require('express-rate-limit');

function createExtractionLimit() {
  return rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ipv6Subnet: 56,
    message: {
      success: false,
      error: 'Too many requests. You can request artwork 5 times every 10 minutes. Please wait before trying again.'
    }
  });
}
module.exports = { createExtractionLimit };
