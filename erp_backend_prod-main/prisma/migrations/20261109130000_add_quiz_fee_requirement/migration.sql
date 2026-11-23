ALTER TABLE `quizzes`
  ADD COLUMN `feeRequirementEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `requiredFeeId` INTEGER NULL,
  ADD INDEX `quizzes_requiredFeeId_idx` (`requiredFeeId`),
  ADD CONSTRAINT `quizzes_requiredFeeId_fkey`
    FOREIGN KEY (`requiredFeeId`) REFERENCES `TraineeFee` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
