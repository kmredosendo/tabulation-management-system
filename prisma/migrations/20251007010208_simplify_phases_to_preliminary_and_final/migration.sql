/*
  Warnings:

  - The values [QA] on the enum `score_phase` will be removed. If these variants are still used in the database, this will fail.
  - The values [QA] on the enum `score_phase` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `criteria` MODIFY `phase` ENUM('PRELIMINARY', 'FINAL') NOT NULL DEFAULT 'PRELIMINARY';

-- AlterTable
ALTER TABLE `score` MODIFY `phase` ENUM('PRELIMINARY', 'FINAL') NOT NULL DEFAULT 'PRELIMINARY';
