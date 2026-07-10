-- CreateEnum
CREATE TYPE "FundingType" AS ENUM ('CASH_TO_INVESTMENT', 'INVESTMENT_TO_CASH');

-- AlterTable
ALTER TABLE "Movement" ADD COLUMN "fundingId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "fundingId" TEXT;

-- CreateTable
CREATE TABLE "AccountFunding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FundingType" NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "investmentAccountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountFunding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Movement_fundingId_idx" ON "Movement"("fundingId");

-- CreateIndex
CREATE INDEX "Transaction_fundingId_idx" ON "Transaction"("fundingId");

-- CreateIndex
CREATE INDEX "AccountFunding_userId_idx" ON "AccountFunding"("userId");

-- CreateIndex
CREATE INDEX "AccountFunding_cashAccountId_idx" ON "AccountFunding"("cashAccountId");

-- CreateIndex
CREATE INDEX "AccountFunding_investmentAccountId_idx" ON "AccountFunding"("investmentAccountId");

-- CreateIndex
CREATE INDEX "AccountFunding_date_idx" ON "AccountFunding"("date");

-- CreateIndex
CREATE INDEX "AccountFunding_type_idx" ON "AccountFunding"("type");

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_fundingId_fkey" FOREIGN KEY ("fundingId") REFERENCES "AccountFunding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fundingId_fkey" FOREIGN KEY ("fundingId") REFERENCES "AccountFunding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountFunding" ADD CONSTRAINT "AccountFunding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountFunding" ADD CONSTRAINT "AccountFunding_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountFunding" ADD CONSTRAINT "AccountFunding_investmentAccountId_fkey" FOREIGN KEY ("investmentAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
