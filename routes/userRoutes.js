import { Router } from 'express';
import { getPendingStudents, approveStudent, getAdminStats } from '../controllers/userController.js';

const router = Router();

router.get('/pending', getPendingStudents);
router.patch('/:id/approve', approveStudent);
router.get('/stats', getAdminStats);

export default router;
