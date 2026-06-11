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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma_1 = __importDefault(require("./utils/prisma"));
function seedProjects() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Seeding project data...');
        // Find the employee
        const employee = yield prisma_1.default.user.findUnique({
            where: { email: 'employee@bigcompany.rw' },
            include: { employeeProfile: true }
        });
        if (!employee || !employee.employeeProfile) {
            console.error('❌ Employee not found. Please run the main seed first.');
            return;
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
                manager: { connect: { id: employeeProfileId } },
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
                manager: { connect: { id: employeeProfileId } },
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
                manager: { connect: { id: employeeProfileId } },
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
                manager: { connect: { id: employeeProfileId } },
                memberRole: 'Content Writer'
            }
        ];
        for (const projectData of projects) {
            const { memberRole } = projectData, projectFields = __rest(projectData, ["memberRole"]);
            // Create project
            const project = yield prisma_1.default.project.create({
                data: projectFields
            });
            // Add employee as project member
            yield prisma_1.default.projectMember.create({
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
                yield prisma_1.default.task.create({
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
    });
}
seedProjects()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.$disconnect();
}));
