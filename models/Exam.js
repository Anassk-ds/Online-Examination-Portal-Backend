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
    questions: { type: [questionSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model('Exam', examSchema);
