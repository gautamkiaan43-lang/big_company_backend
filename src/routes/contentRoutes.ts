import { Router } from 'express';
import {
  createNews,
  getAllNews,
  getPublicNews,
  updateNews,
  deleteNews,
  createBlog,
  getAllBlogs,
  getPublicBlogs,
  updateBlog,
  deleteBlog
} from '../controllers/contentController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Public Routes (No auth needed for landing page)
router.get('/public/news', getPublicNews);
router.get('/public/blogs', getPublicBlogs);

// Protected Admin Routes
router.use(authenticate);

// News Management
router.get('/news', getAllNews);
router.post('/news', createNews);
router.put('/news/:id', updateNews);
router.delete('/news/:id', deleteNews);

// Blog Management
router.get('/blogs', getAllBlogs);
router.post('/blogs', createBlog);
router.put('/blogs/:id', updateBlog);
router.delete('/blogs/:id', deleteBlog);

export default router;
