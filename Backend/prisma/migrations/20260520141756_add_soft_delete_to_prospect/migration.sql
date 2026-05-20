-- AlterTable
ALTER TABLE `prospect` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Prospect_deletedAt_idx` ON `Prospect`(`deletedAt`);
