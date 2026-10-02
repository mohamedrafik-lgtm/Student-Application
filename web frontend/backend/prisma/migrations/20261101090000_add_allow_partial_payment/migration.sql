-- AlterTable
ALTER TABLE `TraineeFee`
    ADD COLUMN `allowPartialPayment` BOOLEAN NOT NULL DEFAULT true;

-- Backfill legacy rows to keep old data behavior (partial payment allowed by default)
UPDATE `TraineeFee`
SET `allowPartialPayment` = true;
