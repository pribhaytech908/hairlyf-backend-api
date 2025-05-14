import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

let redis;
// Initialize Redis connection if REDIS_URL is provided
if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
}

/**
 * Create a rate limiter middleware
 * @param {number} max - Maximum number of requests allowed within the window
 * @param {number} windowSec - Time window in seconds
 * @returns {Function} Express middleware
 */
export const rateLimiter = (max, windowSec) => {
    const config = {
        windowMs: windowSec * 1000, // Convert seconds to milliseconds
        max: max, // Limit each IP to max requests per windowMs
        message: {
            success: false,
            message: 'Too many requests, please try again later.'
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    };

    // Use Redis store if Redis is configured
    if (redis) {
        config.store = new RedisStore({
            sendCommand: (...args) => redis.call(...args),
            prefix: 'rl:', // Redis key prefix for rate limiter
        });
    }

    return rateLimit(config);
};

// Export Redis instance for other uses
export const redisClient = redis; 