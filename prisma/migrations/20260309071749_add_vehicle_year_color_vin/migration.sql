-- DropIndex
DROP INDEX "ProductPriceHistory_product_id_idx";

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "color" VARCHAR(50),
ADD COLUMN     "vin" VARCHAR(50),
ADD COLUMN     "year" INTEGER;
