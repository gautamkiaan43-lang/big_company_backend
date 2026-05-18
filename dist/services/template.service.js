"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateService = void 0;
class TemplateService {
    /**
     * Base wrapper for all emails to ensure consistent branding.
     */
    static wrap(content, title = 'BIG Ltd Operations') {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; border: 1px solid #eee; }
          .header { background: #6366f1; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #ffffff; }
          .footer { background: #f9fafb; color: #6b7280; padding: 20px; text-align: center; font-size: 12px; }
          .button { background: #6366f1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-top: 20px; }
          .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .info-table td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
          .info-table td:first-child { font-weight: bold; color: #4b5563; width: 40%; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 24px;">${title}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} BIG Ltd. All rights reserved.</p>
            <p>This is an automated system notification. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    /**
     * Replaces placeholders in format {{variable_name}} with values from data object.
     */
    static render(template, data) {
        let rendered = template;
        Object.keys(data).forEach(key => {
            const value = data[key];
            const regex = new RegExp(`{{${key}}}`, 'g');
            rendered = rendered.replace(regex, value !== undefined && value !== null ? String(value) : '');
        });
        return rendered;
    }
    /**
     * Fetches template from DB or returns default fallback.
     */
    static getTemplate(name, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const prisma = new (yield Promise.resolve().then(() => __importStar(require('@prisma/client')))).PrismaClient();
            try {
                // @ts-ignore - EmailTemplate might not be in generated client yet
                const dbTemplate = yield prisma.emailTemplate.findUnique({
                    where: { name, isActive: true }
                });
                if (dbTemplate) {
                    const subject = this.render(dbTemplate.subject, data);
                    const content = this.render(dbTemplate.content, data);
                    return {
                        subject,
                        html: this.wrap(content, 'BIG Ltd')
                    };
                }
            }
            catch (e) {
                console.warn(`[TemplateService] Could not fetch template ${name} from DB, using fallback:`, e.message);
            }
            // Fallback to hardcoded templates
            switch (name) {
                case 'ONBOARDING':
                    return {
                        subject: `Welcome to BIG Ltd, ${data.name || 'User'}!`,
                        html: this.getOnboardingTemplate(data.name, data.role, data.email, data.tempPass)
                    };
                case 'LOW_STOCK':
                    return {
                        subject: `⚠️ Low Stock Alert: ${data.productName}`,
                        html: this.getLowStockTemplate(data.productName, data.currentStock, data.threshold)
                    };
                case 'WALLET_NOTIFICATION':
                    const isLow = data.type === 'LOW_BALANCE';
                    return {
                        subject: isLow ? '⚠️ Wallet Balance Warning' : '✅ Wallet Recharge Successful',
                        html: this.getWalletNotificationTemplate(data.type, data.amount, data.balance, data.txRef)
                    };
                case 'ORDER_CONFIRMATION':
                    return {
                        subject: `✅ Order Confirmation: #${data.orderNumber}`,
                        html: this.getOrderConfirmationTemplate(data.orderNumber, data.quantity, data.totalAmount)
                    };
                default:
                    return {
                        subject: data.subject || 'System Notification',
                        html: this.wrap(data.content || '<p>Hello!</p>')
                    };
            }
        });
    }
    /**
     * FALLBACK METHODS (Legacy)
     */
    static getOnboardingTemplate(name, role, email, tempPass) {
        const content = `
      <h2>Welcome to BIG Ltd, ${name}!</h2>
      <p>An administrator has created your ${role} account on our platform. Below are your temporary login credentials:</p>
      <table class="info-table">
        <tr><td>Email:</td><td>${email}</td></tr>
        <tr><td>Temporary Password:</td><td><code>${tempPass}</code></td></tr>
      </table>
      <p><strong>Security Note:</strong> You will be required to change this password upon your first login.</p>
      <center>
        <a href="${process.env.FRONTEND_URL || '#'}/login" class="button">Login to Your Account</a>
      </center>
    `;
        return this.wrap(content);
    }
    static getLowStockTemplate(productName, currentStock, threshold) {
        const content = `
      <div class="alert">
        <h2 style="margin-top:0; color: #991b1b;">⚠️ Low Stock Alert</h2>
        <p>Your stock levels for <strong>${productName}</strong> have fallen below the recommended threshold.</p>
      </div>
      <table class="info-table">
        <tr><td>Product:</td><td>${productName}</td></tr>
        <tr><td>Current Stock:</td><td><span style="color: #ef4444; font-weight: bold;">${currentStock} units</span></td></tr>
        <tr><td>Alert Threshold:</td><td>${threshold} units</td></tr>
      </table>
      <p>Please reorder as soon as possible to ensure continuous operation.</p>
      <center>
        <a href="${process.env.FRONTEND_URL || '#'}/inventory" class="button">Manage Inventory</a>
      </center>
    `;
        return this.wrap(content);
    }
    static getWalletNotificationTemplate(type, amount, balance, txRef) {
        const isLow = type === 'LOW_BALANCE';
        const content = `
      <h2>${isLow ? '⚠️ Wallet Balance Warning' : '✅ Wallet Recharge Successful'}</h2>
      <p>${isLow ? 'Your wallet balance is low. Please recharge to avoid service interruption.' : 'Your wallet has been successfully recharged.'}</p>
      <table class="info-table">
        <tr><td>Current Balance:</td><td><span style="font-size: 18px; font-weight: bold; color: ${isLow ? '#ef4444' : '#10b981'};">${balance.toLocaleString()} RWF</span></td></tr>
        ${txRef ? `<tr><td>Transaction Ref:</td><td>${txRef}</td></tr>` : ''}
        <tr><td>Timestamp:</td><td>${new Date().toLocaleString()}</td></tr>
      </table>
      <center>
        <a href="${process.env.FRONTEND_URL || '#'}/wallet" class="button">${isLow ? 'Recharge Now' : 'View Wallet'}</a>
      </center>
    `;
        return this.wrap(content);
    }
    static getOrderConfirmationTemplate(orderNumber, quantity, totalAmount) {
        const content = `
      <h2>✅ Order Confirmation</h2>
      <p>Your stock order has been submitted successfully.</p>
      <table class="info-table">
        <tr><td>Order Number:</td><td>#${orderNumber}</td></tr>
        <tr><td>Quantity:</td><td>${quantity} units</td></tr>
        <tr><td>Total Amount:</td><td>${totalAmount.toLocaleString()} RWF</td></tr>
        <tr><td>Estimated Delivery:</td><td>24-48 Hours</td></tr>
      </table>
      <p>We will notify you once your order has been dispatched.</p>
    `;
        return this.wrap(content);
    }
    /**
     * Template for Daily Performance Reports (Requirement 2.C.iv)
     */
    static getDailyPerformanceTemplate(metrics) {
        const content = `
      <h2 style="color: #6366f1;">📊 Daily Operations Summary</h2>
      <p>Report Period: <strong>${metrics.period}</strong></p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Total Sales</div>
          <div style="font-size: 20px; font-weight: bold;">${metrics.salesCount}</div>
        </div>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Total Revenue</div>
          <div style="font-size: 20px; font-weight: bold; color: #10b981;">${metrics.revenue.toLocaleString()} RWF</div>
        </div>
      </div>

      <table class="info-table">
        <tr><td>New Retailers:</td><td>${metrics.newRetailers}</td></tr>
        <tr><td>New Wholesalers:</td><td>${metrics.newWholesalers}</td></tr>
        <tr><td>Products in Low Stock:</td><td><span style="color: #ef4444;">${metrics.lowStockCount}</span></td></tr>
        <tr><td>Offline Smart Meters:</td><td><span style="color: ${metrics.offlineMeters > 0 ? '#ef4444' : '#6b7280'};">${metrics.offlineMeters}</span></td></tr>
      </table>

      <p style="font-size: 13px; color: #6b7280; border-top: 1px solid #eee; padding-top: 15px;">
        This report is generated automatically to provide an overview of system performance and activity.
      </p>
    `;
        return this.wrap(content);
    }
    /**
     * Template for Account Action Alerts (PRD 2.A.iv)
     */
    static getAccountActionTemplate(action, reason) {
        const isSuspended = action === 'SUSPENDED';
        const content = `
      <div class="alert" style="border-left-color: ${isSuspended ? '#ef4444' : '#10b981'}; background: ${isSuspended ? '#fee2e2' : '#ecfdf5'};">
        <h2 style="margin-top:0; color: ${isSuspended ? '#991b1b' : '#065f46'};">
          ${isSuspended ? '🚨 Account Suspension Notice' : '✅ Account Reactivated'}
        </h2>
        <p>This is an official notification regarding your BIG Ltd business account status.</p>
      </div>
      
      <p>Your account has been <strong>${action.toLowerCase()}</strong> by the system administrator.</p>
      
      <table class="info-table">
        <tr><td>Action:</td><td>${action}</td></tr>
        <tr><td>Timestamp:</td><td>${new Date().toLocaleString()}</td></tr>
        ${reason ? `<tr><td>Reason:</td><td>${reason}</td></tr>` : ''}
      </table>

      <p>${isSuspended
            ? 'While suspended, you will not be able to process sales, place orders, or access your dashboard. If you believe this is an error, please contact BIG Ltd Support.'
            : 'You now have full access to your dashboard and can resume normal business operations.'}
      </p>

      <center>
        <a href="${process.env.BACKEND_URL || '#'}/login" class="button">${isSuspended ? 'Contact Support' : 'Login Now'}</a>
      </center>
    `;
        return this.wrap(content);
    }
}
exports.TemplateService = TemplateService;
