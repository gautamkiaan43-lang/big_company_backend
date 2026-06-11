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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCertificates = exports.updateLessonProgress = exports.enrollCourse = exports.getCourseById = exports.getCourses = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Get all courses (enrolled + available) for the logged-in employee
const getCourses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        // Get all courses
        const allCourses = yield prisma_1.default.course.findMany({
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
            const enrollment = course.enrollments[0]; // Employee can only have one enrollment per course
            const completedLessons = enrollment ? enrollment.lessonProgress.filter((lp) => lp.completed).length : 0;
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
                completedDate: enrollment === null || enrollment === void 0 ? void 0 : enrollment.completedAt,
                certificateUrl: enrollment === null || enrollment === void 0 ? void 0 : enrollment.certificateUrl,
                lessons: course.totalLessons,
                completedLessons: completedLessons
            };
        });
        res.json({ courses });
    }
    catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getCourses = getCourses;
// Get course by ID with lessons
const getCourseById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        const course = yield prisma_1.default.course.findUnique({
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
        const enrollment = course.enrollments[0];
        const completedLessons = enrollment ? enrollment.lessonProgress.filter((lp) => lp.completed).length : 0;
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
            completedDate: enrollment === null || enrollment === void 0 ? void 0 : enrollment.completedAt,
            certificateUrl: enrollment === null || enrollment === void 0 ? void 0 : enrollment.certificateUrl,
            lessons: course.lessons.map(lesson => {
                const lessonProgress = enrollment === null || enrollment === void 0 ? void 0 : enrollment.lessonProgress.find(lp => lp.lessonId === lesson.id);
                return {
                    id: lesson.id,
                    title: lesson.title,
                    description: lesson.description,
                    order: lesson.order,
                    duration: lesson.duration,
                    completed: (lessonProgress === null || lessonProgress === void 0 ? void 0 : lessonProgress.completed) || false,
                    completedAt: lessonProgress === null || lessonProgress === void 0 ? void 0 : lessonProgress.completedAt
                };
            })
        };
        res.json(formattedCourse);
    }
    catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getCourseById = getCourseById;
// Enroll in a course
const enrollCourse = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        // Check if course exists
        const course = yield prisma_1.default.course.findUnique({
            where: { id: Number(id) },
            include: { lessons: true }
        });
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        // Check if already enrolled
        const existingEnrollment = yield prisma_1.default.courseEnrollment.findUnique({
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
        const enrollment = yield prisma_1.default.courseEnrollment.create({
            data: {
                courseId: Number(id),
                employeeId: employeeProfile.id,
                status: 'NOT_STARTED'
            }
        });
        // Create lesson progress records for all lessons
        for (const lesson of course.lessons) {
            yield prisma_1.default.lessonProgress.create({
                data: {
                    enrollmentId: enrollment.id,
                    lessonId: lesson.id,
                    completed: false
                }
            });
        }
        res.json({ success: true, enrollment });
    }
    catch (error) {
        console.error('Error enrolling in course:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.enrollCourse = enrollCourse;
// Update lesson progress (mark as completed)
const updateLessonProgress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // lesson ID
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        // Find the lesson
        const lesson = yield prisma_1.default.lesson.findUnique({
            where: { id: Number(id) },
            include: { course: true }
        });
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        // Find enrollment
        const enrollment = yield prisma_1.default.courseEnrollment.findUnique({
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
        let lessonProgress = yield prisma_1.default.lessonProgress.findUnique({
            where: {
                enrollmentId_lessonId: {
                    enrollmentId: enrollment.id,
                    lessonId: Number(id)
                }
            }
        });
        if (!lessonProgress) {
            lessonProgress = yield prisma_1.default.lessonProgress.create({
                data: {
                    enrollmentId: enrollment.id,
                    lessonId: Number(id),
                    completed: true,
                    completedAt: new Date()
                }
            });
        }
        else if (!lessonProgress.completed) {
            lessonProgress = yield prisma_1.default.lessonProgress.update({
                where: { id: lessonProgress.id },
                data: {
                    completed: true,
                    completedAt: new Date()
                }
            });
        }
        // Calculate new progress
        const totalLessons = enrollment.course.lessons.length;
        const completedCount = enrollment.lessonProgress.filter(lp => lp.id === lessonProgress.id ? true : lp.completed).length + (lessonProgress.completed ? 0 : 1);
        const progress = Math.round((completedCount / totalLessons) * 100);
        const isCompleted = completedCount === totalLessons;
        // Update enrollment
        const updatedEnrollment = yield prisma_1.default.courseEnrollment.update({
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
    }
    catch (error) {
        console.error('Error updating lesson progress:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateLessonProgress = updateLessonProgress;
// Get certificates (completed courses)
const getCertificates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        const completedEnrollments = yield prisma_1.default.courseEnrollment.findMany({
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
    }
    catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getCertificates = getCertificates;
