import User from '../models/User.js';
import Exam from '../models/Exam.js';
import Result from '../models/Result.js';

export const getPendingStudents = async (_req, res) => {
  try {
    const pending = await User.find({ role: 'student', isApproved: false }).select('-password');
    return res.json(pending.map((u) => ({ id: u._id, name: u.name, email: u.email })));
  } catch (err) {
    console.error('getPendingStudents error:', err);
    return res.status(500).json({ message: 'Server error fetching pending students.' });
  }
};

export const approveStudent = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'Student not found.' });
    return res.json({ id: user._id, name: user.name, email: user.email, isApproved: user.isApproved });
  } catch (err) {
    console.error('approveStudent error:', err);
    return res.status(500).json({ message: 'Server error approving student.' });
  }
};

export const getAllStudents = async (_req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').sort({ name: 1 });
    return res.json(
      students.map((u) => ({ id: u._id, name: u.name, email: u.email, isApproved: u.isApproved, createdAt: u.createdAt }))
    );
  } catch (err) {
    console.error('getAllStudents error:', err);
    return res.status(500).json({ message: 'Server error fetching students.' });
  }
};

export const getAdminStats = async (_req, res) => {
  try {
    const now = new Date();
    const [totalExams, approvedStudents, totalStudents, totalResults, upcomingExams] = await Promise.all([
      Exam.countDocuments(),
      User.countDocuments({ role: 'student', isApproved: true }),
      User.countDocuments({ role: 'student' }),
      Result.countDocuments(),
      Exam.countDocuments({ startDate: { $gt: now } })
    ]);
    return res.json({ totalExams, approvedStudents, totalStudents, totalResults, upcomingExams });
  } catch (err) {
    console.error('getAdminStats error:', err);
    return res.status(500).json({ message: 'Server error fetching stats.' });
  }
};
