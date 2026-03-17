-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `resetCode` VARCHAR(191) NULL,
    `resetCodeExpiresAt` DATETIME(3) NULL,
    `resetCodeGeneratedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `traineeName` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `altPhoneNumber` VARCHAR(191) NULL,
    `qualification` VARCHAR(191) NOT NULL,
    `branch` VARCHAR(191) NOT NULL,
    `program` VARCHAR(191) NOT NULL,
    `friendName` VARCHAR(191) NULL,
    `friendPhone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `company` VARCHAR(255) NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `salary` VARCHAR(100) NULL,
    `description` TEXT NOT NULL,
    `requirements` TEXT NOT NULL,
    `applyUrl` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `news` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `excerpt` TEXT NOT NULL,
    `image` VARCHAR(255) NOT NULL,
    `imageCloudinaryId` VARCHAR(191) NULL,
    `author` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `news_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrainingProgram` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nameAr` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN_SUCCESS', 'LOGIN_FAILURE') NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `userId` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Trainee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nameAr` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `enrollmentType` ENUM('REGULAR', 'DISTANCE', 'BOTH') NOT NULL,
    `maritalStatus` ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED') NOT NULL,
    `nationalId` VARCHAR(191) NOT NULL,
    `idIssueDate` DATETIME(3) NOT NULL,
    `idExpiryDate` DATETIME(3) NOT NULL,
    `programType` ENUM('SUMMER', 'WINTER', 'ANNUAL') NOT NULL,
    `nationality` VARCHAR(191) NOT NULL,
    `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    `birthDate` DATETIME(3) NOT NULL,
    `residenceAddress` VARCHAR(191) NOT NULL,
    `photoUrl` VARCHAR(191) NULL,
    `photoCloudinaryId` VARCHAR(191) NULL,
    `religion` ENUM('ISLAM', 'CHRISTIANITY', 'JUDAISM') NOT NULL DEFAULT 'ISLAM',
    `programId` INTEGER NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `governorate` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `guardianPhone` VARCHAR(191) NOT NULL,
    `guardianEmail` VARCHAR(191) NULL,
    `guardianJob` VARCHAR(191) NULL,
    `guardianRelation` VARCHAR(191) NOT NULL,
    `guardianName` VARCHAR(191) NOT NULL,
    `landline` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `facebook` VARCHAR(191) NULL,
    `educationType` ENUM('PREPARATORY', 'INDUSTRIAL_SECONDARY', 'COMMERCIAL_SECONDARY', 'AGRICULTURAL_SECONDARY', 'AZHAR_SECONDARY', 'GENERAL_SECONDARY', 'UNIVERSITY', 'INDUSTRIAL_APPRENTICESHIP') NOT NULL,
    `schoolName` VARCHAR(191) NOT NULL,
    `graduationDate` DATETIME(3) NOT NULL,
    `totalGrade` DOUBLE NULL,
    `gradePercentage` DOUBLE NULL,
    `sportsActivity` VARCHAR(191) NULL,
    `culturalActivity` VARCHAR(191) NULL,
    `educationalActivity` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `traineeStatus` ENUM('NEW', 'CURRENT', 'GRADUATE', 'WITHDRAWN') NOT NULL DEFAULT 'NEW',
    `classLevel` ENUM('FIRST', 'SECOND', 'THIRD', 'FOURTH') NOT NULL DEFAULT 'FIRST',
    `academicYear` VARCHAR(191) NULL,
    `marketingEmployeeId` INTEGER NULL,
    `firstContactEmployeeId` INTEGER NULL,
    `secondContactEmployeeId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Trainee_nationalId_key`(`nationalId`),
    UNIQUE INDEX `Trainee_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centerName` VARCHAR(191) NOT NULL,
    `centerManagerName` VARCHAR(191) NOT NULL,
    `centerAddress` VARCHAR(191) NOT NULL,
    `centerLogo` VARCHAR(191) NULL,
    `centerLogoCloudinaryId` VARCHAR(191) NULL,
    `facebookPageUrl` VARCHAR(191) NULL,
    `licenseNumber` VARCHAR(191) NULL,
    `loginUrl` VARCHAR(191) NULL,
    `managerPhoneNumber` VARCHAR(191) NULL,
    `showTraineeDebtsToTraineeAffairs` BOOLEAN NOT NULL DEFAULT false,
    `printingAmount` DOUBLE NOT NULL DEFAULT 0,
    `idCardBackgroundImage` VARCHAR(191) NULL,
    `idCardBackgroundCloudinaryId` VARCHAR(191) NULL,
    `idCardLogoPosition` JSON NULL,
    `idCardNamePosition` JSON NULL,
    `idCardPhotoPosition` JSON NULL,
    `idCardNationalIdPosition` JSON NULL,
    `idCardProgramPosition` JSON NULL,
    `idCardCenterNamePosition` JSON NULL,
    `idCardAdditionalText` VARCHAR(191) NULL,
    `idCardAdditionalTextPosition` JSON NULL,
    `idCardWidth` INTEGER NOT NULL DEFAULT 320,
    `idCardHeight` INTEGER NOT NULL DEFAULT 200,
    `idCardLogoSize` JSON NULL,
    `idCardPhotoSize` JSON NULL,
    `idCardNameSize` INTEGER NULL,
    `idCardNationalIdSize` INTEGER NULL,
    `idCardProgramSize` INTEGER NULL,
    `idCardCenterNameSize` INTEGER NULL,
    `idCardAdditionalTextSize` INTEGER NULL,
    `idCardLogoVisible` BOOLEAN NULL,
    `idCardPhotoVisible` BOOLEAN NULL,
    `idCardNameVisible` BOOLEAN NULL,
    `idCardNationalIdVisible` BOOLEAN NULL,
    `idCardProgramVisible` BOOLEAN NULL,
    `idCardCenterNameVisible` BOOLEAN NULL,
    `idCardAdditionalTextVisible` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_contents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `semester` ENUM('FIRST', 'SECOND') NOT NULL,
    `year` ENUM('FIRST', 'SECOND', 'THIRD', 'FOURTH') NOT NULL,
    `programId` INTEGER NULL,
    `instructorId` VARCHAR(191) NOT NULL,
    `theoryAttendanceRecorderId` VARCHAR(191) NULL,
    `practicalAttendanceRecorderId` VARCHAR(191) NULL,
    `durationMonths` INTEGER NOT NULL,
    `theorySessionsPerWeek` INTEGER NOT NULL,
    `practicalSessionsPerWeek` INTEGER NOT NULL,
    `chaptersCount` INTEGER NOT NULL,
    `yearWorkMarks` INTEGER NOT NULL,
    `practicalMarks` INTEGER NOT NULL,
    `writtenMarks` INTEGER NOT NULL,
    `attendanceMarks` INTEGER NOT NULL,
    `quizzesMarks` INTEGER NOT NULL,
    `finalExamMarks` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `training_contents_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` TEXT NOT NULL,
    `type` ENUM('MULTIPLE_CHOICE', 'TRUE_FALSE') NOT NULL,
    `skill` ENUM('RECALL', 'COMPREHENSION', 'DEDUCTION') NOT NULL,
    `difficulty` ENUM('EASY', 'MEDIUM', 'HARD', 'VERY_HARD') NOT NULL,
    `chapter` INTEGER NOT NULL,
    `contentId` INTEGER NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` TEXT NOT NULL,
    `isCorrect` BOOLEAN NOT NULL,
    `questionId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `type` ENUM('THEORY', 'PRACTICAL') NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `location` VARCHAR(191) NULL,
    `chapter` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `contentId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` INTEGER NOT NULL,
    `traineeId` INTEGER NOT NULL,
    `status` ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') NOT NULL,
    `arrivalTime` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attendance_records_sessionId_traineeId_key`(`sessionId`, `traineeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lectures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('VIDEO', 'PDF', 'BOTH') NOT NULL,
    `chapter` INTEGER NOT NULL,
    `youtubeUrl` VARCHAR(191) NULL,
    `pdfFile` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL,
    `contentId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `id_card_prints` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `traineeId` INTEGER NOT NULL,
    `printedById` VARCHAR(191) NOT NULL,
    `printedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `action` ENUM('SAFE_CREATE', 'SAFE_UPDATE', 'SAFE_DELETE', 'SAFE_BALANCE_UPDATE', 'FEE_CREATE', 'FEE_UPDATE', 'FEE_DELETE', 'FEE_APPLY', 'FEE_CANCEL', 'PAYMENT_CREATE', 'PAYMENT_UPDATE', 'PAYMENT_DELETE', 'PAYMENT_STATUS_CHANGE', 'PAYMENT_REVERSE', 'TRANSACTION_CREATE', 'TRANSACTION_UPDATE', 'TRANSACTION_DELETE', 'TRANSACTION_REVERSE', 'BULK_OPERATION', 'DATA_IMPORT', 'DATA_EXPORT', 'SYSTEM_ADJUSTMENT') NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `oldData` JSON NULL,
    `newData` JSON NULL,
    `changes` JSON NULL,
    `description` VARCHAR(191) NULL,
    `amount` DOUBLE NULL,
    `currency` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `userRole` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `relatedEntityType` VARCHAR(191) NULL,
    `relatedEntityId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `isReversible` BOOLEAN NOT NULL DEFAULT false,
    `isReversed` BOOLEAN NOT NULL DEFAULT false,
    `reversedAt` DATETIME(3) NULL,
    `reversedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Safe` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` ENUM('DEBT', 'INCOME', 'EXPENSE', 'ASSETS', 'UNSPECIFIED') NOT NULL DEFAULT 'UNSPECIFIED',
    `balance` DOUBLE NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'EGP',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Safe_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `type` ENUM('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'FEE', 'PAYMENT') NOT NULL,
    `description` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `sourceId` VARCHAR(191) NULL,
    `targetId` VARCHAR(191) NULL,
    `traineeFeeId` INTEGER NULL,
    `traineePaymentId` INTEGER NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TraineeFee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `type` ENUM('TUITION', 'SERVICES', 'TRAINING', 'ADDITIONAL') NOT NULL,
    `academicYear` VARCHAR(191) NOT NULL,
    `allowMultipleApply` BOOLEAN NOT NULL DEFAULT false,
    `programId` INTEGER NOT NULL,
    `safeId` VARCHAR(191) NOT NULL,
    `isApplied` BOOLEAN NOT NULL DEFAULT false,
    `appliedAt` DATETIME(3) NULL,
    `appliedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TraineePayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'PARTIALLY_PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `feeId` INTEGER NOT NULL,
    `traineeId` INTEGER NOT NULL,
    `safeId` VARCHAR(191) NOT NULL,
    `paidAmount` DOUBLE NOT NULL DEFAULT 0,
    `paidAt` DATETIME(3) NULL,
    `paidById` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TraineeDocument` (
    `id` VARCHAR(191) NOT NULL,
    `traineeId` INTEGER NOT NULL,
    `documentType` ENUM('PERSONAL_PHOTO', 'ID_CARD_FRONT', 'ID_CARD_BACK', 'QUALIFICATION_FRONT', 'QUALIFICATION_BACK', 'EXPERIENCE_CERT', 'MINISTRY_CERT', 'PROFESSION_CARD', 'SKILL_CERT') NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `cloudinaryId` VARCHAR(191) NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uploadedById` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TraineeDocument_traineeId_documentType_key`(`traineeId`, `documentType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `conditions` JSON NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Permission_resource_action_key`(`resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,
    `granted` BOOLEAN NOT NULL DEFAULT true,
    `conditions` JSON NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `user_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `assigned_by` VARCHAR(191) NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `conditions` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_permissions` (
    `user_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,
    `granted` BOOLEAN NOT NULL DEFAULT true,
    `assigned_by` VARCHAR(191) NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `conditions` JSON NULL,
    `reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission_logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource_type` VARCHAR(191) NOT NULL,
    `resource_id` VARCHAR(191) NOT NULL,
    `old_value` JSON NULL,
    `new_value` JSON NULL,
    `reason` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketing_employees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `totalApplications` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `marketing_employees_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketing_targets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `targetAmount` INTEGER NOT NULL,
    `achievedAmount` INTEGER NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `setById` VARCHAR(191) NULL,
    `setAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `marketing_targets_employeeId_month_year_key`(`employeeId`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketing_applications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `applicantName` VARCHAR(191) NOT NULL,
    `applicantPhone` VARCHAR(191) NOT NULL,
    `applicantEmail` VARCHAR(191) NULL,
    `programInterest` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'CONTACTED', 'INTERESTED', 'ENROLLED', 'REJECTED', 'NO_RESPONSE') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `followUpDate` DATETIME(3) NULL,
    `convertedToTrainee` BOOLEAN NOT NULL DEFAULT false,
    `traineeId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `marketingEmployeeId` INTEGER NOT NULL,
    `traineeId` INTEGER NOT NULL,
    `type` ENUM('FIRST_CONTACT', 'SECOND_CONTACT') NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `status` ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING',
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `paidBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_payouts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commissionId` INTEGER NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `fromSafeId` VARCHAR(191) NOT NULL,
    `toSafeId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trainee` ADD CONSTRAINT `Trainee_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `TrainingProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trainee` ADD CONSTRAINT `Trainee_marketingEmployeeId_fkey` FOREIGN KEY (`marketingEmployeeId`) REFERENCES `marketing_employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trainee` ADD CONSTRAINT `Trainee_firstContactEmployeeId_fkey` FOREIGN KEY (`firstContactEmployeeId`) REFERENCES `marketing_employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trainee` ADD CONSTRAINT `Trainee_secondContactEmployeeId_fkey` FOREIGN KEY (`secondContactEmployeeId`) REFERENCES `marketing_employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_contents` ADD CONSTRAINT `training_contents_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `TrainingProgram`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_contents` ADD CONSTRAINT `training_contents_instructorId_fkey` FOREIGN KEY (`instructorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_contents` ADD CONSTRAINT `training_contents_theoryAttendanceRecorderId_fkey` FOREIGN KEY (`theoryAttendanceRecorderId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_contents` ADD CONSTRAINT `training_contents_practicalAttendanceRecorderId_fkey` FOREIGN KEY (`practicalAttendanceRecorderId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `training_contents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_options` ADD CONSTRAINT `question_options_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `training_contents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_traineeId_fkey` FOREIGN KEY (`traineeId`) REFERENCES `Trainee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lectures` ADD CONSTRAINT `lectures_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `training_contents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `id_card_prints` ADD CONSTRAINT `id_card_prints_traineeId_fkey` FOREIGN KEY (`traineeId`) REFERENCES `Trainee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `id_card_prints` ADD CONSTRAINT `id_card_prints_printedById_fkey` FOREIGN KEY (`printedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `Safe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `Safe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_traineeFeeId_fkey` FOREIGN KEY (`traineeFeeId`) REFERENCES `TraineeFee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_traineePaymentId_fkey` FOREIGN KEY (`traineePaymentId`) REFERENCES `TraineePayment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TraineeFee` ADD CONSTRAINT `TraineeFee_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `TrainingProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TraineeFee` ADD CONSTRAINT `TraineeFee_safeId_fkey` FOREIGN KEY (`safeId`) REFERENCES `Safe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TraineePayment` ADD CONSTRAINT `TraineePayment_feeId_fkey` FOREIGN KEY (`feeId`) REFERENCES `TraineeFee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TraineePayment` ADD CONSTRAINT `TraineePayment_traineeId_fkey` FOREIGN KEY (`traineeId`) REFERENCES `Trainee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TraineePayment` ADD CONSTRAINT `TraineePayment_safeId_fkey` FOREIGN KEY (`safeId`) REFERENCES `Safe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TraineeDocument` ADD CONSTRAINT `TraineeDocument_traineeId_fkey` FOREIGN KEY (`traineeId`) REFERENCES `Trainee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TraineeDocument` ADD CONSTRAINT `TraineeDocument_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_logs` ADD CONSTRAINT `permission_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_logs` ADD CONSTRAINT `permission_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketing_targets` ADD CONSTRAINT `marketing_targets_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `marketing_employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketing_applications` ADD CONSTRAINT `marketing_applications_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `marketing_employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_marketingEmployeeId_fkey` FOREIGN KEY (`marketingEmployeeId`) REFERENCES `marketing_employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_traineeId_fkey` FOREIGN KEY (`traineeId`) REFERENCES `Trainee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_payouts` ADD CONSTRAINT `commission_payouts_commissionId_fkey` FOREIGN KEY (`commissionId`) REFERENCES `commissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_payouts` ADD CONSTRAINT `commission_payouts_fromSafeId_fkey` FOREIGN KEY (`fromSafeId`) REFERENCES `Safe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_payouts` ADD CONSTRAINT `commission_payouts_toSafeId_fkey` FOREIGN KEY (`toSafeId`) REFERENCES `Safe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
