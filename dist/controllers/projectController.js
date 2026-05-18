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
exports.updateTaskStatus = exports.getTasks = exports.getProjectById = exports.getProjects = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Get all projects for the logged-in employee
const getProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        // Get projects where employee is a member or manager
        const projectMemberships = yield prisma_1.default.projectMember.findMany({
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
        const managedProjects = yield prisma_1.default.project.findMany({
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
            const completedTasks = project.tasks.filter((t) => t.status === 'COMPLETED').length;
            const totalHours = project.tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
            const estimatedHours = project.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
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
    }
    catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getProjects = getProjects;
// Get project by ID
const getProjectById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        const project = yield prisma_1.default.project.findUnique({
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
        const isMember = project.projectMembers.some((pm) => pm.employeeId === employeeProfile.id);
        const isManager = project.managerId === employeeProfile.id;
        if (!isMember && !isManager) {
            return res.status(403).json({ error: 'You do not have access to this project' });
        }
        // Get employee's role
        const memberRecord = project.projectMembers.find((pm) => pm.employeeId === employeeProfile.id);
        const myRole = isManager ? 'Project Manager' : ((memberRecord === null || memberRecord === void 0 ? void 0 : memberRecord.role) || 'Team Member');
        // Format response
        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter((t) => t.status === 'COMPLETED').length;
        const totalHours = project.tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
        const estimatedHours = project.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
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
                id: project.manager.id,
                name: project.manager.user.name,
                email: project.manager.user.email
            },
            myRole: myRole,
            teamSize: project.projectMembers.length,
            tasksCompleted: completedTasks,
            totalTasks: totalTasks,
            hoursSpent: totalHours,
            estimatedHours: estimatedHours,
            tasks: project.tasks.map((task) => ({
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
            team: project.projectMembers.map((pm) => ({
                id: pm.employeeProfile.id,
                name: pm.employeeProfile.user.name,
                email: pm.employeeProfile.user.email,
                role: pm.role,
                joinedAt: pm.joinedAt
            }))
        };
        res.json(formattedProject);
    }
    catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getProjectById = getProjectById;
// Get tasks for the logged-in employee
const getTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        const tasks = yield prisma_1.default.task.findMany({
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
    }
    catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getTasks = getTasks;
// Update task status
const updateTaskStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, actualHours } = req.body;
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        const task = yield prisma_1.default.task.findUnique({
            where: { id: Number(id) }
        });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        // Check if employee is assigned to this task
        if (task.assignedToId !== employeeProfile.id) {
            return res.status(403).json({ error: 'You are not assigned to this task' });
        }
        const updatedTask = yield prisma_1.default.task.update({
            where: { id: Number(id) },
            data: {
                status: status ? status.toUpperCase() : undefined,
                actualHours: actualHours !== undefined ? actualHours : undefined
            }
        });
        // Update project progress
        const project = yield prisma_1.default.project.findUnique({
            where: { id: task.projectId },
            include: { tasks: true }
        });
        if (project) {
            const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length;
            const progress = project.tasks.length > 0
                ? Math.round((completedTasks / project.tasks.length) * 100)
                : 0;
            yield prisma_1.default.project.update({
                where: { id: project.id },
                data: { progress }
            });
        }
        res.json({
            success: true,
            task: Object.assign(Object.assign({}, updatedTask), { status: updatedTask.status.toLowerCase() })
        });
    }
    catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateTaskStatus = updateTaskStatus;
