import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';

// Get all courses (enrolled + available) for the logged-in employee
export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    // Get all courses
    const allCourses = await prisma.course.findMany({
      include: {
        lessons: true,
        enrollments: {
          where: { employeeId: employeeProfile.id },
          include: {
            lessonProgress: true
          }
        }
      }
    });

    // Format courses with enrollment info
    const courses = allCourses.map(course => {
      const enrollment = (course as any).enrollments[0]; // Employee can only have one enrollment per course
      const completedLessons = enrollment ? enrollment.lessonProgress.filter((lp: any) => lp.completed).length : 0;

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level.toLowerCase(),
        duration: course.duration,
        progress: enrollment ? enrollment.progress : 0,
        status: enrollment ? enrollment.status.toLowerCase() : 'not_started',
        instructor: course.instructor,
        enrolled: !!enrollment,
        completedDate: enrollment?.completedAt,
        certificateUrl: enrollment?.certificateUrl,
        lessons: course.totalLessons,
        completedLessons: completedLessons
      };
    });

    res.json({ courses });
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get course by ID with lessons
export const getCourseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const course = await prisma.course.findUnique({
      where: { id: Number(id) },
      include: {
        lessons: {
          orderBy: { order: 'asc' }
        },
        enrollments: {
          where: { employeeId: employeeProfile.id },
          include: {
            lessonProgress: true
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const enrollment = (course as any).enrollments[0];
    const completedLessons = enrollment ? enrollment.lessonProgress.filter((lp: any) => lp.completed).length : 0;

    const formattedCourse = {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level.toLowerCase(),
      duration: course.duration,
      instructor: course.instructor,
      totalLessons: course.totalLessons,
      enrolled: !!enrollment,
      progress: enrollment ? enrollment.progress : 0,
      status: enrollment ? enrollment.status.toLowerCase() : 'not_started',
      completedDate: enrollment?.completedAt,
      certificateUrl: enrollment?.certificateUrl,
      lessons: course.lessons.map(lesson => {
        const lessonProgress = enrollment?.lessonProgress.find(lp => lp.lessonId === lesson.id);
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          order: lesson.order,
          duration: lesson.duration,
          completed: lessonProgress?.completed || false,
          completedAt: lessonProgress?.completedAt
        };
      })
    };

    res.json(formattedCourse);
  } catch (error: any) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: error.message });
  }
};

// Enroll in a course
export const enrollCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: Number(id) },
      include: { lessons: true }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_employeeId: {
          courseId: Number(id),
          employeeId: employeeProfile.id
        }
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Create enrollment
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        courseId: Number(id),
        employeeId: employeeProfile.id,
        status: 'NOT_STARTED'
      }
    });

    // Create lesson progress records for all lessons
    for (const lesson of course.lessons) {
      await prisma.lessonProgress.create({
        data: {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          completed: false
        }
      });
    }

    res.json({ success: true, enrollment });
  } catch (error: any) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update lesson progress (mark as completed)
export const updateLessonProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // lesson ID
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    // Find the lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: Number(id) },
      include: { course: true }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Find enrollment
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_employeeId: {
          courseId: lesson.courseId,
          employeeId: employeeProfile.id
        }
      },
      include: {
        lessonProgress: true,
        course: { include: { lessons: true } }
      }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Not enrolled in this course' });
    }

    // Find or create lesson progress
    let lessonProgress = await prisma.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: Number(id)
        }
      }
    });

    if (!lessonProgress) {
      lessonProgress = await prisma.lessonProgress.create({
        data: {
          enrollmentId: enrollment.id,
          lessonId: Number(id),
          completed: true,
          completedAt: new Date()
        }
      });
    } else if (!lessonProgress.completed) {
      lessonProgress = await prisma.lessonProgress.update({
        where: { id: lessonProgress.id },
        data: {
          completed: true,
          completedAt: new Date()
        }
      });
    }

    // Calculate new progress
    const totalLessons = enrollment.course.lessons.length;
    const completedCount = enrollment.lessonProgress.filter(lp => 
      lp.id === lessonProgress!.id ? true : lp.completed
    ).length + (lessonProgress.completed ? 0 : 1);
    
    const progress = Math.round((completedCount / totalLessons) * 100);
    const isCompleted = completedCount === totalLessons;

    // Update enrollment
    const updatedEnrollment = await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        progress: progress,
        status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: isCompleted ? new Date() : null,
        certificateUrl: isCompleted ? `/certificates/${enrollment.id}` : null
      }
    });

    res.json({ 
      success: true, 
      lessonProgress,
      enrollment: {
        progress: updatedEnrollment.progress,
        status: updatedEnrollment.status.toLowerCase(),
        completedAt: updatedEnrollment.completedAt,
        certificateUrl: updatedEnrollment.certificateUrl
      }
    });
  } catch (error: any) {
    console.error('Error updating lesson progress:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get certificates (completed courses)
export const getCertificates = async (req: AuthRequest, res: Response) => {
  try {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const completedEnrollments = await prisma.courseEnrollment.findMany({
      where: {
        employeeId: employeeProfile.id,
        status: 'COMPLETED'
      },
      include: {
        course: true
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    const certificates = completedEnrollments.map(enrollment => ({
      id: enrollment.id,
      courseId: enrollment.course.id,
      courseTitle: enrollment.course.title,
      instructor: enrollment.course.instructor,
      completedDate: enrollment.completedAt,
      certificateUrl: enrollment.certificateUrl
    }));

    res.json({ certificates });
  } catch (error: any) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ error: error.message });
  }
};
