ALTER TABLE `fee_payment_schedules`
  ADD COLUMN `fineSourceFeeId` INTEGER NULL;

ALTER TABLE `trainee_fine_applications`
  MODIFY COLUMN `sourceTransactionId` VARCHAR(191) NULL,
  ADD COLUMN `sourceFeeId` INTEGER NULL;

-- Stop the old transfer-based configuration; historical fine applications remain intact.
UPDATE `fee_payment_schedules`
SET `fineRecurrence` = NULL
WHERE `fineSourceTransactionId` IS NOT NULL AND `fineSourceFeeId` IS NULL;
