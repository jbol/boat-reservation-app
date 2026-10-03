-- CreateTable
CREATE TABLE `OutboundClick` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `operatorId` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `dateKey` VARCHAR(191) NULL,
    `fromPort` VARCHAR(191) NULL,
    `sailingId` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NOT NULL,
    `device` VARCHAR(191) NOT NULL,

    INDEX `OutboundClick_createdAt_idx`(`createdAt`),
    INDEX `OutboundClick_operatorId_createdAt_idx`(`operatorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageView` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `path` VARCHAR(191) NOT NULL,
    `fromPort` VARCHAR(191) NULL,
    `referrerHost` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NOT NULL,
    `device` VARCHAR(191) NOT NULL,
    `visitorHash` VARCHAR(191) NOT NULL,

    INDEX `PageView_createdAt_idx`(`createdAt`),
    INDEX `PageView_path_createdAt_idx`(`path`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
