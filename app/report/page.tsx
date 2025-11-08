'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ExpenseReport } from '@/lib/types';
import SummaryCards from '@/components/summary/SummaryCards';
import IncomeExpenseBar from '@/components/charts/IncomeExpenseBar';
import CategoryPies from '@/components/charts/CategoryPies';
import TopDonors from '@/components/charts/TopDonors';
import TopRestaurants from '@/components/charts/TopRestaurants';
import TransactionTable from '@/components/table/TransactionTable';
import SectionNav from '@/components/navigation/SectionNav';
import ReportChat from '@/components/report/ReportChat';
import { ArrowLeft } from 'lucide-react';

function ReportContent() {
  const router = useRouter();
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Check sessionStorage for report data
      const sessionData = sessionStorage.getItem('currentReport');
      if (sessionData) {
        const report = JSON.parse(sessionData) as ExpenseReport;
        setReport(report);
        return;
      }

      // No data source found
      setError('レポートデータが見つかりません');
    } catch (err) {
      console.error('Report loading error:', err);
      setError('レポートデータの解析に失敗しました');
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 py-12 px-4">
        <div className="max-w-[1032px] mx-auto text-center">
          <div className="bg-white rounded-[22px] border border-black p-12">
            <h1 className="text-2xl font-bold text-text-primary mb-4">エラー</h1>
            <p className="text-text-secondary mb-8">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-primary-500 text-white rounded-[24px] hover:bg-primary-600 transition-colors font-medium"
            >
              トップページに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-neutral-50 py-12 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b-2 border-neutral-200 shadow-sm">
        <div className="max-w-[1032px] mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back Button and Politician Info */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1.5 text-sm text-text-primary hover:text-primary-600 transition-colors whitespace-nowrap -ml-[30px] font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                戻る
              </button>

              <div className="flex items-baseline gap-3 ml-5">
                <h1 className="text-xl md:text-2xl font-bold text-text-primary whitespace-nowrap">
                  {report.politician.name}
                </h1>
                <p className="text-sm md:text-base text-text-secondary whitespace-nowrap">
                  {report.politician.organization} ({report.politician.fiscalYear}年度)
                </p>
              </div>
            </div>

            {/* Right: Section Navigation */}
            <div className="flex-1 min-w-0 flex justify-end">
              <SectionNav />
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="px-4 md:px-8 py-8">
        <div className="max-w-[1032px] mx-auto space-y-8">

          {/* Summary Cards */}
          <SummaryCards summary={report.summary} />

          {/* Income & Expense Section */}
          <div id="income-expense" className="scroll-mt-24 space-y-8">
            <IncomeExpenseBar summary={report.summary} />

            {/* Grid layout with Income Pie and Top Donors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <CategoryPies income={report.income} expenses={report.expenses} />
              </div>
              <div id="top-donors" className="scroll-mt-24">
                <TopDonors transactions={report.transactions} incomeCategories={report.income.categories} />
              </div>
            </div>
          </div>

          {/* Top Restaurants Section */}
          <div id="top-restaurants" className="scroll-mt-24">
            <TopRestaurants transactions={report.transactions} />
          </div>

          {/* Transaction Table Section */}
          <div id="transactions" className="scroll-mt-24">
            <TransactionTable transactions={report.transactions} />
          </div>
        </div>
      </div>

      {/* AI Chat - Only render when report is loaded */}
      {report && <ReportChat report={report} />}
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 py-12 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent" />
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
