import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendResetPasswordCodeEmail } from '../utils/sendEmail.js';

const SALT_ROUNDS = 10;
const RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes — short-lived since it's a guessable 6-digit code, not a long random token
const RESET_CODE_TTL_MINUTES = 10;
const MAX_RESET_ATTEMPTS = 5; // after this many wrong codes, the user must request a new one

export const register = async (req, res) => {
  try {
    const { name, email, password, role, masterCode } = req.body;

    if (!name?.trim() || !email?.trim() || !password?.trim() || !role) {
      return res.status(400).json({ message: 'Please fill in all fields.' });
    }
    if (!['student', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    if (role === 'admin') {
      const expected = process.env.ADMIN_SECRET_CODE || '';
      if (!masterCode || masterCode !== expected) {
        return res.status(403).json({ message: 'Invalid Master Admin verification code.' });
      }
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role,
      isApproved: role === 'admin' // students need admin approval; admins are auto-approved
    });

    const message =
      role === 'student'
        ? 'Registered! Your account is pending Admin approval before you can sign in.'
        : 'Admin account created! You can now sign in.';

    return res.status(201).json({
      message,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isApproved: user.isApproved }
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Please fill in all fields.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Prevent a student account from logging in via the Admin panel or vice versa.
    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is registered as ${user.role}. Please use the ${user.role} portal.` });
    }

    if (user.role === 'student' && !user.isApproved) {
      return res.status(403).json({ message: 'Your account is pending Admin approval.' });
    }

    return res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isApproved: user.isApproved }
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

// Both students and admins use this — role is used only to give the right
// error message when someone's account exists but under a different role.
export const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ message: 'Please enter your email address.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond the same way whether or not the account exists, so this
    // endpoint can't be used to discover which emails are registered.
    const genericResponse = { message: 'If an account exists for that email, a verification code has been sent.', expiresInMinutes: RESET_CODE_TTL_MINUTES };
    if (!user || (role && user.role !== role)) {
      return res.json(genericResponse);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
    user.resetPasswordCode = crypto.createHash('sha256').update(code).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + RESET_CODE_TTL_MS);
    user.resetPasswordAttempts = 0;
    await user.save();

    await sendResetPasswordCodeEmail({ to: user.email, name: user.name, code, expiresInMinutes: RESET_CODE_TTL_MINUTES });

    // In demo/local mode (no EMAIL_USER/EMAIL_PASS configured), the code
    // only ever reaches the server console — so hand it back in the API
    // response too, purely so the flow stays testable without email set up.
    // Once real email credentials are configured, this field is omitted.
    const isEmailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    return res.json(isEmailConfigured ? genericResponse : { ...genericResponse, devCode: code });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ message: 'Server error while processing the request.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, role, code, newPassword } = req.body;

    if (!email?.trim() || !code?.trim() || !newPassword?.trim()) {
      return res.status(400).json({ message: 'Please fill in all fields.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+resetPasswordCode +resetPasswordExpires +resetPasswordAttempts');

    if (!user || (role && user.role !== role) || !user.resetPasswordCode) {
      return res.status(400).json({ message: 'Invalid or expired verification code. Please request a new one.' });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      user.resetPasswordCode = undefined;
      user.resetPasswordExpires = undefined;
      user.resetPasswordAttempts = 0;
      await user.save();
      return res.status(400).json({ message: 'This code has expired. Please request a new one.' });
    }

    if (user.resetPasswordAttempts >= MAX_RESET_ATTEMPTS) {
      user.resetPasswordCode = undefined;
      user.resetPasswordExpires = undefined;
      user.resetPasswordAttempts = 0;
      await user.save();
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.' });
    }

    const hashedCode = crypto.createHash('sha256').update(code.trim()).digest('hex');
    if (hashedCode !== user.resetPasswordCode) {
      user.resetPasswordAttempts += 1;
      await user.save();
      const remaining = MAX_RESET_ATTEMPTS - user.resetPasswordAttempts;
      return res.status(400).json({ message: `Incorrect code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please request a new code.'}` });
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordAttempts = 0;
    await user.save();

    return res.json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ message: 'Server error while resetting the password.' });
  }
};

// Used by an already-logged-in user (student or admin) to change their own
// password from inside the dashboard, without needing to log out and go
// through the forgot-password flow. Requires the current password as proof
// of identity, since this app doesn't use session tokens.
export const changePassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email?.trim() || !currentPassword?.trim() || !newPassword?.trim()) {
      return res.status(400).json({ message: 'Please fill in all fields.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    return res.json({ message: 'Your password has been changed successfully.' });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ message: 'Server error while changing the password.' });
  }
};
