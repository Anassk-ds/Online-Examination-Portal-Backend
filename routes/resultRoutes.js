import { Router } from 'express';
import { getResults, checkAttempted, submitResult } from '../controllers/resultController.js';

const router = Router();

router.get('/attempted', checkAttempted); // must come before "/:id"-style routes if any are added later
router.get('/', getResults);
router.post('/', submitResult);

export default router;
