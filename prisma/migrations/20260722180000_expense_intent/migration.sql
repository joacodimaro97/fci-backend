-- CreateEnum
CREATE TYPE "ExpenseIntent" AS ENUM ('NECESIDAD', 'CUIDADO', 'GUSTO', 'IMPULSO', 'REVISAR');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "intent" "ExpenseIntent";

-- CreateIndex
CREATE INDEX "Transaction_intent_idx" ON "Transaction"("intent");
