import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';

// Get all projects for the logged-in employee
export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    // Get projects where employee is a member or manager
    const projectMemberships = await prisma.projectMember.findMany({
      where: { employeeId: employeeProfile.id },
      include: {
        project: {
          include: {
            manager: { include: { user: true } },
            tasks: true,
            projectMembers: true
          }
        }
      }
    });

    // Also get projects where employee is the manager
    const managedProjects = await prisma.project.findMany({
      where: { managerId: employeeProfile.id },
      include: {
        manager: { include: { user: true } },
        tasks: true,
        projectMembers: true
      }
    });

    // Combine and deduplicate projects
    const projectsMap = new Map();
    
    projectMemberships.forEach(pm => {
      if (!projectsMap.has(pm.project.id)) {
        projectsMap.set(pm.project.id, {
          project: pm.project,
          myRole: pm.role
        });
      }
    });

    managedProjects.forEach(project => {
      if (!projectsMap.has(project.id)) {
        projectsMap.set(project.id, {
          project: project,
          myRole: 'Project Manager'
        });
      }
    });

    // Format response
    const projects = Array.from(projectsMap.values()).map(({ project, myRole }) => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter((t: any) => t.status === 'COMPLETED').length;
      const totalHours = project.tasks.reduce((sum: number, t: any) => sum + (t.actualHours || 0), 0);
      const estimatedHours = project.tasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0);

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status.toLowerCase(),
        priority: project.priority.toLowerCase(),
        progress: project.progress,
        startDate: project.startDate,
        endDate: project.endDate,
        dueDate: project.dueDate,
        teamSize: project.projectMembers.length,
        myRole: myRole,
        tasksCompleted: completedTasks,
        totalTasks: totalTasks,
        hoursSpent: totalHours,
        estimatedHours: estimatedHours,
        client: project.client,
        manager: project.manager.user.name
      };
    });

    res.json({ projects });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get project by ID
export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const project = await prisma.project.findUnique({
      where: { id: Number(id) },
      include: {
        manager: { include: { user: true } },
        tasks: {
          include: {
            assignedTo: { include: { user: true } }
          }
        },
        projectMembers: {
          include: {
            employeeProfile: { include: { user: true } }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if employee has access to this project
    const isMember = (project as any).projectMembers.some((pm: any) => pm.employeeId === employeeProfile.id);
    const isManager = project.managerId === employeeProfile.id;

    if (!isMember && !isManager) {
      return res.status(403).json({ error: 'You do not have access to this project' });
    }

    // Get employee's role
    const memberRecord = (project as any).projectMembers.find((pm: any) => pm.employeeId === employeeProfile.id);
    const myRole = isManager ? 'Project Manager' : (memberRecord?.role || 'Team Member');

    // Format response
    const totalTasks = (project as any).tasks.length;
    const completedTasks = (project as any).tasks.filter((t: any) => t.status === 'COMPLETED').length;
    const totalHours = (project as any).tasks.reduce((sum: number, t: any) => sum + (t.actualHours || 0), 0);
    const estimatedHours = (project as any).tasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0);

    const formattedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status.toLowerCase(),
      priority: project.priority.toLowerCase(),
      progress: project.progress,
      startDate: project.startDate,
      endDate: project.endDate,
      dueDate: project.dueDate,
      client: project.client,
      manager: {
        id: (project as any).manager.id,
        name: (project as any).manager.user.name,
        email: (project as any).manager.user.email
      },
      myRole: myRole,
      teamSize: (project as any).projectMembers.length,
      tasksCompleted: completedTasks,
      totalTasks: totalTasks,
      hoursSpent: totalHours,
      estimatedHours: estimatedHours,
      tasks: (project as any).tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status.toLowerCase(),
        assignedTo: task.assignedTo ? {
          id: task.assignedTo.id,
          name: task.assignedTo.user.name
        } : null,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours
      })),
      team: (project as any).projectMembers.map((pm: any) => ({
        id: pm.employeeProfile.id,
        name: pm.employeeProfile.user.name,
        email: pm.employeeProfile.user.email,
        role: pm.role,
        joinedAt: pm.joinedAt
      }))
    };

    res.json(formattedProject);
  } catch (error: any) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get tasks for the logged-in employee
export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const tasks = await prisma.task.findMany({
      where: { assignedToId: employeeProfile.id },
      include: {
        project: true,
        assignedTo: { include: { user: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status.toLowerCase(),
      project: {
        id: task.project.id,
        name: task.project.name
      },
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      createdAt: task.createdAt
    }));

    res.json({ tasks: formattedTasks });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update task status
export const updateTaskStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, actualHours } = req.body;

    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const task = await prisma.task.findUnique({
      where: { id: Number(id) }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if employee is assigned to this task
    if (task.assignedToId !== employeeProfile.id) {
      return res.status(403).json({ error: 'You are not assigned to this task' });
    }

    const updatedTask = await prisma.task.update({
      where: { id: Number(id) },
      data: {
        status: status ? status.toUpperCase() : undefined,
        actualHours: actualHours !== undefined ? actualHours : undefined
      }
    });

    // Update project progress
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: { tasks: true }
    });

    if (project) {
      const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length;
      const progress = project.tasks.length > 0 
        ? Math.round((completedTasks / project.tasks.length) * 100)
        : 0;

      await prisma.project.update({
        where: { id: project.id },
        data: { progress }
      });
    }

    res.json({ 
      success: true, 
      task: {
        ...updatedTask,
        status: updatedTask.status.toLowerCase()
      }
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
};
