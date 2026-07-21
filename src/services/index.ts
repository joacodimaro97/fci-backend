import {
  accountRepository,
  accountFundingRepository,
  budgetRepository,
  cashAccountRepository,
  cashTransferRepository,
  categoryRepository,
  creditRepository,
  movementRepository,
  performanceRepository,
  simulationRepository,
  transactionRepository,
  userRepository,
} from '../repositories/prisma/index.js';
import { AccountService } from './AccountService.js';
import { AuthService } from './AuthService.js';
import { CashAccountService } from './CashAccountService.js';
import { CashSummaryService } from './CashSummaryService.js';
import { CategoryService } from './CategoryService.js';
import { CreditService } from './CreditService.js';
import { MovementService } from './MovementService.js';
import { PerformanceService } from './PerformanceService.js';
import { SimulationService } from './SimulationService.js';
import { StatisticsService } from './StatisticsService.js';
import { BudgetService } from './BudgetService.js';
import { FundingService } from './FundingService.js';
import { TransactionService } from './TransactionService.js';
import { TransferService } from './TransferService.js';
import { TelegramService } from './TelegramService.js';

let signTokenFn: (payload: { sub: string; email: string }) => string = () => '';

export function setSignToken(fn: (payload: { sub: string; email: string }) => string): void {
  signTokenFn = fn;
}

export const authService = new AuthService(userRepository, (payload) => signTokenFn(payload));
export const accountService = new AccountService(accountRepository);
export const movementService = new MovementService(movementRepository, accountRepository);
export const performanceService = new PerformanceService(performanceRepository, accountRepository);
export const simulationService = new SimulationService(
  simulationRepository,
  accountRepository,
  performanceRepository,
);
export const statisticsService = new StatisticsService(
  performanceRepository,
  movementRepository,
  accountRepository,
);

export const cashAccountService = new CashAccountService(cashAccountRepository);
export const categoryService = new CategoryService(categoryRepository);
export const transactionService = new TransactionService(
  transactionRepository,
  cashAccountRepository,
  categoryRepository,
);
export const cashSummaryService = new CashSummaryService(
  transactionRepository,
  cashAccountRepository,
  categoryRepository,
);
export const transferService = new TransferService(
  cashTransferRepository,
  cashAccountRepository,
  categoryRepository,
);
export const fundingService = new FundingService(
  accountFundingRepository,
  cashAccountRepository,
  accountRepository,
  categoryRepository,
);
export const budgetService = new BudgetService(
  budgetRepository,
  cashAccountRepository,
  transactionRepository,
  categoryRepository,
);
export const creditService = new CreditService(
  creditRepository,
  cashAccountRepository,
  categoryRepository,
);
export const telegramService = new TelegramService(userRepository);
