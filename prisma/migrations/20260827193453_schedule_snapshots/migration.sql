-- CreateTable
CREATE TABLE `ScheduleSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `operatorId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `fingerprint` TEXT NOT NULL,
    `fetchedAt` DATETIME(3) NOT NULL,
    `lastChangedAt` DATETIME(3) NULL,

    INDEX `ScheduleSnapshot_operatorId_idx`(`operatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
