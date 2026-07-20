import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const SALT_ROUNDS = 10;

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
