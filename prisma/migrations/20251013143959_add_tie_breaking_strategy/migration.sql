-- CreateEnum for TieBreakingStrategy
CREATE TABLE IF NOT EXISTS `_TieBreakingStrategy_old` AS SELECT * FROM `event` WHERE 1=0;

-- Add the enum type and column
ALTER TABLE `event` ADD COLUMN `tieBreakingStrategy` ENUM('INCLUDE_TIES', 'TOTAL_SCORE', 'CONTESTANT_NUMBER', 'MANUAL_SELECTION') NOT NULL DEFAULT 'INCLUDE_TIES' AFTER `finalistsCount`;