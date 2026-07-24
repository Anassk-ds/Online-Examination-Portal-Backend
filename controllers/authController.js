import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendResetPasswordEmail } from '../utils/sendEmail.js';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

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
        return res.status(403).json({
          message: 'Invalid Master Admin verification code.'
        });
      }
    }

    const existing = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (existing) {
      return res.status(409).json({
        message: 'An account with this email already exists.'
      });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role,
      isApproved: role === 'admin'
    });

    const message =
      role === 'student'
        ? 'Registered! Your account is pending Admin approval before you can sign in.'
        : 'Admin account created! You can now sign in.';

    return res.status(201).json({
      message,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
      }
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({
      message: 'Server error during registration.'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({
        message: 'Please fill in all fields.'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        message: `This account is registered as ${user.role}. Please use the ${user.role} portal.`
      });
    }

    if (user.role === 'student' && !user.isApproved) {
      return res.status(403).json({
        message: 'Your account is pending Admin approval.'
      });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
      }
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({
      message: 'Server error during login.'
    });
  }
};
// Both students and admins use this — role is used only to give the right
// error message when someone's account exists but under a different role.
export const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({
        message: 'Please enter your email address.'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });

    // Always respond the same way whether or not the account exists, so this
    // endpoint can't be used to discover which emails are registered.
    if (!user || (role && user.role !== role)) {
      return res.json({
        message: 'If an account exists for that email, a reset link has been sent.'
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    user.resetPasswordExpires = new Date(
      Date.now() + RESET_TOKEN_TTL_MS
    );

    await user.save();

    const clientOrigin =
      process.env.CLIENT_ORIGIN || 'http://localhost:3000';

    const resetUrl = `${clientOrigin}/reset-password/${rawToken}`;

    await sendResetPasswordEmail({
      to: user.email,
      name: user.name,
      resetUrl
    });

    return res.json({
      message:
        'If an account exists for that email, a reset link has been sent.'
    });
  } catch (err) {
    console.error('forgotPassword error:', err);

    return res.status(500).json({
      message: 'Server error while processing the request.'
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password?.trim() || password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters.'
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({
        message: 'This reset link is invalid or has expired.'
      });
    }

    user.password = await bcrypt.hash(password, SALT_ROUNDS);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({
      message:
        'Your password has been reset. You can now sign in.'
    });
  } catch (err) {
    console.error('resetPassword error:', err);

    return res.status(500).json({
      message: 'Server error while resetting the password.'
    });
  }
};
// Used by an already-logged-in user (student or admin) to change their own
// password from inside the dashboard, without needing to log out and go
// through the forgot-password flow. Requires the current password as proof
// of identity, since this app doesn't use session tokens.
export const changePassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (
      !email?.trim() ||
      !currentPassword?.trim() ||
      !newPassword?.trim()
    ) {
      return res.status(400).json({
        message: 'Please fill in all fields.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters.'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return res.status(404).json({
        message: 'Account not found.'
      });
    }

    const match = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!match) {
      return res.status(401).json({
        message: 'Current password is incorrect.'
      });
    }

    user.password = await bcrypt.hash(
      newPassword,
      SALT_ROUNDS
    );

    await user.save();

    return res.json({
      message: 'Your password has been changed successfully.'
    });
  } catch (err) {
    console.error('changePassword error:', err);

    return res.status(500).json({
      message: 'Server error while changing the password.'
    });
  }
};
