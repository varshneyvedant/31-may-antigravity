'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  Package, Users, PackageOpen, CheckCircle, 
  ArrowUpRight, Plus, ClipboardList, RefreshCw 
} from 'lucide-react';
import Link from 'next/link';

export default function ManagerDashboard() {
  const router = useRouter();

  const { data: queryData, isLoading, refetch } = useQuery({
    queryKey: ['managerDashboard'],
    queryFn: async () => {
      const res = await fetch('/api/manager/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 1000 * 30 // Auto refresh every 30 seconds
  });

  const data = queryData;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">
            Manager <span className="text-red-500">Operations</span> Dashboard
          </h2>
          <p className="text-gray-400 text-sm mt-1">Real-time factory floor production & operational metrics</p>
        </div>
        <button 
          onClick={() => refetch()} 
          className="flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 font-semibold py-2 px-4 rounded border border-[#333] transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-gray-400 p-8">Loading operational dashboard...</div>
      ) : (
        <>
          {/* Quick Action Drawer */}
          <div className="card border-l-4 border-l-red-500 bg-red-950/10 p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <h3 className="font-bold text-white text-lg">Quick Operations Control</h3>
                <p className="text-gray-400 text-sm">Perform fast data entries directly into system logs</p>
             </div>
             <div className="flex flex-wrap gap-3">
                <Link href="/manager/production" className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-lg transition-all text-sm">
                   <Plus size={16}/> Log Production
                </Link>
                <Link href="/manager/attendance" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg transition-all text-sm">
                   <Users size={16}/> Mark Attendance
                </Link>
                <Link href="/manager/sales" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-lg transition-all text-sm">
                   <Plus size={16}/> Create Invoice
                </Link>
                <Link href="/manager/payments" className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded shadow-lg transition-all text-sm">
                   <Plus size={16}/> Log Payment
                </Link>
             </div>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card border border-[#333] bg-[#1a1a1a]">
               <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><PackageOpen size={16} className="text-yellow-500" /> Raw Copper Stock</div>
               <div className="text-3xl font-bold text-white mt-1">{Number(data?.rawCopperStock || 0).toFixed(2)} Tons</div>
               <p className="text-xs text-gray-500 mt-2">Available raw materials in store</p>
            </div>
            <div className="card border border-[#333] bg-[#1a1a1a]">
               <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Package size={16} className="text-red-500" /> Production Today</div>
               <div className="text-3xl font-bold text-white mt-1">{Number(data?.productionToday || 0).toFixed(2)} Tons</div>
               <p className="text-xs text-gray-500 mt-2">Wire output today</p>
            </div>
            <div className="card border border-[#333] bg-[#1a1a1a]">
               <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> 30D Average Yield</div>
               <div className="text-3xl font-bold text-green-400 mt-1">{Number(data?.yield30Days || 0).toFixed(2)}%</div>
               <p className="text-xs text-gray-500 mt-2">Target operational yield: 95%+</p>
            </div>
            <div className="card border border-[#333] bg-[#1a1a1a]">
               <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Users size={16} className="text-blue-500" /> Workers Attendance</div>
               <div className="text-3xl font-bold text-blue-400 mt-1">
                 {data?.attendance?.logged ? `${data?.attendance?.present} / ${data?.attendance?.total}` : 'Pending'}
               </div>
               <p className="text-xs text-gray-500 mt-2">
                 {data?.attendance?.logged 
                   ? `${data?.attendance?.absent} Absent, ${data?.attendance?.halfDay} Half-Day` 
                   : 'Attendance logs not submitted yet'}
               </p>
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Recent Production Entries */}
             <div className="card col-span-2">
                <h3 className="text-lg text-gray-300 font-bold mb-4 flex items-center gap-2">
                  <ClipboardList className="text-red-500" /> Recent Production Runs
                </h3>
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="border-b border-[#333] text-gray-400 text-xs uppercase font-medium">
                            <th className="p-3">Date</th>
                            <th className="p-3">Product Category</th>
                            <th className="p-3">Brand</th>
                            <th className="p-3">Copper Used</th>
                            <th className="p-3">Wire Output</th>
                            <th className="p-3">Scrap</th>
                         </tr>
                      </thead>
                      <tbody>
                         {data?.recentProductions?.map((prod: any) => (
                            <tr key={prod.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm text-gray-300">
                               <td className="p-3 whitespace-nowrap">{new Date(prod.date).toLocaleDateString('en-IN')}</td>
                               <td className="p-3 font-semibold text-white">{prod.productCategory}</td>
                               <td className="p-3">{prod.brand || '-'}</td>
                               <td className="p-3">{Number(prod.rawCopperUsed).toFixed(2)}T</td>
                               <td className="p-3 text-green-400 font-bold">{Number(prod.wireProduced).toFixed(2)}T</td>
                               <td className="p-3 text-red-400">{Number(prod.scrapGenerated).toFixed(2)}T</td>
                            </tr>
                         ))}
                         {data?.recentProductions?.length === 0 && (
                            <tr><td colSpan={6} className="p-4 text-center text-gray-500">No production logs registered yet.</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>

             {/* Help Card & Targets */}
             <div className="card col-span-1 flex flex-col justify-between">
                <div>
                   <h3 className="text-lg text-gray-300 font-bold mb-2">Shift Overview & Targets</h3>
                   <p className="text-gray-500 text-sm">Review operational targets assigned by the owners.</p>
                   
                   <div className="space-y-4 mt-6">
                      <div className="bg-[#1e1e1e] p-3 rounded border border-[#333]">
                         <div className="flex justify-between text-xs font-semibold text-gray-400 mb-1">
                            <span>Weekly Production Run</span>
                            <span>{Number(data?.productionWeek || 0).toFixed(1)} / 50 Tons</span>
                         </div>
                         <div className="w-full bg-[#333] h-2 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full" style={{ width: `${Math.min(100, (Number(data?.productionWeek || 0) / 50) * 100)}%` }}></div>
                         </div>
                      </div>

                      <div className="bg-[#1e1e1e] p-3 rounded border border-[#333]">
                         <div className="text-xs font-semibold text-gray-400 mb-1">Weekly Safety Target</div>
                         <p className="text-xs text-gray-500">Maintain scrap generation ratio under <strong className="text-yellow-500">5.0%</strong> per batch. Currently averaged at <strong className="text-emerald-400">{((100 - Number(data?.yield30Days || 0))).toFixed(1)}%</strong> scrap weight loss.</p>
                      </div>
                   </div>
                </div>
                
                <div className="pt-6 border-t border-[#333] text-center">
                    <p className="text-xs text-gray-600">Authorized Manager Session | VARSHNEY ELECTRICAL INDUSTRIES</p>
                 </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
