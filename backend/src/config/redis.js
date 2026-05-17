const Redis = require('ioredis');

let client;

function getRedisClient() {
  if (!client) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const tlsOptions = redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {};
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: false,
      ...tlsOptions,
    });

    client.on('connect', () => console.log('Redis connected'));
    client.on('error', (err) => console.error('Redis error:', err.message));
    client.on('reconnecting', () => console.warn('Redis reconnecting...'));
    client.on('end', () => console.warn('Redis connection closed.'));
  }
  return client;
}

module.exports = getRedisClient;
