-- AlterTable
ALTER TABLE `tbl_post` ADD COLUMN `member_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `tbl_post_member_id_idx` ON `tbl_post`(`member_id`);

-- AddForeignKey
ALTER TABLE `tbl_post` ADD CONSTRAINT `tbl_post_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `tbl_member`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
