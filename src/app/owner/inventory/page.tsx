'use client';

import { formatDateIST } from '@/lib/format';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Package, Clock, Download } from 'lucide-react';
import { format } from 'date-fns';
import { exportToExcel } from '@/lib/export/excel';

export default function InventoryDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/owner/inventory');
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
  }, []);

  if (loading) return <div className="text-gray-400">Loading complex FIFO analytics...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <span className="text-red-500">Live</span> Inventory Valuation
      </h2>

      {data.alert.alert && (
        <div className="bg-red-950/50 border border-red-500 p-4 rounded-md flex items-center gap-4">
          <AlertTriangle className="text-red-500 w-8 h-8" />
          <div>
            <h3 className="font-bold text-red-500">Low Stock Alert</h3>
            <p className="text-gray-300">{data.alert.message}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Package size={18} /> Remaining Stock
          </div>
          <div className="text-3xl font-bold text-white">{Number(data.remainingStockTons).toFixed(2)} Tons</div>
          <div className="text-sm text-gray-500 mt-1">
            {data.alert.daysRemaining !== null ? `${data.alert.daysRemaining} days of supply left` : 'Unknown supply remaining'}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 text-gray-400 mb-2">Current Market Price</div>
          <div className="text-3xl font-bold text-white">₹ {(data.currentMarketPricePerTon / 1000).toLocaleString('en-IN', {maximumFractionDigits:2})}</div>
          <div className="text-sm text-gray-500 mt-1">per KG</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 text-gray-400 mb-2">Total FIFO Cost (Exact)</div>
          <div className="text-3xl font-bold text-white">₹ {data.fifoCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
          <div className="text-sm text-gray-500 mt-1">Based on exact purchase history</div>
        </div>
      </div>

      <div className="card mt-6 border-l-4 border-l-red-500">
        <h3 className="text-xl text-gray-400 mb-4">Stock Valuation Profit / Loss</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="text-gray-500 mb-1">If sold at current market rate:</p>
            <div className="text-4xl font-bold text-white">
              ₹ {data.currentMarketValue.toLocaleString('en-IN', {maximumFractionDigits: 0})}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-gray-500 mb-1">Net Gain/Loss vs Cost:</p>
            <div className={`text-3xl font-bold flex items-center gap-2 ${data.isProfit ? 'text-green-500' : 'text-red-500'}`}>
              {data.isProfit ? <TrendingUp /> : <TrendingDown />}
              ₹ {Math.abs(data.netProfitLoss).toLocaleString('en-IN', {maximumFractionDigits: 0})}
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Order History Tab for Inventory */}
      <div className="card mt-6">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-xl text-gray-300 font-bold flex items-center gap-2">
             <Clock size={20} className="text-red-500" /> Recent Raw Copper Orders
           </h3>
           <button
             onClick={() => exportToExcel(data.orderHistory, 'Raw_Copper_Orders')}
             className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 text-sm"
           >
             <Download size={14}/> Export
           </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#333] text-gray-400 text-sm">
                <th className="p-3">Date</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Qty (Tons)</th>
                <th className="p-3">Price / KG</th>
                <th className="p-3">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {data.orderHistory.map((order: any) => (
                <tr key={order.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] transition-colors text-sm">
                  <td className="p-3 text-gray-300">{formatDateIST(order.date)}</td>
                  <td className="p-3 font-bold text-white">{order.supplierName}</td>
                  <td className="p-3 text-gray-300">{Number(order.qty).toFixed(2)}</td>
                  <td className="p-3 text-gray-300">₹ {(order.pricePerTon / 1000).toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                  <td className="p-3 font-bold text-white">₹ {order.totalValue.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
