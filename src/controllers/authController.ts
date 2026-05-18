import { Request, Response } from 'express';
import prisma, { withRetry } from '../utils/prisma';
import { generateToken, hashPassword, comparePassword } from '../utils/auth';
import { emailQueue } from '../queues/email.queue';


export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, phone, pin, role, first_name, last_name, business_name, shop_name, company_name } = req.body;

    // Determine role from URL if not provided
    let targetuser_role = role;
    if (!targetuser_role) {
      if (req.baseUrl.includes('store')) targetuser_role = 'consumer';
      else if (req.baseUrl.includes('retailer')) targetuser_role = 'retailer';
      else if (req.baseUrl.includes('wholesaler')) targetuser_role = 'wholesaler';
    }

    if (targetuser_role === 'retailer' || targetuser_role === 'wholesaler') {
      return res.status(403).json({ 
        error: 'Self-registration is not allowed for business accounts. Please contact a BIG Ltd administrator for onboarding.' 
      });
    }

    // Check existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { phone: phone || undefined }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = password ? await hashPassword(password) : undefined;
    const hashedPin = pin ? await hashPassword(pin) : undefined;

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        pin: hashedPin, // Store pin (hashed)
        role: targetuser_role,
        name: first_name ? `${first_name} ${last_name || ''}`.trim() : (business_name || company_name || shop_name),
        updatedAt: new Date()
      }
    });

    // Create Profile
    if (targetuser_role === 'consumer') {
      await prisma.consumerProfile.create({
        data: {
          userId: user.id
        }
      });
    } else if (targetuser_role === 'retailer') {
      await prisma.retailerProfile.create({
        data: {
          userId: user.id,
          shopName: shop_name || business_name || 'My Shop',
          address: req.body.address
        }
      });
    } else if (targetuser_role === 'wholesaler') {
      await prisma.wholesalerProfile.create({
        data: {
          userId: user.id,
          companyName: company_name || 'My Company',
          address: req.body.address
        }
      });
    }

    const token = generateToken({ id: user.id, role: user.role });
    
    // Trigger Customer Signup SMS (CUS-SMS-001)
    if (targetuser_role === 'consumer' && user.phone) {
      try {
        const { emailQueue } = await import('../queues/email.queue');
        await emailQueue.add('customer-signup', {
          to: user.phone,
          templateType: 'customer-signup', // Mapped to CUS-SMS-001
          data: {
            customer_name: user.name || 'Valued Customer',
            customer_id: user.id.toString()
          },
          relatedEntity: { type: 'USER', id: user.id.toString() }
        });
      } catch (err) {
        console.error('Customer signup notification failed:', err);
      }
    }

    res.json({
      success: true,
      access_token: token,
      user_id: user.id,
      message: 'Registration successful'
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, phone, pin } = req.body;
    console.log('Login attempt:', { email, phone, role: req.body.role, baseUrl: req.baseUrl });

    let targetuser_role = req.body.role;
    if (!targetuser_role) {
      if (req.baseUrl.includes('store')) targetuser_role = 'consumer';
      else if (req.baseUrl.includes('retailer')) targetuser_role = 'retailer';
      else if (req.baseUrl.includes('wholesaler')) targetuser_role = 'wholesaler';
      else if (req.baseUrl.includes('employee')) targetuser_role = 'employee';
      else if (req.baseUrl.includes('admin')) targetuser_role = 'admin';
    }
    console.log('Determined role:', targetuser_role);

    // Find User with retry for connection issues
    const user = await withRetry(() => prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { phone: phone || undefined }
        ],
        role: targetuser_role // Ensure role matches
      },
      include: {
        consumerProfile: true,
        retailerProfile: true,
        wholesalerProfile: true,
        employeeProfile: true
      }
    }));


    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials or role' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
    }

    // Verify Password or PIN
    let valid = false;
    if (targetuser_role === 'consumer') {
      if (user.pin && pin && await comparePassword(pin, user.pin)) valid = true;
      else if (user.password && password && await comparePassword(password, user.password)) valid = true;
    } else {
      if (user.password && await comparePassword(password, user.password)) valid = true;
    }

    if (!valid) {
      // Notify Retailer of Failed Login (RET-EMAIL-017)
      if (user.role === 'retailer' && user.email) {
        await emailQueue.add('failed-login-alert', {
          to: user.email,
          templateType: 'failed-login', // Mapped to RET-EMAIL-017
          data: {
            retail_name: user.name || 'Retailer',
            attempt_time: new Date().toLocaleString(),
            device: req.headers['user-agent'] || 'Unknown Device',
            ip: req.ip || 'Unknown'
          },
          relatedEntity: { type: 'USER', id: user.id.toString() }
        });
      }

      // Notify Wholesaler of Failed Login (WHO-EMAIL-016)
      if (user.role === 'wholesaler' && user.email) {
        await emailQueue.add('failed-login-alert', {
          to: user.email,
          templateType: 'wholesaler-failed-login', // Mapped to WHO-EMAIL-016
          data: {
            wholesaler_name: user.name || 'Wholesaler',
            attempt_time: new Date().toLocaleString(),
            device: req.headers['user-agent'] || 'Unknown Device',
            ip: req.ip || 'Unknown'
          },
          relatedEntity: { type: 'USER', id: user.id.toString() }
        });
      }

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, role: user.role });

    // Notify Retailer of Suspicious Activity (RET-EMAIL-015)
    if (user.role === 'retailer' && user.email) {
      await emailQueue.add('suspicious-activity-alert', {
        to: user.email,
        templateType: 'suspicious-activity', // Mapped to RET-EMAIL-015
        data: {
          retail_name: user.name || 'Retailer',
          activity_type: 'New Device Login',
          activity_time: new Date().toLocaleString(),
          location: 'Kigali, Rwanda (Approx)',
          device: req.headers['user-agent'] || 'Unknown Device',
          action_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/retailer/security`
        },
        relatedEntity: { type: 'USER', id: user.id.toString() }
      });
    }

    // Notify Wholesaler of Suspicious Activity (WHO-EMAIL-015)
    if (user.role === 'wholesaler' && user.email) {
      await emailQueue.add('suspicious-activity-alert', {
        to: user.email,
        templateType: 'wholesaler-suspicious-activity', // Mapped to WHO-EMAIL-015
        data: {
          wholesaler_name: user.name || 'Wholesaler',
          activity: 'Unusual account login detected',
          time: new Date().toLocaleString(),
          location: req.ip || 'Unknown',
          security_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wholesaler/security`
        },
        relatedEntity: { type: 'USER', id: user.id.toString() }
      });
    }

    // Format Response
    const responseData: any = {
      success: true,
      access_token: token,
      require_password_reset: user.isFirstLogin
    };

    if (targetuser_role === 'consumer') {
      responseData.customer = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        first_name: user.name?.split(' ')[0],
        last_name: user.name?.split(' ').slice(1).join(' '),
        ...user.consumerProfile
      };
    } else if (targetuser_role === 'retailer') {
      responseData.retailer = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        shop_name: user.retailerProfile?.shopName,
        name: user.name,
        ...user.retailerProfile
      };
    } else if (targetuser_role === 'wholesaler') {
      responseData.wholesaler = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        company_name: user.wholesalerProfile?.companyName,
        name: user.name,
        ...user.wholesalerProfile
      };
    } else if (targetuser_role === 'employee') {
      responseData.employee = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        ...user.employeeProfile
      };
    } else if (targetuser_role === 'admin') {
      responseData.admin = {
        id: user.id,
        email: user.email,
        name: user.name
      };
    }

    res.json(responseData);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const updatePassword = async (req: any, res: Response) => {
  try {
    const { old_password, new_password } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await comparePassword(old_password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const hashedPassword = await hashPassword(new_password);
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        isFirstLogin: false,
        tempPassword: null
      }
    });

    // Notify Retailer of Security Update (RET-EMAIL-012)
    if (user.role === 'retailer' && user.email) {
      await emailQueue.add('security-update-alert', {
        to: user.email,
        templateType: 'security-update', // Mapped to RET-EMAIL-012
        data: {
          retail_name: user.name || 'Retailer',
          change_time: new Date().toLocaleString(),
          device: req.headers['user-agent'] || 'Unknown Device',
          ip_address: req.ip || 'Unknown'
        },
        relatedEntity: { type: 'USER', id: user.id.toString() }
      });
    }

    // Notify Wholesaler of Security Update (WHO-EMAIL-012)
    if (user.role === 'wholesaler' && user.email) {
      await emailQueue.add('security-update-alert', {
        to: user.email,
        templateType: 'wholesaler-security-update', // Mapped to WHO-EMAIL-012
        data: {
          wholesaler_name: user.name || 'Wholesaler',
          change_time: new Date().toLocaleString(),
          device: req.headers['user-agent'] || 'Unknown Device',
          ip_address: req.ip || 'Unknown'
        },
        relatedEntity: { type: 'USER', id: user.id.toString() }
      });
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePin = async (req: any, res: Response) => {
  try {
    const { old_pin, new_pin } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.pin) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await comparePassword(old_pin, user.pin);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect current PIN' });
    }

    const hashedPin = await hashPassword(new_pin);
    await prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin }
    });

    // Notify Retailer of Security Update (RET-EMAIL-012)
    if (user.role === 'retailer' && user.email) {
      await emailQueue.add('security-update-alert', {
        to: user.email,
        templateType: 'security-update', // Mapped to RET-EMAIL-012
        data: {
          retail_name: user.name || 'Retailer',
          change_time: new Date().toLocaleString(),
          device: req.headers['user-agent'] || 'Unknown Device',
          ip_address: req.ip || 'Unknown'
        },
        relatedEntity: { type: 'USER', id: user.id.toString() }
      });
    }

    // Notify Wholesaler of Security Update (WHO-EMAIL-012)
    if (user.role === 'wholesaler' && user.email) {
      await emailQueue.add('security-update-alert', {
        to: user.email,
        templateType: 'wholesaler-security-update', // Mapped to WHO-EMAIL-012
        data: {
          wholesaler_name: user.name || 'Wholesaler',
          change_time: new Date().toLocaleString(),
          device: req.headers['user-agent'] || 'Unknown Device',
          ip_address: req.ip || 'Unknown'
        },
        relatedEntity: { type: 'USER', id: user.id.toString() }
      });
    }

    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
