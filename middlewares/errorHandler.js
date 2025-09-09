import AppError from '../utils/appError.js';

const handleCastErrorDB = err => {
    const path = err.path || 'unknown field';
    const value = err.value !== undefined ? err.value : 'unknown value';
    const message = `Invalid ${path}: ${value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    let value = 'unknown';
    
    // Safely extract the duplicate field value
    if (err.errmsg && typeof err.errmsg === 'string') {
        const match = err.errmsg.match(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/);
        if (match && match[0]) {
            value = match[0];
        } else {
            // Fallback: try to extract any quoted value
            const fallbackMatch = err.errmsg.match(/"([^"]*)"|'([^']*)'/); 
            if (fallbackMatch) {
                value = fallbackMatch[0];
            } else {
                // Last resort: try to find the field name from the error message
                const fieldMatch = err.errmsg.match(/index: ([^\s]+)/);
                if (fieldMatch && fieldMatch[1]) {
                    value = fieldMatch[1];
                }
            }
        }
    }
    
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
    if (!err.errors || typeof err.errors !== 'object') {
        return new AppError('Validation error occurred', 400);
    }
    
    const errors = Object.values(err.errors)
        .filter(el => el && el.message) // Filter out any null/undefined errors
        .map(el => el.message);
    
    if (errors.length === 0) {
        return new AppError('Validation error occurred', 400);
    }
    
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const sendErrorDev = (err, res) => {
    // Log the error for debugging
    console.error('Development Error 💥', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        statusCode: err.statusCode
    });
    
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } else {
        console.error('ERROR 💥', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong!'
        });
    }
};

export default (err, req, res, next) => {
    // Ensure err is defined and has basic properties
    if (!err) {
        err = new Error('Unknown error occurred');
    }
    
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    // Ensure message exists
    if (!err.message) {
        err.message = 'Internal server error';
    }

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Handle specific MongoDB/Mongoose errors with safety checks
        if (error.name === 'CastError') {
            error = handleCastErrorDB(error);
        } else if (error.code === 11000) {
            error = handleDuplicateFieldsDB(error);
        } else if (error.name === 'ValidationError') {
            error = handleValidationErrorDB(error);
        }

        sendErrorProd(error, res);
    }
};
