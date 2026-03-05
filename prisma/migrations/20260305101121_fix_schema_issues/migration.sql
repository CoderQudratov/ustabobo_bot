/*
  Warnings:

  - You are about to drop the column `pin_code` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "balance_due" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "pin_code",
ADD COLUMN     "pin_code_hash" TEXT;
