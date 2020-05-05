const { clearHash } = require('../services/cache');

// middleware to automate clearHash
// premise: middleware always run before the request handler
// we don't want to automatically dump the cache before the post is truly created
// => make an async function to wait for `next`
// => execution comes back for the middleware's `next` after the route handler is complete
module.exports = async (req, res, next) => {
  await next();

  clearHash(req.user.id);
}