import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CalendarInstallmentItem,
  CreateCreditData,
  CreditAccountInfo,
  CreditEntity,
  CreditInstallmentEntity,
  CreditInstallmentWithMeta,
  CreditTotals,
  CreditWithDetails,
  PayInstallmentData,
  UpdateCreditData,
} from '../../models/index.js';
import { CreditStatus, InstallmentStatus } from '../../types/enums.js';
import { startOfDay, todayCalendarDate } from '../../utils/index.js';
import type {
  CalendarFilters,
  CreditFilters,
  ICreditRepository,
} from '../ICreditRepository.js';

const cashAccountSelect = { id: true, name: true, currency: true } as const;

type CreditRow = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  counterparty: string | null;
  direction: CreditWithDetails['direction'];
  currency: string;
  principal: number;
  installmentCount: number;
  installmentAmount: number;
  startDate: Date;
  status: CreditWithDetails['status'];
  defaultCashAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
  defaultCashAccount: CreditAccountInfo | null;
  installments: Array<{
    id: string;
    creditId: string;
    number: number;
    dueDate: Date;
    amount: number;
    status: CreditInstallmentWithMeta['status'];
    paidAt: Date | null;
    cashAccountId: string | null;
    createdAt: Date;
    updatedAt: Date;
    transactions: Array<{ id: string }>;
  }>;
};

