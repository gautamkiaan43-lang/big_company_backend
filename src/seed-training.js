const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTraining() {
  console.log('🌱 Seeding training data...');

  // Find the employee
  const employee = await prisma.user.findUnique({
    where: { email: 'employee@bigcompany.rw' },
    include: { employeeProfile: true }
  });

  if (!employee || !employee.employeeProfile) {
    console.error('❌ Employee not found. Please run the main seed first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const employeeProfileId = employee.employeeProfile.id;

  // Create courses matching the frontend hardcoded data
  const courses = [
    {
      title: 'Advanced React Development',
      description: 'Master advanced React patterns, hooks, and performance optimization',
      category: 'Technical',
      level: 'ADVANCED',
      duration: 40,
      instructor: 'John Developer',
      totalLessons: 20,
      enrolled: true,
      progress: 65,
      completedLessons: 13
    },
    {
      title: 'Project Management Fundamentals',
      description: 'Learn the basics of project management and agile methodologies',
      category: 'Management',
      level: 'BEGINNER',
      duration: 20,
      instructor: 'Sarah Manager',
      totalLessons: 10,
      enrolled: true,
      progress: 100,
      completedLessons: 10,
      completed: true,
      completedDate: new Date('2025-11-15')
    },
    {
      title: 'Effective Communication Skills',
      description: 'Improve your verbal and written communication in the workplace',
      category: 'Soft Skills',
      level: 'INTERMEDIATE',
      duration: 15,
      instructor: 'Mike Trainer',
      totalLessons: 12,
      enrolled: true,
      progress: 30,
      completedLessons: 4
    },
    {
      title: 'Sales Techniques & Strategies',
      description: 'Learn proven sales techniques to close more deals',
      category: 'Sales',
      level: 'INTERMEDIATE',
      duration: 25,
      instructor: 'Lisa Seller',
      totalLessons: 15,
      enrolled: true,
      progress: 0,
      completedLessons: 0
    },
    {
      title: 'Leadership & Team Building',
      description: 'Develop leadership skills and learn to build high-performing teams',
      category: 'Management',
      level: 'ADVANCED',
      duration: 30,
      instructor: 'David Leader',
      totalLessons: 18,
      enrolled: false
    }
  ];

  for (const courseData of courses) {
    const { enrolled, progress, completedLessons, completed, completedDate, ...courseFields } = courseData;

    // Create course
    const course = await prisma.course.create({
      data: courseFields
    });

    // Create lessons for the course
    for (let i = 1; i <= course.totalLessons; i++) {
      await prisma.lesson.create({
        data: {
          courseId: course.id,
          title: `Lesson ${i}: ${course.title}`,
          description: `Detailed content for lesson ${i}`,
          order: i,
          duration: Math.ceil(course.duration / course.totalLessons),
          content: `Content for lesson ${i}`
        }
      });
    }

    // If enrolled, create enrollment and lesson progress
    if (enrolled) {
      const enrollmentStatus = completed ? 'COMPLETED' : (progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED');
      
      const enrollment = await prisma.courseEnrollment.create({
        data: {
          courseId: course.id,
          employeeId: employeeProfileId,
          status: enrollmentStatus,
          progress: progress,
          completedAt: completedDate || null,
          certificateUrl: completed ? `/certificates/${course.id}` : null
        }
      });

      // Get lessons for this course
      const lessons = await prisma.lesson.findMany({
        where: { courseId: course.id },
        orderBy: { order: 'asc' }
      });

      // Create lesson progress
      for (let i = 0; i < lessons.length; i++) {
        const isCompleted = i < completedLessons;
        await prisma.lessonProgress.create({
          data: {
            enrollmentId: enrollment.id,
            lessonId: lessons[i].id,
            completed: isCompleted,
            completedAt: isCompleted ? new Date() : null
          }
        });
      }

      console.log(`✅ Created course: ${course.title} (Enrolled, ${completedLessons}/${course.totalLessons} lessons completed)`);
    } else {
      console.log(`✅ Created course: ${course.title} (Available)`);
    }
  }

  console.log('🎉 Training data seeding complete!');
  await prisma.$disconnect();
}

seedTraining()
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
