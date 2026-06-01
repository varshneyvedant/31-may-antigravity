'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, Banknote, CreditCard, Factory, 
  ArrowUpRight, ShieldCheck, ClipboardList, RefreshCw, 
  Activity, ArrowRight, RotateCcw 
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { formatCurrency, formatDateIST } from '@/lib/format';

export default function OwnerDashboard() {
  const router = useRouter();
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const { data: queryData, isLoading, refetch } = useQuery({
    queryKey: ['ownerDashboard'],
    queryFn: async () => {
      const res = await fetch('/api/owner/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 1000 * 45 // Refresh every 45 seconds
  });

  const data = queryData;

  const handleRollback = async (logId: string) => {
    if (!confirm("Are you absolutely sure you want to rollback and reverse this action? This will undo the creation of the record in the database.")) return;
    setRollingBackId(logId);
    try {
      const res = await fetch('/api/owner/audit/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId })
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Rollback failed");
      } else {
        alert("Rollback successful! The transaction has been reversed.");
        refetch();
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setRollingBackId(null);
    }
  };

  const handleAuthorizePayment = async (paymentId: string, action: 'APPROVE' | 'REJECT') => {
    const actionStr = action === 'APPROVE' ? 'Approve' : 'Reject';
    if (!confirm(`Are you sure you want to ${actionStr} this stakeholder payment?`)) return;

    try {
      const res = await fetch('/api/owner/payments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action })
      });
      const json = await res.json();
      if (res.ok) {
        alert(`Successfully ${action === 'APPROVE' ? 'approved' : 'rejected'} payment!`);
        refetch();
      } else {
        alert(json.error || 'Authorization failed');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred.');
    }
  };

  const getIsRollbackable = (log: any) => {
    if (log.action !== 'CREATE') return false;
    try {
      if (!log.details) return false;
      const details = JSON.parse(log.details);
      return !!details.id;
    } catch {
      return false;
    }
  };

  const getActionColor = (action: string) => {
    switch(action) {
      case 'CREATE': return 'text-green-500 bg-green-950/40 border-green-500/20';
      case 'UPDATE': return 'text-blue-500 bg-blue-950/40 border-blue-500/20';
      case 'DELETE': return 'text-red-500 bg-red-950/40 border-red-500/20';
      default: return 'text-gray-400 bg-gray-800 border-gray-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            Owner <span className="text-red-500">Executive</span> Command Center
          </h2>
          <p className="text-gray-400 text-sm mt-1">High-level financial surveillance & factory operational control</p>
        </div>
        <button 
          onClick={() => refetch()} 
          className="flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 font-semibold py-2 px-4 rounded border border-[#333] transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-gray-400 p-8">Loading executive command dashboard...</div>
      ) : (
        <>
          {/* Quick Deep Dives Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <Link href="/owner/financials" className="card border border-[#333] hover:border-red-500/40 bg-[#1a1a1a] transition-all p-5 flex flex-col justify-between group">
                <div>
                   <h3 className="text-gray-300 font-bold group-hover:text-red-400 transition-colors">Financial Dashboard</h3>
                   <p className="text-xs text-gray-500 mt-1">Detailed Revenue, Profit, and Expense analytics</p>
                </div>
                <div className="text-red-500 flex items-center gap-1 mt-4 text-xs font-semibold">
                   View Deep Dive <ArrowRight size={12}/>
                </div>
             </Link>
             <Link href="/owner/stakeholders" className="card border border-[#333] hover:border-blue-500/40 bg-[#1a1a1a] transition-all p-5 flex flex-col justify-between group">
                <div>
                   <h3 className="text-gray-300 font-bold group-hover:text-blue-400 transition-colors">Stakeholders Ledger</h3>
                   <p className="text-xs text-gray-500 mt-1">Balances, wait-times, and payment histories</p>
                </div>
                <div className="text-blue-500 flex items-center gap-1 mt-4 text-xs font-semibold">
                   View Stakeholders <ArrowRight size={12}/>
                </div>
             </Link>
             <Link href="/owner/inventory" className="card border border-[#333] hover:border-yellow-500/40 bg-[#1a1a1a] transition-all p-5 flex flex-col justify-between group">
                <div>
                   <h3 className="text-gray-300 font-bold group-hover:text-yellow-400 transition-colors">Raw Copper Analytics</h3>
                   <p className="text-xs text-gray-500 mt-1">Inventory lifespans, reorders, and yields</p>
                </div>
                <div className="text-yellow-500 flex items-center gap-1 mt-4 text-xs font-semibold">
                   View Stock Analytics <ArrowRight size={12}/>
                </div>
             </Link>
             <Link href="/owner/employees" className="card border border-[#333] hover:border-purple-500/40 bg-[#1a1a1a] transition-all p-5 flex flex-col justify-between group">
                <div>
                   <h3 className="text-gray-300 font-bold group-hover:text-purple-400 transition-colors">HR & Payroll</h3>
                   <p className="text-xs text-gray-500 mt-1">Manage staff wages, audit adjustments, and salary scales</p>
                </div>
                <div className="text-purple-500 flex items-center gap-1 mt-4 text-xs font-semibold">
                   Manage Employees <ArrowRight size={12}/>
                </div>
             </Link>
          </div>

          {/* Section Headers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Financial Panel */}
             <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                   <Banknote className="text-emerald-500" /> Current Financial Position
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-[#1a1a1a] rounded border border-[#333] border-l-4 border-l-green-500">
                      <div className="text-gray-400 text-xs mb-1">Receivables (Owed to Us)</div>
                      <div className="text-2xl font-bold text-white">{formatCurrency(data?.financials?.totalReceivables || 0)}</div>
                   </div>
                   <div className="p-4 bg-[#1a1a1a] rounded border border-[#333] border-l-4 border-l-red-500">
                      <div className="text-gray-400 text-xs mb-1">Payables (We Owe)</div>
                      <div className="text-2xl font-bold text-white">{formatCurrency(data?.financials?.totalPayables || 0)}</div>
                   </div>
                   <div className="p-4 bg-[#1a1a1a] rounded border border-[#333] border-l-4 border-l-blue-500">
                      <div className="text-gray-400 text-xs mb-1">Net Position</div>
                      <div className="text-2xl font-bold text-blue-400">{formatCurrency(data?.financials?.netAmount || 0)}</div>
                   </div>
                   <div className="p-4 bg-[#1a1a1a] rounded border border-[#333] border-l-4 border-l-emerald-500 bg-emerald-950/10">
                      <div className="text-gray-400 text-xs mb-1">Cash in Hand</div>
                      <div className="text-2xl font-bold text-emerald-400">{formatCurrency(data?.financials?.cashInHand || 0)}</div>
                   </div>
                </div>
             </div>

             {/* Floor Operations Panel */}
             <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                   <Factory className="text-yellow-500" /> Live Floor Operations
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-[#1a1a1a] rounded border border-[#333]">
                      <div className="text-gray-400 text-xs mb-1">Raw Copper Stock</div>
                      <div className="text-2xl font-bold text-white">{Number(data?.operations?.rawCopperStock || 0).toFixed(2)} Tons</div>
                   </div>
                   <div className="p-4 bg-[#1a1a1a] rounded border border-[#333]">
                      <div className="text-gray-400 text-xs mb-1">Wire Output Today</div>
                      <div className="text-2xl font-bold text-white">{Number(data?.operations?.productionToday || 0).toFixed(2)} Tons</div>
                   </div>
                   <div className="p-4 bg-[#1a1a1a] rounded border border-[#333] col-span-2">
                      <div className="text-gray-400 text-xs mb-1">30D Rolling Production Yield</div>
                      <div className="flex justify-between items-center mt-1">
                         <div className={`text-2xl font-bold ${Number(data?.operations?.yield30Days || 0) >= 95 ? 'text-green-500' : 'text-red-500'}`}>
                            {Number(data?.operations?.yield30Days || 0).toFixed(2)}%
                         </div>
                         <span className="text-[10px] text-gray-500 font-semibold uppercase">Target: 95%+</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Pending Payment Authorizations (Dual-Authorization) */}
          {data?.pendingPayments && data.pendingPayments.length > 0 && (
             <div className="card border-t-2 border-t-yellow-500 bg-[#1a1a1a]/80 backdrop-blur-md">
                <div className="flex justify-between items-center mb-4 border-b border-[#333] pb-3">
                   <h3 className="text-lg text-yellow-500 font-bold flex items-center gap-2">
                     <RotateCcw className="text-yellow-500" size={18} /> Pending Payment Authorizations
                   </h3>
                   <span className="px-2 py-0.5 bg-yellow-950/40 text-yellow-400 border border-yellow-500/20 text-xs font-black rounded-full">
                      {data.pendingPayments.length} Action Needed
                   </span>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                      <thead>
                         <tr className="border-b border-[#333] text-gray-400 text-xs uppercase font-black">
                            <th className="p-3">Submitted At</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Stakeholder</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Description</th>
                            <th className="p-3 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody>
                         {data.pendingPayments.map((p: any) => (
                            <tr key={p.id} className="border-b border-[#333] last:border-0 hover:bg-[#252525] text-gray-300">
                               <td className="p-3 whitespace-nowrap text-xs text-gray-400">{formatDateIST(p.date)}</td>
                               <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${p.type === 'INCOMING' ? 'bg-green-950/40 text-green-400 border border-green-500/20' : 'bg-red-950/40 text-red-400 border border-red-500/20'}`}>
                                     {p.type === 'INCOMING' ? 'Customer Paid' : 'We Paid'}
                                  </span>
                               </td>
                               <td className="p-3 font-semibold text-white">
                                  {p.customer?.name || p.supplier?.name || '-'}
                                </td>
                               <td className="p-3 font-bold text-white text-base">
                                  {formatCurrency(Number(p.amount))}
                               </td>
                               <td className="p-3 text-xs text-gray-400 max-w-xs truncate">{p.description || '-'}</td>
                               <td className="p-3 text-right flex justify-end gap-2">
                                  <button
                                    onClick={() => handleAuthorizePayment(p.id, 'APPROVE')}
                                    className="px-2.5 py-1 bg-green-950/30 hover:bg-green-900/60 text-green-400 border border-green-500/20 text-xs rounded font-black transition-all"
                                  >
                                     Approve
                                  </button>
                                  <button
                                    onClick={() => handleAuthorizePayment(p.id, 'REJECT')}
                                    className="px-2.5 py-1 bg-red-950/30 hover:bg-red-900/60 text-red-400 border border-red-500/20 text-xs rounded font-black transition-all"
                                  >
                                     Reject
                                  </button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {/* Recent Audit Trails */}
          <div className="card">
             <div className="flex justify-between items-center mb-4 border-b border-[#333] pb-3">
                <h3 className="text-lg text-gray-300 font-bold flex items-center gap-2">
                  <Activity className="text-purple-500" /> Recent System Activities
                </h3>
                <Link href="/owner/audit" className="text-xs text-red-500 hover:text-red-400 font-bold flex items-center gap-1">
                   View Full Logs <ArrowRight size={12}/>
                </Link>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead>
                      <tr className="border-b border-[#333] text-gray-400 text-xs uppercase">
                         <th className="p-3">Timestamp</th>
                         <th className="p-3">User</th>
                         <th className="p-3">Module</th>
                         <th className="p-3">Action</th>
                         <th className="p-3">Description</th>
                         <th className="p-3 text-right">Overrides</th>
                      </tr>
                   </thead>
                   <tbody>
                      {data?.recentAudits?.map((log: any) => (
                         <tr key={log.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm text-gray-300">
                            <td className="p-3 whitespace-nowrap">{formatDateIST(log.date)}</td>
                            <td className="p-3">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-black ${log.user === 'OWNER' ? 'bg-red-950/40 text-red-400' : 'bg-blue-950/40 text-blue-400'}`}>
                                  {log.user}
                               </span>
                            </td>
                            <td className="p-3 font-semibold text-white">{log.module}</td>
                            <td className="p-3">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getActionColor(log.action)}`}>
                                  {log.action}
                               </span>
                            </td>
                            <td className="p-3">{log.description}</td>
                            <td className="p-3 text-right">
                               {getIsRollbackable(log) ? (
                                  <button
                                    disabled={rollingBackId === log.id}
                                    onClick={() => handleRollback(log.id)}
                                    className="px-2 py-0.5 bg-red-950/30 hover:bg-red-900/50 text-red-500 border border-red-500/20 text-[10px] rounded transition-all flex items-center gap-1 font-black ml-auto"
                                  >
                                     <RotateCcw size={10} className={rollingBackId === log.id ? "animate-spin" : ""} />
                                     Rollback
                                  </button>
                               ) : (
                                  <span className="text-[10px] text-gray-600 font-medium italic">Immutable</span>
                                )}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
