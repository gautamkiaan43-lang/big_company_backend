import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';

// Get employee dashboard
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id },
      include: { user: true }
    });

    if (!employeeProfile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    // Calc attendance stats
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const attendances = await prisma.attendance.findMany({
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
        tasksCompleted: await prisma.task.count({ where: { assignedToId: employeeProfile.id, status: 'COMPLETED' } }),
        pendingTasks: await prisma.task.count({ where: { assignedToId: employeeProfile.id, status: { not: 'COMPLETED' } } })
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get attendance history
export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) return res.status(404).json({ error: 'Employee not found' });

    const attendance = await prisma.attendance.findMany({
      where: { employeeId: employeeProfile.id },
      orderBy: { date: 'desc' },
      take: 30
    });

    // Check if checked in today
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const todayAttendance = await prisma.attendance.findFirst({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get single attendance detail
export const getAttendanceById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) return res.status(404).json({ error: 'Employee not found' });

    const attendance = await prisma.attendance.findUnique({
      where: { id: Number(id) },
    });

    if (!attendance) return res.status(404).json({ error: 'Attendance record not found' });
    
    // Authorization check
    if (attendance.employeeId !== employeeProfile.id) {
        return res.status(403).json({ error: 'Unauthorized access to this record' });
    }

    // Mock data for breaks and tasks since they aren't in schema yet
    // In a real app, you would fetch these from related tables
    const details = {
        ...attendance,
        breaks: [], 
        tasks: []
    };

    res.json(details);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Check In
export const checkIn = async (req: AuthRequest, res: Response) => {
  try {
    const { location } = req.body;
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) return res.status(404).json({ error: 'Employee not found' });

    const now = new Date();
    const today = new Date(now);
    today.setHours(0,0,0,0);

    // Check for existing record
    const existing = await prisma.attendance.findFirst({
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

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: employeeProfile.id,
        date: now,
        checkIn: now,
        status,
        location: location || 'Office'
      }
    });

    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Check Out
export const checkOut = async (req: AuthRequest, res: Response) => {
  try {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) return res.status(404).json({ error: 'Employee not found' });

    const now = new Date();
    const today = new Date(now);
    today.setHours(0,0,0,0);

    const attendance = await prisma.attendance.findFirst({
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

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        workHours: parseFloat(hoursWorked.toFixed(2))
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Leaves
export const getLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) return res.status(404).json({ error: 'Employee not found' });

    const leaves = await prisma.leaveRequest.findMany({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Request Leave
export const requestLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) return res.status(404).json({ error: 'Employee not found' });

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: employeeProfile.id,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason
      }
    });

    res.json(leave);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get payslips (placeholder)
export const getPayslips = async (req: AuthRequest, res: Response) => {
  try {
    res.json({ payslips: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get tasks 
export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });
    if (!employeeProfile) return res.status(404).json({ error: 'Employee not found' });

    const tasks = await prisma.task.findMany({
      where: { assignedToId: employeeProfile.id },
      include: { project: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ tasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// BILL PAYMENTS
// ==========================================

// Get Bill Payments
export const getBillPayments = async (req: AuthRequest, res: Response) => {
  try {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) return res.status(404).json({ error: 'Employee not found' });

    const bills = await prisma.billPayment.findMany({
      where: { employeeId: employeeProfile.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(bills);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Add Bill Payment
export const addBillPayment = async (req: AuthRequest, res: Response) => {
  try {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) return res.status(404).json({ error: 'Employee not found' });

    const {
      companyName,
      companyType,
      accountNumber,
      accountHolderName,
      monthlyAmount,
      paymentDay,
      startDate,
      endDate,
      notes
    } = req.body;

    const bill = await prisma.billPayment.create({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update Bill Payment
export const updateBillPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) return res.status(404).json({ error: 'Employee not found' });

    const bill = await prisma.billPayment.findUnique({
      where: { id: Number(id) }
    });

    if (!bill) return res.status(404).json({ error: 'Bill payment not found' });
    if (bill.employeeId !== employeeProfile.id) return res.status(403).json({ error: 'Unauthorized' });

    const updated = await prisma.billPayment.update({
      where: { id: Number(id) },
      data: {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Bill Payment
export const deleteBillPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!employeeProfile) return res.status(404).json({ error: 'Employee not found' });

    const bill = await prisma.billPayment.findUnique({
      where: { id: Number(id) }
    });

    if (!bill) return res.status(404).json({ error: 'Bill payment not found' });
    if (bill.employeeId !== employeeProfile.id) return res.status(403).json({ error: 'Unauthorized' });

    await prisma.billPayment.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Bill payment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
