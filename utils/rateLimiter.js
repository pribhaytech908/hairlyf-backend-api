import rateLimit from 'express-rate-limit';

/**
 * Create a rate limiter middleware using in-memory store
 * @param {number} max - Maximum number of requests allowed within the window
 * @param {number} windowSec - Time window in seconds
 * @returns {Function} Express middleware
 */
export const rateLimiter = (max, windowSec) => {
    return rateLimit({
        windowMs: windowSec * 1000, // Convert seconds to milliseconds
        max: max, // Limit each IP to max requests per windowMs
        message: {
            success: false,
            message: 'Too many requests, please try again later.'
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        // Using default memory store
        skipFailedRequests: false, // Don't count failed requests (status >= 400)
        // Add some basic protection
        trustProxy: true, // Trust the X-Forwarded-For header
    });
}; 