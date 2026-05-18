import prisma from '../utils/prisma';

const RETAILER_TEMPLATES = [
  {
    name: 'RET-EMAIL-001',
    subject: 'Welcome to BIG Energy Platform',
    description: 'Retail Signup Confirmation',
    triggerName: 'Retailer account created',
    requiredVariables: 'retail_name,retail_id,phone,email,created_date,login_url',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Welcome to BIG Energy Platform.</p>
      <p>Your retail account has been successfully created and activated.</p>
      <p><strong>Account Information:</strong></p>
      <ul>
        <li>Retail ID: {{retail_id}}</li>
        <li>Registered Phone: {{phone}}</li>
        <li>Registered Email: {{email}}</li>
        <li>Registration Date: {{created_date}}</li>
      </ul>
      <p>You can now access your retail dashboard using the link below:</p>
      <p><a href="{{login_url}}" style="display: inline-block; padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px;">Access Dashboard</a></p>
      <p>Please keep your login credentials secure.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-002',
    subject: 'Order Accepted - {{order_id}}',
    description: 'Order Accepted by Wholesaler',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Your order has been accepted successfully by the wholesaler.</p>
      <p><strong>Order Details:</strong></p>
      <ul>
        <li>Order ID: {{order_id}}</li>
        <li>Product: {{product}}</li>
        <li>Quantity: {{quantity}}</li>
        <li>Wholesaler: {{wholesaler_name}}</li>
        <li>Order Date: {{order_date}}</li>
        <li>Estimated Delivery: {{estimated_delivery}}</li>
      </ul>
      <p>Please prepare to receive the delivery. You may track the order status through your dashboard.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-003',
    subject: 'Order Delivered Successfully - {{order_id}}',
    description: 'Order Delivered with Receipt Information',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Your order has been delivered successfully.</p>
      <p><strong>Delivery & Receipt Details:</strong></p>
      <ul>
        <li>Order ID: {{order_id}}</li>
        <li>Invoice Number: {{invoice_no}}</li>
        <li>Product: {{product}}</li>
        <li>Quantity Delivered: {{quantity}}</li>
        <li>Total Amount: {{amount}} RWF</li>
        <li>Delivery Date: {{delivery_date}}</li>
        <li>Payment Method: {{payment_method}}</li>
        <li>Remaining Balance: {{balance}} RWF</li>
      </ul>
      <p><strong>Receipt:</strong><br/>
      <a href="{{receipt_url}}">{{receipt_url}}</a></p>
      <p>Please keep this email for your records.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-004',
    subject: 'New Customer Link Request',
    description: 'Customer Link Request Notification',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>A new customer has requested to be linked to your retail account.</p>
      <p><strong>Customer Information:</strong></p>
      <ul>
        <li>Customer Name: {{customer_name}}</li>
        <li>Phone Number: {{customer_phone}}</li>
        <li>Request Date: {{request_date}}</li>
      </ul>
      <p>Please review and approve or reject the request from your dashboard:</p>
      <p><a href="{{dashboard_url}}" style="display: inline-block; padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px;">Review Request</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-005',
    subject: 'Customer Link Request Approved',
    description: 'Customer Link Approval Confirmation',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>The customer link request has been approved successfully.</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li>Customer Name: {{customer_name}}</li>
        <li>Approval Date: {{approval_date}}</li>
      </ul>
      <p>The customer is now linked to your retail account.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-006',
    subject: 'Capital Wallet Top-Up Successful',
    description: 'Capital Wallet Top-Up Confirmation',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Your capital wallet has been topped up successfully.</p>
      <p><strong>Transaction Details:</strong></p>
      <ul>
        <li>Amount Added: {{amount}} RWF</li>
        <li>New Wallet Balance: {{new_balance}} RWF</li>
        <li>Transaction ID: {{transaction_id}}</li>
        <li>Date: {{topup_date}}</li>
      </ul>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-007',
    subject: 'Monthly Profit Transfer Report - {{month}}',
    description: 'Monthly Profit Transfer Confirmation',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Your monthly financial summary and profit transfer have been completed successfully.</p>
      <p><strong>Monthly Report:</strong></p>
      <ul>
        <li>Reporting Month: {{month}}</li>
        <li>Total Sales: {{total_sales}} RWF</li>
        <li>Gross Profit: {{gross_profit}} RWF</li>
      </ul>
      <p><strong>Deductions:</strong></p>
      <ul>
        <li>Rent: {{rent}} RWF</li>
        <li>Tax: {{tax}} RWF</li>
        <li>Salary: {{salary}} RWF</li>
        <li>Other Deductions: {{other_deductions}} RWF</li>
      </ul>
      <p><strong>Final Summary:</strong></p>
      <ul>
        <li>Net Profit: {{net_profit}} RWF</li>
        <li>Transferred Amount: {{transfer_amount}} RWF</li>
        <li>Transfer Date: {{transfer_date}}</li>
      </ul>
      <p><strong>Detailed report:</strong><br/>
      <a href="{{report_url}}">{{report_url}}</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-008',
    subject: 'Credit Request Submitted Successfully',
    description: 'Credit Request Submitted',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Your credit request has been submitted successfully.</p>
      <p><strong>Request Details:</strong></p>
      <ul>
        <li>Request ID: {{request_id}}</li>
        <li>Requested Amount: {{credit_amount}} RWF</li>
        <li>Request Date: {{request_date}}</li>
        <li>Reason: {{reason}}</li>
      </ul>
      <p>Your request is currently under review. You will receive another notification once the request has been approved or rejected.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-009',
    subject: 'Credit Request Approved',
    description: 'Credit Approval Confirmation',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Your credit request has been approved successfully.</p>
      <p><strong>Approved Credit Details:</strong></p>
      <ul>
        <li>Approved Amount: {{approved_amount}} RWF</li>
        <li>Interest Rate: {{interest_rate}}</li>
        <li>Repayment Period: {{repayment_period}}</li>
        <li>Due Date: {{due_date}}</li>
      </ul>
      <p><strong>Repayment link:</strong><br/>
      <a href="{{repayment_url}}">{{repayment_url}}</a></p>
      <p>Please ensure repayment before the due date to maintain good account standing.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-010',
    subject: 'Credit Payment Confirmation',
    description: 'Paid Credit Confirmation',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Your credit payment has been received successfully.</p>
      <p><strong>Payment Details:</strong></p>
      <ul>
        <li>Amount Paid: {{paid_amount}} RWF</li>
        <li>Remaining Credit Balance: {{remaining_balance}} RWF</li>
        <li>Payment Date: {{payment_date}}</li>
        <li>Transaction ID: {{transaction_id}}</li>
      </ul>
      <p>Thank you for your payment.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-011',
    subject: 'Daily Sales and Stock Report - {{date}}',
    description: 'Daily Sales Report & Stock Update',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Below is your daily business summary report.</p>
      <p><strong>Sales Summary:</strong></p>
      <ul>
        <li>Date: {{date}}</li>
        <li>Total Sales: {{total_sales}} RWF</li>
        <li>Total Transactions: {{transactions}}</li>
      </ul>
      <p><strong>Inventory Summary:</strong></p>
      <ul>
        <li>Remaining Stock: {{stock_remaining}}</li>
        <li>Top Selling Product: {{top_product}}</li>
      </ul>
      <p><strong>Detailed report:</strong><br/>
      <a href="{{report_url}}">{{report_url}}</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-012',
    subject: 'Security Update Confirmation',
    description: 'PIN or Password Change Confirmation',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Your account security credentials were updated successfully.</p>
      <p><strong>Security Details:</strong></p>
      <ul>
        <li>Change Time: {{change_time}}</li>
        <li>Device: {{device}}</li>
        <li>IP Address: {{ip_address}}</li>
      </ul>
      <p>If you did not perform this action, please contact support immediately.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-013',
    subject: 'Low Stock Alert',
    description: 'Low Stock Alert',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Your stock level is running low.</p>
      <p><strong>Stock Details:</strong></p>
      <ul>
        <li>Product: {{product}}</li>
        <li>Remaining Quantity: {{remaining_quantity}}</li>
        <li>Minimum Recommended Quantity: {{minimum_required}}</li>
      </ul>
      <p>Please restock as soon as possible to avoid stock interruption:</p>
      <p><a href="{{restock_url}}" style="display: inline-block; padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px;">Restock Now</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-014',
    subject: 'Out of Stock Alert',
    description: 'Out of Stock Alert',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>The following product is currently out of stock:</p>
      <ul>
        <li>Product: {{product}}</li>
      </ul>
      <p>Please place a restocking order immediately to continue serving customers:</p>
      <p><a href="{{restock_url}}" style="display: inline-block; padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px;">Place Order</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-015',
    subject: 'Suspicious Activity Detected',
    description: 'Suspicious Shopping Activity Alert',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>We detected unusual activity on your retail account.</p>
      <p><strong>Activity Details:</strong></p>
      <ul>
        <li>Activity: {{activity}}</li>
        <li>Time: {{time}}</li>
        <li>Location/IP: {{location}}</li>
      </ul>
      <p>If this activity was not authorized by you, please secure your account immediately and contact support.</p>
      <p><strong>Security page:</strong><br/>
      <a href="{{security_url}}">{{security_url}}</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-016',
    subject: 'Low Capital Wallet Balance Alert',
    description: 'Low Capital Wallet Alert',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Your capital wallet balance is currently below the recommended operational threshold.</p>
      <p><strong>Wallet Information:</strong></p>
      <ul>
        <li>Current Balance: {{current_balance}} RWF</li>
        <li>Recommended Minimum Balance: {{minimum_balance}} RWF</li>
      </ul>
      <p>Please top up your wallet to continue operations smoothly:</p>
      <p><a href="{{topup_url}}" style="display: inline-block; padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px;">Top Up Wallet</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-017',
    subject: 'Failed Login Attempt Detected',
    description: 'Failed Login Attempt Alert',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>A failed login attempt was detected on your account.</p>
      <p><strong>Attempt Details:</strong></p>
      <ul>
        <li>Time: {{attempt_time}}</li>
        <li>Device: {{device}}</li>
        <li>IP Address: {{ip}}</li>
      </ul>
      <p>If this was not you, we recommend changing your password immediately.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-018',
    subject: 'Order Failed - {{order_id}}',
    description: 'Failed Order Notification',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>Your order could not be completed successfully.</p>
      <p><strong>Order Details:</strong></p>
      <ul>
        <li>Order ID: {{order_id}}</li>
        <li>Date: {{date}}</li>
        <li>Failure Reason: {{reason}}</li>
      </ul>
      <p>Please review the issue and try again or contact support for assistance.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'RET-EMAIL-019',
    subject: 'Pending Order Alert - {{order_id}}',
    description: 'Pending Order Alert (>20 Minutes)',
    content: `
      <p>Hello {{retail_name}},</p>
      <p>The following order has remained pending longer than expected.</p>
      <p><strong>Order Details:</strong></p>
      <ul>
        <li>Order ID: {{order_id}}</li>
        <li>Pending Duration: {{pending_duration}}</li>
        <li>Current Status: {{status}}</li>
      </ul>
      <p>Immediate review is recommended to avoid operational delays:</p>
      <p><a href="{{dashboard_url}}" style="display: inline-block; padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px;">Review Order</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  }
];

const WHOLESALER_TEMPLATES = [
  {
    name: 'WHO-EMAIL-001',
    subject: 'Welcome to BIG Energy Platform',
    description: 'Wholesaler Signup Confirmation',
    triggerName: 'Wholesaler account created',
    requiredVariables: 'wholesaler_name,wholesaler_id,phone,email,created_date,login_url',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>Welcome to BIG Energy Platform.</p>
      <p>Your wholesaler account has been successfully created and activated.</p>
      <p><strong>Account Information:</strong></p>
      <ul class="info-table">
        <li>Wholesaler ID: {{wholesaler_id}}</li>
        <li>Registered Phone: {{phone}}</li>
        <li>Registered Email: {{email}}</li>
        <li>Registration Date: {{created_date}}</li>
      </ul>
      <p>You can now access your wholesaler dashboard using the link below:</p>
      <p><a href="{{login_url}}" class="button">Access Wholesaler Dashboard</a></p>
      <p>Please keep your login credentials secure.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-002',
    subject: 'Daily Sales and Stock Report - {{date}}',
    description: 'Daily Wholesaler Sales & Stock Summary',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>Below is your daily wholesaler business summary.</p>
      <div class="alert">
        <strong>Sales Summary:</strong><br>
        Date: {{date}}<br>
        Total Sales: {{total_sales}} RWF<br>
        Total Transactions: {{transactions}}
      </div>
      <div class="alert" style="background: #ecfdf5; border-color: #10b981;">
        <strong>Inventory Summary:</strong><br>
        Remaining Stock: {{stock_remaining}}<br>
        Top Selling Product: {{top_product}}
      </div>
      <p>For a detailed breakdown, please view the full report:</p>
      <p><a href="{{report_url}}" class="button">View Detailed Report</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-003',
    subject: 'New Retailer Order Request - {{order_id}}',
    description: 'New Order Received from Retailer',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>A retailer has submitted a new stock order request.</p>
      <p><strong>Order Details:</strong></p>
      <table class="info-table">
        <tr><td>Order ID</td><td>{{order_id}}</td></tr>
        <tr><td>Retailer</td><td>{{retail_name}}</td></tr>
        <tr><td>Product</td><td>{{product}}</td></tr>
        <tr><td>Quantity</td><td>{{quantity}}</td></tr>
        <tr><td>Total Amount</td><td>{{amount}} RWF</td></tr>
        <tr><td>Order Date</td><td>{{order_date}}</td></tr>
      </table>
      <p>Please review and process this order from your dashboard:</p>
      <p><a href="{{dashboard_url}}" class="button">Process Order</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-004',
    subject: 'Retailer Order Delivered - {{order_id}}',
    description: 'Wholesaler Order Delivery Confirmation',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>The retailer order has been marked as delivered successfully.</p>
      <p><strong>Delivery & Receipt Details:</strong></p>
      <table class="info-table">
        <tr><td>Order ID</td><td>{{order_id}}</td></tr>
        <tr><td>Invoice Number</td><td>{{invoice_no}}</td></tr>
        <tr><td>Retailer</td><td>{{retail_name}}</td></tr>
        <tr><td>Product</td><td>{{product}}</td></tr>
        <tr><td>Quantity Delivered</td><td>{{quantity}}</td></tr>
        <tr><td>Total Amount</td><td>{{amount}} RWF</td></tr>
        <tr><td>Delivery Date</td><td>{{delivery_date}}</td></tr>
        <tr><td>Payment Method</td><td>{{payment_method}}</td></tr>
        <tr><td>Remaining Balance</td><td>{{balance}} RWF</td></tr>
      </table>
      <p><a href="{{receipt_url}}" class="button">View Receipt</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-005',
    subject: 'New Retailer Link Request',
    description: 'New Retailer Link Request Notification',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>A new retailer has requested to be linked to your wholesaler account.</p>
      <p><strong>Retailer Information:</strong></p>
      <table class="info-table">
        <tr><td>Retailer Name</td><td>{{retail_name}}</td></tr>
        <tr><td>Phone Number</td><td>{{retail_phone}}</td></tr>
        <tr><td>Request Date</td><td>{{request_date}}</td></tr>
      </table>
      <p>Please approve or reject the request from your dashboard:</p>
      <p><a href="{{dashboard_url}}" class="button">View Link Request</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-006',
    subject: 'Retailer Credit Request - {{request_id}}',
    description: 'New Credit Request from Retailer',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>A retailer has submitted a credit request.</p>
      <p><strong>Credit Request Details:</strong></p>
      <table class="info-table">
        <tr><td>Request ID</td><td>{{request_id}}</td></tr>
        <tr><td>Retailer</td><td>{{retail_name}}</td></tr>
        <tr><td>Requested Amount</td><td>{{credit_amount}} RWF</td></tr>
        <tr><td>Request Date</td><td>{{request_date}}</td></tr>
        <tr><td>Reason</td><td>{{reason}}</td></tr>
      </table>
      <p>Please review and approve or reject the request from your dashboard:</p>
      <p><a href="{{dashboard_url}}" class="button">Review Credit Request</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-007',
    subject: 'Retailer Credit Approved - {{request_id}}',
    description: 'Confirmation of Approved Retailer Credit',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>You approved a retailer credit request successfully.</p>
      <p><strong>Approved Credit Details:</strong></p>
      <table class="info-table">
        <tr><td>Request ID</td><td>{{request_id}}</td></tr>
        <tr><td>Retailer</td><td>{{retail_name}}</td></tr>
        <tr><td>Approved Amount</td><td>{{approved_amount}} RWF</td></tr>
        <tr><td>Interest Rate</td><td>{{interest_rate}}%</td></tr>
        <tr><td>Repayment Period</td><td>{{repayment_period}} days</td></tr>
        <tr><td>Due Date</td><td>{{due_date}}</td></tr>
        <tr><td>Current Credit Balance</td><td>{{current_credit_balance}} RWF</td></tr>
      </table>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-008',
    subject: 'Retailer Credit Payment Received - {{transaction_id}}',
    description: 'Payment Received for Retailer Credit',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>A retailer credit payment has been received successfully.</p>
      <p><strong>Payment Details:</strong></p>
      <table class="info-table">
        <tr><td>Retailer</td><td>{{retail_name}}</td></tr>
        <tr><td>Amount Paid</td><td>{{paid_amount}} RWF</td></tr>
        <tr><td>Remaining Credit Balance</td><td>{{remaining_balance}} RWF</td></tr>
        <tr><td>Payment Date</td><td>{{payment_date}}</td></tr>
        <tr><td>Transaction ID</td><td>{{transaction_id}}</td></tr>
      </table>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-009',
    subject: 'Supplier Order Confirmation - {{supplier_order_id}}',
    description: 'Wholesaler Supplier Order Recorded',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>Your supplier order has been recorded successfully.</p>
      <p><strong>Supplier Order Details:</strong></p>
      <table class="info-table">
        <tr><td>Supplier Order ID</td><td>{{supplier_order_id}}</td></tr>
        <tr><td>Supplier</td><td>{{supplier_name}}</td></tr>
        <tr><td>Product</td><td>{{product}}</td></tr>
        <tr><td>Quantity</td><td>{{quantity}}</td></tr>
        <tr><td>Total Amount</td><td>{{amount}} RWF</td></tr>
        <tr><td>Order Date</td><td>{{order_date}}</td></tr>
        <tr><td>Expected Delivery</td><td>{{expected_delivery}}</td></tr>
      </table>
      <p><a href="{{receipt_url}}" class="button">View Order Receipt</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-010',
    subject: 'New Supplier Added Successfully',
    description: 'Confirmation of New Supplier Addition',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>A new supplier has been added successfully to your account.</p>
      <p><strong>Supplier Information:</strong></p>
      <table class="info-table">
        <tr><td>Supplier Name</td><td>{{supplier_name}}</td></tr>
        <tr><td>Supplier Phone</td><td>{{supplier_phone}}</td></tr>
        <tr><td>Supplier Email</td><td>{{supplier_email}}</td></tr>
        <tr><td>Date Added</td><td>{{created_date}}</td></tr>
      </table>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-011',
    subject: 'Monthly Profit Transfer Report - {{month}}',
    description: 'Monthly Wholesaler Profit Summary',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>Your monthly financial summary and profit transfer have been completed successfully.</p>
      <div class="alert">
        <strong>Monthly Report: {{month}}</strong><br>
        Total Sales: {{total_sales}} RWF<br>
        Gross Profit: {{gross_profit}} RWF
      </div>
      <p><strong>Deductions:</strong></p>
      <table class="info-table">
        <tr><td>Rent</td><td>{{rent}} RWF</td></tr>
        <tr><td>Tax</td><td>{{tax}} RWF</td></tr>
        <tr><td>Salary</td><td>{{salary}} RWF</td></tr>
        <tr><td>Other Deductions</td><td>{{other_deductions}} RWF</td></tr>
      </table>
      <div class="alert" style="background: #e0e7ff; border-color: #6366f1;">
        <strong>Final Summary:</strong><br>
        Net Profit: {{net_profit}} RWF<br>
        Transferred Amount: {{transfer_amount}} RWF<br>
        Transfer Date: {{transfer_date}}
      </div>
      <p><a href="{{report_url}}" class="button">Detailed Financial Report</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-012',
    subject: 'Security Update Confirmation',
    description: 'Wholesaler Security Credential Change',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>Your account security credentials were updated successfully.</p>
      <p><strong>Security Details:</strong></p>
      <table class="info-table">
        <tr><td>Change Time</td><td>{{change_time}}</td></tr>
        <tr><td>Device</td><td>{{device}}</td></tr>
        <tr><td>IP Address</td><td>{{ip_address}}</td></tr>
      </table>
      <p>If you did not perform this action, please contact support immediately.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-013',
    subject: 'Low Stock Alert',
    description: 'Wholesaler Low Stock Notification',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>Your wholesaler stock level is running low.</p>
      <p><strong>Stock Details:</strong></p>
      <table class="info-table">
        <tr><td>Product</td><td>{{product}}</td></tr>
        <tr><td>Remaining Quantity</td><td>{{remaining_quantity}}</td></tr>
        <tr><td>Minimum Required</td><td>{{minimum_required}}</td></tr>
      </table>
      <p>Please restock as soon as possible to avoid stock interruption:</p>
      <p><a href="{{restock_url}}" class="button">Restock Inventory</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-014',
    subject: 'Out of Stock Alert',
    description: 'Wholesaler Out of Stock Alert',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>The following product is currently out of stock:</p>
      <div class="alert">
        <strong>Product: {{product}}</strong>
      </div>
      <p>Please place a restocking order immediately to continue operations:</p>
      <p><a href="{{restock_url}}" class="button">Order Stock Now</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-015',
    subject: 'Suspicious Inventory Activity Detected',
    description: 'Alert for Unusual Wholesaler Activity',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>We detected unusual inventory activity on your wholesaler account.</p>
      <p><strong>Activity Details:</strong></p>
      <table class="info-table">
        <tr><td>Activity</td><td>{{activity}}</td></tr>
        <tr><td>Time</td><td>{{time}}</td></tr>
        <tr><td>Location/IP</td><td>{{location}}</td></tr>
      </table>
      <p>If this activity was not authorized by you, please secure your account immediately.</p>
      <p><a href="{{security_url}}" class="button">Review Security</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-016',
    subject: 'Failed Login Attempt Detected',
    description: 'Wholesaler Failed Login Alert',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>A failed login attempt was detected on your account.</p>
      <p><strong>Attempt Details:</strong></p>
      <table class="info-table">
        <tr><td>Time</td><td>{{attempt_time}}</td></tr>
        <tr><td>Device</td><td>{{device}}</td></tr>
        <tr><td>IP Address</td><td>{{ip}}</td></tr>
      </table>
      <p>If this was not you, we recommend changing your password immediately.</p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  },
  {
    name: 'WHO-EMAIL-017',
    subject: 'Pending Action Alert - {{reference_id}}',
    description: 'Wholesaler Pending Request Warning',
    content: `
      <p>Hello {{wholesaler_name}},</p>
      <p>The following item has remained pending longer than expected.</p>
      <p><strong>Pending Item Details:</strong></p>
      <table class="info-table">
        <tr><td>Reference ID</td><td>{{reference_id}}</td></tr>
        <tr><td>Type</td><td>{{request_type}}</td></tr>
        <tr><td>Pending Duration</td><td>{{pending_duration}}</td></tr>
        <tr><td>Current Status</td><td>{{status}}</td></tr>
      </table>
      <p>Please review the item from your dashboard:</p>
      <p><a href="{{dashboard_url}}" class="button">Review Item</a></p>
      <p>Regards,<br/>
      Big Innovation Group Ltd<br/>
      +250788541239<br/>
      Info@big.co.rw</p>
    `
  }
];

const CUSTOMER_SMS_TEMPLATES = [
  {
    name: 'CUS-SMS-001',
    subject: 'Customer Signup Confirmation',
    description: 'Customer Signup Confirmation',
    triggerName: 'Customer account created',
    requiredVariables: 'customer_name,customer_id',
    content: 'Welcome {{customer_name}}, your account has been created successfully. Customer ID: {{customer_id}}. Keep your PIN secure. for support call: +250788541239.'
  },
  {
    name: 'CUS-SMS-002',
    subject: 'Order Delivery Confirmation',
    description: 'Triggered when customer order is marked delivered',
    content: 'Hello {{customer_name}}, your order {{order_id}} has been delivered on {{delivery_date}}. Amount: {{amount}} RWF. Thank you. for support call: +250788541239.'
  },
  {
    name: 'CUS-SMS-003',
    subject: 'Wallet Top-Up Confirmation',
    description: 'Triggered when customer wallet top-up is successful',
    content: 'Hello {{customer_name}}, wallet top-up successful. Amount: {{amount}} RWF. New balance: {{new_balance}} RWF. Ref: {{transaction_id}}. for support call: +250788541239.'
  },
  {
    name: 'CUS-SMS-004',
    subject: 'Gas Recharge Token Confirmation',
    description: 'Triggered when customer buys gas meter recharge/token',
    content: 'Hello {{customer_name}}, gas recharge for {{meter_name}} {{meter_id}} is successful. Amount: {{amount}} RWF. Token: {{token}}. Ref: {{transaction_id}}. for support call: +250788541239.'
  },
  {
    name: 'CUS-SMS-005',
    subject: 'Paid Credit Confirmation',
    description: 'Triggered when customer pays credit/loan',
    content: 'Hello {{customer_name}}, credit payment received. Paid: {{paid_amount}} RWF. Remaining balance: {{remaining_balance}} RWF. Ref: {{transaction_id}}. for support call: +250788541239.'
  },
  {
    name: 'CUS-SMS-006',
    subject: 'Gas Rewards Received and Update Confirmation',
    description: 'Triggered when customer receives gas reward balance update',
    content: 'Hello {{customer_name}}, you received {{reward_amount}} M3 gas reward. New reward balance: {{new_reward_balance}} M3. for support call: +250788541239.'
  },
  {
    name: 'CUS-SMS-007',
    subject: 'Change PIN or Password Confirmation',
    description: 'Triggered when customer changes PIN or password',
    content: 'Hello {{customer_name}}, your PIN/password was changed at {{change_time}}. If this was not you, contact support immediately. for support call: +250788541239.'
  },
  {
    name: 'CUS-SMS-008',
    subject: 'Rejected or Failed Order Alert',
    description: 'Triggered when customer order is rejected or fails',
    content: 'Hello {{customer_name}}, your order {{order_id}} was not completed. Reason: {{reason}}. Please try again. for support call: +250788541239.'
  },
  {
    name: 'CUS-SMS-009',
    subject: 'Approved or Rejected Credit Request Alert',
    description: 'Triggered when customer credit request is approved or rejected',
    content: 'Hello {{customer_name}}, your credit request {{request_id}} is {{status}}. Amount: {{amount}} RWF. Reason/Note: {{reason}}. for support call: +250788541239.'
  },
  {
    name: 'CUS-SMS-010',
    subject: 'Low Balance Alert',
    description: 'Triggered when customer wallet or meter balance drops below threshold',
    content: 'Hello {{customer_name}}, low {{balance_type}} balance alert. Current balance: {{current_balance}}. Please top up to avoid service interruption. for support call: +250788541239.'
  },
  {
    name: 'CUS-SMS-011',
    subject: 'Failed Login Attempt Alert',
    description: 'Triggered on failed login attempt detection',
    content: 'Hello {{customer_name}}, failed login attempt detected at {{attempt_time}}. If this was not you, change your PIN/password. for support call: +250788541239.'
  },
  {
    name: 'CUS-SMS-012',
    subject: 'Activated or Deactivated Account Information',
    description: 'Triggered when customer account status changes',
    content: 'Hello {{customer_name}}, your account has been {{status}} on {{date}}. Reason/Note: {{reason}}. for support call: +250788541239.'
  }
];

async function initTemplates() {
  console.log('🚀 Initializing BIG Energy Email & SMS Templates...');
  
  const allTemplates = [...RETAILER_TEMPLATES, ...WHOLESALER_TEMPLATES, ...CUSTOMER_SMS_TEMPLATES];

  for (const templateData of allTemplates) {
    try {
      // Determine channel and portal based on name prefix if not explicitly provided
      const channel = templateData.name.includes('SMS') ? 'SMS' : 'EMAIL';
      const portal = templateData.name.startsWith('RET') ? 'RETAILER' : 
                     templateData.name.startsWith('WHO') ? 'WHOLESALER' : 'CUSTOMER';

      await prisma.emailTemplate.upsert({
        where: { name: templateData.name },
        update: {
          subject: templateData.subject || '',
          content: templateData.content,
          description: templateData.description,
          channel: channel,
          portal: portal,
          isActive: true,
          updatedBy: 'SYSTEM_INIT'
        },
        create: {
          name: templateData.name,
          subject: templateData.subject || '',
          content: templateData.content,
          description: templateData.description,
          channel: channel,
          portal: portal,
          isActive: true,
          createdBy: 'SYSTEM_INIT',
          version: 1
        }
      });
      console.log(`✅ Template ${templateData.name} initialized [${channel} - ${portal}].`);
    } catch (error: any) {
      console.error(`❌ Failed to initialize template ${templateData.name}:`, error.message);
    }
  }
  
  console.log('🎉 Template initialization complete!');
}

initTemplates()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
