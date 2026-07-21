import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema(
  {
    studentEmail: { type: String, required: true, lowercase: true, trim: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    examTitle: { type: String, default: 'Exam Session' },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    totalMarks: { type: Number }, // sum of per-question weights; falls back to totalQuestions on the frontend if absent (older results)
    // Keyed by question index; each value is either a plain MCQ answer string
    // or a coding-answer object ({ code, lang, testCaseResults, ... }).
    studentAnswers: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

// One attempt per student per exam — enforced at the DB level too.
resultSchema.index({ examId: 1, studentEmail: 1 }, { unique: true });

export default mongoose.model('Result', resultSchema);
