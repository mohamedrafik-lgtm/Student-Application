ALTER TABLE `quizzes`
  ADD COLUMN `integrityMonitoringEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `maxTabDepartures` INTEGER NOT NULL DEFAULT 3;

ALTER TABLE `quiz_attempts`
  ADD COLUMN `tabDepartureCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `integrityBlockedAt` DATETIME(3) NULL,
  ADD COLUMN `integrityBlockReason` TEXT NULL,
  ADD COLUMN `integrityAllowedStartAt` DATETIME(3) NULL,
  ADD COLUMN `integrityAllowedEndAt` DATETIME(3) NULL,
  ADD COLUMN `integrityAllowedByUserId` VARCHAR(191) NULL;

CREATE TABLE `quiz_attempt_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `attemptId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(30) NOT NULL DEFAULT 'TAB_DEPARTURE',
  `platform` VARCHAR(10) NOT NULL,
  `clientEventId` VARCHAR(100) NOT NULL,
  `details` TEXT NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `quiz_attempt_events_clientEventId_key` (`clientEventId`),
  INDEX `quiz_attempt_events_attemptId_occurredAt_idx` (`attemptId`, `occurredAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `quiz_attempt_events_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `quiz_attempts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quiz_access_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `quizId` INTEGER NOT NULL,
  `traineeId` INTEGER NOT NULL,
  `attemptId` VARCHAR(191) NULL,
  `requestType` VARCHAR(30) NOT NULL,
  `reason` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `reviewNotes` TEXT NULL,
  `reviewedById` VARCHAR(191) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `scheduledStartAt` DATETIME(3) NULL,
  `scheduledEndAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `quiz_access_requests_quizId_status_createdAt_idx` (`quizId`, `status`, `createdAt`),
  INDEX `quiz_access_requests_traineeId_quizId_status_idx` (`traineeId`, `quizId`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `quiz_access_requests_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `quiz_access_requests_traineeId_fkey` FOREIGN KEY (`traineeId`) REFERENCES `Trainee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `quiz_access_requests_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `quiz_attempts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
