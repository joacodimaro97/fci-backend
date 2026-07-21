-- CreateEnum
CREATE TYPE "CreditDirection" AS ENUM ('OWED_BY_ME', 'OWED_TO_ME');

-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "installmentId" TEXT;

-- CreateTable
CREATE TABLE "Credit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "counterparty" TEXT,
    "direction" "CreditDirection" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "principal" DOUBLE PRECISION NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installmentAmount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" "CreditStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultCashAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditInstallment" (
    "id" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "cashAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_installmentId_idx" ON "Transaction"("installmentId");

-- CreateIndex
CREATE INDEX "Credit_userId_idx" ON "Credit"("userId");

-- CreateIndex
CREATE INDEX "Credit_direction_idx" ON "Credit"("direction");

-- CreateIndex
CREATE INDEX "Credit_status_idx" ON "Credit"("status");

-- CreateIndex
CREATE INDEX "Credit_defaultCashAccountId_idx" ON "Credit"("defaultCashAccountId");

-- CreateIndex
CREATE INDEX "CreditInstallment_creditId_idx" ON "CreditInstallment"("creditId");

-- CreateIndex
CREATE INDEX "CreditInstallment_dueDate_idx" ON "CreditInstallment"("dueDate");

-- CreateIndex
CREATE INDEX "CreditInstallment_status_idx" ON "CreditInstallment"("status");

-- CreateIndex
CREATE INDEX "CreditInstallment_cashAccountId_idx" ON "CreditInstallment"("cashAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditInstallment_creditId_number_key" ON "CreditInstallment"("creditId", "number");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "CreditInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_defaultCashAccountId_fkey" FOREIGN KEY ("defaultCashAccountId") REFERENCES "CashAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditInstallment" ADD CONSTRAINT "CreditInstallment_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "Credit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditInstallment" ADD CONSTRAINT "CreditInstallment_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
