import { fetchAPI } from '@/lib/api';

export interface FinancialDashboardFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface IncomeAnalysisFilters {
  dateFrom?: string;
  dateTo?: string;
  safeId?: string;
}

export interface TransactionsSummaryFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}

// الحصول على تقرير لوحة التحكم المالية
export async function getFinancialDashboard(filters: FinancialDashboardFilters = {}) {
  const params = new URLSearchParams();
  
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  
  return fetchAPI(`/finances/reports/dashboard?${params.toString()}`);
}

// تحليل الدخل حسب الخزائن والفترة
export async function getIncomeAnalysis(filters: IncomeAnalysisFilters = {}) {
  const params = new URLSearchParams();
  
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.safeId) params.append('safeId', filters.safeId);
  
  return fetchAPI(`/finances/reports/income-analysis?${params.toString()}`);
}

// ملخص المعاملات المالية
export async function getTransactionsSummary(filters: TransactionsSummaryFilters = {}) {
  const params = new URLSearchParams();
  
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.type) params.append('type', filters.type);
  
  return fetchAPI(`/finances/reports/transactions-summary?${params.toString()}`);
}

// تصدير التقارير (يمكن إضافتها لاحقاً)
export async function exportFinancialReport(type: 'dashboard' | 'income' | 'transactions', filters: any = {}) {
  const params = new URLSearchParams(filters);
  
  // TODO: تنفيذ تصدير التقارير
  return fetchAPI(`/finances/reports/${type}/export?${params.toString()}`);
}
