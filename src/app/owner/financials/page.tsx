'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import TimeframeSelector from '@/components/ui/TimeframeSelector';
import { Timeframe } from '@/lib/timeframe';
import { formatCurrency, formatDateIST } from '@/lib/format';
import { TrendingUp, Banknote, CreditCard, Factory, MoveUpRight, ArrowUpRight, Clock, RotateCcw, Download } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

import { useQuery } from '@tanstack/react-query';

export default function FinancialsDashboard() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');

  const { data: queryData, isLoading: loading, error } = useQuery({
    queryKey: ['financials', timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/owner/financials?timeframe=${timeframe}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      return json.data;
    },
    staleTime: 0, // Fresh metrics loaded on every view/navigation
  });

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['recentPayments'],
    queryFn: async () => {
      const res = await fetch('/api/manager/payments');
      if (!res.ok) throw new Error('Failed to fetch payments');
      const json = await res.json();
      return json.payments;
    },
    staleTime: 0,
  });

  const [activeTab, setActiveTab] = useState<'analytics' | 'pl' | 'bs'>('analytics');

  const data = queryData;

  const handleExportPL = () => {
    if (!data || !data.financialStatements) return;
    const pl = data.financialStatements.pl;
    const exportData = [
      { 'Account Type': 'Operating Revenue', 'Line Item': 'Sales Revenue', 'Amount (₹)': Number(pl.salesRevenue) },
      { 'Account Type': 'Operating Revenue', 'Line Item': 'Scrap Revenue', 'Amount (₹)': Number(pl.scrapRevenue) },
      { 'Account Type': 'Operating Revenue', 'Line Item': 'Total Operating Revenue', 'Amount (₹)': Number(pl.totalRevenue) },
      { 'Account Type': 'Cost of Goods Sold', 'Line Item': 'Direct Material Cost (COGS)', 'Amount (₹)': Number(pl.cogs) },
      { 'Account Type': 'Cost of Goods Sold', 'Line Item': 'Total Cost of Goods Sold', 'Amount (₹)': Number(pl.cogs) },
      { 'Account Type': 'Gross Margin', 'Line Item': 'Gross Profit', 'Amount (₹)': Number(pl.grossProfit) },
      { 'Account Type': 'Operating Expenses', 'Line Item': 'Factory & Administrative Expenses', 'Amount (₹)': Number(pl.operatingExpenses) },
      { 'Account Type': 'Operating Expenses', 'Line Item': 'Total Operating Expenses', 'Amount (₹)': Number(pl.operatingExpenses) },
      { 'Account Type': 'Net Income', 'Line Item': 'Net Profit', 'Amount (₹)': Number(pl.netProfit) }
    ];
    import('@/lib/export/excel').then(({ exportToExcel }) => {
      exportToExcel(exportData, `Profit_Loss_Statement_${timeframe}`);
    });
  };

  const handleExportBS = () => {
    if (!data || !data.financialStatements) return;
    const bs = data.financialStatements.bs;
    const exportData = [
      { 'Section': 'Assets', 'Line Item': 'Cash & Bank Balance', 'Amount (₹)': Number(bs.cashBank) },
      { 'Section': 'Assets', 'Line Item': 'Accounts Receivable (AR)', 'Amount (₹)': Number(bs.accountsReceivable) },
      { 'Section': 'Assets', 'Line Item': 'Inventories (FIFO Valuation)', 'Amount (₹)': Number(bs.inventory) },
      { 'Section': 'Assets', 'Line Item': 'Employee Advances', 'Amount (₹)': Number(bs.employeeAdvances) },
      { 'Section': 'Assets', 'Line Item': 'Total Assets', 'Amount (₹)': Number(bs.totalAssets) },
      { 'Section': 'Liabilities', 'Line Item': 'Accounts Payable (AP)', 'Amount (₹)': Number(bs.accountsPayable) },
      { 'Section': 'Liabilities', 'Line Item': 'Total Liabilities', 'Amount (₹)': Number(bs.totalLiabilities) },
      { 'Section': 'Equity', 'Line Item': 'Retained Earnings', 'Amount (₹)': Number(bs.retainedEarnings) },
      { 'Section': 'Equity', 'Line Item': 'Total Owner Equity', 'Amount (₹)': Number(bs.retainedEarnings) },
      { 'Section': 'Equity', 'Line Item': 'Total Liabilities & Equity', 'Amount (₹)': Number(bs.totalLiabilities + bs.retainedEarnings) }
    ];
    import('@/lib/export/excel').then(({ exportToExcel }) => {
      exportToExcel(exportData, 'Balance_Sheet_Statement');
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
        <span className="text-red-500">Financial</span> & Production Overview
      </h2>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-1.5 rounded font-bold text-sm transition-all ${activeTab === 'analytics' ? 'bg-red-500 text-white shadow' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}
          >
            Analytics & Charts
          </button>
          <button
            onClick={() => setActiveTab('pl')}
            className={`px-4 py-1.5 rounded font-bold text-sm transition-all ${activeTab === 'pl' ? 'bg-red-500 text-white shadow' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}
          >
            Profit & Loss (P&L)
          </button>
          <button
            onClick={() => setActiveTab('bs')}
            className={`px-4 py-1.5 rounded font-bold text-sm transition-all ${activeTab === 'bs' ? 'bg-red-500 text-white shadow' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}
          >
            Balance Sheet
          </button>
        </div>
      </div>

      {!loading && data && activeTab === 'analytics' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
             <div className="card border-t-2 border-t-green-500 bg-gradient-to-b from-green-950/20 to-transparent">
               <div className="text-gray-400 text-xs mb-1 flex items-center gap-1"><Banknote size={14}/> Revenue</div>
               <div className="text-2xl font-bold text-white">{formatCurrency(data.metrics.totalRevenue)}</div>
             </div>
             <div className="card border-t-2 border-t-blue-500 bg-gradient-to-b from-blue-950/20 to-transparent">
               <div className="text-gray-400 text-xs mb-1 flex items-center gap-1"><TrendingUp size={14}/> Gross Profit</div>
               <div className="text-2xl font-bold text-white">{formatCurrency(data.metrics.totalGrossProfit)}</div>
             </div>
             <div className="card border-t-2 border-t-orange-500 bg-gradient-to-b from-orange-950/20 to-transparent">
               <div className="text-gray-400 text-xs mb-1 flex items-center gap-1"><Factory size={14}/> Expenses</div>
               <div className="text-2xl font-bold text-white">{formatCurrency(data.metrics.totalExpenses)}</div>
             </div>
             <div className="card border-t-2 border-t-purple-500 bg-gradient-to-b from-purple-950/20 to-transparent">
               <div className="text-gray-400 text-xs mb-1 flex items-center gap-1"><ArrowUpRight size={14}/> Net Profit</div>
               <div className="text-2xl font-bold text-white">{formatCurrency(data.metrics.totalNetProfit)}</div>
             </div>
             <div className="card border-t-2 border-t-red-500 bg-gradient-to-b from-red-950/20 to-transparent">
               <div className="text-gray-400 text-xs mb-1 flex items-center gap-1">Net Margin/Ton</div>
               <div className="text-2xl font-bold text-white">{formatCurrency(data.metrics.avgProfitPerTon)}<span className="text-xs text-gray-500 font-normal">/T</span></div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card border-l-4 border-l-green-500">
              <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><MoveUpRight size={16}/> Receivables (Customers Owe Us)</div>
              <div className="text-3xl font-bold text-white">{formatCurrency(data.totalReceivables)}</div>
              <p className="text-xs text-gray-500 mt-1">Current Balance</p>
            </div>
            <div className="card border-l-4 border-l-red-500">
              <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><CreditCard size={16}/> Payables (We Owe Suppliers)</div>
              <div className="text-3xl font-bold text-white">{formatCurrency(data.totalPayables)}</div>
              <p className="text-xs text-gray-500 mt-1">Current Balance</p>
            </div>
            <div className="card border-l-4 border-l-blue-500 bg-blue-950/10">
              <div className="text-gray-400 text-sm mb-1">Global Net Position</div>
              <div className="text-3xl font-bold text-blue-400">
                {data.netAmount < 0 ? '-' : ''}{formatCurrency(Math.abs(data.netAmount))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Receivables - Payables</p>
            </div>
            <div className="card border-l-4 border-l-emerald-500 bg-emerald-950/10">
              <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Banknote size={16}/> Cash In Hand</div>
              <div className="text-3xl font-bold text-emerald-400">
                {data.cashInHand < 0 ? '-' : ''}{formatCurrency(Math.abs(data.cashInHand))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Total In - Total Out</p>
            </div>
          </div>
        </>
      )}

      {loading ? (
        <div className="text-gray-400">Loading comprehensive financial charts...</div>
      ) : (
        <>
          <div className="card mb-8">
            <h3 className="text-lg text-gray-300 mb-4 font-bold flex items-center gap-2">
               <TrendingUp className="text-yellow-500" /> Copper Market Price Trend ({timeframe})
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="period" stroke="#a3a3a3" />
                  <YAxis stroke="#a3a3a3" tickFormatter={(value) => `₹${Number(value/1000).toFixed(0)}k`} domain={['auto', 'auto']} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }}
                    formatter={(value: any) => `₹ ${Number(value).toLocaleString('en-IN')} / Ton`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="CopperPrice" stroke="#eab308" strokeWidth={3} name="Avg Market Price (Per Ton)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <div className="card">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="text-blue-400" /> Global Customer Payments
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-[#1a1a1a] rounded border border-[#333]">
                      <div className="text-gray-400 text-sm mb-1">Average Wait</div>
                      <div className="text-2xl font-bold text-blue-400">{Number(data?.paymentAnalytics?.customers?.avgDays || 0).toFixed(1)} Days</div>
                   </div>
                   <div className="p-4 bg-[#1a1a1a] rounded border border-[#333]">
                      <div className="text-gray-400 text-sm mb-1">Slowest Payer</div>
                      <div className="text-2xl font-bold text-red-400">{Number(data?.paymentAnalytics?.customers?.slowestDays || 0).toFixed(1)} Days</div>
                   </div>
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">Based on {data?.paymentAnalytics?.customers?.completedOrders || 0} fully paid invoices</p>
             </div>

             <div className="card">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="text-purple-400" /> Global Supplier Payments
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-[#1a1a1a] rounded border border-[#333]">
                      <div className="text-gray-400 text-sm mb-1">Average Wait</div>
                      <div className="text-2xl font-bold text-purple-400">{Number(data?.paymentAnalytics?.suppliers?.avgDays || 0).toFixed(1)} Days</div>
                   </div>
                   <div className="p-4 bg-[#1a1a1a] rounded border border-[#333]">
                      <div className="text-gray-400 text-sm mb-1">Slowest Payer</div>
                      <div className="text-2xl font-bold text-red-400">{Number(data?.paymentAnalytics?.suppliers?.slowestDays || 0).toFixed(1)} Days</div>
                   </div>
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">Based on {data?.paymentAnalytics?.suppliers?.completedOrders || 0} fully paid invoices</p>
             </div>
          </div>

          {/* Predictive Scrap & Inventory Optimization */}
          <div className="card mb-8 border border-yellow-500/20 bg-gradient-to-r from-yellow-950/10 to-transparent">
             <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
               <TrendingUp className="text-yellow-500" /> Predictive Scrap & Inventory Optimization
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-[#1a1a1a] rounded border border-[#333]">
                   <div className="text-gray-400 text-xs mb-1">Raw Copper Stock</div>
                   <div className="text-2xl font-bold text-white">{Number(data?.inventoryOptimization?.rawCopperStock || 0).toFixed(2)} Tons</div>
                </div>
                <div className="p-4 bg-[#1a1a1a] rounded border border-[#333]">
                   <div className="text-gray-400 text-xs mb-1">Estimated Days Remaining</div>
                   <div className={`text-2xl font-bold ${data?.inventoryOptimization?.reorderUrgency === 'CRITICAL' ? 'text-red-500' : data?.inventoryOptimization?.reorderUrgency === 'WARNING' ? 'text-orange-500' : 'text-green-500'}`}>
                      {data?.inventoryOptimization?.daysRemaining} Days
                   </div>
                </div>
                <div className="p-4 bg-[#1a1a1a] rounded border border-[#333]">
                   <div className="text-gray-400 text-xs mb-1">Reorder Recommendation</div>
                   <div className="text-2xl font-bold text-blue-400">
                      {Number(data?.inventoryOptimization?.recommendedReorderQty) > 0 ? `${data?.inventoryOptimization?.recommendedReorderQty} Tons` : 'Optimal Stock'}
                   </div>
                </div>
                <div className="p-4 bg-[#1a1a1a] rounded border border-[#333]">
                   <div className="text-gray-400 text-xs mb-1">Predictive Scrap Value</div>
                   <div className="text-2xl font-bold text-emerald-400">{formatCurrency(data?.inventoryOptimization?.predictedScrapValue || 0)}</div>
                   <p className="text-[10px] text-gray-500 mt-1">From {data?.inventoryOptimization?.predictedScrapTons}T forecast yield</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card col-span-1 md:col-span-2">
               <h3 className="text-lg text-gray-300 mb-4 font-bold">Revenue vs Total Expenses ({timeframe} Trend)</h3>
               <div className="h-72 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={data.monthlyTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                     <XAxis dataKey="period" stroke="#a3a3a3" />
                     <YAxis stroke="#a3a3a3" tickFormatter={(value) => `₹${(value/100000).toFixed(1)}L`} />
                     <RechartsTooltip
                       contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }}
                       formatter={(value: any) => `₹ ${Number(value).toLocaleString('en-IN')}`}
                     />
                     <Legend />
                     <Bar dataKey="Revenue" fill="#22c55e" name="Revenue (Sales)" />
                     <Bar dataKey="GrossProfit" fill="#3b82f6" name="Gross Profit" />
                     <Bar dataKey="NetProfit" fill="#a855f7" name="Net Profit" />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="card col-span-1 flex flex-col justify-between">
               <div>
                 <h3 className="text-lg text-gray-300 mb-4 font-bold">Production Yield ({timeframe})</h3>
                 <div className="flex flex-col items-center justify-center h-48">
                   <div className={`text-6xl font-black ${data.overallYield >= 95 ? 'text-green-500' : 'text-red-500'}`}>
                     {Number(data.overallYield).toFixed(2)}%
                   </div>
                   <p className="text-gray-500 mt-4 text-center text-sm">
                     Target yield is 95%+. Represents Wire Produced / Raw Copper Used.
                   </p>
                 </div>
               </div>
            </div>
          </div>

          <div
            className="card cursor-pointer hover:border-orange-500 transition-colors group"
            onClick={() => router.push(`/owner/expenses?timeframe=${timeframe}`)}
          >
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg text-gray-300 font-bold group-hover:text-orange-400 transition-colors">Factory Expenses Breakdown ({timeframe})</h3>
               <span className="text-sm text-gray-500 group-hover:text-orange-400">View Deep Dive →</span>
            </div>
            <div className="flex flex-col md:flex-row items-center h-80">
              <div className="w-full md:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.expenseBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                       contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }}
                       formatter={(value: any) => `₹ ${Number(value).toLocaleString('en-IN')}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 flex flex-col gap-3">
                 {data.expenseBreakdown.map((e: any, i: number) => (
                   <div key={e.name} className="flex justify-between items-center bg-[#2a2a2a] p-3 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="text-gray-300">{e.name}</span>
                      </div>
                      <span className="font-bold text-white">₹ {e.value.toLocaleString('en-IN')}</span>
                   </div>
                 ))}
                 {data.expenseBreakdown.length === 0 && <div className="text-gray-500">No expenses in this timeframe.</div>}
              </div>
            </div>
          </div>

          {/* Recent Stakeholder Payments Log */}
          <div className="card border-t-2 border-t-purple-500 bg-[#1a1a1a]/80 backdrop-blur-md mt-6">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-[#333]">
               <div>
                 <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <RotateCcw className="text-purple-400" size={20} /> Recent Stakeholder Payments Log
                 </h3>
                 <p className="text-xs text-gray-400 mt-1">Audit log of all registered incoming and outgoing payments</p>
               </div>
               
               <div className="flex gap-2">
                 <button
                   onClick={() => {
                     const exportData = (paymentsData || []).map((p: any) => ({
                       'Date': formatDateIST(p.date),
                       'Type': p.type === 'INCOMING' ? 'Customer Paid Us' : 'We Paid Supplier',
                       'Stakeholder Name': p.customer?.name || p.supplier?.name || '-',
                       'Amount (₹)': Number(p.amount),
                       'Description': p.description || ''
                     }));
                     import('@/lib/export/excel').then(({ exportToExcel }) => {
                       exportToExcel(exportData, 'Stakeholder_Payments_Overview');
                     });
                   }}
                   disabled={!paymentsData || paymentsData.length === 0}
                   className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-950/40 hover:bg-green-900/60 border border-green-500/20 text-green-400 rounded transition-colors"
                 >
                   <Download size={14} /> Excel
                 </button>
                 <button
                   onClick={() => {
                     const headers = ['Date & Time', 'Transaction Type', 'Stakeholder', 'Amount', 'Description'];
                     const rows = (paymentsData || []).map((p: any) => [
                       formatDateIST(p.date),
                       p.type === 'INCOMING' ? 'Customer Paid Us' : 'We Paid Supplier',
                       p.customer?.name || p.supplier?.name || '-',
                       formatCurrency(Number(p.amount)),
                       p.description || '-'
                     ]);
                     import('@/lib/export/pdf').then(({ exportToPDF }) => {
                       exportToPDF(headers, rows, 'Stakeholder Payments Overview Ledger');
                     });
                   }}
                   disabled={!paymentsData || paymentsData.length === 0}
                   className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-red-400 rounded transition-colors"
                 >
                   <Download size={14} /> PDF
                 </button>
               </div>
             </div>

             {loadingPayments ? (
               <div className="text-gray-400 py-8 text-center text-sm">Loading payments log...</div>
             ) : !paymentsData || paymentsData.length === 0 ? (
               <div className="text-gray-500 py-8 text-center text-sm italic">No recent stakeholder payments found.</div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead>
                     <tr className="border-b border-[#333] text-gray-400 text-xs uppercase font-black">
                       <th className="p-3">Date & Time</th>
                       <th className="p-3">Type</th>
                       <th className="p-3">Stakeholder</th>
                       <th className="p-3">Amount</th>
                       <th className="p-3 font-semibold">Description</th>
                     </tr>
                   </thead>
                   <tbody>
                     {paymentsData.map((payment: any) => (
                       <tr key={payment.id} className="border-b border-[#333] last:border-0 hover:bg-[#252525] transition-colors">
                         <td className="p-3 text-xs text-gray-400 whitespace-nowrap">{formatDateIST(payment.date)}</td>
                         <td className="p-3">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${payment.type === 'INCOMING' ? 'bg-green-950/40 text-green-400 border border-green-500/20' : 'bg-red-950/40 text-red-400 border border-red-500/20'}`}>
                             {payment.type === 'INCOMING' ? 'INCOMING' : 'OUTGOING'}
                           </span>
                         </td>
                         <td className="p-3 font-semibold text-white">
                           {payment.customer?.name || payment.supplier?.name || <span className="text-gray-500 italic">None</span>}
                         </td>
                         <td className={`p-3 font-bold text-base ${payment.type === 'INCOMING' ? 'text-green-400' : 'text-red-400'}`}>
                           {payment.type === 'INCOMING' ? '+' : '-'}{formatCurrency(Number(payment.amount))}
                         </td>
                         <td className="p-3 text-xs text-gray-400 max-w-xs truncate">{payment.description || '-'}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        </>
      )}

      {!loading && data && activeTab === 'pl' && (() => {
        const pl = data.financialStatements?.pl || { salesRevenue: 0, scrapRevenue: 0, totalRevenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, netProfit: 0 };
        return (
          <div className="card space-y-6 bg-[#1a1a1a]/90 border border-[#333] shadow-2xl p-8">
            <div className="flex justify-between items-center pb-4 border-b border-[#333]">
              <div>
                <h3 className="text-2xl font-black text-white">Profit & Loss Statement</h3>
                <p className="text-xs text-gray-400 mt-1">Accrual-based performance report for timeframe: {timeframe}</p>
              </div>
              <button
                onClick={handleExportPL}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-green-950/40 hover:bg-green-900/60 border border-green-500/20 text-green-400 rounded transition-colors"
              >
                <Download size={14} /> Export Excel
              </button>
            </div>

            <div className="space-y-6 text-sm text-gray-300">
              {/* Operating Revenue Section */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-extrabold text-blue-400 tracking-wider">1. Operating Revenue</h4>
                <div className="flex justify-between p-2 hover:bg-[#252525] rounded transition-colors pl-4">
                  <span>Sales Invoices Revenue</span>
                  <span className="font-mono text-white font-semibold">{formatCurrency(pl.salesRevenue)}</span>
                </div>
                <div className="flex justify-between p-2 hover:bg-[#252525] rounded transition-colors pl-4">
                  <span>Scrap copper sales Revenue</span>
                  <span className="font-mono text-white font-semibold">{formatCurrency(pl.scrapRevenue)}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-[#222] rounded font-bold border-y border-[#333]">
                  <span className="text-white">Total Operating Revenue (A)</span>
                  <span className="font-mono text-green-400 text-base">{formatCurrency(pl.totalRevenue)}</span>
                </div>
              </div>

              {/* COGS Section */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-extrabold text-blue-400 tracking-wider">2. Cost of Goods Sold (COGS)</h4>
                <div className="flex justify-between p-2 hover:bg-[#252525] rounded transition-colors pl-4">
                  <span>Direct Raw Materials Consumed (FIFO Valuation)</span>
                  <span className="font-mono text-white font-semibold">{formatCurrency(pl.cogs)}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-[#222] rounded font-bold border-y border-[#333]">
                  <span className="text-white">Total Cost of Goods Sold (B)</span>
                  <span className="font-mono text-red-400 text-base">{formatCurrency(pl.cogs)}</span>
                </div>
              </div>

              {/* Gross Margin */}
              <div className="flex justify-between p-3 bg-blue-950/20 rounded font-black border border-blue-500/20 text-base">
                <span className="text-white uppercase tracking-wider">3. Gross Profit (C = A - B)</span>
                <span className="font-mono text-blue-400">{formatCurrency(pl.grossProfit)}</span>
              </div>

              {/* Operating Expenses */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-extrabold text-blue-400 tracking-wider">4. Operating Expenses</h4>
                <div className="flex justify-between p-2 hover:bg-[#252525] rounded transition-colors pl-4">
                  <span>Factory Operations & Administrative Expenses</span>
                  <span className="font-mono text-white font-semibold">{formatCurrency(pl.operatingExpenses)}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-[#222] rounded font-bold border-y border-[#333]">
                  <span className="text-white">Total Operating Expenses (D)</span>
                  <span className="font-mono text-red-400 text-base">{formatCurrency(pl.operatingExpenses)}</span>
                </div>
              </div>

              {/* Net Income */}
              <div className="flex justify-between p-4 bg-purple-950/30 rounded font-black border border-purple-500/20 text-lg">
                <span className="text-white uppercase tracking-wider">5. Net Operating Income (E = C - D)</span>
                <span className={`font-mono ${pl.netProfit >= 0 ? 'text-green-400' : 'text-red-500'}`}>{formatCurrency(pl.netProfit)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {!loading && data && activeTab === 'bs' && (() => {
        const bs = data.financialStatements?.bs || { cashBank: 0, accountsReceivable: 0, inventory: 0, employeeAdvances: 0, totalAssets: 0, accountsPayable: 0, totalLiabilities: 0, retainedEarnings: 0 };
        return (
          <div className="card space-y-6 bg-[#1a1a1a]/90 border border-[#333] shadow-2xl p-8">
            <div className="flex justify-between items-center pb-4 border-b border-[#333]">
              <div>
                <h3 className="text-2xl font-black text-white">Balance Sheet</h3>
                <p className="text-xs text-gray-400 mt-1">Corporate Statement of Financial Position (Point-in-Time)</p>
              </div>
              <button
                onClick={handleExportBS}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-green-950/40 hover:bg-green-900/60 border border-green-500/20 text-green-400 rounded transition-colors"
              >
                <Download size={14} /> Export Excel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-300">
              {/* Assets column */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-[#333] pb-2 uppercase tracking-wide text-green-400">Assets (Dr.)</h4>
                <div className="space-y-2">
                  <span className="text-xs uppercase font-extrabold text-gray-500 block mb-1">Current Assets</span>
                  <div className="flex justify-between p-2 hover:bg-[#252525] rounded transition-colors pl-2">
                    <span>Cash & Bank Balance</span>
                    <span className="font-mono text-white font-semibold">{formatCurrency(bs.cashBank)}</span>
                  </div>
                  <div className="flex justify-between p-2 hover:bg-[#252525] rounded transition-colors pl-2">
                    <span>Accounts Receivable (AR)</span>
                    <span className="font-mono text-white font-semibold">{formatCurrency(bs.accountsReceivable)}</span>
                  </div>
                  <div className="flex justify-between p-2 hover:bg-[#252525] rounded transition-colors pl-2">
                    <span>Inventory (Raw & Finished Wires)</span>
                    <span className="font-mono text-white font-semibold">{formatCurrency(bs.inventory)}</span>
                  </div>
                  <div className="flex justify-between p-2 hover:bg-[#252525] rounded transition-colors pl-2">
                    <span>Employee Salary Advances</span>
                    <span className="font-mono text-white font-semibold">{formatCurrency(bs.employeeAdvances)}</span>
                  </div>
                </div>
                <div className="flex justify-between p-3 bg-green-950/20 rounded font-black border border-green-500/20 text-base">
                  <span className="text-white">TOTAL ASSETS</span>
                  <span className="font-mono text-green-400">{formatCurrency(bs.totalAssets)}</span>
                </div>
              </div>

              {/* Liabilities & Equity column */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white border-b border-[#333] pb-2 uppercase tracking-wide text-red-400">Liabilities & Equity (Cr.)</h4>
                  
                  <div className="space-y-2">
                    <span className="text-xs uppercase font-extrabold text-gray-500 block mb-1">Current Liabilities</span>
                    <div className="flex justify-between p-2 hover:bg-[#252525] rounded transition-colors pl-2">
                      <span>Accounts Payable (AP)</span>
                      <span className="font-mono text-white font-semibold">{formatCurrency(bs.accountsPayable)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[#222] rounded font-bold border-y border-[#333] mt-2">
                      <span className="text-white">Total Liabilities</span>
                      <span className="font-mono text-white">{formatCurrency(bs.totalLiabilities)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <span className="text-xs uppercase font-extrabold text-gray-500 block mb-1">Owner Equity</span>
                    <div className="flex justify-between p-2 hover:bg-[#252525] rounded transition-colors pl-2">
                      <span>Retained Earnings</span>
                      <span className="font-mono text-white font-semibold">{formatCurrency(bs.retainedEarnings)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between p-3 bg-red-950/20 rounded font-black border border-red-500/20 text-base mt-4">
                  <span className="text-white">TOTAL LIABILITIES & EQUITY</span>
                  <span className="font-mono text-red-400">{formatCurrency(bs.totalLiabilities + bs.retainedEarnings)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
     </div>
   );
}
