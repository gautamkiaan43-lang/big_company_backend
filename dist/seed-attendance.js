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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma_1 = __importDefault(require("./utils/prisma"));
function seedAttendance() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Seeding attendance data...');
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
        // Create attendance records for the past 30 days
        const today = new Date();
        const attendanceRecords = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (date.getDay() === 0 || date.getDay() === 6)
                continue;
            // Random check-in time between 8:00 and 9:30 AM
            const checkInHour = 8 + Math.floor(Math.random() * 2);
            const checkInMinute = Math.floor(Math.random() * 60);
            const checkIn = new Date(date);
            checkIn.setHours(checkInHour, checkInMinute, 0, 0);
            // Random check-out time between 5:00 and 6:30 PM
            const checkOutHour = 17 + Math.floor(Math.random() * 2);
            const checkOutMinute = Math.floor(Math.random() * 60);
            const checkOut = new Date(date);
            checkOut.setHours(checkOutHour, checkOutMinute, 0, 0);
            // Calculate work hours
            const workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
            // Determine status
            let status = 'present';
            if (checkInHour >= 9)
                status = 'late';
            if (Math.random() < 0.05)
                status = 'absent'; // 5% chance of absence
            // Random location
            const locations = ['office', 'remote', 'client_site', 'field'];
            const location = locations[Math.floor(Math.random() * locations.length)];
            attendanceRecords.push({
                employeeId: employeeProfileId,
                date: date,
                checkIn: checkIn,
                checkOut: status === 'absent' ? null : checkOut,
                status: status,
                location: location,
                workHours: status === 'absent' ? 0 : workHours
            });
        }
        // Create all attendance records
        for (const record of attendanceRecords) {
            yield prisma_1.default.attendance.create({
                data: record
            });
        }
        console.log(`✅ Created ${attendanceRecords.length} attendance records`);
        console.log('🎉 Attendance seeding complete!');
    });
}
seedAttendance()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.$disconnect();
}));
