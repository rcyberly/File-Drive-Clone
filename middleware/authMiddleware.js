import jwt from 'jsonwebtoken';
// Removed any unnecessary relative paths, as this file is at the root level (middleware/)

/**
 * Middleware to check for a valid JWT in the Authorization header.
 * If valid, attaches req.userId.
 */
export const authMiddleware = async (req, res, next) => {
    let token;

    // Check for token in headers (Bearer Token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user ID (the 'id' from the token payload) to the request object
            req.userId = decoded.id; 

            // Proceed to the next middleware or route handler
            next();

        } catch (error) {
            console.error('Token verification failed:', error);
            // If verification fails (e.g., token expired, invalid signature)
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else if (!token) {
        // Only return 401 if no token was even attempted
        res.status(401).json({ message: 'Not authorized, no token' });
    }
    // Added 'else if' to prevent setting headers after they are sent if an error occurred.
};

// NOTE: Exporting as a named export (`authMiddleware`)
