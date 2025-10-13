-- AlterTable
ALTER TABLE `event` ALTER COLUMN `finalistsCount` DROP DEFAULT,
    MODIFY `hasTwoPhases` BOOLEAN NOT NULL DEFAULT false;
