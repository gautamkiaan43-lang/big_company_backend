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
exports.deleteBillPayment = exports.updateBillPayment = exports.addBillPayment = exports.getBillPayments = exports.getTasks = exports.getPayslips = exports.requestLeave = exports.getLeaves = exports.checkOut = exports.checkIn = exports.getAttendanceById = exports.getAttendance = exports.getDashboard = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Get employee dashboard
const getDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id },
            include: { user: true }
        });
        if (!employeeProfile) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        // Calc attendance stats
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const attendances = yield prisma_1.default.attendance.findMany({
            where: {
                employeeId: employeeProfile.id,
                date: { gte: firstDayOfMonth }
            }
        });
        const presentDays = attendances.filter(a => a.status === 'present').length;
        const lateDays = attendances.filter(a => a.status === 'late').length;
        const absentDays = attendances.filter(a => a.status === 'absent').length;
        res.json({
            employee: {
                name: employeeProfile.user.name,
                employeeNumber: employeeProfile.employeeNumber,
                department: employeeProfile.department,
                position: employeeProfile.position
            },
            stats: {
                attendance: presentDays,
                late: lateDays,
                absent: absentDays,
                tasksCompleted: yield prisma_1.default.task.count({ where: { assignedToId: employeeProfile.id, status: 'COMPLETED' } }),
                pendingTasks: yield prisma_1.default.task.count({ where: { assignedToId: employeeProfile.id, status: { not: 'COMPLETED' } } })
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getDashboard = getDashboard;
// Get attendance history
const getAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile)
            return res.status(404).json({ error: 'Employee not found' });
        const attendance = yield prisma_1.default.attendance.findMany({
            where: { employeeId: employeeProfile.id },
            orderBy: { date: 'desc' },
            take: 30
        });
        // Check if checked in today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayAttendance = yield prisma_1.default.attendance.findFirst({
            where: {
                employeeId: employeeProfile.id,
                date: {
                    gte: today,
                    lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        });
        res.json({
            history: attendance,
            todayStatus: todayAttendance || null
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getAttendance = getAttendance;
// Get single attendance detail
const getAttendanceById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile)
            return res.status(404).json({ error: 'Employee not found' });
        const attendance = yield prisma_1.default.attendance.findUnique({
            where: { id: Number(id) },
        });
        if (!attendance)
            return res.status(404).json({ error: 'Attendance record not found' });
        // Authorization check
        if (attendance.employeeId !== employeeProfile.id) {
            return res.status(403).json({ error: 'Unauthorized access to this record' });
        }
        // Mock data for breaks and tasks since they aren't in schema yet
        // In a real app, you would fetch these from related tables
        const details = Object.assign(Object.assign({}, attendance), { breaks: [], tasks: [] });
        res.json(details);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getAttendanceById = getAttendanceById;
// Check In
const checkIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { location } = req.body;
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile)
            return res.status(404).json({ error: 'Employee not found' });
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        // Check for existing record
        const existing = yield prisma_1.default.attendance.findFirst({
            where: {
                employeeId: employeeProfile.id,
                date: { gte: today }
            }
        });
        if (existing) {
            return res.status(400).json({ error: 'Already checked in for today' });
        }
        // Determine status (e.g., late if after 9:00 AM)
        const startHour = 9;
        const status = now.getHours() >= startHour && now.getMinutes() > 15 ? 'late' : 'present';
        const attendance = yield prisma_1.default.attendance.create({
            data: {
                employeeId: employeeProfile.id,
                date: now,
                checkIn: now,
                status,
                location: location || 'Office'
            }
        });
        res.json(attendance);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.checkIn = checkIn;
// Check Out
const checkOut = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile)
            return res.status(404).json({ error: 'Employee not found' });
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const attendance = yield prisma_1.default.attendance.findFirst({
            where: {
                employeeId: employeeProfile.id,
                date: { gte: today }
            }
        });
        if (!attendance) {
            return res.status(400).json({ error: 'No check-in record found for today' });
        }
        if (attendance.checkOut) {
            return res.status(400).json({ error: 'Already checked out' });
        }
        // Calculate work hours
        const durationMs = now.getTime() - new Date(attendance.checkIn).getTime();
        const hoursWorked = durationMs / (1000 * 60 * 60);
        const updated = yield prisma_1.default.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOut: now,
                workHours: parseFloat(hoursWorked.toFixed(2))
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.checkOut = checkOut;
// Get Leaves
const getLeaves = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile)
            return res.status(404).json({ error: 'Employee not found' });
        const leaves = yield prisma_1.default.leaveRequest.findMany({
            where: { employeeId: employeeProfile.id },
            orderBy: { createdAt: 'desc' }
        });
        // Summary stats - Include PENDING so user sees immediate impact
        const usedLeaves = leaves.filter(l => ['approved', 'pending'].includes(l.status));
        const vacationTaken = usedLeaves.filter(l => l.type === 'vacation').reduce((acc, curr) => {
            const days = (new Date(curr.endDate).getTime() - new Date(curr.startDate).getTime()) / (1000 * 3600 * 24) + 1;
            return acc + Math.ceil(days);
        }, 0);
        const sickTaken = usedLeaves.filter(l => l.type === 'sick').reduce((acc, curr) => {
            const days = (new Date(curr.endDate).getTime() - new Date(curr.startDate).getTime()) / (1000 * 3600 * 24) + 1;
            return acc + Math.ceil(days);
        }, 0);
        const personalTaken = usedLeaves.filter(l => l.type === 'personal').reduce((acc, curr) => {
            const days = (new Date(curr.endDate).getTime() - new Date(curr.startDate).getTime()) / (1000 * 3600 * 24) + 1;
            return acc + Math.ceil(days);
        }, 0);
        // Hardcoded limits for now, but served from backend
        // In future, fetch from company settings or employee contract
        const limits = {
            vacation: 15,
            sick: 10,
            personal: 5
        };
        res.json({
            leaves,
            stats: {
                vacation: {
                    total: limits.vacation,
                    used: vacationTaken,
                    remaining: limits.vacation - vacationTaken
                },
                sick: {
                    total: limits.sick,
                    used: sickTaken,
                    remaining: limits.sick - sickTaken
                },
                personal: {
                    total: limits.personal,
                    used: personalTaken,
                    remaining: limits.personal - personalTaken
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getLeaves = getLeaves;
// Request Leave
const requestLeave = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, startDate, endDate, reason } = req.body;
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile)
            return res.status(404).json({ error: 'Employee not found' });
        const leave = yield prisma_1.default.leaveRequest.create({
            data: {
                employeeId: employeeProfile.id,
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason
            }
        });
        res.json(leave);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.requestLeave = requestLeave;
// Get payslips (placeholder)
const getPayslips = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({ payslips: [] });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getPayslips = getPayslips;
// Get tasks 
const getTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile)
            return res.status(404).json({ error: 'Employee not found' });
        const tasks = yield prisma_1.default.task.findMany({
            where: { assignedToId: employeeProfile.id },
            include: { project: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ tasks });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getTasks = getTasks;
// ==========================================
// BILL PAYMENTS
// ==========================================
// Get Bill Payments
const getBillPayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile)
            return res.status(404).json({ error: 'Employee not found' });
        const bills = yield prisma_1.default.billPayment.findMany({
            where: { employeeId: employeeProfile.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(bills);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getBillPayments = getBillPayments;
// Add Bill Payment
const addBillPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile)
            return res.status(404).json({ error: 'Employee not found' });
        const { companyName, companyType, accountNumber, accountHolderName, monthlyAmount, paymentDay, startDate, endDate, notes } = req.body;
        const bill = yield prisma_1.default.billPayment.create({
            data: {
                employeeId: employeeProfile.id,
                companyName,
                companyType,
                accountNumber,
                accountHolderName,
                monthlyAmount,
                paymentDay,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                notes
            }
        });
        res.json(bill);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.addBillPayment = addBillPayment;
// Update Bill Payment
const updateBillPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile)
            return res.status(404).json({ error: 'Employee not found' });
        const bill = yield prisma_1.default.billPayment.findUnique({
            where: { id: Number(id) }
        });
        if (!bill)
            return res.status(404).json({ error: 'Bill payment not found' });
        if (bill.employeeId !== employeeProfile.id)
            return res.status(403).json({ error: 'Unauthorized' });
        const updated = yield prisma_1.default.billPayment.update({
            where: { id: Number(id) },
            data: Object.assign(Object.assign({}, req.body), { startDate: req.body.startDate ? new Date(req.body.startDate) : undefined, endDate: req.body.endDate ? new Date(req.body.endDate) : undefined })
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateBillPayment = updateBillPayment;
// Delete Bill Payment
const deleteBillPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const employeeProfile = yield prisma_1.default.employeeProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!employeeProfile)
            return res.status(404).json({ error: 'Employee not found' });
        const bill = yield prisma_1.default.billPayment.findUnique({
            where: { id: Number(id) }
        });
        if (!bill)
            return res.status(404).json({ error: 'Bill payment not found' });
        if (bill.employeeId !== employeeProfile.id)
            return res.status(403).json({ error: 'Unauthorized' });
        yield prisma_1.default.billPayment.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Bill payment deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteBillPayment = deleteBillPayment;
