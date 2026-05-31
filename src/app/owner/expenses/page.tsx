'use client';

import { formatDateIST } from '@/lib/format';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TimeframeSelector from '@/components/ui/TimeframeSelector';
import { Timeframe } from '@/lib/timeframe';
import { formatCurrency } from '@/lib/format';
import { Factory, TrendingUp, AlertTriangle, ArrowLeft, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPDF } from '@/lib/export/pdf';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

function ExpensesDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const initialTimeframe = (searchParams.get('timeframe') as Timeframe) || '1M';
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);

  const handleTimeframeChange = (newTf: Timeframe) => {
     setTimeframe(newTf);
     router.replace(`/owner/expenses?timeframe=${newTf}`);
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/owner/expenses?timeframe=${timeframe}`);
        const json = await res.json();
        if (isMounted) setData(json.data);
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [timeframe]);

  if (loading && !data) return <div className="text-gray-400">Loading deep-dive expense analytics...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 bg-[#2a2a2a] px-3 py-1 rounded w-fit text-sm"
      >
        <ArrowLeft size={16} /> Back to Financials
      </button>

      <div className="flex justify-between items-start">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Factory className="text-orange-500" /> Factory Expense Deep-Dive
        </h2>
        <TimeframeSelector value={timeframe} onChange={handleTimeframeChange} />
      </div>

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="card md:col-span-1 border-l-4 border-l-orange-500 bg-gradient-to-br from-[#1e1e1e] to-[#2a2a2a]">
               <div className="text-gray-400 text-sm mb-1">Total Expenses ({timeframe})</div>
               <div className="text-4xl font-black text-orange-500">{formatCurrency(data.totalExpenses)}</div>
               <div className="mt-4 space-y-2">
                 {data.breakdown.map((b: any, i: number) => (
                    <div key={b.category} className="flex justify-between items-center text-sm border-b border-[#333] pb-1 last:border-0">
                       <span className="text-gray-300 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                          {b.category}
                       </span>
                       <span className="font-bold text-white">{Number(b.percent).toFixed(1)}%</span>
                    </div>
                 ))}
               </div>
             </div>

             <div className="card md:col-span-3">
               <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-300">
                  <TrendingUp size={18} className="text-orange-500"/> Expense Trendline
               </h3>
               <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={data.trends}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                     <XAxis dataKey="period" stroke="#a3a3a3" />
                     <YAxis stroke="#a3a3a3" tickFormatter={(value) => `₹${(value/100000).toFixed(1)}L`} />
                     <RechartsTooltip
                       contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }}
                       formatter={(value: any) => formatCurrency(value)}
                     />
                     <Legend />
                     <Line type="monotone" dataKey="Total" stroke="#a3a3a3" strokeWidth={4} name="Total Expenses" dot={false} />
                     {data.breakdown.map((b: any, i: number) => (
                        <Line
                          key={b.category} type="monotone" dataKey={b.category}
                          stroke={COLORS[i % COLORS.length]} strokeWidth={2} name={b.category} dot={false}
                        />
                     ))}
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>

          <div className="card">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Recent Individual Expense Logs</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                       const dataToExport = data.rawList.map((exp: any) => ({
                          Date: formatDateIST(exp.date),
                          Category: exp.category,
                          ExpenseMonth: exp.expenseMonth || 'N/A',
                          Description: exp.description || 'N/A',
                          Amount: Number(exp.amount)
                       }));
                       exportToExcel(dataToExport, `Expenses_History_${timeframe}`);
                    }}
                    className="bg-[#1f2937] hover:bg-gray-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Download size={14}/> Export Excel
                  </button>
                  <button
                    onClick={() => {
                       const headers = ['Date', 'Category', 'Expense Month', 'Description', 'Amount'];
                       const rows = data.rawList.map((exp: any) => [
                          formatDateIST(exp.date),
                          exp.category,
                          exp.expenseMonth || '-',
                          exp.description || '-',
                          formatCurrency(Number(exp.amount))
                       ]);
                       exportToPDF(headers, rows, `Factory Expenses Report (${timeframe})`);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Download size={14}/> Export PDF
                  </button>
                </div>
             </div>
             <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#1e1e1e]">
                  <tr className="border-b border-[#333] text-gray-400 text-sm">
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Expense Month</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rawList.map((exp: any) => (
                    <tr key={exp.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                      <td className="p-3 text-gray-300">{formatDateIST(exp.date)}</td>
                      <td className="p-3 font-bold text-white">{exp.category}</td>
                      <td className="p-3 text-gray-400">{exp.expenseMonth || '-'}</td>
                      <td className="p-3 text-gray-400">{exp.description || '-'}</td>
                      <td className="p-3 font-bold text-orange-400 text-right">{formatCurrency(exp.amount)}</td>
                    </tr>
                  ))}
                  {data.rawList.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">No expenses logged in this timeframe.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ExpensesDashboard() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading deep-dive expense analytics...</div>}>
       <ExpensesDashboardContent />
    </Suspense>
  );
}
