-- CreateTable
CREATE TABLE `tbl_member` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(50) NULL,
    `age` INTEGER NULL,
    `address` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `tbl_member_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
