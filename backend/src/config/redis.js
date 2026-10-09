const Redis = require('ioredis');

let client;
let inMemoryStore = {}; // In-memory fallback storage

function getRedisClient() {
  if (!client) {
    // If no Redis URL is configured, return a mock client
    if (!process.env.REDIS_URL) {
      console.warn('Redis disabled: REDIS_URL not configured. Using in-memory fallback.');
      // Return a mock client with proper in-memory storage
      return {
        get: async (key) => {
          const item = inMemoryStore[key];
          if (!item) return null;
          // Check if expired
          if (item.expiry && Date.now() > item.expiry) {
            delete inMemoryStore[key];
            return null;
          }
          return item.value;
        },
        set: async (key, value, ...args) => {
          // Handle EX (seconds) expiry: SET key value EX seconds
          let expiry = null;
          if (args[0] === 'EX' && args[1]) {
            expiry = Date.now() + (args[1] * 1000);
          }
          inMemoryStore[key] = { value, expiry };
          return 'OK';
        },
        del: async (...keys) => {
          let count = 0;
          for (const key of keys) {
            if (inMemoryStore[key]) {
              delete inMemoryStore[key];
              count++;
            }
          }
          return count;
        },
        expire: async (key, seconds) => {
          if (inMemoryStore[key]) {
            inMemoryStore[key].expiry = Date.now() + (seconds * 1000);
            return 1;
          }
          return 0;
        },
        setex: async (key, seconds, value) => {
          inMemoryStore[key] = {
            value,
            expiry: Date.now() + (seconds * 1000)
          };
          return 'OK';
        },
        exists: async (...keys) => {
          let count = 0;
          for (const key of keys) {
            if (inMemoryStore[key]) count++;
          }
          return count;
        },
        on: () => { },
        quit: async () => { },
      };
    }

    const redisUrl = process.env.REDIS_URL;
    const tlsOptions = redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {};
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: false,
      retryStrategy: (times) => {
        // Stop retrying after 10 attempts to prevent log spam
        if (times > 10) {
          console.error('Redis: Max retry attempts reached. Stopping reconnection.');
          return null; // Stop retrying
        }
        // Retry with exponential backoff (max 5 seconds)
        return Math.min(times * 200, 5000);
      },
      ...tlsOptions,
    });

    client.on('connect', () => console.log('Redis connected'));
    client.on('error', (err) => {
      // Only log error once per connection attempt
      if (!client.errorLogged) {
        console.error('Redis error:', err.message);
        client.errorLogged = true;
      }
    });
    client.on('reconnecting', () => {
      client.errorLogged = false; // Reset for next attempt
    });
    client.on('end', () => console.warn('Redis connection closed.'));
  }
  return client;
}

module.exports = getRedisClient;
