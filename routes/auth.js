import express from 'express';

// FIX: Changed the imported names from '{ register, login }' to 
// the actual exported names from the controller: '{ registerUser, loginUser }'.
import { registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();

// Route for new user registration (POST /api/auth/register)
// FIX: Using the correct function name
router.post('/register', registerUser);

// Route for user login (POST /api/auth/login)
// FIX: Using the correct function name
router.post('/login', loginUser);

export default router;
