'use client';

import { formatDateIST } from '@/lib/format';

import { getCurrentISTInput } from '@/lib/format';


import { useState } from 'react';
import { Check } from 'lucide-react';

export default function ExpensesPage() {
  const [formData, setFormData] = useState({
    category: 'Electricity',
    amount: '',
    description: '',
    expenseMonth: '',
    date: getCurrentISTInput()
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmAndRecord = async () => {
    setShowConfirmModal(false);
    await fetch('/api/manager/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    alert('Expense logged successfully!');
    setFormData({ category: 'Electricity', amount: '', description: '', expenseMonth: '', date: getCurrentISTInput() });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="text-red-500">Log</span> Factory Expense
      </h2>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Expense Category</label>
            <select
              className="input-field"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              <option value="Electricity">Electricity</option>
              <option value="Rent">Rent</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Water">Water</option>
              <option value="Salaries">Salaries</option>
              <option value="Other">Other</option>
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

        <div>
          <label className="block text-sm text-gray-400 mb-1">Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            className="input-field"
            value={formData.amount}
            onChange={e => setFormData({...formData, amount: e.target.value})}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Expense Month (For Recurring Bills)</label>
          <input
            type="month"
            className="input-field"
            value={formData.expenseMonth}
            onChange={e => setFormData({...formData, expenseMonth: e.target.value})}
          />
          <p className="text-xs text-gray-500 mt-1">Leave blank if this is a one-time/adhoc expense.</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Description (Optional)</label>
          <input
            type="text"
            className="input-field"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            placeholder="e.g., Generator repair parts"
          />
        </div>

        <button type="submit" className="btn-primary mt-4">Record Expense</button>
      </form>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                 <Check className="text-green-500" /> Confirm Factory Expense
              </h3>
              <p className="text-sm text-gray-400 mb-4 border-b border-[#333]/50 pb-2">
                 Please review the details below before recording the expense.
              </p>

              <div className="space-y-3 mb-6 text-sm text-gray-300">
                 <div className="flex justify-between">
                    <span className="text-gray-500">Expense Category:</span>
                    <span className="font-bold text-white">{formData.category}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Expense Amount:</span>
                    <span className="font-bold text-red-500">₹ {Number(formData.amount).toLocaleString('en-IN', {maximumFractionDigits:2})}</span>
                 </div>
                 {formData.expenseMonth && (
                    <div className="flex justify-between">
                       <span className="text-gray-500">Expense Month:</span>
                       <span className="font-bold text-white">{formData.expenseMonth}</span>
                    </div>
                 )}
                 {formData.description && (
                    <div className="flex justify-between">
                       <span className="text-gray-500">Description:</span>
                       <span className="font-bold text-white">{formData.description}</span>
                    </div>
                 )}
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
