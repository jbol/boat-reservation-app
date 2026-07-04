-- CreateTable
CREATE TABLE `Port` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nameEs` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Port_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Operator` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `homeUrl` VARCHAR(191) NOT NULL,
    `bookingUrl` VARCHAR(191) NOT NULL,
    `blurbEs` TEXT NULL,
    `blurbEn` TEXT NULL,
    `tier` VARCHAR(191) NOT NULL DEFAULT 'deeplink',
    `scheduleVerified` BOOLEAN NOT NULL DEFAULT false,
    `scheduleCheckedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Operator_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Route` (
    `id` VARCHAR(191) NOT NULL,
    `operatorId` VARCHAR(191) NOT NULL,
    `originPortId` VARCHAR(191) NOT NULL,
    `destinationEs` VARCHAR(191) NOT NULL DEFAULT 'Isla de Tabarca',
    `destinationEn` VARCHAR(191) NOT NULL DEFAULT 'Tabarca Island',
    `durationMin` INTEGER NOT NULL,
    `durationNoteEs` VARCHAR(191) NULL,
    `durationNoteEn` VARCHAR(191) NULL,
    `returnNoteEs` TEXT NULL,
    `returnNoteEn` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FareType` (
    `id` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `labelEs` VARCHAR(191) NOT NULL,
    `labelEn` VARCHAR(191) NOT NULL,
    `priceCents` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'EUR',
    `noteEs` VARCHAR(191) NULL,
    `noteEn` VARCHAR(191) NULL,

    UNIQUE INDEX `FareType_routeId_code_key`(`routeId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sailing` (
    `id` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NOT NULL,
    `dateKey` VARCHAR(10) NOT NULL,
    `departureTime` VARCHAR(5) NOT NULL,
    `status` ENUM('SCHEDULED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',

    INDEX `Sailing_dateKey_idx`(`dateKey`),
    UNIQUE INDEX `Sailing_routeId_dateKey_departureTime_key`(`routeId`, `dateKey`, `departureTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'es',

    INDEX `Customer_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reservation` (
    `id` VARCHAR(191) NOT NULL,
    `sailingId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `adults` INTEGER NOT NULL DEFAULT 1,
    `children` INTEGER NOT NULL DEFAULT 0,
    `infants` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('INTENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'INTENT',
    `source` ENUM('HANDOFF', 'MANUAL') NOT NULL DEFAULT 'HANDOFF',
    `externalRef` VARCHAR(191) NULL,
    `estTotalCents` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Reservation_status_idx`(`status`),
    INDEX `Reservation_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Route` ADD CONSTRAINT `Route_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `Operator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Route` ADD CONSTRAINT `Route_originPortId_fkey` FOREIGN KEY (`originPortId`) REFERENCES `Port`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FareType` ADD CONSTRAINT `FareType_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `Route`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sailing` ADD CONSTRAINT `Sailing_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `Route`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_sailingId_fkey` FOREIGN KEY (`sailingId`) REFERENCES `Sailing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
