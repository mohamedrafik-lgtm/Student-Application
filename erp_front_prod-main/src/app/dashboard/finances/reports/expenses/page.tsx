'use client';

import { Suspense } from 'react';
import FinancialFlowReport from '../components/FinancialFlowReport';
import { FinancialPageGuard } from '@/components/permissions/PageGuard';

export default function ExpensesReportPage() {
  return <FinancialPageGuard><Suspense fallback={<div className="p-8 text-center text-slate-500">جارٍ تحميل تقرير المصروفات...</div>}><FinancialFlowReport kind="expense" /></Suspense></FinancialPageGuard>;
}
