import { Router } from 'express';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword
} from '../controllers/authController.js';

const router = Router();

// Authentication Routes
router.post('/register', register);
router.post('/login', login);

// Forgot Password
router.post('/forgot-password', forgotPassword);

// Reset Password
router.post('/reset-password/:token', resetPassword);

// Change Password (logged-in user)
router.post('/change-password', changePassword);

export default router;
