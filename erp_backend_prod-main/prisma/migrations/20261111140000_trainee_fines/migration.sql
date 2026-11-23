ALTER TABLE `fee_payment_schedules`
  ADD COLUMN `fineSourceTransactionId` VARCHAR(191) NULL,
  ADD COLUMN `fineSourceAmount` DOUBLE NULL,
  ADD COLUMN `fineSourceDescription` TEXT NULL,
  ADD COLUMN `fineRecurrence` ENUM('ONCE', 'MONTHLY') NULL;

ALTER TABLE `TraineePayment`
  ADD COLUMN `feeAmount` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `feePaidAmount` DOUBLE NOT NULL DEFAULT 0;

UPDATE `TraineePayment` SET `feeAmount` = `amount`, `feePaidAmount` = `paidAmount`;

CREATE TABLE `trainee_fine_applications` (
  `id` VARCHAR(191) NOT NULL,
  `scheduleId` VARCHAR(191) NOT NULL,
  `traineePaymentId` INTEGER NOT NULL,
  `sourceTransactionId` VARCHAR(191) NOT NULL,
  `sourceDescription` TEXT NOT NULL,
  `sourceAmount` DOUBLE NOT NULL,
  `recurrence` ENUM('ONCE', 'MONTHLY') NOT NULL,
  `periodKey` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `appliedBy` VARCHAR(191) NOT NULL DEFAULT 'system',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `trainee_fine_applications_traineePaymentId_periodKey_key` (`traineePaymentId`, `periodKey`),
  INDEX `trainee_fine_applications_scheduleId_appliedAt_idx` (`scheduleId`, `appliedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `trainee_fine_applications_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `fee_payment_schedules` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `trainee_fine_applications_traineePaymentId_fkey` FOREIGN KEY (`traineePaymentId`) REFERENCES `TraineePayment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
