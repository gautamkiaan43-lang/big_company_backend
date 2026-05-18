const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedProjects() {
  console.log('🌱 Seeding project data...');

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

  // Create projects matching the frontend hardcoded data
  const projects = [
    {
      name: 'E-Commerce Platform Redesign',
      description: 'Complete overhaul of the customer-facing e-commerce platform',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      progress: 65,
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-12-31'),
      dueDate: new Date('2025-12-31'),
      client: 'ABC Corporation',
      managerId: employeeProfileId,
      memberRole: 'Frontend Developer'
    },
    {
      name: 'Mobile App Development',
      description: 'Native mobile application for iOS and Android',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      progress: 45,
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-02-28'),
      dueDate: new Date('2026-02-28'),
      client: 'XYZ Ltd',
      managerId: employeeProfileId,
      memberRole: 'QA Tester'
    },
    {
      name: 'Internal CRM System',
      description: 'Custom CRM solution for sales team management',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      progress: 100,
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-11-30'),
      dueDate: new Date('2025-11-30'),
      client: null,
      managerId: employeeProfileId,
      memberRole: 'Backend Developer'
    },
    {
      name: 'Marketing Website Launch',
      description: 'New corporate website with blog and portfolio sections',
      status: 'NOT_STARTED',
      priority: 'LOW',
      progress: 0,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-03-31'),
      dueDate: new Date('2026-03-31'),
      client: 'DEF Industries',
      managerId: employeeProfileId,
      memberRole: 'Content Writer'
    }
  ];

  for (const projectData of projects) {
    const { memberRole, ...projectFields } = projectData;

    // Create project
    const project = await prisma.project.create({
      data: projectFields
    });

    // Add employee as project member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        employeeId: employeeProfileId,
        role: memberRole
      }
    });

    // Create tasks for each project
    const taskCounts = {
      'E-Commerce Platform Redesign': { total: 20, completed: 13 },
      'Mobile App Development': { total: 20, completed: 9 },
      'Internal CRM System': { total: 15, completed: 15 },
      'Marketing Website Launch': { total: 12, completed: 0 }
    };

    const taskCount = taskCounts[project.name] || { total: 10, completed: 0 };
    
    for (let i = 1; i <= taskCount.total; i++) {
      const isCompleted = i <= taskCount.completed;
      const estimatedHours = Math.floor(Math.random() * 8) + 4; // 4-12 hours
      const actualHours = isCompleted ? estimatedHours + (Math.random() * 4 - 2) : 0; // +/- 2 hours variance

      await prisma.task.create({
        data: {
          projectId: project.id,
          title: `Task ${i} for ${project.name}`,
          description: `Detailed description for task ${i}`,
          status: isCompleted ? 'COMPLETED' : (i === taskCount.completed + 1 ? 'IN_PROGRESS' : 'TODO'),
          assignedToId: employeeProfileId,
          dueDate: new Date(project.dueDate.getTime() - (taskCount.total - i) * 24 * 60 * 60 * 1000),
          estimatedHours: estimatedHours,
          actualHours: actualHours
        }
      });
    }

    console.log(`✅ Created project: ${project.name} with ${taskCount.total} tasks`);
  }

  console.log('🎉 Project seeding complete!');
  await prisma.$disconnect();
}

seedProjects()
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
