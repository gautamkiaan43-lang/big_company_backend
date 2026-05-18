-- Create ConsumerSettings table
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
  CONSTRAINT `ConsumerSettings_consumerId_fkey` FOREIGN KEY (`consumerId`) REFERENCES `ConsumerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
