import axios from 'axios';
import { monitoringService } from './monitoring.service';
import prisma from '../utils/prisma';

export const initHealthCheck = () => {
  console.log('🩺 Background Health Check Initialized (runs every 5 mins)');
  
  // Run every 5 minutes (300000 ms)
  setInterval(async () => {
    try {
      // 1. Check Database connection
      try {
        await prisma.$queryRaw`SELECT 1`;
        await monitoringService.reportApiRecovery('DATABASE');
      } catch (dbError: any) {
        await monitoringService.reportApiFailure('DATABASE', dbError.message || 'Database connection failed');
      }

      // 2. Check Main Server / Self Ping
      try {
        const port = process.env.PORT || 9001;
        const response = await axios.get(`http://localhost:${port}/`);
        if (response.status === 200) {
          await monitoringService.reportApiRecovery('MAIN_SERVER');
        } else {
          await monitoringService.reportApiFailure('MAIN_SERVER', 'Self-ping returned non-200 status');
        }
      } catch (serverError: any) {
        await monitoringService.reportApiFailure('MAIN_SERVER', serverError.message || 'Self-ping failed');
      }
    } catch (error) {
      console.error('Health Check Error:', error);
    }
  }, 300000);
};
