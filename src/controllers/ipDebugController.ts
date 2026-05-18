import { Request, Response } from 'express';
import axios from 'axios';

/**
 * TEMPORARY DEBUG CONTROLLER: Used only for PalmKash IP whitelisting.
 * This endpoint retrieves the server's public IP address by querying ipify.
 * 
 * TODO: REMOVE THIS CONTROLLER ONCE IP WHITELISTING IS COMPLETE.
 */
export const getServerIp = async (req: Request, res: Response) => {
  try {
    const response = await axios.get('https://api.ipify.org?format=json', {
      timeout: 5000 // 5 seconds timeout
    });
    
    return res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching server IP from ipify:', error.message);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve server IP',
      error: error.message
    });
  }
};
