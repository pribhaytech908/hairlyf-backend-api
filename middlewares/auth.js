import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Session from '../models/Session.js';

/**
 * Protect routes - Authentication middleware
 * Verifies JWT token and adds user to request object
 */
export const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from Authorization header or cookies
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if session exists and is active
            const sessionId = req.cookies.sessionId;
            if (sessionId) {
                const session = await Session.findOne({
                    _id: sessionId,
                    user: user._id,
                    isActive: true
                });

                if (!session) {
                    res.clearCookie("token");
                    res.clearCookie("refreshToken");
                    res.clearCookie("sessionId");
                    return res.status(401).json({
                        success: false,
                        message: 'Session expired or invalid'
                    });
                }

                // Update last active timestamp
                session.lastActive = new Date();
                await session.save();
                
                // Attach session to request
                req.session = session;
            }

            // Attach user to request
            req.user = user;
            next();
        } catch (error) {
            // Handle expired token
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired, please login again'
                });
            }

            // Handle invalid token
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error in authentication'
        });
    }
};

/**
 * Optional authentication middleware
 * Adds user to request if token exists, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next();
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            
            if (user) {
                req.user = user;
            }
            
            next();
        } catch (error) {
            // Continue without user if token is invalid
            next();
        }
    } catch (error) {
        next();
    }
};

/**
 * Role-based authorization middleware
 * @param {...String} roles - Allowed roles
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }

        next();
    };
};

/**
 * Check if user is verified middleware
 */
export const isVerified = (req, res, next) => {
    if (!req.user.isVerified) {
        return res.status(403).json({
            success: false,
            message: 'Please verify your account first'
        });
    }
    next();
};

// Export protect as isAuthenticated for backward compatibility
export const isAuthenticated = protect; 