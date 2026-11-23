-- AlterTable
ALTER TABLE `TraineeFee`
    ADD COLUMN `refundDeadlineEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `refundDeadlineAt` DATETIME(3) NULL;

-- Backfill legacy rows to keep refund deadline disabled by default
UPDATE `TraineeFee`
SET `refundDeadlineEnabled` = false,
    `refundDeadlineAt` = NULL;
