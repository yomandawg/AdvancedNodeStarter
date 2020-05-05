const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');

// const { clearHash } = require('../services/cache');
const cleanCache = require('../middlewares/cleanCache');

const Blog = mongoose.model('Blog');

module.exports = app => {
  app.get('/api/blogs/:id', requireLogin, async (req, res) => {
    const blog = await Blog.findOne({
      _user: req.user.id,
      _id: req.params.id
    });

    res.send(blog);
  });

  app.get('/api/blogs', requireLogin, async (req, res) => {
    const blogs = await Blog.find({ _user: req.user.id }).cache({
        key: req.user.id
      });
    
    res.send(blogs);

    /*
    const redis = require('redis');
    const redisUrl = 'redis://127.0.0.1:6379';
    const client = redis.createClient(redisUrl);

    // Do we have any cached data in redis related to this query
    // if yes, then respond to the request right away and return
    
    // trick to return a promise instead of a callback
    const util = require('util'); // promisify function to wrap a function to return a promise
    client.get = util.promisify(client.get);
    // const cachedBlog = client.get(req.user.id, () => {});
    const cachedBlogs = await client.get(req.user.id);

    // if no, we need to respond to requeset and update our cache to store the data
    if (cachedBlogs) {
      console.log('SERVING FROM CACHE');
      return res.send(JSON.parse(cachedBlogs));
    }

    const blogs = await Blog.find({ _user: req.user.id }); // query to receive all blog
    // only reach out to MongoDB the first time
    // cache it to redis server
    console.log('SERVING FROM MONGODB')
    res.send(blogs);

    client.set(req.user.id, JSON.stringify(blogs));
    */
  });

  // requireLogin: middleware - automates certain effects
  // set up middleware to automate `clearHash` dumping
  app.post('/api/blogs', requireLogin, cleanCache/*middleware*/, async (req, res) => {
    const { title, content } = req.body;

    const blog = new Blog({
      title,
      content,
      _user: req.user.id
    });

    try {
      await blog.save();
      res.send(blog);
    } catch (err) {
      res.send(400, err);
    }

    // clearHash(req.user.id); // dump cache whenever a new post is written
  });
};
