'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, ArrowLeft, Factory, ShoppingCart } from 'lucide-react';
import { formatDateIST } from '@/lib/format';

function FinishedProductDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const size = searchParams.get('size');

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!category) return;

    fetch(`/api/shared/inventory/finished/detail?category=${encodeURIComponent(category)}&brand=${encodeURIComponent(brand || '')}&size=${encodeURIComponent(size || '')}`)
      .then(res => res.json())
      .then(json => {
         if (json.success) setHistory(json.history);
         setLoading(false);
      });
  }, [category, brand, size]);

  if (loading) return <div className="text-gray-400">Loading product history...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 bg-[#2a2a2a] px-3 py-1 rounded w-fit text-sm"
      >
        <ArrowLeft size={16} /> Back to Stock
      </button>

      <div className="card border-l-4 border-l-blue-500 mb-6">
         <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Box className="text-blue-500" /> {size} {brand !== 'Unbranded' ? brand : ''} {category}
         </h2>
         <p className="text-gray-400 mt-1">Complete production and sales activity ledger.</p>
      </div>

      <div className="card">
         <h3 className="text-xl font-bold mb-4">Stock Movement History</h3>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-[#1e1e1e]">
                  <tr className="border-b border-[#333] text-gray-400 text-xs uppercase tracking-wider">
                     <th className="p-3">Date (IST)</th>
                     <th className="p-3">Action</th>
                     <th className="p-3">Quantity</th>
                     <th className="p-3">Details</th>
                  </tr>
               </thead>
               <tbody>
                  {history.map((log) => (
                     <tr key={log.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                        <td className="p-3 text-gray-300 whitespace-nowrap">{formatDateIST(log.date)}</td>
                        <td className="p-3">
                           {log.type === 'PRODUCTION' ? (
                              <span className="flex items-center gap-1 text-green-400 bg-green-950/30 px-2 py-1 rounded w-fit border border-green-500/20 font-bold text-xs">
                                 <Factory size={12} /> ADDED
                              </span>
                           ) : (
                              <span className="flex items-center gap-1 text-orange-400 bg-orange-950/30 px-2 py-1 rounded w-fit border border-orange-500/20 font-bold text-xs">
                                 <ShoppingCart size={12} /> SOLD
                              </span>
                           )}
                        </td>
                        <td className={`p-3 font-bold text-lg ${log.type === 'PRODUCTION' ? 'text-green-400' : 'text-orange-400'}`}>
                           {log.type === 'PRODUCTION' ? '+' : '-'}{Number(log.qty).toFixed(2)} T
                        </td>
                        <td className="p-3 text-gray-400">{log.note}</td>
                     </tr>
                  ))}
                  {history.length === 0 && (
                     <tr><td colSpan={4} className="p-4 text-center text-gray-500">No activity recorded for this product yet.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}

export default function FinishedProductDetail() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading product details...</div>}>
      <FinishedProductDetailContent />
    </Suspense>
  );
}
