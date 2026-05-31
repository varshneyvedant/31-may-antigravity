'use client';

import { formatDateIST } from '@/lib/format';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import TimeframeSelector from '@/components/ui/TimeframeSelector';
import { Timeframe } from '@/lib/timeframe';
import { Building, Phone, MapPin, Landmark, FileText, Star, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';

function SupplierDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const initialTimeframe = (searchParams.get('timeframe') as Timeframe) || '1M';
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);

  const handleTimeframeChange = (newTf: Timeframe) => {
     setTimeframe(newTf);
     router.replace(`/owner/stakeholders/supplier/${id}?timeframe=${newTf}`);
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/owner/stakeholders/supplier?id=${id}&timeframe=${timeframe}`);
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

  if (loading && !data) return <div className="text-gray-400">Loading supplier profile...</div>;

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
            <Building className="text-red-500" /> {data?.supplier.name}
          </h2>
          <div className="text-gray-400 text-sm flex gap-4">
             <span className="flex items-center gap-1"><Phone size={14}/> {data?.supplier.contact || 'N/A'}</span>
             <span className="flex items-center gap-1"><FileText size={14}/> GST: {data?.supplier.gst || 'N/A'}</span>
          </div>
          <div className="text-gray-400 text-sm mt-1 flex flex-col gap-1">
             <span className="flex items-center gap-1"><MapPin size={14} /> {data?.supplier.address || 'N/A'}</span>
             <span className="flex items-center gap-1"><Landmark size={14} /> Bank: {data?.supplier.bankDetails || 'N/A'}</span>
          </div>
        </div>
        <TimeframeSelector value={timeframe} onChange={handleTimeframeChange} />
      </div>

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card border-l-4 border-l-purple-500">
              <div className="text-gray-400 text-sm mb-1">Raw Material Share</div>
              <div className="text-3xl font-bold text-white">{Number(data.metrics.stockPercent).toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">of total copper bought in timeframe</div>
            </div>
            <div className="card">
              <div className="text-gray-400 text-sm mb-1">Total Purchase Value</div>
              <div className="text-3xl font-bold text-white">{formatCurrency(data.metrics.totalPurchaseValue)}</div>
              <div className="text-xs text-gray-500 mt-1">{Number(data.metrics.totalTons).toFixed(2)} Tons supplied</div>
            </div>
            <div className="card">
              <div className="text-gray-400 text-sm mb-1">Current Pending Amount</div>
              <div className={`text-3xl font-bold ${data.metrics.pendingAmount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {formatCurrency(data.metrics.pendingAmount)}
              </div>
            </div>
            <div className="card bg-gradient-to-br from-[#1e1e1e] to-[#2a2a2a]">
              <div className="text-gray-400 text-sm mb-1">Supplier Rank</div>
              <div className="text-xl font-bold text-yellow-500 flex items-center gap-2 mt-1">
                <Star className="fill-yellow-500 flex-shrink-0" size={20} /> {data.metrics.rank}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="text-purple-500" /> Purchase History ({timeframe})
            </h3>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#333] text-gray-400 text-sm">
                    <th className="p-3">Date</th>
                    <th className="p-3">Qty (Tons)</th>
                    <th className="p-3">Price / KG</th>
                    <th className="p-3">Total Value</th>
                    <th className="p-3 text-right">Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.purchaseHistory.map((purchase: any) => (
                    <tr key={purchase.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                      <td className="p-3 text-gray-300">{formatDateIST(purchase.date)}</td>
                      <td className="p-3 text-white font-bold">{Number(purchase.qty).toFixed(2)}</td>
                      <td className="p-3 text-gray-300">₹ {(purchase.pricePerTon / 1000).toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
                      <td className="p-3 font-bold text-gray-200">{formatCurrency(purchase.totalValue)}</td>
                      <td className="p-3 text-right align-top">
                        {purchase.isFullyPaid ? (
                           <span className="bg-green-950/40 text-green-500 px-2 py-1 rounded text-xs font-bold border border-green-500/20">PAID IN FULL</span>
                        ) : (
                           <div className="flex flex-col items-end">
                              <span className="text-red-400 font-bold mb-1">Owe: {formatCurrency(purchase.pendingAmount)}</span>
                              <span className="text-gray-500 text-xs">Paid: {formatCurrency(purchase.amountPaid)}</span>
                           </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.purchaseHistory.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">No purchases found in this timeframe.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 border-t border-[#333] pt-6">
              <Clock className="text-red-500" /> Payment History ({timeframe})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#1e1e1e]">
                  <tr className="border-b border-[#333] text-gray-400 text-xs uppercase tracking-wider">
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentHistory.map((pay: any) => (
                    <tr key={pay.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                      <td className="p-3 text-gray-300 whitespace-nowrap">{formatDateIST(pay.date)}</td>
                      <td className="p-3 text-gray-400">{pay.description}</td>
                      <td className="p-3 font-bold text-red-400 text-right">{formatCurrency(pay.amount)}</td>
                    </tr>
                  ))}
                  {data.paymentHistory.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">No payments sent in this timeframe.</td></tr>
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

export default function SupplierDetail() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading supplier profile...</div>}>
       <SupplierDetailContent />
    </Suspense>
  );
}
