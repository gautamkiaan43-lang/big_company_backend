import { Router } from 'express';
import { 
  getProjects, 
  getProjectById, 
  getTasks,
  updateTaskStatus
} from '../controllers/projectController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/projects', getProjects);
router.get('/projects/:id', getProjectById);
router.get('/tasks', getTasks);
router.put('/tasks/:id', updateTaskStatus);

export default router;
