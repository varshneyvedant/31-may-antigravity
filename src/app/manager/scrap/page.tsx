'use client';

import { formatDateIST } from '@/lib/format';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TimeframeSelector from '@/components/ui/TimeframeSelector';
import { Timeframe } from '@/lib/timeframe';
import { formatCurrency } from '@/lib/format';
import { Trash2, TrendingUp, PackageMinus, HandCoins, Check, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPDF } from '@/lib/export/pdf';

function ScrapDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const initialTimeframe = (searchParams.get('timeframe') as Timeframe) || '1M';
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);

  const [showSellForm, setShowSellForm] = useState(false);
  const [sellForm, setSellForm] = useState({ qty: '', revenue: '' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleTimeframeChange = (newTf: Timeframe) => {
     setTimeframe(newTf);
     router.replace(`/manager/scrap?timeframe=${newTf}`);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/scrap?timeframe=${timeframe}`);
      const json = await res.json();
      setData(json.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initFetch = async () => {
      try {
        const res = await fetch(`/api/manager/scrap?timeframe=${timeframe}`);
        const json = await res.json();

        if (isMounted) {
           setData(json.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initFetch();
    return () => { isMounted = false; };
  }, [timeframe]);

  const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (parseFloat(sellForm.qty) > data.currentHolding) {
        alert('You cannot sell more scrap than you currently hold!');
        return;
     }
     setShowConfirmModal(true);
  };

  const handleConfirmAndRecord = async () => {
     setShowConfirmModal(false);
     const res = await fetch('/api/manager/scrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellForm)
     });

     if (!res.ok) {
        alert('Failed to record scrap sale');
        return;
     }

     alert('Scrap sale recorded successfully! Capital has been added to your bank ledger.');
     setShowSellForm(false);
     setSellForm(prev => ({ ...prev, qty: '', revenue: '' }));
     fetchData();
  };

  if (loading && !data) return <div className="text-gray-400">Loading Scrap module...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Trash2 className="text-yellow-600" /> Scrap Management & Recovery
          </h2>
          <p className="text-gray-400">Automatically tracks the exact discrepancy between raw copper consumed and wire produced.</p>
        </div>
        <TimeframeSelector value={timeframe} onChange={handleTimeframeChange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
         <div className="card border-l-4 border-l-yellow-600">
           <div className="text-gray-400 text-xs mb-1 flex items-center gap-1">Current Scrap Stock</div>
           <div className="text-3xl font-bold text-white">{Number(data?.currentHolding).toFixed(2)}<span className="text-xs text-gray-500 font-normal ml-1">Tons</span></div>
           <p className="text-xs text-gray-500 mt-1">Static Balance (Available to Sell)</p>
         </div>
         <div className="card border-l-4 border-l-red-500 bg-gradient-to-r from-[#1a1a1a] to-[#222]">
           <div className="text-gray-400 text-xs mb-1 flex items-center gap-1"><PackageMinus size={14}/> Generated in Timeframe</div>
           <div className="text-2xl font-bold text-red-400">{Number(data?.generatedInTimeframe).toFixed(2)} Tons</div>
         </div>
         <div className="card border-l-4 border-l-blue-500 bg-gradient-to-r from-[#1a1a1a] to-[#222]">
           <div className="text-gray-400 text-xs mb-1 flex items-center gap-1"><TrendingUp size={14}/> Sold in Timeframe</div>
           <div className="text-2xl font-bold text-blue-400">{Number(data?.soldInTimeframe).toFixed(2)} Tons</div>
         </div>
         <div className="card border-l-4 border-l-green-500 bg-gradient-to-r from-[#1a1a1a] to-[#222]">
           <div className="text-gray-400 text-xs mb-1 flex items-center gap-1"><HandCoins size={14}/> Capital Recovered</div>
           <div className="text-2xl font-bold text-green-400">{formatCurrency(data?.revenueInTimeframe)}</div>
         </div>
      </div>

      <div className="flex gap-4 mb-6">
         <button onClick={() => setShowSellForm(!showSellForm)} className="btn-primary bg-yellow-600 hover:bg-yellow-700 flex items-center gap-2">
            <HandCoins size={18} /> Recover Capital: Sell Scrap
         </button>
      </div>

      {showSellForm && (
         <form onSubmit={handleSubmit} className="card bg-[#1a1a1a] border border-yellow-600/50 mb-8 p-6">
            <h3 className="text-xl font-bold mb-4 text-yellow-500">Record Scrap Sale</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                  <label className="block text-sm text-gray-400 mb-1">Quantity Sold (Tons)</label>
                  <input type="number" step="0.01" className="input-field" required value={sellForm.qty} onChange={e => setSellForm({...sellForm, qty: e.target.value})} />
               </div>
               <div>
                  <label className="block text-sm text-gray-400 mb-1">Total Revenue Received (₹)</label>
                  <input type="number" step="0.01" className="input-field" required value={sellForm.revenue} onChange={e => setSellForm({...sellForm, revenue: e.target.value})} />
               </div>
            </div>
            <div className="mt-4 flex gap-4">
               <button type="submit" className="btn-primary bg-yellow-600 hover:bg-yellow-700">Confirm Scrap Sale</button>
               <button type="button" onClick={() => setShowSellForm(false)} className="px-4 py-2 bg-[#2a2a2a] text-gray-300 rounded hover:text-white">Cancel</button>
            </div>
         </form>
      )}

      <div className="card">
         <div className="flex justify-between items-center mb-4 border-[#333]">
            <h3 className="text-xl font-bold flex items-center gap-2">
              Scrap Inventory Ledger ({timeframe})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                   const dataToExport = data.history.map((log: any) => ({
                      Date: formatDateIST(log.date),
                      Type: log.type === 'GENERATED' ? 'GENERATED (PRODUCTION)' : 'SOLD (RECOVERY)',
                      Quantity: Number(log.qty).toFixed(2),
                      Revenue: log.type === 'SOLD' ? Number(log.revenue) : 0
                   }));
                   exportToExcel(dataToExport, `Scrap_Ledger_${timeframe}`);
                }}
                className="bg-[#1f2937] hover:bg-gray-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Download size={14}/> Export Excel
              </button>
              <button
                onClick={() => {
                   const headers = ['Date', 'Transaction Type', 'Quantity (Tons)', 'Revenue Earned'];
                   const rows = data.history.map((log: any) => [
                      formatDateIST(log.date),
                      log.type === 'GENERATED' ? '🏭 GENERATED (PRODUCTION)' : '💰 SOLD (RECOVERY)',
                      Number(log.qty).toFixed(2),
                      log.type === 'SOLD' ? formatCurrency(log.revenue) : '-'
                   ]);
                   exportToPDF(headers, rows, `Scrap Inventory Ledger (${timeframe})`);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Download size={14}/> Export PDF
              </button>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-[#1e1e1e]">
                  <tr className="border-b border-[#333] text-gray-400 text-xs uppercase tracking-wider">
                     <th className="p-3">Date</th>
                     <th className="p-3">Transaction Type</th>
                     <th className="p-3 text-right">Quantity (Tons)</th>
                     <th className="p-3 text-right">Revenue Earned</th>
                  </tr>
               </thead>
               <tbody>
                  {data?.history.map((log: any) => (
                     <tr key={log.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                        <td className="p-3 text-gray-300">{formatDateIST(log.date)}</td>
                        <td className="p-3">
                           {log.type === 'GENERATED' ? (
                              <span className="text-red-400 bg-red-950/30 px-2 py-1 rounded text-xs font-bold border border-red-500/20">🏭 GENERATED (PRODUCTION)</span>
                           ) : (
                              <span className="text-yellow-500 bg-yellow-950/30 px-2 py-1 rounded text-xs font-bold border border-yellow-600/30">💰 SOLD (RECOVERY)</span>
                           )}
                        </td>
                        <td className="p-3 font-bold text-white text-right">{Number(log.qty).toFixed(2)}</td>
                        <td className="p-3 font-bold text-green-400 text-right">{log.type === 'SOLD' ? formatCurrency(log.revenue) : '-'}</td>
                     </tr>
                  ))}
                  {data?.history.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">No scrap generated or sold in this timeframe.</td></tr>}
               </tbody>
            </table>
         </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                 <Check className="text-green-500" /> Confirm Scrap Sale
              </h3>
              <p className="text-sm text-gray-400 mb-4 border-b border-[#333]/50 pb-2">
                 Please review the scrap recovery details below before recording the sale.
              </p>

              <div className="space-y-3 mb-6 text-sm text-gray-300">
                 <div className="flex justify-between">
                    <span className="text-gray-500">Quantity Sold:</span>
                    <span className="font-bold text-white">{parseFloat(sellForm.qty).toFixed(2)} Tons</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Revenue Received:</span>
                    <span className="font-bold text-green-400">{formatCurrency(parseFloat(sellForm.revenue))}</span>
                 </div>
                 <div className="flex justify-between border-t border-[#333]/30 pt-2 text-xs text-gray-500">
                    <span>Ledger Impact:</span>
                    <span className="italic text-gray-400">Capital added directly to bank ledger</span>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button 
                    onClick={handleConfirmAndRecord}
                    className="btn-primary flex-1 bg-green-600 hover:bg-green-700 font-bold"
                 >
                    Confirm & Record
                 </button>
                 <button 
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 bg-[#2a2a2a] text-gray-300 hover:text-white rounded font-bold border border-[#333]"
                 >
                    Edit / Cancel
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default function ScrapDashboard() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading scrap module...</div>}>
       <ScrapDashboardContent />
    </Suspense>
  );
}
