import { Router } from 'express';
import { getExams, getExamById, createExam, updateExam, deleteExam } from '../controllers/examController.js';

const router = Router();

router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

export default router;
