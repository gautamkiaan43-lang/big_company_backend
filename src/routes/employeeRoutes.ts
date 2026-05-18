import { Router } from 'express';
import { 
  getDashboard, 
  getAttendance, 
  getAttendanceById,
  getPayslips, 
  getTasks,
  checkIn,
  checkOut,
  getLeaves,
  requestLeave,
  getBillPayments,
  addBillPayment,
  updateBillPayment,
  deleteBillPayment
} from '../controllers/employeeController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/attendance', getAttendance);
router.get('/attendance/:id', getAttendanceById);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

router.get('/leaves', getLeaves);
router.post('/leaves', requestLeave);
router.get('/payslips', getPayslips);
router.get('/tasks', getTasks);

// Bill Payments
router.get('/bill-payments', getBillPayments);
router.post('/bill-payments', addBillPayment);
router.put('/bill-payments/:id', updateBillPayment);
router.delete('/bill-payments/:id', deleteBillPayment);

export default router;
