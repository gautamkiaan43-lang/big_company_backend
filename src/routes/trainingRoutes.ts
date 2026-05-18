import { Router } from 'express';
import { 
  getCourses, 
  getCourseById, 
  enrollCourse,
  updateLessonProgress,
  getCertificates
} from '../controllers/trainingController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/training/courses', getCourses);
router.get('/training/courses/:id', getCourseById);
router.post('/training/courses/:id/enroll', enrollCourse);
router.put('/training/lessons/:id/complete', updateLessonProgress);
router.get('/training/certificates', getCertificates);

export default router;
