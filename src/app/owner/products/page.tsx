'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TimeframeSelector from '@/components/ui/TimeframeSelector';
import { Timeframe } from '@/lib/timeframe';
import { formatCurrency } from '@/lib/format';
import { PackageSearch, TrendingUp, Users, ChevronRight, Tags } from 'lucide-react';

export default function ProductsDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [expandedCat, setExpandedCat] = useState<string | null>('CC Wires');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/owner/products?timeframe=${timeframe}`);
        const json = await res.json();
        if (isMounted) setData(json.tree);
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [timeframe]);

  if (loading && data.length === 0) return <div className="text-gray-400">Loading complex product profitability tree...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-start">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <PackageSearch className="text-purple-500" /> Products & Brands Analysis
        </h2>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>

      <div className="flex flex-col gap-4">
        {data.map((cat: any) => (
          <div key={cat.categoryName} className="card bg-[#1a1a1a] border-[#333]">
             <div
               className="flex justify-between items-center cursor-pointer group"
               onClick={() => setExpandedCat(expandedCat === cat.categoryName ? null : cat.categoryName)}
             >
                <div className="flex items-center gap-3">
                   <ChevronRight className={`transition-transform ${expandedCat === cat.categoryName ? 'rotate-90 text-purple-500' : 'text-gray-500'}`} />
                   <div>
                     <h3 className="text-xl font-black text-white flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        {cat.categoryName}
                     </h3>
                     <p className="text-sm text-gray-500 mt-1">{Number(cat.totalTons).toFixed(2)} Tons Sold</p>
                   </div>
                </div>
                <div className="flex gap-6 text-right">
                   <div>
                     <div className="text-xs text-gray-500">Gross Profit</div>
                     <div className="font-bold text-blue-400">{formatCurrency(cat.totalGrossProfit)}</div>
                   </div>
                   <div>
                     <div className="text-xs text-gray-500">Revenue</div>
                     <div className="font-bold text-green-500">{formatCurrency(cat.totalRevenue)}</div>
                   </div>
                   <div>
                     <div className="text-xs text-gray-500">Avg Margin</div>
                     <div className={`font-bold ${cat.marginPercent > 0 ? 'text-white' : 'text-red-500'}`}>{Number(cat.marginPercent).toFixed(1)}%</div>
                   </div>
                </div>
             </div>

             {expandedCat === cat.categoryName && (
                <div className="mt-6 pt-6 border-t border-[#333] pl-8 space-y-4">
                   <h4 className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-1"><Tags size={14}/> Brand Breakdown</h4>
                   {cat.brandsList.map((brand: any) => (
                      <div key={brand.brandName} className="bg-[#222] border border-[#333] rounded-md p-4 flex justify-between items-start">
                         <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                               <h5 className="font-bold text-lg text-white">{brand.brandName}</h5>
                               <button
                                 onClick={() => {
                                    const safeName = brand.brandName === 'Unbranded / Raw' ? 'RawCopper' : brand.brandName;
                                    router.push(`/owner/products/${encodeURIComponent(safeName)}?timeframe=${timeframe}`);
                                 }}
                                 className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
                               >
                                 Full Dashboard →
                               </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 max-w-sm">
                               <div>
                                  <div className="text-xs text-gray-500">Total Volume</div>
                                  <div className="font-medium text-gray-300">{Number(brand.totalTons).toFixed(2)} Tons</div>
                               </div>
                               <div>
                                  <div className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp size={12}/> Profit / Ton</div>
                                  <div className="font-medium text-purple-400">{formatCurrency(brand.avgProfitPerTon)}/T</div>
                               </div>
                            </div>
                         </div>

                         <div className="flex-1 border-l border-[#333] pl-6 ml-6">
                            <h6 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Users size={12}/> Top Buyers</h6>
                            <ul className="space-y-1">
                               {brand.topCustomers.map((cust: any) => (
                                 <li key={cust.name} className="flex justify-between text-sm">
                                    <span className="text-gray-300">{cust.name}</span>
                                    <span className="font-bold text-gray-500">{Number(cust.qty).toFixed(2)}T</span>
                                 </li>
                               ))}
                               {brand.topCustomers.length === 0 && <li className="text-xs text-gray-600">No buyers found.</li>}
                            </ul>
                         </div>

                         <div className="flex-1 border-l border-[#333] pl-6 ml-6 text-right">
                            <div className="mb-2">
                               <div className="text-xs text-gray-500">Brand Revenue</div>
                               <div className="font-bold text-green-500">{formatCurrency(brand.totalRevenue)}</div>
                            </div>
                            <div>
                               <div className="text-xs text-gray-500">Brand Gross Profit</div>
                               <div className="font-bold text-blue-400">{formatCurrency(brand.totalGrossProfit)}</div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
}
