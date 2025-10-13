/*
  Warnings:

  - You are about to drop the column `locked` on the `judge` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `judge` DROP COLUMN `locked`,
    ADD COLUMN `lockedFinal` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lockedPreliminary` BOOLEAN NOT NULL DEFAULT false;
