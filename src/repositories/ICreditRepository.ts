import type {
  CalendarInstallmentItem,
  CreateCreditData,
  CreditEntity,
  CreditInstallmentEntity,
  CreditWithDetails,
  PayInstallmentData,
  UpdateCreditData,
} from '../models/index.js';
import type {
  CreditDirection,
  CreditStatus,
  InstallmentStatus,
} from '../types/enums.js';

export interface CreditFilters {
  userId: string;
  direction?: CreditDirection;
  status?: CreditStatus;
  currency?: string;
}

export interface CalendarFilters {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  direction?: CreditDirection;
  status?: InstallmentStatus;
}

export interface ICreditRepository {
  create(data: CreateCreditData): Promise<CreditWithDetails>;
  findByFilters(filters: CreditFilters): Promise<CreditWithDetails[]>;
  findByIdAndUserId(id: string, userId: string): Promise<CreditWithDetails | null>;
  update(id: string, data: UpdateCreditData): Promise<CreditWithDetails>;
  delete(id: string): Promise<void>;
  updateInstallmentDueDate(
    installmentId: string,
    dueDate: Date,
  ): Promise<CreditInstallmentEntity>;
  payInstallment(data: PayInstallmentData): Promise<CreditWithDetails>;
  unpayInstallment(installmentId: string): Promise<CreditWithDetails>;
  findCalendar(filters: CalendarFilters): Promise<CalendarInstallmentItem[]>;
  findCreditEntityByIdAndUserId(id: string, userId: string): Promise<CreditEntity | null>;
}
