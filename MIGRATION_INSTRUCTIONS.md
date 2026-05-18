# Database Migration Instructions

## Problem
The `ConsumerSettings` table doesn't exist in the database, causing the ProfilePage to fail.

## Solution Options

### **Option 1: Run Prisma Migration (Recommended)**

1. **Stop the backend server** (press `Ctrl+C` in the terminal running `npm run dev`)

2. **Run the migration:**
   ```powershell
   cd c:\Users\Admin\Desktop\BigCompany\big-pos-backend
   npx prisma migrate dev --name add_consumer_settings
   ```
   
3. **When prompted, press Enter** to create the migration

4. **Restart the backend:**
   ```powershell
   npm run dev
   ```

### **Option 2: Manual SQL Execution**

If Option 1 doesn't work, manually create the table:

1. **Open your MySQL client** (phpMyAdmin, MySQL Workbench, or command line)

2. **Select the `big_company` database**

3. **Run this SQL:**
   ```sql
   CREATE TABLE IF NOT EXISTS `ConsumerSettings` (
     `id` VARCHAR(191) NOT NULL,
     `consumerId` VARCHAR(191) NOT NULL,
     `pushNotifications` BOOLEAN NOT NULL DEFAULT true,
     `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
     `smsNotifications` BOOLEAN NOT NULL DEFAULT false,
     `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     `updatedAt` DATETIME(3) NOT NULL,
     PRIMARY KEY (`id`),
     UNIQUE INDEX `ConsumerSettings_consumerId_key`(`consumerId`),
     CONSTRAINT `ConsumerSettings_consumerId_fkey` 
       FOREIGN KEY (`consumerId`) 
       REFERENCES `ConsumerProfile`(`id`) 
       ON DELETE RESTRICT ON UPDATE CASCADE
   ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **Regenerate Prisma Client:**
   ```powershell
   cd c:\Users\Admin\Desktop\BigCompany\big-pos-backend
   npx prisma generate
   ```

5. **Restart the backend server**

### **Option 3: Use Prisma Studio**

1. **Stop the backend server**

2. **Open Prisma Studio:**
   ```powershell
   cd c:\Users\Admin\Desktop\BigCompany\big-pos-backend
   npx prisma studio
   ```

3. **This will open a browser interface where you can see your database**

4. **Then run the migration as in Option 1**

---

## After Migration

Once the table is created:

1. ✅ Restart the backend server
2. ✅ Refresh the ProfilePage in your browser
3. ✅ The error should be gone
4. ✅ ProfilePage should load successfully

---

## Quick Test

After migration, test the ProfilePage:
- Navigate to the consumer profile page
- Check if data loads without errors
- Try editing and saving profile
- Toggle notification preferences
