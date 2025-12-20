/*
  Warnings:

  - You are about to drop the column `authorId` on the `studies` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "studies" DROP CONSTRAINT "studies_authorId_fkey";

-- DropIndex
DROP INDEX "studies_authorId_idx";

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "accessExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "studies" DROP COLUMN "authorId",
ADD COLUMN     "author" TEXT;
