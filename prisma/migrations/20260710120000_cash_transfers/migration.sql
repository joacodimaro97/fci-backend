-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "transferId" TEXT;

-- CreateTable
CREATE TABLE "CashTransfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromCashAccountId" TEXT NOT NULL,
    "toCashAccountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_transferId_idx" ON "Transaction"("transferId");

-- CreateIndex
CREATE INDEX "CashTransfer_userId_idx" ON "CashTransfer"("userId");

-- CreateIndex
CREATE INDEX "CashTransfer_fromCashAccountId_idx" ON "CashTransfer"("fromCashAccountId");

-- CreateIndex
CREATE INDEX "CashTransfer_toCashAccountId_idx" ON "CashTransfer"("toCashAccountId");

-- CreateIndex
CREATE INDEX "CashTransfer_date_idx" ON "CashTransfer"("date");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "CashTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransfer" ADD CONSTRAINT "CashTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransfer" ADD CONSTRAINT "CashTransfer_fromCashAccountId_fkey" FOREIGN KEY ("fromCashAccountId") REFERENCES "CashAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransfer" ADD CONSTRAINT "CashTransfer_toCashAccountId_fkey" FOREIGN KEY ("toCashAccountId") REFERENCES "CashAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
