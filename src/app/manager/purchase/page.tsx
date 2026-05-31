'use client';


import { getCurrentISTInput, formatDateIST } from '@/lib/format';


import { useState, useEffect } from 'react';
import { Check, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPDF } from '@/lib/export/pdf';

export default function PurchasePage() {
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([]);
  const [formData, setFormData] = useState({
    supplierId: '',
    qty: '',
    pricePerKg: '',
    date: getCurrentISTInput()
  });
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchRecentPurchases = () => {
     fetch('/api/manager/purchase')
        .then(res => res.json())
        .then(data => {
           if (data.purchases) setRecentPurchases(data.purchases);
        });
  };

  useEffect(() => {
    fetchRecentPurchases();
    fetch('/api/suppliers')
      .then(res => res.json())
      .then(data => {
        if(data.suppliers) {
           setSuppliers(data.suppliers);
           if(data.suppliers.length > 0) setFormData(prev => ({...prev, supplierId: data.suppliers[0].id}));
        }
      });
  }, []);

  // Total Value = Qty (in Tons) * 1000 (to get KGs) * price per KG
  const totalValue = (parseFloat(formData.qty) || 0) * 1000 * (parseFloat(formData.pricePerKg) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmAndRecord = async () => {
    setShowConfirmModal(false);
    // Convert pricePerKg to pricePerTon for the database
    const pricePerTon = (parseFloat(formData.pricePerKg) || 0) * 1000;

    await fetch('/api/manager/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         supplierId: formData.supplierId,
         qty: formData.qty,
         pricePerTon: pricePerTon,
         date: formData.date
      })
    });
    alert('Purchase logged successfully!');
    setFormData(prev => ({ ...prev, qty: '', pricePerKg: '' }));
    fetchRecentPurchases();
  };

  const handleUndo = async (id: string) => {
     if (!window.confirm('Are you sure you want to undo this purchase? This will reverse the supplier ledger entry.')) return;
     await fetch(`/api/manager/purchase?id=${id}`, { method: 'DELETE' });
     fetchRecentPurchases();
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="text-red-500">Log</span> Raw Copper Purchase
      </h2>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Supplier</label>
            <select
              className="input-field"
              value={formData.supplierId}
              onChange={e => setFormData({...formData, supplierId: e.target.value})}
              required
            >
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date of Record</label>
            <input
              type="datetime-local"
              className="input-field"
              min="2000-01-01"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Quantity (Tons)</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={formData.qty}
              onChange={e => setFormData({...formData, qty: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Price per KG (₹)</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={formData.pricePerKg}
              onChange={e => setFormData({...formData, pricePerKg: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="p-4 bg-[#2a2a2a] rounded-md mt-2 flex justify-between items-center">
          <span className="text-gray-300">Total Invoice Value:</span>
          <span className="text-xl font-bold text-white">₹ {totalValue.toLocaleString('en-IN')}</span>
        </div>

        <button type="submit" className="btn-primary mt-4">Record Purchase</button>
      </form>

      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-300">Recent Purchases History</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                 const dataToExport = recentPurchases.map((purchase: any) => ({
                    Date: formatDateIST(purchase.date),
                    Supplier: purchase.supplier.name,
                    Quantity: `${Number(purchase.qty).toFixed(2)} Tons`,
                    PricePerTon: Number(purchase.pricePerTon),
                    TotalValue: Number(purchase.totalValue)
                 }));
                 exportToExcel(dataToExport, `Purchases_History_${new Date().toISOString().slice(0,10)}`);
              }}
              className="bg-[#1f2937] hover:bg-gray-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1.5"
            >
              <Download size={14}/> Export Excel
            </button>
            <button
              onClick={() => {
                 const headers = ['Date', 'Supplier', 'Quantity', 'Price/Ton', 'Total Value'];
                 const rows = recentPurchases.map((purchase: any) => [
                    formatDateIST(purchase.date),
                    purchase.supplier.name,
                    `${Number(purchase.qty).toFixed(2)} Tons`,
                    `₹ ${Number(purchase.pricePerTon).toLocaleString('en-IN', {maximumFractionDigits:0})}`,
                    `₹ ${Number(purchase.totalValue).toLocaleString('en-IN', {maximumFractionDigits:0})}`
                 ]);
                 exportToPDF(headers, rows, 'Recent Purchases History Report');
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1.5"
            >
              <Download size={14}/> Export PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-[#1a1a1a] rounded overflow-hidden">
            <thead className="bg-[#222]">
              <tr className="border-b border-[#333] text-gray-400 text-sm">
                <th className="p-3">Date</th>
                <th className="p-3">Supplier</th>
                <th className="p-3 text-right">Total Value</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentPurchases.map((purchase) => (
                <tr key={purchase.id} className="border-b border-[#333] last:border-0 text-sm hover:bg-[#2a2a2a]">
                  <td className="p-3 text-gray-300">{formatDateIST(purchase.date)}</td>
                  <td className="p-3 font-medium text-white">{purchase.supplier.name}</td>
                  <td className="p-3 text-right font-bold text-red-400">₹ {purchase.totalValue.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                  <td className="p-3 text-center">
                    <button type="button" onClick={() => handleUndo(purchase.id)} className="text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1 bg-red-500/10 rounded border border-red-500/20">
                      Undo / Delete
                    </button>
                  </td>
                </tr>
              ))}
              {recentPurchases.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500">No recent purchases found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                 <Check className="text-green-500" /> Confirm Raw Copper Purchase
              </h3>
              <p className="text-sm text-gray-400 mb-4 border-b border-[#333]/50 pb-2">
                 Please review the purchase details below before recording.
              </p>

              <div className="space-y-3 mb-6 text-sm text-gray-300">
                 <div className="flex justify-between">
                    <span className="text-gray-500">Supplier Name:</span>
                    <span className="font-bold text-white">
                       {suppliers.find(s => s.id === formData.supplierId)?.name || ''}
                    </span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Quantity:</span>
                    <span className="font-bold text-white">{formData.qty} Tons</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Price per KG:</span>
                    <span className="font-bold text-white">₹ {formData.pricePerKg}/kg</span>
                 </div>
                 <div className="flex justify-between border-t border-[#333]/30 pt-2 bg-red-950/10 border-red-900/30 p-2 rounded">
                    <span className="text-gray-400">Total Invoice Value:</span>
                    <span className="font-bold text-white">₹ {totalValue.toLocaleString('en-IN')}</span>
                 </div>
                 <div className="flex justify-between border-t border-[#333]/30 pt-2 text-xs text-gray-500">
                    <span>Log Date:</span>
                    <span>{formData.date ? formatDateIST(formData.date) : 'Current Time'}</span>
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
