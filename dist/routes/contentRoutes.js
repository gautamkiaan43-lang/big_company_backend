"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contentController_1 = require("../controllers/contentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public Routes (No auth needed for landing page)
router.get('/public/news', contentController_1.getPublicNews);
router.get('/public/blogs', contentController_1.getPublicBlogs);
// Protected Admin Routes
router.use(authMiddleware_1.authenticate);
// News Management
router.get('/news', contentController_1.getAllNews);
router.post('/news', contentController_1.createNews);
router.put('/news/:id', contentController_1.updateNews);
router.delete('/news/:id', contentController_1.deleteNews);
// Blog Management
router.get('/blogs', contentController_1.getAllBlogs);
router.post('/blogs', contentController_1.createBlog);
router.put('/blogs/:id', contentController_1.updateBlog);
router.delete('/blogs/:id', contentController_1.deleteBlog);
exports.default = router;
