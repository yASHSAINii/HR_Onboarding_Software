import express from 'express';
import { register, login, adminLogin, profile } from '../controllers/authcontroller.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', adminLogin); // For your frontend

// Protected route
router.get('/profile', authenticateToken, profile);

export default router;