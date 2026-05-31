'use client';

import { formatDateIST } from '@/lib/format';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import TimeframeSelector from '@/components/ui/TimeframeSelector';
import { Timeframe } from '@/lib/timeframe';
import { Building, Phone, MapPin, Truck, FileText, Star, Clock, PieChart as PieChartIcon, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/format';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

function CustomerDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const initialTimeframe = (searchParams.get('timeframe') as Timeframe) || '1M';
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);

  const handleTimeframeChange = (newTf: Timeframe) => {
     setTimeframe(newTf);
     router.replace(`/owner/stakeholders/customer/${id}?timeframe=${newTf}`);
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/owner/stakeholders/customer?id=${id}&timeframe=${timeframe}`);
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
  }, [id, timeframe]);

  if (loading && !data) return <div className="text-gray-400">Loading customer profile...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 bg-[#2a2a2a] px-3 py-1 rounded w-fit text-sm"
      >
        <ArrowLeft size={16} /> Back to Directory
      </button>

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Building className="text-red-500" /> {data?.customer.name}
          </h2>
          <div className="text-gray-400 text-sm flex gap-4">
             <span className="flex items-center gap-1"><Phone size={14}/> {data?.customer.contact || 'N/A'}</span>
             <span className="flex items-center gap-1"><FileText size={14}/> GST: {data?.customer.gst || 'N/A'}</span>
             <span className="flex items-center gap-1"><Truck size={14}/> {data?.customer.transport || 'N/A'}</span>
          </div>
          <div className="text-gray-400 text-sm mt-1 flex items-center gap-1">
             <MapPin size={14} /> {data?.customer.address || 'N/A'}
          </div>
        </div>
        <TimeframeSelector value={timeframe} onChange={handleTimeframeChange} />
      </div>

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card border-l-4 border-l-blue-500">
              <div className="text-gray-400 text-sm mb-1">Company Revenue Share</div>
              <div className="text-3xl font-bold text-white">{Number(data.metrics.revenuePercent).toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">of total revenue in timeframe</div>
            </div>
            <div className="card">
              <div className="text-gray-400 text-sm mb-1">Total Sales Value</div>
              <div className="text-3xl font-bold text-white">{formatCurrency(data.metrics.totalSalesValue)}</div>
              <div className="text-xs text-gray-500 mt-1">{Number(data.metrics.totalTons).toFixed(2)} Tons ordered</div>
            </div>
            <div className="card">
              <div className="text-gray-400 text-sm mb-1">Current Pending Amount</div>
              <div className={`text-3xl font-bold ${data.metrics.pendingAmount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(data.metrics.pendingAmount)}
              </div>
            </div>
            <div className="card bg-gradient-to-br from-[#1e1e1e] to-[#2a2a2a]">
              <div className="text-gray-400 text-sm mb-1">Customer Rank</div>
              <div className="text-2xl font-bold text-yellow-500 flex items-center gap-2">
                <Star className="fill-yellow-500" /> {data.metrics.rank}
              </div>
            </div>
          </div>

          <div className="card">
             <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
               <PieChartIcon className="text-red-500" /> Customer Janam Kundli (Ordering Habits)
             </h3>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-64">
                <div className="h-full">
                   <h4 className="text-center text-sm text-gray-400 mb-2">Volume by Category (Tons)</h4>
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={data.janamKundli.categories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                            {data.janamKundli.categories.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                         </Pie>
                         <RechartsTooltip contentStyle={{backgroundColor: '#1e1e1e', borderColor: '#333'}} formatter={(val: any) => `${Number(val).toFixed(2)} Tons`} />
                         <Legend wrapperStyle={{fontSize: '12px'}}/>
                      </PieChart>
                   </ResponsiveContainer>
                </div>

                <div className="h-full border-l border-r border-[#333]">
                   <h4 className="text-center text-sm text-gray-400 mb-2">Volume by Brand (Tons)</h4>
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={data.janamKundli.brands} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                            {data.janamKundli.brands.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                         </Pie>
                         <RechartsTooltip contentStyle={{backgroundColor: '#1e1e1e', borderColor: '#333'}} formatter={(val: any) => `${Number(val).toFixed(2)} Tons`} />
                         <Legend wrapperStyle={{fontSize: '12px'}}/>
                      </PieChart>
                   </ResponsiveContainer>
                </div>

                <div className="h-full">
                   <h4 className="text-center text-sm text-gray-400 mb-2">Volume by Wire Size (Tons)</h4>
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={data.janamKundli.sizes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                            {data.janamKundli.sizes.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                         </Pie>
                         <RechartsTooltip contentStyle={{backgroundColor: '#1e1e1e', borderColor: '#333'}} formatter={(val: any) => `${Number(val).toFixed(2)} Tons`} />
                         <Legend wrapperStyle={{fontSize: '12px'}}/>
                      </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>
             {data.janamKundli.categories.length === 0 && <div className="text-center text-gray-500 mt-4">No data available to generate Kundli.</div>}
          </div>

          <div className="card">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="text-red-500" /> Detailed Order History ({timeframe})
            </h3>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#333] text-gray-400 text-sm">
                    <th className="p-3">Date</th>
                    <th className="p-3">Items</th>
                    <th className="p-3 text-right">Total Value</th>
                    <th className="p-3 text-right">Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.salesHistory.map((sale: any) => (
                    <tr key={sale.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                      <td className="p-3 text-gray-300 align-top whitespace-nowrap">{formatDateIST(sale.date)}</td>
                      <td className="p-3 text-gray-300">
                        <div className="flex flex-col gap-1">
                          {sale.items.map((i: any) => (
                             <div key={i.id} className="bg-[#1a1a1a] p-2 rounded border border-[#333] flex justify-between">
                               <span>
                                 <strong>{Number(i.qty).toFixed(2)}T</strong> of {i.productCategory}
                                 {i.brand && ` (${i.brand})`}
                                 {i.wireType && ` - ${i.wireType}`}
                               </span>
                               <span className="text-gray-500 text-xs mt-0.5">@ ₹{(i.pricePerTon / 1000).toLocaleString('en-IN', {maximumFractionDigits: 2})}/KG</span>
                             </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-white text-right align-top">{formatCurrency(sale.totalValue)}</td>
                      <td className="p-3 text-right align-top">
                        {sale.isFullyPaid ? (
                           <span className="bg-green-950/40 text-green-500 px-2 py-1 rounded text-xs font-bold border border-green-500/20">PAID IN FULL</span>
                        ) : (
                           <div className="flex flex-col items-end">
                              <span className="text-red-400 font-bold mb-1">Pending: {formatCurrency(sale.pendingAmount)}</span>
                              <span className="text-gray-500 text-xs">Paid: {formatCurrency(sale.amountPaid)}</span>
                           </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.salesHistory.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">No orders found in this timeframe.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 border-t border-[#333] pt-6">
              <Clock className="text-green-500" /> Payment History ({timeframe})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#1e1e1e]">
                  <tr className="border-b border-[#333] text-gray-400 text-xs uppercase tracking-wider">
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount Received</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentHistory.map((pay: any) => (
                    <tr key={pay.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                      <td className="p-3 text-gray-300 whitespace-nowrap">{formatDateIST(pay.date)}</td>
                      <td className="p-3 text-gray-400">{pay.description}</td>
                      <td className="p-3 font-bold text-green-400 text-right">{formatCurrency(pay.amount)}</td>
                    </tr>
                  ))}
                  {data.paymentHistory.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">No payments received in this timeframe.</td></tr>
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

export default function CustomerDetail() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading customer profile...</div>}>
       <CustomerDetailContent />
    </Suspense>
  );
}
