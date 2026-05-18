# Big Company Backend API

Complete backend API for the Big Company multi-role platform built with Node.js, Express, TypeScript, Prisma, and MySQL.

## Features

- **Multi-role Authentication**: Consumer, Retailer, Wholesaler, Employee, Admin
- **JWT-based Authorization**
- **RESTful API Design**
- **MySQL Database with Prisma ORM**
- **Role-based Access Control**
- **Comprehensive CRUD Operations**

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MySQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs

## Prerequisites

- Node.js (v16 or higher)
- MySQL Server running on localhost:3306
- Database named `big_company` created

## Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables (already configured in `.env`):

```
DATABASE_URL="mysql://root:@localhost:3306/big_company"
JWT_SECRET="super_secret_jwt_key_12345"
PORT=9000
```

3. Generate Prisma Client and push schema to database:

```bash
npx prisma generate
npx prisma db push
```

4. Seed the database with demo data:

```bash
npm run seed
```

## Running the Server

### Development Mode (with auto-reload):

```bash
npm run dev
```

### Production Mode:

```bash
npm run build
node dist/index.js
```

### Quick Start:

```bash
npm start
```

The server will start on `https://big-company-production.up.railway.app/`

## Demo Credentials

After running the seed script, you can use these credentials:

### Admin

- Email: `admin@bigcompany.rw`
- Password: `admin123`

### Employee

- Email: `employee@bigcompany.rw`
- Password: `employee123`

### Wholesaler

- Email: `wholesaler@bigcompany.rw`
- Password: `wholesaler123`

### Retailer

- Email: `retailer@bigcompany.rw`
- Password: `retailer123`

### Consumer

- Phone: `250788123456`
- PIN: `1234`

## API Endpoints

### Authentication (All Roles)

#### Register

- `POST /store/auth/register` - Consumer registration
- `POST /retailer/auth/register` - Retailer registration
- `POST /wholesaler/auth/register` - Wholesaler registration

#### Login

- `POST /store/auth/login` - Consumer login (phone + PIN)
- `POST /retailer/auth/login` - Retailer login (email + password)
- `POST /wholesaler/auth/login` - Wholesaler login (email + password)
- `POST /employee/auth/login` - Employee login (email + password)
- `POST /admin/auth/login` - Admin login (email + password)

### Consumer/Store Endpoints (`/store`)

All require `Authorization: Bearer <token>` header

- `GET /store/retailers` - Get all retailers
- `GET /store/categories` - Get product categories
- `GET /store/products` - Get products (query: retailerId, category, search)
- `GET /store/customers/me/orders` - Get my orders
- `GET /store/wallet/balance` - Get wallet balance
- `GET /store/rewards/balance` - Get rewards points
- `GET /store/loans` - Get my loans
- `GET /store/loans/products` - Get available loan products
- `GET /store/loans/eligibility` - Check loan eligibility

### Retailer Endpoints (`/retailer`)

All require `Authorization: Bearer <token>` header

- `GET /retailer/dashboard/stats` - Get dashboard statistics
- `GET /retailer/inventory` - Get inventory/products
- `POST /retailer/inventory` - Create new product
- `PUT /retailer/inventory/:id` - Update product
- `GET /retailer/orders` - Get orders from wholesalers
- `GET /retailer/branches` - Get branches
- `POST /retailer/branches` - Create new branch
- `GET /retailer/wallet` - Get wallet info

### Wholesaler Endpoints (`/wholesaler`)

All require `Authorization: Bearer <token>` header

- `GET /wholesaler/dashboard/stats` - Get dashboard statistics
- `GET /wholesaler/inventory` - Get inventory/products
- `POST /wholesaler/inventory` - Create new product
- `GET /wholesaler/retailer-orders` - Get orders from retailers
- `PUT /wholesaler/retailer-orders/:id/status` - Update order status
- `GET /wholesaler/credit-requests` - Get credit requests

### Employee Endpoints (`/employee`)

All require `Authorization: Bearer <token>` header

- `GET /employee/dashboard` - Get employee dashboard
- `GET /employee/attendance` - Get attendance records
- `GET /employee/payslips` - Get payslips
- `GET /employee/tasks` - Get assigned tasks

### Admin Endpoints (`/admin`)

All require `Authorization: Bearer <token>` header

- `GET /admin/dashboard` - Get admin dashboard with all stats
- `GET /admin/customers` - Get all customers
- `GET /admin/retailers` - Get all retailers
- `POST /admin/accounts/create-retailer` - Create new retailer
- `GET /admin/wholesalers` - Get all wholesalers
- `POST /admin/accounts/create-wholesaler` - Create new wholesaler
- `GET /admin/loans` - Get all loans
- `GET /admin/nfc-cards` - Get all NFC cards
- `GET /admin/categories` - Get all product categories

## Database Schema

The database includes the following main models:

- **User** - Base user model with role-based authentication
- **ConsumerProfile** - Consumer-specific data (wallet, rewards)
- **RetailerProfile** - Retailer-specific data (shop, credit limit)
- **WholesalerProfile** - Wholesaler-specific data (company info)
- **EmployeeProfile** - Employee-specific data (department, position)
- **Product** - Products (can belong to retailer or wholesaler)
- **Order** - Orders between retailers and wholesalers
- **Sale** - Sales from retailers to consumers
- **Branch** - Retailer branches
- **Terminal** - POS terminals
- **NfcCard** - NFC cards for payments
- **Loan** - Consumer loans
- **Message** - Inter-user messaging
- **Notification** - User notifications

## Project Structure

```
backend/
├── src/
│   ├── controllers/       # Request handlers
│   │   ├── authController.ts
│   │   ├── storeController.ts
│   │   ├── retailerController.ts
│   │   ├── wholesalerController.ts
│   │   ├── employeeController.ts
│   │   └── adminController.ts
│   ├── routes/           # API routes
│   │   ├── authRoutes.ts
│   │   ├── storeRoutes.ts
│   │   ├── retailerRoutes.ts
│   │   ├── wholesalerRoutes.ts
│   │   ├── employeeRoutes.ts
│   │   ├── adminRoutes.ts
│   │   ├── nfcRoutes.ts
│   │   └── walletRoutes.ts
│   ├── middleware/       # Express middleware
│   │   └── authMiddleware.ts
│   ├── utils/           # Utility functions
│   │   ├── auth.ts      # JWT & hashing
│   │   └── prisma.ts    # Prisma client
│   ├── index.ts         # Server entry point
│   └── seed.ts          # Database seeder
├── prisma/
│   └── schema.prisma    # Database schema
├── .env                 # Environment variables
├── tsconfig.json        # TypeScript config
└── package.json         # Dependencies

```

## Development

### Database Management

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma db push --force-reset

# Re-seed database
npm run seed
```
                
### Testing API

You can test the API using:

- **Postman** or **Insomnia**
- **cURL**
- The frontend application

Example login request:

```bash
curl -X POST https://big-company-production.up.railway.app/retailer/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"retailer@bigcompany.rw","password":"retailer123"}'
```
  
## Notes

- All passwords are hashed using bcryptjs
- JWT tokens expire after 1 day
- CORS is enabled for all origins (configure for production)
- The server runs on port 9000 by default

## License

ISC
