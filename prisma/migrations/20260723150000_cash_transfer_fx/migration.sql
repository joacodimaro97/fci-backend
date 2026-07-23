-- AlterTable
ALTER TABLE "CashTransfer" ADD COLUMN "toAmount" DOUBLE PRECISION;
ALTER TABLE "CashTransfer" ADD COLUMN "exchangeRate" DOUBLE PRECISION;

-- Backfill existing same-currency transfers
UPDATE "CashTransfer" SET "toAmount" = "amount" WHERE "toAmount" IS NULL;

ALTER TABLE "CashTransfer" ALTER COLUMN "toAmount" SET NOT NULL;
