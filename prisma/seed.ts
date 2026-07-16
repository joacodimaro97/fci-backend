import {
  PrismaClient,
  InvestmentType,
  MovementType,
  SimulationType,
  CashTransactionType,
  FundingType,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Iniciando seed...');

  await prisma.budget.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.cashTransfer.deleteMany();
  await prisma.accountFunding.deleteMany();
  await prisma.category.deleteMany();
  await prisma.cashAccount.deleteMany();
  await prisma.simulationResult.deleteMany();
  await prisma.simulation.deleteMany();
  await prisma.dailyPerformance.deleteMany();
  await prisma.movement.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 12);

  const user = await prisma.user.create({
    data: {
      name: 'Usuario Demo',
      email: 'demo@fci.com',
      password: hashedPassword,
    },
  });

  const account = await prisma.account.create({
    data: {
      userId: user.id,
      name: 'FCI Renta Fija',
      description: 'Fondo común de inversión en renta fija',
      currency: 'ARS',
      investmentType: InvestmentType.FCI,
    },
  });

  const movements = [
    { type: MovementType.DEPOSIT, amount: 50000, monthOffset: 0 },
    { type: MovementType.DEPOSIT, amount: 25000, monthOffset: 1 },
    { type: MovementType.DEPOSIT, amount: 30000, monthOffset: 2 },
    { type: MovementType.WITHDRAW, amount: 5000, monthOffset: 3 },
    { type: MovementType.DEPOSIT, amount: 20000, monthOffset: 4 },
    { type: MovementType.DEPOSIT, amount: 15000, monthOffset: 5 },
    { type: MovementType.DEPOSIT, amount: 10000, monthOffset: 6 },
    { type: MovementType.WITHDRAW, amount: 3000, monthOffset: 7 },
    { type: MovementType.DEPOSIT, amount: 25000, monthOffset: 8 },
    { type: MovementType.DEPOSIT, amount: 18000, monthOffset: 9 },
    { type: MovementType.DEPOSIT, amount: 12000, monthOffset: 10 },
    { type: MovementType.DEPOSIT, amount: 8000, monthOffset: 11 },
  ];

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  startDate.setHours(0, 0, 0, 0);

  for (const mov of movements) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + mov.monthOffset);
    await prisma.movement.create({
      data: {
        accountId: account.id,
        type: mov.type,
        amount: mov.amount,
        date,
        description: `${mov.type === MovementType.DEPOSIT ? 'Depósito' : 'Retiro'} mensual`,
      },
    });
  }

  let shareValue = 100000;
  const performances = [];

  for (let day = 0; day < 365; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    const dailyReturnPercent = Math.random() * 0.8 - 0.1;
    const dailyProfit = shareValue * (dailyReturnPercent / 100);
    shareValue += dailyProfit;

    performances.push({
      accountId: account.id,
      date,
      dailyReturnPercent: Math.round(dailyReturnPercent * 10000) / 10000,
      dailyProfit: Math.round(dailyProfit * 100) / 100,
      shareValue: Math.round(shareValue * 100) / 100,
      notes: day % 30 === 0 ? 'Cierre mensual' : undefined,
    });
  }

  await prisma.dailyPerformance.createMany({ data: performances });

  const simulations = [
    {
      name: 'Proyección Tasa Fija 10%',
      simulationType: SimulationType.FIXED,
      capitalInitial: 100000,
      monthlyContribution: 10000,
      annualRate: 0.1,
      years: 5,
    },
    {
      name: 'Histórico Real',
      simulationType: SimulationType.REAL_HISTORY,
      capitalInitial: 100000,
      monthlyContribution: 5000,
      annualRate: null,
      years: 3,
    },
    {
      name: 'Escenario Optimista',
      simulationType: SimulationType.OPTIMISTIC,
      capitalInitial: 50000,
      monthlyContribution: 8000,
      annualRate: null,
      years: 2,
    },
  ];

  for (const sim of simulations) {
    const totalDays = sim.years * 365;
    const results = [];
    let capital = sim.capitalInitial;
    const dailyRate = sim.annualRate ? Math.pow(1 + sim.annualRate, 1 / 365) - 1 : 0.001;

    for (let day = 1; day <= Math.min(totalDays, 30); day++) {
      const rate =
        sim.simulationType === SimulationType.OPTIMISTIC
          ? 0.001 + Math.random() * 0.002
          : dailyRate;
      const profit = capital * rate;
      capital += profit;
      results.push({
        day,
        capital: Math.round(capital * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        dailyRate: rate,
      });
    }

    await prisma.simulation.create({
      data: {
        accountId: account.id,
        name: sim.name,
        simulationType: sim.simulationType,
        capitalInitial: sim.capitalInitial,
        monthlyContribution: sim.monthlyContribution,
        annualRate: sim.annualRate,
        years: sim.years,
        results: { create: results },
      },
    });
  }

  const cashAccount = await prisma.cashAccount.create({
    data: {
      userId: user.id,
      name: 'Caja de ahorro',
      description: 'Cuenta principal de gastos e ingresos',
      currency: 'ARS',
      openingBalance: 80000,
    },
  });

  const walletAccount = await prisma.cashAccount.create({
    data: {
      userId: user.id,
      name: 'Billetera',
      description: 'Efectivo diario',
      currency: 'ARS',
      openingBalance: 15000,
    },
  });

  const rootCategories = [
    { name: 'Trabajo', type: CashTransactionType.INCOME, color: '#22c55e', icon: 'work' },
    { name: 'Extras', type: CashTransactionType.INCOME, color: '#86efac', icon: 'extra' },
    { name: 'Vivienda', type: CashTransactionType.EXPENSE, color: '#ef4444', icon: 'home' },
    { name: 'Alimentación', type: CashTransactionType.EXPENSE, color: '#f97316', icon: 'food' },
    { name: 'Movilidad', type: CashTransactionType.EXPENSE, color: '#eab308', icon: 'transport' },
    { name: 'Servicios', type: CashTransactionType.EXPENSE, color: '#3b82f6', icon: 'utilities' },
    { name: 'Ocio', type: CashTransactionType.EXPENSE, color: '#a855f7', icon: 'leisure' },
  ];

  const rootByName: Record<string, string> = {};
  for (const cat of rootCategories) {
    const created = await prisma.category.create({
      data: {
        userId: user.id,
        name: cat.name,
        type: cat.type,
        color: cat.color,
        icon: cat.icon,
        parentId: null,
      },
    });
    rootByName[cat.name] = created.id;
  }

  const subcategories = [
    { parent: 'Trabajo', name: 'Sueldo', type: CashTransactionType.INCOME, color: '#16a34a', icon: 'salary' },
    { parent: 'Trabajo', name: 'Freelance', type: CashTransactionType.INCOME, color: '#15803d', icon: 'freelance' },
    { parent: 'Extras', name: 'Reintegros', type: CashTransactionType.INCOME, color: '#4ade80', icon: 'refund' },
    { parent: 'Vivienda', name: 'Alquiler', type: CashTransactionType.EXPENSE, color: '#dc2626', icon: 'rent' },
    { parent: 'Alimentación', name: 'Supermercado', type: CashTransactionType.EXPENSE, color: '#ea580c', icon: 'groceries' },
    { parent: 'Movilidad', name: 'Transporte público', type: CashTransactionType.EXPENSE, color: '#ca8a04', icon: 'bus' },
    { parent: 'Movilidad', name: 'Uber', type: CashTransactionType.EXPENSE, color: '#a16207', icon: 'uber' },
    { parent: 'Servicios', name: 'Luz e internet', type: CashTransactionType.EXPENSE, color: '#2563eb', icon: 'power' },
    { parent: 'Servicios', name: 'Gas', type: CashTransactionType.EXPENSE, color: '#1d4ed8', icon: 'gas' },
    { parent: 'Ocio', name: 'Cenas', type: CashTransactionType.EXPENSE, color: '#9333ea', icon: 'dinner' },
    { parent: 'Ocio', name: 'Streaming', type: CashTransactionType.EXPENSE, color: '#7e22ce', icon: 'stream' },
  ];

  const subByName: Record<string, string> = {};
  for (const sub of subcategories) {
    const created = await prisma.category.create({
      data: {
        userId: user.id,
        parentId: rootByName[sub.parent],
        name: sub.name,
        type: sub.type,
        color: sub.color,
        icon: sub.icon,
      },
    });
    subByName[sub.name] = created.id;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const transactionsSeed = [
    { category: 'Sueldo', type: CashTransactionType.INCOME, amount: 850000, day: 1, description: 'Sueldo mensual' },
    { category: 'Freelance', type: CashTransactionType.INCOME, amount: 120000, day: 10, description: 'Proyecto web' },
    { category: 'Reintegros', type: CashTransactionType.INCOME, amount: 25000, day: 15, description: 'Reintegro' },
    { category: 'Alquiler', type: CashTransactionType.EXPENSE, amount: 280000, day: 1, description: 'Alquiler departamento' },
    { category: 'Supermercado', type: CashTransactionType.EXPENSE, amount: 45000, day: 3, description: 'Compras semanales' },
    { category: 'Supermercado', type: CashTransactionType.EXPENSE, amount: 38000, day: 10, description: 'Compras semanales' },
    { category: 'Supermercado', type: CashTransactionType.EXPENSE, amount: 52000, day: 17, description: 'Compras semanales' },
    { category: 'Transporte público', type: CashTransactionType.EXPENSE, amount: 15000, day: 5, description: 'Sube / NAFTA' },
    { category: 'Uber', type: CashTransactionType.EXPENSE, amount: 12000, day: 18, description: 'Uber' },
    { category: 'Luz e internet', type: CashTransactionType.EXPENSE, amount: 35000, day: 8, description: 'Luz + internet' },
    { category: 'Gas', type: CashTransactionType.EXPENSE, amount: 18000, day: 12, description: 'Gas' },
    { category: 'Cenas', type: CashTransactionType.EXPENSE, amount: 22000, day: 14, description: 'Cena' },
    { category: 'Streaming', type: CashTransactionType.EXPENSE, amount: 8000, day: 20, description: 'Streaming' },
    { category: 'Supermercado', type: CashTransactionType.EXPENSE, amount: 41000, day: 24, description: 'Compras' },
    { category: 'Freelance', type: CashTransactionType.INCOME, amount: 50000, day: 22, description: 'Bonus cliente' },
  ];

  for (const tx of transactionsSeed) {
    const date = new Date(year, month, Math.min(tx.day, 28), 0, 0, 0, 0);
    await prisma.transaction.create({
      data: {
        cashAccountId: cashAccount.id,
        categoryId: subByName[tx.category]!,
        type: tx.type,
        amount: tx.amount,
        date,
        description: tx.description,
      },
    });
  }

  const transferOutCategory = await prisma.category.create({
    data: {
      userId: user.id,
      name: 'Transferencia saliente',
      type: CashTransactionType.EXPENSE,
      color: '#64748b',
      icon: 'transfer-out',
      parentId: null,
    },
  });

  const transferInCategory = await prisma.category.create({
    data: {
      userId: user.id,
      name: 'Transferencia entrante',
      type: CashTransactionType.INCOME,
      color: '#64748b',
      icon: 'transfer-in',
      parentId: null,
    },
  });

  const transferDate = new Date(year, month, 5, 0, 0, 0, 0);
  const transferAmount = 25000;
  const transfer = await prisma.cashTransfer.create({
    data: {
      userId: user.id,
      fromCashAccountId: cashAccount.id,
      toCashAccountId: walletAccount.id,
      amount: transferAmount,
      date: transferDate,
      description: 'Movimiento a billetera',
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        cashAccountId: cashAccount.id,
        categoryId: transferOutCategory.id,
        type: CashTransactionType.EXPENSE,
        amount: transferAmount,
        date: transferDate,
        description: 'Movimiento a billetera',
        transferId: transfer.id,
      },
      {
        cashAccountId: walletAccount.id,
        categoryId: transferInCategory.id,
        type: CashTransactionType.INCOME,
        amount: transferAmount,
        date: transferDate,
        description: 'Movimiento a billetera',
        transferId: transfer.id,
      },
    ],
  });

  const depositToInvestmentCategory = await prisma.category.create({
    data: {
      userId: user.id,
      name: 'Depósito a inversión',
      type: CashTransactionType.EXPENSE,
      color: '#475569',
      icon: 'investment-deposit',
      parentId: null,
    },
  });

  const fundingDate = new Date(year, month, 2, 0, 0, 0, 0);
  const fundingAmount = 100000;
  const funding = await prisma.accountFunding.create({
    data: {
      userId: user.id,
      type: FundingType.CASH_TO_INVESTMENT,
      cashAccountId: cashAccount.id,
      investmentAccountId: account.id,
      amount: fundingAmount,
      date: fundingDate,
      description: 'Aporte mensual al FCI',
    },
  });

  await prisma.transaction.create({
    data: {
      cashAccountId: cashAccount.id,
      categoryId: depositToInvestmentCategory.id,
      type: CashTransactionType.EXPENSE,
      amount: fundingAmount,
      date: fundingDate,
      description: 'Aporte mensual al FCI',
      fundingId: funding.id,
    },
  });

  await prisma.movement.create({
    data: {
      accountId: account.id,
      type: MovementType.DEPOSIT,
      amount: fundingAmount,
      date: fundingDate,
      description: 'Aporte mensual al FCI',
      fundingId: funding.id,
    },
  });

  const budgetStart = new Date(year, month, 1, 0, 0, 0, 0);
  const budgetEnd = new Date(year, month + 1, 0, 0, 0, 0, 0);
  await prisma.budget.create({
    data: {
      userId: user.id,
      cashAccountId: cashAccount.id,
      name: 'Gastos del mes',
      amount: 300000,
      startDate: budgetStart,
      endDate: budgetEnd,
    },
  });

  await prisma.budget.create({
    data: {
      userId: user.id,
      cashAccountId: null,
      name: 'Presupuesto alimentación',
      amount: 150000,
      startDate: budgetStart,
      endDate: budgetEnd,
      categories: {
        create: [{ categoryId: rootByName['Alimentación']! }],
      },
    },
  });

  console.log('Seed completado:');
  console.log(`  Usuario: demo@fci.com / password123`);
  console.log(`  Cuenta inversión: ${account.name}`);
  console.log(`  Movimientos: 12`);
  console.log(`  Rendimientos diarios: 365`);
  console.log(`  Simulaciones: 3`);
  console.log(`  Cuenta cash: ${cashAccount.name}`);
  console.log(`  Cuenta cash: ${walletAccount.name}`);
  console.log(`  Categorías raíz: ${rootCategories.length}`);
  console.log(`  Subcategorías: ${subcategories.length}`);
  console.log(`  Transacciones: ${transactionsSeed.length}`);
  console.log(`  Transferencias: 1`);
  console.log(`  Movimientos efectivo↔inversión: 1`);
  console.log(`  Presupuestos: 2`);
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
