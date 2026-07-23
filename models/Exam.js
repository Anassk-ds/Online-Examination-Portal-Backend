import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    output: { type: String, default: '' }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['mcq', 'coding'], default: 'mcq' },
    text: { type: String, default: '' },
    marks: { type: Number, default: 1, min: 0 },
    // MCQ fields
    optionA: { type: String, default: '' },
    optionB: { type: String, default: '' },
    optionC: { type: String, default: '' },
    optionD: { type: String, default: '' },
    correct: { type: String, default: 'A' },
    // Coding fields
    codingProblemStatement: { type: String, default: '' },
    sampleInput: { type: String, default: '' },
    sampleOutput: { type: String, default: '' },
    testCases: { type: [testCaseSchema], default: [] },
    allowedLanguages: { type: [String], default: ['javascript', 'python', 'java'] }
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // How long each student's countdown timer runs once THEY click Start —
    // independent of startDate/endDate, which only control the window during
    // which students are allowed to begin the exam at all. A student who
    // starts at any point inside that window still gets exactly this many
    // minutes on their own timer.
    durationMinutes: { type: Number, required: true, default: 60, min: 1 },
    questions: { type: [questionSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model('Exam', examSchema);
