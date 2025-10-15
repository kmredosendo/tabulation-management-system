/*
  Warnings:

  - You are about to drop the `_TieBreakingStrategy_old` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `event` ADD COLUMN `manualTalentScoring` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `finalistsCount` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `_TieBreakingStrategy_old`;

-- CreateTable
CREATE TABLE `manual_finalist_selection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `contestantId` INTEGER NOT NULL,
    `selectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `manual_finalist_selection_eventId_contestantId_key`(`eventId`, `contestantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `manual_finalist_selection` ADD CONSTRAINT `manual_finalist_selection_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manual_finalist_selection` ADD CONSTRAINT `manual_finalist_selection_contestantId_fkey` FOREIGN KEY (`contestantId`) REFERENCES `contestant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
