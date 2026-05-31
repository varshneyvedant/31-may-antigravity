'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Share2, Printer, Check, Download } from 'lucide-react';
import { create } from 'zustand';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPDF } from '@/lib/export/pdf';

interface SaleItem {
  productCategory: string;
  brand: string;
  wireType: string;
  qty: string;
  pricePerKg: string;
}

interface CartStore {
  items: SaleItem[];
  addItem: () => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, field: keyof SaleItem, value: string) => void;
  reset: () => void;
}

const useCartStore = create<CartStore>((set) => ({
  items: [{ productCategory: 'CC Wires', brand: 'Poly Vansh', wireType: '1mm', qty: '', pricePerKg: '' }],
  addItem: () => set((state) => ({ items: [...state.items, { productCategory: 'CC Wires', brand: 'Poly Vansh', wireType: '1mm', qty: '', pricePerKg: '' }] })),
  removeItem: (index) => set((state) => ({ items: state.items.filter((_, i) => i !== index) })),
  updateItem: (index, field, value) => set((state) => {
    const newItems = [...state.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'productCategory' && value === 'Raw Copper Bundle') {
       newItems[index].brand = '';
       newItems[index].wireType = '';
    } else if (field === 'productCategory') {
       const brands = getBrands(value);
       newItems[index].brand = brands.length > 0 ? brands[0] : '';
       newItems[index].wireType = '1mm';
    }
    return { items: newItems };
  }),
  reset: () => set({ items: [{ productCategory: 'CC Wires', brand: 'Poly Vansh', wireType: '1mm', qty: '', pricePerKg: '' }] })
}));

function getBrands(category: string) {
  if (category === 'CC Wires') return ['Poly Vansh', 'Poly Unnati', 'Poly Unique Plus', 'Poly Unique Plus Premium'];
  if (category === 'Submersible Winding Wire') return ['Poly Lifeline', 'Poly Life Plus'];
  return [];
}

function calculateItemTotal(item: any) {
  const q = parseFloat(item.qty) || 0;
  const p = parseFloat(item.pricePerKg) || 0;
  return (q * 1000) * p;
}

