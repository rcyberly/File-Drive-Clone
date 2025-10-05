// src/controllers/authController.js - User Registration and Login Logic

import pool from '../config/db.js';
// FIX: Using bcryptjs instead of bcrypt for cross-platform compatibility on cloud services like Render.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Ensure this environment variable is correctly set in your .env file and on Render!
const JWT_SECRET = process.env.JWT_SECRET || 'a_fallback_secret_key'; 

// Function to generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' }); 
};

/**
 * POST /api/auth/register - Register a new user
 * @param {object} req - Request object (requires email and password in body).
 * @param {object} res - Response object.
 */
export const registerUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // 1. Check if user already exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ message: 'User already exists.' });
        }

        // 2. Hash the password (using bcryptjs)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Insert new user into database
        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, hashedPassword]
        );
        const user = newUser.rows[0];

        // 4. Generate and send JWT token
        const token = generateToken(user.id);

        res.status(201).json({ 
            message: 'User registered successfully!',
            token,
            user: { id: user.id, email: user.email } 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

/**
 * POST /api/auth/login - Log in an existing user
 * @param {object} req - Request object (requires email and password in body).
 * @param {object} res - Response object.
 */
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // 1. Find user by email
        const userResult = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // 2. Compare password (using bcryptjs)
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // 3. Generate and send JWT token
        const token = generateToken(user.id);

        res.status(200).json({ 
            message: 'Login successful!', 
            token,
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

/**
 * GET /api/auth/me - Get current user data
 * @param {object} req - Request object (requires user info set by authMiddleware).
 * @param {object} res - Response object.
 */
export const getMe = (req, res) => {
    // req.user is set by authMiddleware (which you will need to implement)
    // For now, this just returns the user object attached by the middleware.
    if (!req.user) {
         return res.status(401).json({ message: 'Not authorized.' });
    }
    res.json(req.user);
};

