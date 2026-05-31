'use client';

import { formatDateIST } from '@/lib/format';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import TimeframeSelector from '@/components/ui/TimeframeSelector';
import { Timeframe } from '@/lib/timeframe';
import { formatCurrency } from '@/lib/format';
import { Tags, TrendingUp, Users, Clock, Box, ArrowLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

function BrandDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { brand } = useParams();
  const decodedBrand = decodeURIComponent(brand as string);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Initialize timeframe from URL query if it exists
  const initialTimeframe = (searchParams.get('timeframe') as Timeframe) || '1M';
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);

  // Update URL whenever timeframe changes so back-button remembers it
  const handleTimeframeChange = (newTf: Timeframe) => {
     setTimeframe(newTf);
     router.replace(`/owner/products/${encodeURIComponent(decodedBrand)}?timeframe=${newTf}`);
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/owner/products/brand?brand=${encodeURIComponent(decodedBrand)}&timeframe=${timeframe}`);
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
  }, [decodedBrand, timeframe]);

  if (loading && !data) return <div className="text-gray-400">Loading deep brand analytics...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 bg-[#2a2a2a] px-3 py-1 rounded w-fit text-sm"
      >
        <ArrowLeft size={16} /> Back to Products
      </button>

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Tags className="text-purple-500" /> {data?.brandName} Deep-Dive
          </h2>
          <p className="text-gray-400">Showing detailed analytics for the selected timeframe.</p>
        </div>
        <TimeframeSelector value={timeframe} onChange={handleTimeframeChange} />
      </div>

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="card border-t-2 border-t-purple-500 bg-gradient-to-b from-purple-950/20 to-transparent">
               <div className="text-gray-400 text-xs mb-1 flex items-center gap-1"><Box size={14}/> Total Volume Sold</div>
               <div className="text-3xl font-bold text-white">{Number(data.totalBrandVolume).toFixed(2)}<span className="text-sm font-normal text-gray-500 ml-1">Tons</span></div>
             </div>
             <div className="card border-t-2 border-t-green-500 bg-gradient-to-b from-green-950/20 to-transparent">
               <div className="text-gray-400 text-xs mb-1 flex items-center gap-1">Brand Revenue</div>
               <div className="text-3xl font-bold text-green-400">{formatCurrency(data.totalBrandRevenue)}</div>
             </div>
             <div className="card border-t-2 border-t-blue-500 bg-gradient-to-b from-blue-950/20 to-transparent">
               <div className="text-gray-400 text-xs mb-1 flex items-center gap-1">Brand Gross Profit</div>
               <div className="text-3xl font-bold text-blue-400">{formatCurrency(data.totalBrandGrossProfit)}</div>
             </div>
          </div>

          <div className="card h-80">
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-300">
                <TrendingUp size={18} className="text-purple-500"/> Revenue & Profit Trend
             </h3>
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
                 <Line type="monotone" dataKey="Revenue" stroke="#22c55e" strokeWidth={3} dot={{r:4}} />
                 <Line type="monotone" dataKey="GrossProfit" stroke="#3b82f6" strokeWidth={3} dot={{r:4}} />
               </LineChart>
             </ResponsiveContainer>
          </div>

          <div className="card">
             <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="text-purple-500"/> Complete Buyer Breakdown ({timeframe})
             </h3>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-[#1e1e1e]">
                   <tr className="border-b border-[#333] text-gray-400 text-xs uppercase tracking-wider">
                     <th className="p-3">Customer Name</th>
                     <th className="p-3 text-right">Volume (Tons)</th>
                     <th className="p-3 text-right">% of Brand Rev</th>
                     <th className="p-3 text-right">% of Comp. Rev</th>
                     <th className="p-3 text-right">% of Brand Profit</th>
                     <th className="p-3 text-right">% of Comp. Profit</th>
                   </tr>
                 </thead>
                 <tbody>
                   {data.buyers.map((buyer: any) => (
                     <tr key={buyer.name} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                       <td className="p-3 font-bold text-white">{buyer.name}</td>
                       <td className="p-3 text-gray-300 text-right">{Number(buyer.volume).toFixed(2)}</td>
                       <td className="p-3 text-gray-300 text-right">{Number(buyer.brandRevPercent).toFixed(1)}%</td>
                       <td className="p-3 text-green-400 text-right">{Number(buyer.compRevPercent).toFixed(1)}%</td>
                       <td className="p-3 text-gray-300 text-right">{Number(buyer.brandProfPercent).toFixed(1)}%</td>
                       <td className="p-3 text-blue-400 text-right">{Number(buyer.compProfPercent).toFixed(1)}%</td>
                     </tr>
                   ))}
                   {data.buyers.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-500">No buyers found.</td></tr>}
                 </tbody>
               </table>
             </div>
          </div>

          <div className="card">
             <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Clock className="text-purple-500"/> Full Order History ({timeframe})
             </h3>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-[#1e1e1e]">
                   <tr className="border-b border-[#333] text-gray-400 text-xs uppercase tracking-wider">
                     <th className="p-3">Date & Time</th>
                     <th className="p-3">Customer</th>
                     <th className="p-3">Size</th>
                     <th className="p-3 text-right">Qty</th>
                     <th className="p-3 text-right">Sell Price/KG</th>
                     <th className="p-3 text-right">Cost Price/KG</th>
                     <th className="p-3 text-right">Margin %</th>
                     <th className="p-3 text-right">Invoice Profit</th>
                     <th className="p-3 text-right">Total Revenue</th>
                     <th className="p-3 text-center">Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {data.history.map((order: any) => (
                     <tr key={order.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                       <td className="p-3 text-gray-300 whitespace-nowrap">{formatDateIST(order.date)}</td>
                       <td className="p-3 font-bold text-white">{order.customer}</td>
                       <td className="p-3 text-gray-400">{order.size}</td>
                       <td className="p-3 text-gray-300 text-right">{Number(order.qty).toFixed(2)}</td>
                       <td className="p-3 text-gray-300 text-right">₹{(order.sellingPrice / 1000).toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
                       <td className="p-3 text-orange-400 text-right text-xs">₹{(order.costPrice / 1000).toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
                       <td className={`p-3 font-bold text-right ${order.margin > 0 ? 'text-green-500' : 'text-red-500'}`}>{Number(order.margin).toFixed(1)}%</td>
                       <td className={`p-3 font-bold text-right ${order.totalProfit > 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatCurrency(order.totalProfit)}</td>
                       <td className="p-3 font-bold text-white text-right">{formatCurrency(order.totalRevenue)}</td>
                       <td className="p-3 text-center">
                          {order.isFullyPaid ? (
                             <span className="bg-green-950/40 text-green-500 px-2 py-1 rounded text-xs font-bold border border-green-500/20">PAID</span>
                          ) : (
                             <span className="bg-red-950/40 text-red-500 px-2 py-1 rounded text-xs font-bold border border-red-500/20">PENDING</span>
                          )}
                       </td>
                     </tr>
                   ))}
                   {data.history.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-500">No orders found.</td></tr>}
                 </tbody>
               </table>
             </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function BrandDetail() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading deep brand analytics...</div>}>
       <BrandDetailContent />
    </Suspense>
  );
}
