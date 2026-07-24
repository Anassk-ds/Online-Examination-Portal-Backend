import { Router } from 'express';
import { getPendingStudents, approveStudent, getAdminStats, getAllStudents } from '../controllers/userController.js';

const router = Router();

router.get('/pending', getPendingStudents);
router.get('/students', getAllStudents);
router.patch('/:id/approve', approveStudent);
router.get('/stats', getAdminStats);

export default router;
