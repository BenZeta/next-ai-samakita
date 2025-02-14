/*
  Warnings:

  - You are about to alter the column `size` on the `Room` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "layout" JSONB,
ALTER COLUMN "size" SET DATA TYPE INTEGER;
