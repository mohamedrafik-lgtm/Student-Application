ALTER TABLE `quizzes`
  ADD COLUMN `gradeComponentKey` VARCHAR(40) NULL DEFAULT 'quizzesMarks',
  ADD COLUMN `gradeComponentLabel` VARCHAR(191) NULL DEFAULT 'اختبارات أونلاين',
  ADD COLUMN `gradeAllocation` DOUBLE NULL;

CREATE TABLE `quiz_grade_allocation_logs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `quizId` INTEGER NOT NULL,
  `oldComponentKey` VARCHAR(40) NULL,
  `oldComponentLabel` VARCHAR(191) NULL,
  `oldAllocation` DOUBLE NULL,
  `newComponentKey` VARCHAR(40) NOT NULL,
  `newComponentLabel` VARCHAR(191) NOT NULL,
  `newAllocation` DOUBLE NOT NULL,
  `changedById` VARCHAR(191) NULL,
  `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `quiz_grade_allocation_logs_quizId_changedAt_idx` (`quizId`, `changedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `quiz_grade_allocation_logs_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quiz_grade_contributions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `quizId` INTEGER NOT NULL,
  `traineeId` INTEGER NOT NULL,
  `trainingContentId` INTEGER NOT NULL,
  `componentKey` VARCHAR(40) NOT NULL,
  `earnedMarks` DOUBLE NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `quiz_grade_contributions_quizId_traineeId_key` (`quizId`, `traineeId`),
  INDEX `quiz_grade_contributions_trainingContentId_componentKey_traineeId_idx` (`trainingContentId`, `componentKey`, `traineeId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `quiz_grade_contributions_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `quiz_grade_contributions_traineeId_fkey` FOREIGN KEY (`traineeId`) REFERENCES `Trainee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
