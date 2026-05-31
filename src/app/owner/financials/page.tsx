'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import TimeframeSelector from '@/components/ui/TimeframeSelector';
import { Timeframe } from '@/lib/timeframe';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, Banknote, CreditCard, Factory, MoveUpRight, ArrowUpRight, Clock } from 'lucide-react';

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
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const data = queryData;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
        <span className="text-red-500">Financial</span> & Production Overview
      </h2>

      <TimeframeSelector value={timeframe} onChange={setTimeframe} />

      {!loading && data && (
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
        </>
      )}
    </div>
  );
}
