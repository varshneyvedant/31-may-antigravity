'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, ArrowRightLeft, Check, Download, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDateIST } from '@/lib/format';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPDF } from '@/lib/export/pdf';

export default function ReturnsPage() {
  const [activeTab, setActiveTab] = useState<'credit' | 'debit'>('credit');
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [debitNotes, setDebitNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [creditForm, setCreditForm] = useState({ saleId: '', qtyReturned: '', amountCredited: '', reason: '' });
  const [debitForm, setDebitForm] = useState({ purchaseId: '', qtyReturned: '', amountDebited: '', reason: '' });
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch sales
      const salesRes = await fetch('/api/manager/sales');
      const salesData = await salesRes.json();
      if (salesData.sales) {
        setSales(salesData.sales);
        if (salesData.sales.length > 0) setCreditForm(prev => ({ ...prev, saleId: salesData.sales[0].id }));
      }

      // Fetch purchases
      const purchasesRes = await fetch('/api/manager/purchase');
      const purchasesData = await purchasesRes.json();
      if (purchasesData.purchases) {
        setPurchases(purchasesData.purchases);
        if (purchasesData.purchases.length > 0) setDebitForm(prev => ({ ...prev, purchaseId: purchasesData.purchases[0].id }));
      }

      // Fetch credit notes
      const creditRes = await fetch('/api/manager/returns/credit-note');
      const creditData = await creditRes.json();
      if (creditData.creditNotes) setCreditNotes(creditData.creditNotes);

      // Fetch debit notes
      const debitRes = await fetch('/api/manager/returns/debit-note');
      const debitData = await debitRes.json();
      if (debitData.debitNotes) setDebitNotes(debitData.debitNotes);

    } catch (err) {
      console.error('Failed to fetch returns data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmAndRecord = async () => {
    setShowConfirmModal(false);
    
    try {
      const endpoint = activeTab === 'credit' ? '/api/returns/credit-note' : '/api/returns/debit-note'; // wait, our APIs are under /api/manager/returns/credit-note
      const realEndpoint = activeTab === 'credit' ? '/api/manager/returns/credit-note' : '/api/manager/returns/debit-note';
      const payload = activeTab === 'credit' ? creditForm : debitForm;

      const res = await fetch(realEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(`${activeTab === 'credit' ? 'Credit Note' : 'Debit Note'} successfully registered! Financial ledgers and general ledger journals have been adjusted.`);
        // Reset forms
        if (activeTab === 'credit') {
          setCreditForm({ saleId: sales[0]?.id || '', qtyReturned: '', amountCredited: '', reason: '' });
        } else {
          setDebitForm({ purchaseId: purchases[0]?.id || '', qtyReturned: '', amountDebited: '', reason: '' });
        }
        fetchData();
      } else {
        const errData = await res.json();
        alert(`Failed to log returns: ${errData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred.');
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    if (activeTab === 'credit') {
      const data = creditNotes.map(n => ({
        'Date': formatDateIST(n.date),
        'Credit Note ID': n.id,
        'Sale Invoice ID': n.saleId,
        'Customer Name': n.sale?.customer?.name || '-',
        'Qty Returned (Tons)': Number(n.qtyReturned),
        'Amount Credited (₹)': Number(n.amountCredited),
        'Reason': n.reason || ''
      }));
      exportToExcel(data, 'Sales_Returns_Credit_Notes');
    } else {
      const data = debitNotes.map(n => ({
        'Date': formatDateIST(n.date),
        'Debit Note ID': n.id,
        'Purchase Bill ID': n.purchaseId,
        'Supplier Name': n.purchase?.supplier?.name || '-',
        'Qty Returned (Tons)': Number(n.qtyReturned),
        'Amount Debited (₹)': Number(n.amountDebited),
        'Reason': n.reason || ''
      }));
      exportToExcel(data, 'Purchase_Returns_Debit_Notes');
    }
  };

  const handleExportPDF = () => {
    if (activeTab === 'credit') {
      const headers = ['Date', 'Customer', 'Qty (Tons)', 'Amount Credited', 'Reason'];
      const rows = creditNotes.map(n => [
        formatDateIST(n.date),
        n.sale?.customer?.name || '-',
        Number(n.qtyReturned).toFixed(2),
        formatCurrency(Number(n.amountCredited)),
        n.reason || '-'
      ]);
      exportToPDF(headers, rows, 'Sales Returns (Credit Notes) Log');
    } else {
      const headers = ['Date', 'Supplier', 'Qty (Tons)', 'Amount Debited', 'Reason'];
      const rows = debitNotes.map(n => [
        formatDateIST(n.date),
        n.purchase?.supplier?.name || '-',
        Number(n.qtyReturned).toFixed(2),
        formatCurrency(Number(n.amountDebited)),
        n.reason || '-'
      ]);
      exportToPDF(headers, rows, 'Supplier Purchase Returns (Debit Notes) Log');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <RotateCcw className="text-red-500" /> Quality Returns & Rejections (Reversals)
        </h2>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab('credit')}
          className={`px-6 py-2 flex items-center gap-2 rounded font-bold transition-all ${activeTab === 'credit' ? 'bg-red-500 text-white shadow' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}
        >
          <ArrowRightLeft size={16} /> Sales Returns (Credit Notes)
        </button>
        <button
          onClick={() => setActiveTab('debit')}
          className={`px-6 py-2 flex items-center gap-2 rounded font-bold transition-all ${activeTab === 'debit' ? 'bg-red-500 text-white shadow' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}
        >
          <ArrowRightLeft size={16} /> Supplier Returns (Debit Notes)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Return logging form */}
        <div className="lg:col-span-1">
          {activeTab === 'credit' ? (
            <form onSubmit={handleSubmit} className="card bg-[#1a1a1a] border-t-4 border-t-red-500 flex flex-col gap-4">
              <h3 className="text-lg font-bold text-white mb-2">Issue Credit Note</h3>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Select Sale Invoice</label>
                <select
                  className="input-field text-xs mb-3"
                  value={creditForm.saleId}
                  onChange={e => setCreditForm({ ...creditForm, saleId: e.target.value })}
                  required
                >
                  {sales.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.customer?.name} - {formatDateIST(s.date)} ({formatCurrency(Number(s.totalValue))})
                    </option>
                  ))}
                  {sales.length === 0 && <option value="">No sales available</option>}
                </select>

                {/* Selected Sale info */}
                {(() => {
                  const selectedSale = sales.find(s => s.id === creditForm.saleId);
                  if (!selectedSale) return null;
                  const totalTons = selectedSale.items?.reduce((sum: number, item: any) => sum + Number(item.qty), 0) || 0;
                  return (
                    <div className="p-3 bg-[#222] rounded border border-[#333] space-y-2 text-xs">
                      <div className="flex justify-between border-b border-[#333] pb-1.5 font-semibold text-gray-300">
                        <span>Invoice Details</span>
                        <span className="text-green-400 font-bold">{formatCurrency(Number(selectedSale.totalValue))}</span>
                      </div>
                      <div className="space-y-1 text-gray-400">
                        <p className="flex justify-between"><span>Customer:</span> <strong className="text-white">{selectedSale.customer?.name}</strong></p>
                        <p className="flex justify-between"><span>Invoice Date:</span> <strong className="text-white">{formatDateIST(selectedSale.date)}</strong></p>
                        <p className="flex justify-between"><span>Total Tonnage:</span> <strong className="text-white font-mono">{totalTons.toFixed(2)} Tons</strong></p>
                      </div>
                      <div className="mt-2 border-t border-[#333] pt-1.5">
                        <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Items Sold</span>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {selectedSale.items?.map((item: any) => (
                            <div key={item.id} className="bg-[#1e1e1e] p-1.5 rounded flex justify-between items-center text-[10px] border border-[#2a2a2a]">
                              <div className="pr-2">
                                <span className="text-white font-bold">{item.productCategory}</span>
                                {item.productCategory !== 'Raw Copper Bundle' && (
                                  <span className="text-gray-400 block text-[9px]">{item.brand || 'No Brand'} - {item.wireType || 'No Type'}</span>
                                )}
                              </div>
                              <div className="text-right whitespace-nowrap">
                                <span className="text-green-400 font-bold font-mono">{Number(item.qty).toFixed(2)} T</span>
                                <span className="text-gray-500 block text-[8px]">@ {formatCurrency(Number(item.pricePerTon))} / T</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Qty Returned (Tons)</label>
                <input
                  type="number" step="0.01" className="input-field text-base font-bold"
                  value={creditForm.qtyReturned}
                  onChange={e => setCreditForm({ ...creditForm, qtyReturned: e.target.value })}
                  placeholder="e.g. 2.5 Tons" required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount to Credit (₹)</label>
                <input
                  type="number" step="0.01" className="input-field text-base font-bold text-green-400"
                  value={creditForm.amountCredited}
                  onChange={e => setCreditForm({ ...creditForm, amountCredited: e.target.value })}
                  placeholder="e.g. 500000" required
                />
                <p className="text-[10px] text-gray-500 mt-1">This will deduct from the customer's outstanding Accounts Receivable balance.</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Rejection Reason</label>
                <input
                  type="text" className="input-field"
                  value={creditForm.reason}
                  onChange={e => setCreditForm({ ...creditForm, reason: e.target.value })}
                  placeholder="e.g. Wire conductivity test fail" required
                />
              </div>

              <button type="submit" className="btn-primary mt-2">Log Sales Return</button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="card bg-[#1a1a1a] border-t-4 border-t-red-500 flex flex-col gap-4">
              <h3 className="text-lg font-bold text-white mb-2">Issue Debit Note</h3>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Select Purchase Bill</label>
                <select
                  className="input-field text-xs mb-3"
                  value={debitForm.purchaseId}
                  onChange={e => setDebitForm({ ...debitForm, purchaseId: e.target.value })}
                  required
                >
                  {purchases.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.supplier?.name} - {formatDateIST(p.date)} ({formatCurrency(Number(p.totalValue))})
                    </option>
                  ))}
                  {purchases.length === 0 && <option value="">No purchases available</option>}
                </select>

                {/* Selected Purchase info */}
                {(() => {
                  const selectedPurchase = purchases.find(p => p.id === debitForm.purchaseId);
                  if (!selectedPurchase) return null;
                  return (
                    <div className="p-3 bg-[#222] rounded border border-[#333] space-y-2 text-xs">
                      <div className="flex justify-between border-b border-[#333] pb-1.5 font-semibold text-gray-300">
                        <span>Purchase Details</span>
                        <span className="text-red-400 font-bold">{formatCurrency(Number(selectedPurchase.totalValue))}</span>
                      </div>
                      <div className="space-y-1 text-gray-400">
                        <p className="flex justify-between"><span>Supplier:</span> <strong className="text-white">{selectedPurchase.supplier?.name}</strong></p>
                        <p className="flex justify-between"><span>Purchase Date:</span> <strong className="text-white">{formatDateIST(selectedPurchase.date)}</strong></p>
                        <p className="flex justify-between"><span>Quantity Bought:</span> <strong className="text-white font-mono">{Number(selectedPurchase.qty).toFixed(2)} Tons</strong></p>
                        <p className="flex justify-between"><span>Rate per Ton:</span> <strong className="text-white font-mono">{formatCurrency(Number(selectedPurchase.pricePerTon))} / T</strong></p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Qty Returned (Tons)</label>
                <input
                  type="number" step="0.01" className="input-field text-base font-bold"
                  value={debitForm.qtyReturned}
                  onChange={e => setDebitForm({ ...debitForm, qtyReturned: e.target.value })}
                  placeholder="e.g. 1.2 Tons" required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount to Debit (₹)</label>
                <input
                  type="number" step="0.01" className="input-field text-base font-bold text-red-400"
                  value={debitForm.amountDebited}
                  onChange={e => setDebitForm({ ...debitForm, amountDebited: e.target.value })}
                  placeholder="e.g. 350000" required
                />
                <p className="text-[10px] text-gray-500 mt-1">This will deduct from our outstanding Accounts Payable liability with the supplier.</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Rejection Reason</label>
                <input
                  type="text" className="input-field"
                  value={debitForm.reason}
                  onChange={e => setDebitForm({ ...debitForm, reason: e.target.value })}
                  placeholder="e.g. Underweight shipment" required
                />
              </div>

              <button type="submit" className="btn-primary mt-2">Log Supplier Return</button>
            </form>
          )}
        </div>

        {/* History table */}
        <div className="lg:col-span-2 card bg-[#1a1a1a]/70 backdrop-blur-sm border-t-2 border-t-yellow-500/50">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#333]">
            <div>
              <h3 className="text-lg font-bold text-white">
                {activeTab === 'credit' ? 'Credit Notes Ledger' : 'Debit Notes Ledger'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Quality rejections history log</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleExportExcel}
                disabled={activeTab === 'credit' ? creditNotes.length === 0 : debitNotes.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-green-950/40 hover:bg-green-900/60 border border-green-500/20 text-green-400 rounded transition-colors"
              >
                <Download size={12} /> Excel
              </button>
              <button
                onClick={handleExportPDF}
                disabled={activeTab === 'credit' ? creditNotes.length === 0 : debitNotes.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-red-400 rounded transition-colors"
              >
                <Download size={12} /> PDF
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-gray-400 text-center py-8">Loading history ledger...</div>
          ) : activeTab === 'credit' ? (
            creditNotes.length === 0 ? (
              <div className="text-gray-500 text-center py-8 italic text-sm">No sales returns credit notes registered yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#333] text-gray-400 text-xs uppercase font-black">
                      <th className="p-3">Date</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Qty Returned</th>
                      <th className="p-3">Amount Credited</th>
                      <th className="p-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditNotes.map(note => (
                      <tr key={note.id} className="border-b border-[#333] last:border-0 hover:bg-[#252525] transition-colors">
                        <td className="p-3 text-xs text-gray-400">{formatDateIST(note.date)}</td>
                        <td className="p-3 font-semibold text-white">{note.sale?.customer?.name || '-'}</td>
                        <td className="p-3 text-gray-300 font-bold">{Number(note.qtyReturned).toFixed(2)} T</td>
                        <td className="p-3 font-extrabold text-green-400">{formatCurrency(Number(note.amountCredited))}</td>
                        <td className="p-3 text-xs text-gray-400 max-w-xs truncate">{note.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            debitNotes.length === 0 ? (
              <div className="text-gray-500 text-center py-8 italic text-sm">No supplier returns debit notes registered yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#333] text-gray-400 text-xs uppercase font-black">
                      <th className="p-3">Date</th>
                      <th className="p-3">Supplier</th>
                      <th className="p-3">Qty Returned</th>
                      <th className="p-3">Amount Debited</th>
                      <th className="p-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debitNotes.map(note => (
                      <tr key={note.id} className="border-b border-[#333] last:border-0 hover:bg-[#252525] transition-colors">
                        <td className="p-3 text-xs text-gray-400">{formatDateIST(note.date)}</td>
                        <td className="p-3 font-semibold text-white">{note.purchase?.supplier?.name || '-'}</td>
                        <td className="p-3 text-gray-300 font-bold">{Number(note.qtyReturned).toFixed(2)} T</td>
                        <td className="p-3 font-extrabold text-red-400">{formatCurrency(Number(note.amountDebited))}</td>
                        <td className="p-3 text-xs text-gray-400 max-w-xs truncate">{note.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2 border-b border-[#333]/50 pb-2">
                 <AlertTriangle className="text-yellow-500 animate-pulse" size={24} /> Confirm Rejection / Return Log
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                 Please review the quality rejection details carefully. This will permanently alter ledgers.
              </p>

              <div className="space-y-3 mb-6 text-sm text-gray-300 bg-[#222] p-4 rounded border border-[#333]">
                 <div className="flex justify-between">
                    <span className="text-gray-500">Return Type:</span>
                    <span className="font-bold text-white uppercase">{activeTab === 'credit' ? 'Sales Return (Credit Note)' : 'Supplier Return (Debit Note)'}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Stakeholder Name:</span>
                    <span className="font-bold text-white">
                       {activeTab === 'credit' 
                         ? sales.find(s => s.id === creditForm.saleId)?.customer?.name 
                         : purchases.find(p => p.id === debitForm.purchaseId)?.supplier?.name || 'N/A'}
                    </span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Qty Returned:</span>
                    <span className="font-bold text-white">
                      {activeTab === 'credit' ? creditForm.qtyReturned : debitForm.qtyReturned} Tons
                    </span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Valuation:</span>
                    <span className={`font-bold ${activeTab === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(Number(activeTab === 'credit' ? creditForm.amountCredited : debitForm.amountDebited))}
                    </span>
                 </div>
                 <div className="flex justify-between text-xs text-gray-400 italic">
                    <span>Reason:</span>
                    <span className="text-white font-semibold">
                      "{activeTab === 'credit' ? creditForm.reason : debitForm.reason}"
                    </span>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button 
                    onClick={handleConfirmAndRecord}
                    className="btn-primary flex-1 bg-yellow-600 hover:bg-yellow-700 font-bold"
                 >
                    Confirm & Record
                 </button>
                 <button 
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 bg-[#2a2a2a] text-gray-300 hover:text-white rounded font-bold border border-[#333]"
                 >
                    Cancel
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
