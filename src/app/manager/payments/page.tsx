'use client';

import { useState, useEffect } from 'react';
import { Banknote, Users, Truck, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export default function PaymentsPage() {
  const [type, setType] = useState<'customer' | 'supplier'>('customer');
  const [stakeholders, setStakeholders] = useState<{id: string, name: string}[]>([]);
  const [formData, setFormData] = useState({
    stakeholderId: '',
    amount: ''
  });
  const [multiplier, setMultiplier] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetch(`/api/${type}s`)
      .then(res => res.json())
      .then(data => {
         const items = type === 'customer' ? data.customers : data.suppliers;
         if(items) {
           setStakeholders(items);
           if(items.length > 0) setFormData(prev => ({ ...prev, stakeholderId: items[0].id }));
         }
      });
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmAndRecord = async () => {
    setShowConfirmModal(false);
    const finalAmount = parseFloat(formData.amount) * multiplier;
    const idempotencyKey = crypto.randomUUID();

    await fetch('/api/manager/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, stakeholderId: formData.stakeholderId, amount: finalAmount, idempotencyKey })
    });
    alert('Payment recorded successfully! The system has auto-applied it to the oldest pending invoices.');
    setFormData({ ...formData, amount: '' });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="text-red-500">Record</span> Stakeholder Payment
      </h2>

      <div className="flex gap-4 mb-6">
         <button
           onClick={() => setType('customer')}
           className={`px-6 py-2 flex items-center gap-2 rounded font-bold transition-colors ${type === 'customer' ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}
         >
           <Users size={16} /> Customers Paid Us
         </button>
         <button
           onClick={() => setType('supplier')}
           className={`px-6 py-2 flex items-center gap-2 rounded font-bold transition-colors ${type === 'supplier' ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}
         >
           <Truck size={16} /> We Paid Supplier
         </button>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-6 border-t-4 border-t-red-500 bg-[#1a1a1a]">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
             Select {type === 'customer' ? 'Customer (Sender)' : 'Supplier (Recipient)'}
          </label>
          <select
            className="input-field"
            value={formData.stakeholderId}
            onChange={e => setFormData({...formData, stakeholderId: e.target.value})}
            required
          >
            {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Lump-sum Amount Received/Paid</label>
          <div className="flex gap-2 items-center bg-[#222] border border-[#333] rounded-md focus-within:border-red-500 overflow-hidden">
            <span className="pl-4 text-gray-400 font-bold">₹</span>
            <input
              type="number" step="0.01" className="bg-transparent text-xl font-bold h-14 flex-1 outline-none px-2 text-white" required
              value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
              placeholder="Enter amount..."
            />
            <div className="h-8 border-l border-[#444] mx-1"></div>
            <select
              className="bg-transparent text-sm text-gray-400 font-semibold h-14 px-3 outline-none cursor-pointer hover:text-white"
              value={multiplier}
              onChange={e => setMultiplier(Number(e.target.value))}
            >
              <option value="1" className="bg-[#222] text-white">Raw</option>
              <option value="1000" className="bg-[#222] text-white">Thousands</option>
              <option value="100000" className="bg-[#222] text-white">Lakhs</option>
              <option value="10000000" className="bg-[#222] text-white">Crores</option>
            </select>
          </div>
          {formData.amount && (
            <p className="text-sm text-gray-400 mt-2 text-right">
              Final: <span className="text-white font-bold">{formatCurrency(parseFloat(formData.amount) * multiplier)}</span>
            </p>
          )}
        </div>

        <div className="p-4 bg-[#2a2a2a] rounded border border-[#333] flex items-start gap-3">
           <Banknote className="text-gray-400 mt-1" />
           <p className="text-sm text-gray-400">
             <strong>Smart Distribution:</strong> This lump-sum payment will automatically be applied to the oldest unpaid invoices first, clearing them out sequentially until the payment amount is exhausted.
           </p>
        </div>

        <button type="submit" className="btn-primary py-3 text-lg font-bold">
           Record Transaction
        </button>
      </form>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                 <Check className="text-green-500" /> Confirm Stakeholder Payment
              </h3>
              <p className="text-sm text-gray-400 mb-4 border-b border-[#333]/50 pb-2">
                 Please review the transaction details below before recording.
              </p>

              <div className="space-y-3 mb-6 text-sm text-gray-300">
                 <div className="flex justify-between">
                    <span className="text-gray-500">Transaction Type:</span>
                    <span className="font-bold text-white uppercase">{type === 'customer' ? 'Customer Paid Us' : 'We Paid Supplier'}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Stakeholder Name:</span>
                    <span className="font-bold text-white">
                       {stakeholders.find(s => s.id === formData.stakeholderId)?.name || ''}
                    </span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Payment Amount:</span>
                    <span className="font-bold text-green-400">{formatCurrency(parseFloat(formData.amount) * multiplier)}</span>
                 </div>
                 <div className="flex justify-between border-t border-[#333]/30 pt-2 text-xs text-gray-500">
                    <span>Smart Application:</span>
                    <span className="italic text-gray-400">Will auto-apply to oldest pending invoices first</span>
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