function formatDateIST(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

export default function RecordSale() {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [overridePin, setOverridePin] = useState('');
  const [pinError, setPinError] = useState('');
  const [createdSaleForSlip, setCreatedSaleForSlip] = useState<any>(null);

  const { items, addItem, removeItem, updateItem, reset } = useCartStore();

  const { data: customersData } = useQuery({ queryKey: ['customers'], queryFn: () => fetch('/api/customers').then(res => res.json()) });
  const customers = customersData?.customers || [];

  const { data: salesData } = useQuery({ queryKey: ['recentSales'], queryFn: () => fetch('/api/manager/sales').then(res => res.json()) });
  const recentSales = salesData?.sales || [];

  const { data: costData } = useQuery({ queryKey: ['copperCost'], queryFn: () => fetch('/api/copper-cost').then(res => res.json()) });
  const currentCost = costData?.costPerTon || 0;

  const { data: finishedData } = useQuery({ queryKey: ['finishedInventory'], queryFn: () => fetch('/api/shared/inventory/finished').then(res => res.json()) });
  const finishedTree = finishedData?.tree || [];

  const getItemStock = (item: any) => {
    if (item.productCategory === 'Raw Copper Bundle') {
      return costData?.remainingStockTons || 0;
    }
    const catNode = finishedTree.find((c: any) => c.name === item.productCategory);
    if (!catNode) return 0;
    const brandNode = catNode.brands.find((b: any) => b.name === (item.brand || 'Unbranded'));
    if (!brandNode) return 0;
    const sizeNode = brandNode.sizes.find((s: any) => s.size === (item.wireType || 'N/A'));
    return sizeNode ? sizeNode.available : 0;
  };

  useEffect(() => {
    if (customers.length > 0 && !customerId) {
       setCustomerId(customers[0].id);
     }
  }, [customers, customerId]);

  const handleItemChange = (index: number, field: string, value: string) => updateItem(index, field as keyof SaleItem, value);

  let grandTotal = 0;
  items.forEach(item => {
    grandTotal += calculateItemTotal(item);
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/manager/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, date, items })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to record sale');
      return data;
    },
    onSuccess: (data) => {
      const slipCustomer = customers.find((c: any) => c.id === customerId);
      setCreatedSaleForSlip({
        invoiceNo: `VE-${Date.now().toString().slice(-6)}`,
        date: date ? new Date(date) : new Date(),
        customer: slipCustomer,
        items: [...items],
        total: grandTotal
      });

      reset();
      setDate('');
      setShowPinModal(false);
      setOverridePin('');
      queryClient.invalidateQueries({ queryKey: ['recentSales'] });
      queryClient.invalidateQueries({ queryKey: ['copperCost'] });
      queryClient.invalidateQueries({ queryKey: ['finishedInventory'] });
    },
    onError: (err: any) => alert(err.message)
  });

  const submitSale = async () => { submitMutation.mutate(); };

  const undoMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/manager/sales?id=' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentSales'] });
      queryClient.invalidateQueries({ queryKey: ['finishedInventory'] });
    }
  });

  const handleUndo = (id: string) => {
    if (!confirm('Are you sure you want to undo this sale? This will soft-delete the ledger entry.')) return;
    undoMutation.mutate(id);
  };

  const handleViewSlip = (sale: any) => {
    const slipItems = sale.items.map((item: any) => ({
      productCategory: item.productCategory,
      brand: item.brand,
      wireType: item.wireType,
      qty: Number(item.qty),
      pricePerKg: Number(item.pricePerTon) / 1000
    }));

    setCreatedSaleForSlip({
      invoiceNo: `VE-${sale.id.slice(-6).toUpperCase()}`,
      date: new Date(sale.date),
      customer: sale.customer,
      items: slipItems,
      total: Number(sale.totalValue)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmAndRecord = async () => {
    setShowConfirmModal(false);
    const currentCostPerKg = currentCost / 1000;
    const isLossMaking = items.some(item => parseFloat(item.pricePerKg) < currentCostPerKg);
    if (isLossMaking) {
       setShowPinModal(true);
    } else {
       await submitSale();
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (overridePin === '1234') {
       submitSale();
    } else {
       setPinError('Invalid Owner PIN. Sale aborted.');
    }
  };

  const getWhatsAppShareUrl = (slip: any) => {
    if (!slip) return '';
    let text = `*LEDGER SLIP*\n`;
    text += `----------------------------------------\n`;
    text += `*Date:* ${new Date(slip.date).toLocaleDateString('en-IN')}\n`;
    text += `*Party Name:* ${slip.customer?.name || 'Cash Sale'}\n`;
    if (slip.customer?.transport) {
      text += `*Transport:* ${slip.customer.transport}\n`;
    }
    text += `----------------------------------------\n`;
    text += `*Items Details:*\n`;
    slip.items.forEach((item: any) => {
      const qtyText = `${item.qty} Tons`;
      const itemDesc = item.productCategory === 'Raw Copper Bundle' 
        ? `Raw Copper` 
        : `${item.brand} ${item.wireType}`;
      text += `- ${itemDesc} (${qtyText}) @ ₹${item.pricePerKg}/Kg = ₹${calculateItemTotal(item).toLocaleString('en-IN', {maximumFractionDigits:0})}\n`;
    });
    text += `----------------------------------------\n`;
    text += `*GRAND TOTAL: ₹${slip.total.toLocaleString('en-IN', {maximumFractionDigits:0})}*\n`;
    text += `----------------------------------------\n`;

    const phone = slip.customer?.contact || '';
    return `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`;
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('ledger-slip');
    if (!element) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: '#fcfbf4',
        scale: 2,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `ledger-slip-${createdSaleForSlip?.invoiceNo || Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating image:', err);
      alert('Failed to generate image. Please try again.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Import Caveat Handwriting Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap" rel="stylesheet" />

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="text-red-500">Record</span> Customer Sale Invoice
      </h2>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Select Customer</label>
            <select
              className="input-field"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              required
            >
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date of Record</label>
            <input
              type="datetime-local"
              className="input-field"
              min="2000-01-01"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="border border-[#333] p-4 rounded-md bg-[#1a1a1a]">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-gray-300">Invoice Items</h3>
             <button type="button" onClick={addItem} className="text-red-500 text-sm flex items-center gap-1 hover:text-red-400">
                <Plus size={16} /> Add Item
             </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap items-end gap-4 p-3 bg-[#222] rounded border border-[#333]">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select className="input-field text-sm" value={item.productCategory} onChange={e => handleItemChange(index, 'productCategory', e.target.value)}>
                    <option value="CC Wires">CC Wires</option>
                    <option value="Submersible Winding Wire">Submersible Winding</option>
                    <option value="Raw Copper Bundle">Raw Copper Bundle</option>
                  </select>
                </div>

                {item.productCategory !== 'Raw Copper Bundle' && (
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs text-gray-500 mb-1">Brand</label>
                    <select className="input-field text-sm" value={item.brand} onChange={e => handleItemChange(index, 'brand', e.target.value)}>
                      {getBrands(item.productCategory).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}

                {item.productCategory !== 'Raw Copper Bundle' && (
                  <div className="flex-1 min-w-[80px]">
                    <label className="block text-xs text-gray-500 mb-1">Size</label>
                    <select className="input-field text-sm" value={item.wireType} onChange={e => handleItemChange(index, 'wireType', e.target.value)}>
                      <option value="1mm">1mm</option>
                      <option value="2mm">2mm</option>
                      <option value="3mm">3mm</option>
                      <option value="4mm">4mm</option>
                    </select>
                  </div>
                )}

                <div className="flex-1 min-w-[120px]">
                  <div className="flex justify-between items-end mb-1">
                     <label className="block text-xs text-gray-500">Quantity (Tons)</label>
                     <span className="text-[10px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded font-bold">Stock: {Number(getItemStock(item)).toFixed(2)}T</span>
                  </div>
                  <input
                    type="number" step="0.01" className="input-field text-sm" required
                    value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-1">
                     <label className="block text-xs text-gray-500">Selling Price/KG (₹)</label>
                     <span className="text-[10px] text-orange-500 bg-orange-500/10 px-1 rounded">Cost/KG: ₹{(currentCost / 1000).toLocaleString('en-IN', {maximumFractionDigits:2})}</span>
                  </div>
                  <input
                    type="number" step="0.01"
                    className={`input-field text-sm ${parseFloat(item.pricePerKg) < (currentCost / 1000) ? 'border-red-500 bg-red-950/20' : ''}`}
                    required
                    value={item.pricePerKg} onChange={e => handleItemChange(index, 'pricePerKg', e.target.value)}
                  />
                </div>
                <div className="w-32 text-right">
                  <label className="block text-xs text-gray-500 mb-1">Line Total</label>
                  <div className="font-bold text-gray-300 py-2">
                    ₹ {calculateItemTotal(item).toLocaleString('en-IN', {maximumFractionDigits:0})}
                  </div>
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="p-2 text-gray-500 hover:text-red-500">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-md flex justify-between items-center">
          <span className="text-gray-300 font-medium text-lg">Grand Total Value:</span>
          <span className="text-3xl font-black text-white">₹ {grandTotal.toLocaleString('en-IN', {maximumFractionDigits:0})}</span>
        </div>

        <button type="submit" className="btn-primary py-3 text-lg mt-2">Generate Final Invoice & Record Sale</button>
      </form>

      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-300">Recent Sales History</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                 const dataToExport = recentSales.map((sale: any) => ({
                    Date: formatDateIST(sale.date),
                    Customer: sale.customer.name,
                    TotalValue: sale.totalValue
                 }));
                 exportToExcel(dataToExport, `Sales_History_${new Date().toISOString().slice(0,10)}`);
              }}
              className="bg-[#1f2937] hover:bg-gray-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1.5"
            >
              <Download size={14}/> Export Excel
            </button>
            <button
              onClick={() => {
                 const headers = ['Date', 'Customer', 'Total Value'];
                 const rows = recentSales.map((sale: any) => [
                    formatDateIST(sale.date),
                    sale.customer.name,
                    `₹ ${sale.totalValue.toLocaleString('en-IN', {maximumFractionDigits:0})}`
                 ]);
                 exportToPDF(headers, rows, 'Recent Sales History Report');
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
                <th className="p-3">Customer</th>
                <th className="p-3 text-right">Total Value</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale: any) => (
                <tr key={sale.id} className="border-b border-[#333] last:border-0 text-sm hover:bg-[#2a2a2a]">
                  <td className="p-3 text-gray-300">{formatDateIST(sale.date)}</td>
                  <td className="p-3 font-medium text-white">{sale.customer.name}</td>
                  <td className="p-3 text-right font-bold text-green-400">₹ {sale.totalValue.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                  <td className="p-3 text-center flex justify-center gap-2">
                    <button type="button" onClick={() => handleViewSlip(sale)} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold px-2 py-1 bg-indigo-500/10 rounded border border-indigo-500/20">
                      View Slip
                    </button>
                    <button type="button" onClick={() => handleUndo(sale.id)} className="text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1 bg-red-500/10 rounded border border-red-500/20">
                      Undo / Delete
                    </button>
                  </td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500">No recent sales found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg max-w-lg w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                 <Check className="text-green-500" /> Confirm Sales Invoice Details
              </h3>
              <p className="text-sm text-gray-400 mb-4 border-b border-[#333]/50 pb-2">
                 Please review the details below before recording the sale.
              </p>

              <div className="space-y-3 mb-6 text-sm text-gray-300">
                 <div className="flex justify-between">
                    <span className="text-gray-500">Customer Name:</span>
                    <span className="font-bold text-white">
                       {customers.find((c: any) => c.id === customerId)?.name || 'Cash Sale'}
                    </span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Log Date:</span>
                    <span className="font-bold text-white">
                       {date ? formatDateIST(date) : 'Current Time (IST)'}
                    </span>
                 </div>
                 {customers.find((c: any) => c.id === customerId)?.transport && (
                    <div className="flex justify-between">
                       <span className="text-gray-500">Transport:</span>
                       <span className="font-bold text-white">
                          {customers.find((c: any) => c.id === customerId)?.transport}
                       </span>
                    </div>
                 )}

                 <div className="border border-[#333] rounded overflow-hidden mt-4">
                    <table className="w-full text-left text-xs bg-[#222]">
                       <thead className="bg-[#2a2a2a] text-gray-400">
                          <tr className="border-b border-[#333]">
                             <th className="p-2">Items Chosen</th>
                             <th className="p-2 text-center">Qty</th>
                             <th className="p-2 text-right">Total</th>
                          </tr>
                       </thead>
                       <tbody>
                          {items.map((item, idx) => (
                             <tr key={idx} className="border-b border-[#333]/50 last:border-0 text-gray-300">
                                <td className="p-2">
                                   {item.productCategory === 'Raw Copper Bundle' 
                                      ? 'Raw Copper Bundle' 
                                      : `${item.brand} ${item.wireType}`}
                                   <div className="text-[10px] text-gray-500">@ ₹{item.pricePerKg}/kg</div>
                                </td>
                                <td className="p-2 text-center">{Number(item.qty).toFixed(2)}T</td>
                                <td className="p-2 text-right">₹ {calculateItemTotal(item).toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>

                 <div className="flex justify-between items-center bg-red-950/20 border border-red-900/50 p-3 rounded mt-4">
                    <span className="text-gray-400 font-medium">Grand Total Value:</span>
                    <span className="text-xl font-bold text-white">₹ {grandTotal.toLocaleString('en-IN', {maximumFractionDigits:0})}</span>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button 
                    onClick={handleConfirmAndRecord}
                    className="btn-primary flex-1 bg-green-600 hover:bg-green-700 font-bold"
                 >
                    Confirm & Record Sale
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

      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div className="bg-[#1e1e1e] border border-[#333] p-8 rounded-lg max-w-sm w-full">
              <h3 className="text-2xl font-bold text-red-500 mb-2">Loss-Making Sale Detected</h3>
              <p className="text-sm text-gray-400 mb-6">
                You are attempting to sell products below the current raw material FIFO cost.
                This action requires an Owner Override PIN to proceed.
              </p>

              {pinError && <div className="bg-red-950/50 text-red-500 p-2 text-sm rounded mb-4">{pinError}</div>}

              <form onSubmit={handlePinSubmit}>
                 <input
                   type="password"
                   maxLength={4}
                   placeholder="Enter 4-Digit PIN (1234)"
                   className="input-field text-center text-2xl tracking-widest h-14 mb-4"
                   value={overridePin}
                   onChange={(e) => setOverridePin(e.target.value)}
                   required
                   autoFocus
                 />
                 <div className="flex gap-4">
                    <button type="submit" className="btn-primary flex-1 bg-red-600 hover:bg-red-700">Authorize Loss</button>
                    <button type="button" onClick={() => {setShowPinModal(false); setPinError(''); setOverridePin('');}} className="px-4 py-2 bg-[#2a2a2a] text-gray-300 hover:text-white rounded">Cancel</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Dynamic Handwritten Ledger Slip Modal */}
      {createdSaleForSlip && (
         <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="max-w-md w-full flex flex-col gap-4">
               
               {/* Notebook Page Ledger Wrapper */}
               <div id="ledger-slip" className="bg-[#fcfbf4] text-[#1c3a6b] p-6 rounded shadow-2xl border-2 border-[#4e4033] relative overflow-hidden font-handwritten select-none" style={{ fontFamily: "'Caveat', cursive" }}>
                  
                  {/* Ledger ruled lines pattern */}
                  <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
                     backgroundImage: 'linear-gradient(#5a4b3b 1px, transparent 1px)',
                     backgroundSize: '100% 28px',
                     marginTop: '35px'
                  }}></div>

                  {/* Red margin line */}
                  <div className="absolute left-10 top-0 bottom-0 border-l border-red-400 opacity-40"></div>

                  {/* Header Title */}
                  <div className="text-center mb-6 pl-10 border-b border-[#1c3a6b]/20 pb-2">
                     <h3 className="text-3xl font-black tracking-wide transform -rotate-1 rounded-sm uppercase">
                        Ledger Slip
                     </h3>
                  </div>

                  {/* Metadata block */}
                  <div className="space-y-1.5 text-xl pl-10 mb-6 border-b-2 border-dashed border-[#4e4033]/40 pb-4">
                     <div className="flex justify-between">
                        <span>Party Name: <strong>{createdSaleForSlip.customer?.name || 'Cash Sale'}</strong></span>
                        <span>Date: <strong>{new Date(createdSaleForSlip.date).toLocaleDateString('en-IN')}</strong></span>
                     </div>
                     {createdSaleForSlip.customer?.transport && (
                        <div>
                           <span>Transport: <strong>{createdSaleForSlip.customer.transport}</strong></span>
                        </div>
                     )}
                  </div>

                  {/* Ruled Columns Ledger Grid */}
                  <div className="space-y-4 pl-10 min-h-[160px] text-xl border-b-2 border-[#1c3a6b] pb-4">
                     <div className="flex font-black border-b border-[#1c3a6b] pb-1 text-sm uppercase">
                        <span className="w-1/2">Particulars</span>
                        <span className="w-1/4 text-center">Qty (Tons)</span>
                        <span className="w-1/4 text-right">Amount</span>
                     </div>
                     <div className="space-y-3">
                        {createdSaleForSlip.items.map((item: any, i: number) => (
                           <div key={i} className="flex justify-between items-center text-lg">
                              <span className="w-1/2 leading-tight">
                                 {item.productCategory === 'Raw Copper Bundle' 
                                   ? 'Raw Copper Bundle' 
                                   : `${item.brand} ${item.wireType}`}
                                 <br />
                                 <span className="text-sm text-gray-500 opacity-80">@ ₹{item.pricePerKg}/kg</span>
                              </span>
                              <span className="w-1/4 text-center">{Number(item.qty).toFixed(2)}T</span>
                              <span className="w-1/4 text-right">₹ {calculateItemTotal(item).toLocaleString('en-IN', {maximumFractionDigits:0})}</span>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Total Value */}
                  <div className="pl-10 pt-4 flex justify-between items-end relative">
                     <div className="text-right ml-auto">
                        <span className="text-lg font-bold">Grand Total:</span>
                        <div className="text-3xl font-black border-b-4 border-double border-[#1c3a6b] inline-block">
                           ₹ {createdSaleForSlip.total.toLocaleString('en-IN', {maximumFractionDigits:0})}
                        </div>
                     </div>
                  </div>

               </div>

               {/* Action Buttons */}
               <div className="flex gap-3">
                  <a
                    href={getWhatsAppShareUrl(createdSaleForSlip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded transition-colors text-center flex items-center justify-center gap-2 shadow"
                  >
                     <Share2 size={18} /> Share on WhatsApp
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="bg-[#2a2a2a] hover:bg-[#333] text-white border border-[#444] font-bold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2 shadow"
                  >
                     <Printer size={18} /> Print Slip
                  </button>
                  <button
                    onClick={handleDownloadImage}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/20 font-bold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2 shadow"
                  >
                     <Download size={18} /> Download Image
                  </button>
                  <button
                    onClick={() => setCreatedSaleForSlip(null)}
                    className="bg-red-950/20 hover:bg-red-900/50 text-red-500 border border-red-500/20 font-bold py-3 px-6 rounded transition-colors"
                  >
                     Close
                  </button>
               </div>

            </div>
         </div>
      )}
    </div>
  );
}
