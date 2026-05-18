import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { uploadImage } from '../utils/cloudinary';

// News Controllers
export const createNews = async (req: Request, res: Response) => {
  try {
    const { title, shortDescription, fullContent, image, author, status } = req.body;

    // Upload image to Cloudinary if provided as base64
    let imageUrl = image;
    if (image && image.startsWith('data:image')) {
      imageUrl = await uploadImage(image);
    }

    const news = await prisma.news.create({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllNews = async (req: Request, res: Response) => {
  try {
    const news = await prisma.news.findMany({
      orderBy: { publishedAt: 'desc' },
    });
    res.json(news);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPublicNews = async (req: Request, res: Response) => {
  try {
    const news = await prisma.news.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
    });
    res.json(news);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { image, ...updateData } = req.body;

    let imageUrl = image;
    if (image && image.startsWith('data:image')) {
      imageUrl = await uploadImage(image);
    }

    const news = await prisma.news.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        image: imageUrl,
      },
    });
    res.json(news);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.news.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'News deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Blog Controllers
export const createBlog = async (req: Request, res: Response) => {
  try {
    const { title, category, blogText, image, author, status } = req.body;

    let imageUrl = image;
    if (image && image.startsWith('data:image')) {
      imageUrl = await uploadImage(image);
    }

    const blog = await prisma.blog.create({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await prisma.blog.findMany({
      orderBy: { publishedAt: 'desc' },
    });
    res.json(blogs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPublicBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await prisma.blog.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
    });
    res.json(blogs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { image, ...updateData } = req.body;

    let imageUrl = image;
    if (image && image.startsWith('data:image')) {
      imageUrl = await uploadImage(image);
    }

    const blog = await prisma.blog.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        image: imageUrl,
      },
    });
    res.json(blog);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.blog.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Blog deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
