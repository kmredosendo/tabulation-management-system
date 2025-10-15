/*
  Warnings:

  - You are about to drop the column `manualTalentScoring` on the `event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `admin` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `createdBy` INTEGER NULL;

-- AlterTable
ALTER TABLE `event` DROP COLUMN `manualTalentScoring`;

-- AddForeignKey
ALTER TABLE `admin` ADD CONSTRAINT `admin_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
