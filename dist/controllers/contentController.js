"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBlog = exports.updateBlog = exports.getPublicBlogs = exports.getAllBlogs = exports.createBlog = exports.deleteNews = exports.updateNews = exports.getPublicNews = exports.getAllNews = exports.createNews = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const cloudinary_1 = require("../utils/cloudinary");
// News Controllers
const createNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, shortDescription, fullContent, image, author, status } = req.body;
        // Upload image to Cloudinary if provided as base64
        let imageUrl = image;
        if (image && image.startsWith('data:image')) {
            imageUrl = yield (0, cloudinary_1.uploadImage)(image);
        }
        const news = yield prisma_1.default.news.create({
            data: {
                title,
                shortDescription,
                fullContent,
                image: imageUrl,
                author,
                status: status || 'published',
                publishedAt: new Date(),
            },
        });
        res.status(201).json(news);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createNews = createNews;
const getAllNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const news = yield prisma_1.default.news.findMany({
            orderBy: { publishedAt: 'desc' },
        });
        res.json(news);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getAllNews = getAllNews;
const getPublicNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const news = yield prisma_1.default.news.findMany({
            where: { status: 'published' },
            orderBy: { publishedAt: 'desc' },
        });
        res.json(news);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getPublicNews = getPublicNews;
const updateNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const _a = req.body, { image } = _a, updateData = __rest(_a, ["image"]);
        let imageUrl = image;
        if (image && image.startsWith('data:image')) {
            imageUrl = yield (0, cloudinary_1.uploadImage)(image);
        }
        const news = yield prisma_1.default.news.update({
            where: { id: parseInt(id) },
            data: Object.assign(Object.assign({}, updateData), { image: imageUrl }),
        });
        res.json(news);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateNews = updateNews;
const deleteNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.news.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: 'News deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteNews = deleteNews;
// Blog Controllers
const createBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, category, blogText, image, author, status } = req.body;
        let imageUrl = image;
        if (image && image.startsWith('data:image')) {
            imageUrl = yield (0, cloudinary_1.uploadImage)(image);
        }
        const blog = yield prisma_1.default.blog.create({
            data: {
                title,
                category,
                blogText,
                image: imageUrl,
                author,
                status: status || 'published',
                publishedAt: new Date(),
            },
        });
        res.status(201).json(blog);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createBlog = createBlog;
const getAllBlogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blogs = yield prisma_1.default.blog.findMany({
            orderBy: { publishedAt: 'desc' },
        });
        res.json(blogs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getAllBlogs = getAllBlogs;
const getPublicBlogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blogs = yield prisma_1.default.blog.findMany({
            where: { status: 'published' },
            orderBy: { publishedAt: 'desc' },
        });
        res.json(blogs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getPublicBlogs = getPublicBlogs;
const updateBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const _a = req.body, { image } = _a, updateData = __rest(_a, ["image"]);
        let imageUrl = image;
        if (image && image.startsWith('data:image')) {
            imageUrl = yield (0, cloudinary_1.uploadImage)(image);
        }
        const blog = yield prisma_1.default.blog.update({
            where: { id: parseInt(id) },
            data: Object.assign(Object.assign({}, updateData), { image: imageUrl }),
        });
        res.json(blog);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateBlog = updateBlog;
const deleteBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.blog.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: 'Blog deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteBlog = deleteBlog;
