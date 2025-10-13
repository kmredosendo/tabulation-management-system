-- AlterTable
ALTER TABLE `event` ADD COLUMN `finalistsCount` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `separateGenders` BOOLEAN NOT NULL DEFAULT false;
