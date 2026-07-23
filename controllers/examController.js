import Exam from '../models/Exam.js';

export const getExams = async (_req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    return res.json(exams.map(toClientExam));
  } catch (err) {
    console.error('getExams error:', err);
    return res.status(500).json({ message: 'Server error fetching exams.' });
  }
};

export const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    return res.json(toClientExam(exam));
  } catch (err) {
    console.error('getExamById error:', err);
    return res.status(400).json({ message: 'Exam not found.' });
  }
};

export const createExam = async (req, res) => {
  try {
    const { title, startDate, endDate, durationMinutes, questions } = req.body;
    const validation = validateExamPayload({ title, startDate, endDate, durationMinutes, questions });
    if (validation) return res.status(400).json({ message: validation });

    const exam = await Exam.create({ title: title.trim(), startDate, endDate, durationMinutes, questions });
    return res.status(201).json(toClientExam(exam));
  } catch (err) {
    console.error('createExam error:', err);
    return res.status(500).json({ message: 'Server error creating exam.' });
  }
};

export const updateExam = async (req, res) => {
  try {
    const { title, startDate, endDate, durationMinutes, questions } = req.body;
    const validation = validateExamPayload({ title, startDate, endDate, durationMinutes, questions });
    if (validation) return res.status(400).json({ message: validation });

    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { title: title.trim(), startDate, endDate, durationMinutes, questions },
      { new: true, runValidators: true }
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    return res.json(toClientExam(exam));
  } catch (err) {
    console.error('updateExam error:', err);
    return res.status(500).json({ message: 'Server error updating exam.' });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    return res.json({ message: 'Exam deleted.' });
  } catch (err) {
    console.error('deleteExam error:', err);
    return res.status(500).json({ message: 'Server error deleting exam.' });
  }
};

// ---- helpers ----

// Same rules as the admin.jsx client-side check, enforced again server-side
// so a bad request (or a bypassed client) can't save a broken exam.
function validateExamPayload({ title, startDate, endDate, durationMinutes, questions }) {
  if (!title?.trim() || !startDate || !endDate) {
    return 'Please provide the exam title and both dates.';
  }
  if (new Date(endDate) <= new Date(startDate)) {
    return 'End date must be after the start date.';
  }
  if (!durationMinutes || Number(durationMinutes) <= 0) {
    return 'Please set how many minutes students get once they start the exam.';
  }
  for (const q of questions || []) {
    if (!q.marks || Number(q.marks) <= 0) {
      return `"${q.text || 'A question'}" needs a marks value greater than 0.`;
    }
    if (q.type === 'coding') {
      const cases = q.testCases || [];
      if (cases.length === 0 || cases.every((tc) => !tc.input && !tc.output)) {
        return `"${q.text || 'A coding question'}" needs at least one test case with input and expected output.`;
      }
      const incomplete = cases.some((tc) => tc.input?.trim() && !tc.output?.trim());
      if (incomplete) {
        return `"${q.text || 'A coding question'}" has a test case with input but no expected output.`;
      }
    }
  }
  return null;
}

// Reshapes a Mongoose exam doc into the `_id`-as-string shape the frontend expects.
function toClientExam(exam) {
  const obj = exam.toObject();
  return { ...obj, _id: obj._id.toString() };
}
