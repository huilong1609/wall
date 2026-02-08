const auth = require('./auth');
const errorHandler = require('./errorHandler');
const rateLimiter = require('./rateLimiter');
const validation = require('./validation');

module.exports = {
  ...auth,
  ...errorHandler,
  ...rateLimiter,
  ...validation,
};
