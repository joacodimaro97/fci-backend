-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "relatedExpenseId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_relatedExpenseId_idx" ON "Transaction"("relatedExpenseId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_relatedExpenseId_fkey" FOREIGN KEY ("relatedExpenseId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