export class PrismaCreditRepository implements ICreditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCreditData): Promise<CreditWithDetails> {
    const credit = await this.prisma.credit.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description,
        counterparty: data.counterparty,
        direction: data.direction,
        currency: data.currency,
        principal: data.principal,
        installmentCount: data.installmentCount,
        installmentAmount: data.installmentAmount,
        startDate: data.startDate,
        defaultCashAccountId: data.defaultCashAccountId,
        installments: {
          create: data.installments.map((item) => ({
            number: item.number,
            dueDate: item.dueDate,
            amount: item.amount,
          })),
        },
      },
      include: this.detailInclude(),
    });

    return this.mapToDetails(credit);
  }

  async findByFilters(filters: CreditFilters): Promise<CreditWithDetails[]> {
    const where: Prisma.CreditWhereInput = { userId: filters.userId };
    if (filters.direction) where.direction = filters.direction;
    if (filters.status) where.status = filters.status;
    if (filters.currency) where.currency = filters.currency;

    const credits = await this.prisma.credit.findMany({
      where,
      include: this.detailInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return credits.map((credit) => this.mapToDetails(credit));
  }

  async findByIdAndUserId(id: string, userId: string): Promise<CreditWithDetails | null> {
    const credit = await this.prisma.credit.findFirst({
      where: { id, userId },
      include: this.detailInclude(),
    });
    return credit ? this.mapToDetails(credit) : null;
  }

  async findCreditEntityByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<CreditEntity | null> {
    return this.prisma.credit.findFirst({ where: { id, userId } });
  }

  async update(id: string, data: UpdateCreditData): Promise<CreditWithDetails> {
    const credit = await this.prisma.credit.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        counterparty: data.counterparty,
        defaultCashAccountId: data.defaultCashAccountId,
        status: data.status,
      },
      include: this.detailInclude(),
    });
    return this.mapToDetails(credit);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.credit.delete({ where: { id } });
  }

  async updateInstallmentDueDate(
    installmentId: string,
    dueDate: Date,
  ): Promise<CreditInstallmentEntity> {
    return this.prisma.creditInstallment.update({
      where: { id: installmentId },
      data: { dueDate },
    });
  }

  async payInstallment(data: PayInstallmentData): Promise<CreditWithDetails> {
    const result = await this.prisma.$transaction(async (tx) => {
      const installment = await tx.creditInstallment.findUnique({
        where: { id: data.installmentId },
        include: { credit: true },
      });
      if (!installment) {
        throw new Error('INSTALLMENT_NOT_FOUND');
      }

      await tx.creditInstallment.update({
        where: { id: data.installmentId },
        data: {
          status: InstallmentStatus.PAID,
          paidAt: data.date,
          cashAccountId: data.cashAccountId,
        },
      });

      const description =
        data.description ??
        `Cuota ${installment.number}/${installment.credit.installmentCount} — ${installment.credit.name}`;

      await tx.transaction.create({
        data: {
          cashAccountId: data.cashAccountId,
          categoryId: data.categoryId,
          type: data.cashTransactionType,
          amount: installment.amount,
          date: data.date,
          description,
          installmentId: data.installmentId,
        },
      });

      const pendingLeft = await tx.creditInstallment.count({
        where: {
          creditId: installment.creditId,
          status: InstallmentStatus.PENDING,
        },
      });

      if (pendingLeft === 0 && installment.credit.status === CreditStatus.ACTIVE) {
        await tx.credit.update({
          where: { id: installment.creditId },
          data: { status: CreditStatus.COMPLETED },
        });
      }

      return installment.creditId;
    });

    const credit = await this.prisma.credit.findUniqueOrThrow({
      where: { id: result },
      include: this.detailInclude(),
    });
    return this.mapToDetails(credit);
  }

  async unpayInstallment(installmentId: string): Promise<CreditWithDetails> {
    const result = await this.prisma.$transaction(async (tx) => {
      const installment = await tx.creditInstallment.findUnique({
        where: { id: installmentId },
      });
      if (!installment) {
        throw new Error('INSTALLMENT_NOT_FOUND');
      }

      await tx.transaction.deleteMany({ where: { installmentId } });

      await tx.creditInstallment.update({
        where: { id: installmentId },
        data: {
          status: InstallmentStatus.PENDING,
          paidAt: null,
          cashAccountId: null,
        },
      });

      await tx.credit.update({
        where: { id: installment.creditId },
        data: { status: CreditStatus.ACTIVE },
      });

      return installment.creditId;
    });

    const credit = await this.prisma.credit.findUniqueOrThrow({
      where: { id: result },
      include: this.detailInclude(),
    });
    return this.mapToDetails(credit);
  }

  async findCalendar(filters: CalendarFilters): Promise<CalendarInstallmentItem[]> {
    const where: Prisma.CreditInstallmentWhereInput = {
      credit: {
        userId: filters.userId,
        ...(filters.direction ? { direction: filters.direction } : {}),
      },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.dueDate = {};
      if (filters.startDate) where.dueDate.gte = filters.startDate;
      if (filters.endDate) where.dueDate.lte = filters.endDate;
    }

    const rows = await this.prisma.creditInstallment.findMany({
      where,
      include: {
        credit: {
          select: {
            id: true,
            name: true,
            counterparty: true,
            direction: true,
            currency: true,
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { number: 'asc' }],
    });

    const today = startOfDay(todayCalendarDate());

    return rows.map((row) => ({
      installmentId: row.id,
      creditId: row.credit.id,
      creditName: row.credit.name,
      counterparty: row.credit.counterparty,
      direction: row.credit.direction,
      currency: row.credit.currency,
      number: row.number,
      dueDate: row.dueDate,
      amount: row.amount,
      status: row.status,
      paidAt: row.paidAt,
      overdue:
        row.status === InstallmentStatus.PENDING && startOfDay(row.dueDate) < today,
    }));
  }

  private detailInclude() {
    return {
      defaultCashAccount: { select: cashAccountSelect },
      installments: {
        include: { transactions: { select: { id: true } } },
        orderBy: { number: 'asc' as const },
      },
    };
  }

  private mapToDetails(credit: CreditRow): CreditWithDetails {
    const today = startOfDay(todayCalendarDate());
    const installments: CreditInstallmentWithMeta[] = credit.installments.map((item) => ({
      id: item.id,
      creditId: item.creditId,
      number: item.number,
      dueDate: item.dueDate,
      amount: item.amount,
      status: item.status,
      paidAt: item.paidAt,
      cashAccountId: item.cashAccountId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      overdue:
        item.status === InstallmentStatus.PENDING && startOfDay(item.dueDate) < today,
      transactionId: item.transactions[0]?.id ?? null,
    }));

    return {
      id: credit.id,
      userId: credit.userId,
      name: credit.name,
      description: credit.description,
      counterparty: credit.counterparty,
      direction: credit.direction,
      currency: credit.currency,
      principal: credit.principal,
      installmentCount: credit.installmentCount,
      installmentAmount: credit.installmentAmount,
      startDate: credit.startDate,
      status: credit.status,
      defaultCashAccountId: credit.defaultCashAccountId,
      createdAt: credit.createdAt,
      updatedAt: credit.updatedAt,
      defaultCashAccount: credit.defaultCashAccount,
      installments,
      totals: this.buildTotals(installments),
    };
  }

  private buildTotals(installments: CreditInstallmentWithMeta[]): CreditTotals {
    let paidAmount = 0;
    let pendingAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let nextDueDate: Date | null = null;

    for (const item of installments) {
      if (item.status === InstallmentStatus.PAID) {
        paidAmount += item.amount;
        paidCount += 1;
        continue;
      }

      pendingAmount += item.amount;
      pendingCount += 1;
      if (item.overdue) {
        overdueAmount += item.amount;
        overdueCount += 1;
      }
      if (!nextDueDate || item.dueDate < nextDueDate) {
        nextDueDate = item.dueDate;
      }
    }

    return {
      paidAmount,
      pendingAmount,
      paidCount,
      pendingCount,
      nextDueDate,
      overdueAmount,
      overdueCount,
    };
  }
}
