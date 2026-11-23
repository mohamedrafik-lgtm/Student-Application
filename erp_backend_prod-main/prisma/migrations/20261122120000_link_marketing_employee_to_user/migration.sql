ALTER TABLE `marketing_employees`
  ADD COLUMN `userId` VARCHAR(191) NULL,
  ADD INDEX `marketing_employees_userId_idx` (`userId`),
  ADD CONSTRAINT `marketing_employees_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
