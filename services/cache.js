const mongoose = require('mongoose');

const redis = require('redis');
const util = require('util');

const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
// client.get = util.promisify(client.get);
client.hget = util.promisify(client.hget);

// Untoucheed copy
const exec = mongoose.Query.prototype.exec;

// Selective Caching function
mongoose.Query.prototype.cache = function(options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || ''); // default option ''

  return this; // chainable
}

// Overwrtie the `exec` function
// no arrow function here to handle `this`
mongoose.Query.prototype.exec = async function() {
  // console.log("I'M ABOUT TO RUN A QUERY");

  // Selective Caching
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }
  
  const key = JSON.stringify(Object.assign({}, this.getQuery(), {
    collection: this.mongooseCollection.name
  }));

  // See if we have a value for 'key' in redis
  // const cacheValue = await client.get(key);
  const cacheValue = await client.hget(this.hashKey, key); // nested hash
  
  // If we do, return that
  if (cacheValue) {
    // console.log(this); // this === current query being executed
    
    const doc = JSON.parse(cacheValue);    

    return Array.isArray(doc)
      ? doc.map(d => new this.model(d))
      : new this.model(doc);
  }

  // Otherwise, issue the query and store the result in redis
  const result = await exec.apply(this, arguments); // pass in arguments to the pristine `exec`

  // 'EX' === expiration mode; for 10 seconds
  // client.set(key, JSON.stringify(result), 'EX', 10);
  client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10);

  return result;
};


module.exports = {
  // clearing hash
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  }
};