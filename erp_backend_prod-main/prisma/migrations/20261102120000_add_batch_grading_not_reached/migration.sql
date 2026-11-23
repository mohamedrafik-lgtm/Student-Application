ALTER TABLE `batch_grading_skipped`
  ADD COLUMN `traineeId` INTEGER NULL;

ALTER TABLE `batch_grading_already_graded`
  ADD COLUMN `traineeId` INTEGER NULL;

ALTER TABLE `batch_grading_failures`
  ADD COLUMN `traineeId` INTEGER NULL;

ALTER TABLE `batch_grading_results`
  MODIFY COLUMN `nationalId` VARCHAR(191) NULL,
  ADD COLUMN `traineeId` INTEGER NULL;

ALTER TABLE `batch_grading_already_graded`
  MODIFY COLUMN `nationalId` VARCHAR(191) NULL;

CREATE TABLE `batch_grading_not_reached` (
  `id` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `answerSheetId` VARCHAR(191) NOT NULL,
  `traineeId` INTEGER NOT NULL,
  `traineeName` VARCHAR(191) NOT NULL,
  `nationalId` VARCHAR(191) NULL,
  `sheetStatus` ENUM('NOT_SUBMITTED', 'SUBMITTED', 'GRADED', 'VERIFIED') NOT NULL,
  `reason` VARCHAR(191) NOT NULL DEFAULT 'لم تعتمد لهذه الورقة نتيجة في جلسة التصحيح الجماعي',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `batch_grading_not_reached_sessionId_answerSheetId_key` (`sessionId`, `answerSheetId`),
  INDEX `batch_grading_not_reached_sessionId_idx` (`sessionId`),
  INDEX `batch_grading_not_reached_traineeId_idx` (`traineeId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `batch_grading_not_reached_sessionId_fkey`
    FOREIGN KEY (`sessionId`) REFERENCES `batch_grading_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `batch_grading_not_reached_answerSheetId_fkey`
    FOREIGN KEY (`answerSheetId`) REFERENCES `paper_answer_sheets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
