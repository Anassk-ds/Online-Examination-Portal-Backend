import Result from '../models/Result.js';

export const getResults = async (req, res) => {
  try {
    const { email } = req.query;
    const filter = email ? { studentEmail: email.toLowerCase().trim() } : {};
    const results = await Result.find(filter).sort({ createdAt: -1 });
    return res.json(results.map(toClientResult));
  } catch (err) {
    console.error('getResults error:', err);
    return res.status(500).json({ message: 'Server error fetching results.' });
  }
};

export const checkAttempted = async (req, res) => {
  try {
    const { examId, email } = req.query;
    if (!examId || !email) return res.status(400).json({ message: 'examId and email are required.' });
    const existing = await Result.findOne({ examId, studentEmail: email.toLowerCase().trim() });
    return res.json({ attempted: !!existing });
  } catch (err) {
    console.error('checkAttempted error:', err);
    return res.status(500).json({ message: 'Server error checking attempt status.' });
  }
};

export const submitResult = async (req, res) => {
  try {
    const { studentEmail, examId, examTitle, score, totalQuestions, totalMarks, studentAnswers } = req.body;
    if (!studentEmail || !examId || score === undefined || totalQuestions === undefined) {
      return res.status(400).json({ message: 'Missing required result fields.' });
    }

    const result = await Result.create({
      studentEmail: studentEmail.toLowerCase().trim(),
      examId,
      examTitle,
      score,
      totalQuestions,
      totalMarks,
      studentAnswers
    });
    return res.status(201).json(toClientResult(result));
  } catch (err) {
    if (err.code === 11000) {
      // Unique index on (examId, studentEmail) caught a double-submit race.
      return res.status(409).json({ message: 'This exam has already been submitted.' });
    }
    console.error('submitResult error:', err);
    return res.status(500).json({ message: 'Server error saving result.' });
  }
};

function toClientResult(result) {
  const obj = result.toObject();
  return { ...obj, id: obj._id.toString(), examId: obj.examId.toString() };
}
