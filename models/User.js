
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // stored hashed, never plaintext
    role: { type: String, enum: ['student', 'admin'], required: true },
    isApproved: { type: Boolean, default: false },
    resetPasswordCode: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    resetPasswordAttempts: { type: Number, default: 0, select: false }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
