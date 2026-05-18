import dotenv from 'dotenv';
dotenv.config();

import prisma from './utils/prisma';

async function seedAttendance() {
  console.log('🌱 Seeding attendance data...');

  // Find the employee
  const employee = await prisma.user.findUnique({
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
    if (date.getDay() === 0 || date.getDay() === 6) continue;

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
    if (checkInHour >= 9) status = 'late';
    if (Math.random() < 0.05) status = 'absent'; // 5% chance of absence

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
    await prisma.attendance.create({
      data: record
    });
  }

  console.log(`✅ Created ${attendanceRecords.length} attendance records`);
  console.log('🎉 Attendance seeding complete!');
}

seedAttendance()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
