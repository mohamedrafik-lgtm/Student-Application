'use client';

import { Suspense } from 'react';
import FinancialFlowReport from '../components/FinancialFlowReport';
import { FinancialPageGuard } from '@/components/permissions/PageGuard';

export default function IncomeReportPage() {
  return <FinancialPageGuard><Suspense fallback={<div className="p-8 text-center text-slate-500">جارٍ تحميل تقرير الإيرادات...</div>}><FinancialFlowReport kind="income" /></Suspense></FinancialPageGuard>;
}
