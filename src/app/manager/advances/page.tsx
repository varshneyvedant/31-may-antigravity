'use client';

import { formatDateIST } from '@/lib/format';

import { getCurrentISTInput } from '@/lib/format';


import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/format';
import { AlertCircle, Info, Check, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPDF } from '@/lib/export/pdf';

export default function AdvancesPage() {
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
  const [formData, setFormData] = useState({ employeeId: '', amount: '', reason: '', date: getCurrentISTInput() });
  const [aiData, setAiData] = useState<any>(null);

  // For repayments
  const [repaymentData, setRepaymentData] = useState({ amount: '' });
  const [multiplier, setMultiplier] = useState(1);

  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);
  const [showRepayConfirm, setShowRepayConfirm] = useState(false);

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if(data.employees) {
           setEmployees(data.employees);
           if(data.employees.length > 0) {
              setFormData(prev => ({...prev, employeeId: data.employees[0].id}));
           }
        }
      });
  }, []);

  const fetchAiData = () => {
    if (formData.employeeId) {
      fetch(`/api/manager/advances?empId=${formData.employeeId}`)
         .then(res => res.json())
         .then(res => setAiData(res.data));
    }
  };

  useEffect(() => {
     fetchAiData();
  }, [formData.employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (aiData?.isWarning && !window.confirm("WARNING: The AI system strongly recommends against this advance. Are you sure you want to proceed?")) {
       return;
    }
    setShowAdvanceConfirm(true);
  };

  const handleConfirmAdvance = async () => {
    setShowAdvanceConfirm(false);
    await fetch('/api/manager/advances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    alert('Advance logged successfully!');
    setFormData({ ...formData, amount: '', reason: '' });
    fetchAiData();
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowRepayConfirm(true);
  };

  const handleConfirmRepay = async () => {
    setShowRepayConfirm(false);
    const finalAmount = parseFloat(repaymentData.amount) * multiplier;

    await fetch('/api/manager/advances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         action: 'REPAY',
         employeeId: formData.employeeId,
         amount: finalAmount
      })
    });
    alert('Repayment logged successfully and auto-applied to oldest pending advances!');
    setRepaymentData({ amount: '' });
    fetchAiData();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="text-red-500">Employee</span> Advance Dashboard
      </h2>

      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-1">Select Employee</label>
        <select
          className="input-field max-w-md"
          value={formData.employeeId}
          onChange={e => setFormData({...formData, employeeId: e.target.value})}
          required
        >
          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
        </select>
      </div>

      {aiData && (
         <div className={`p-4 rounded border mb-6 ${aiData.isWarning ? 'bg-red-950/20 border-red-500/50' : 'bg-green-950/20 border-green-500/50'}`}>
            <h3 className="font-bold flex items-center gap-2 mb-2 text-white">
               {aiData.isWarning ? <AlertCircle size={18} className="text-red-500" /> : <Info size={18} className="text-green-500"/>}
               AI System Recommendation
            </h3>
            <p className={`text-sm font-medium ${aiData.recommendColor}`}>
               {aiData.recommendation}
            </p>
            <div className="mt-3 text-xs text-gray-400">
               Current Pending Balance: <span className="font-bold text-gray-300">{formatCurrency(aiData.totalAdvances)}</span> ({aiData.monthsAdvance}x Monthly Salary)
            </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Give Advance Column */}
        <div className="card flex flex-col gap-6">
          <h3 className="text-xl font-bold text-gray-300">Give Advance</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Advance Amount (₹)</label>
                 <input
                   type="number" step="0.01" className="input-field" required
                   value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                 />
               </div>
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Date of Record</label>
                 <input
                   type="datetime-local" className="input-field" required
                   value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                 />
               </div>
             </div>
             <div>
               <label className="block text-sm text-gray-400 mb-1">Reason</label>
               <input
                 type="text" className="input-field" required
                 value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}
               />
             </div>

             <button type="submit" className={`btn-primary mt-2 ${aiData?.isWarning ? 'bg-red-600 hover:bg-red-700' : ''}`}>
                {aiData?.isWarning ? 'Override Warning & Give Advance' : 'Approve Advance'}
             </button>
          </form>
        </div>

        {/* Repayment Column */}
        <div className="card flex flex-col gap-6 border-t-4 border-t-green-500">
          <h3 className="text-xl font-bold text-gray-300">Record Repayment / Deduction</h3>
          <form onSubmit={handleRepaySubmit} className="flex flex-col gap-4">
            <div>
               <label className="block text-sm text-gray-400 mb-1">Repayment Amount</label>
               <div className="flex gap-2 items-center bg-[#222] border border-[#333] rounded-md focus-within:border-green-500 overflow-hidden">
                 <span className="pl-3 text-gray-400 font-bold">₹</span>
                 <input
                   type="number" step="0.01" className="bg-transparent font-bold h-12 flex-1 outline-none px-2 text-white" required
                   value={repaymentData.amount} onChange={e => setRepaymentData({...repaymentData, amount: e.target.value})}
                   placeholder="Enter amount..."
                 />
                 <div className="h-6 border-l border-[#444] mx-1"></div>
                 <select
                    className="bg-transparent text-xs text-gray-400 font-semibold h-12 px-2 outline-none cursor-pointer hover:text-white"
                    value={multiplier}
                    onChange={e => setMultiplier(Number(e.target.value))}
                 >
                    <option value="1" className="bg-[#222] text-white">Raw</option>
                    <option value="1000" className="bg-[#222] text-white">Thousands</option>
                    <option value="100000" className="bg-[#222] text-white">Lakhs</option>
                 </select>
               </div>
               {repaymentData.amount && (
                 <p className="text-xs text-gray-400 mt-2 text-right">
                   Final: <span className="text-white font-bold">{formatCurrency(parseFloat(repaymentData.amount) * multiplier)}</span>
                 </p>
               )}
               <p className="text-xs text-gray-500 mt-2">Repayments are automatically applied to the oldest pending advance first.</p>
            </div>
            <button type="submit" className="btn-primary mt-2 bg-green-600 hover:bg-green-700 text-white">
              Log Repayment
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Advances Ledger & History</h3>
            <p className="text-xs text-gray-400 mt-1">Pending debt and repayment history for the selected employee.</p>
          </div>
          {aiData?.advances && aiData.advances.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                   const dataToExport = aiData.advances.map((adv: any) => ({
                      Date: formatDateIST(adv.date),
                      TotalAmount: Number(adv.amount),
                      AmountRepaid: Number(adv.amountRepaid),
                      PendingDebt: Number(adv.amount) - Number(adv.amountRepaid),
                      Reason: adv.reason || 'N/A'
                   }));
                   const employeeName = employees.find(e => e.id === formData.employeeId)?.name || 'Employee';
                   exportToExcel(dataToExport, `${employeeName}_Advances_Ledger`);
                }}
                className="bg-[#1f2937] hover:bg-gray-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Download size={14}/> Export Excel
              </button>
              <button
                onClick={() => {
                   const headers = ['Date', 'Advance Amount', 'Amount Repaid', 'Pending Debt', 'Reason'];
                   const rows = aiData.advances.map((adv: any) => [
                      formatDateIST(adv.date),
                      formatCurrency(Number(adv.amount)),
                      formatCurrency(Number(adv.amountRepaid)),
                      formatCurrency(Number(adv.amount) - Number(adv.amountRepaid)),
                      adv.reason || 'N/A'
                   ]);
                   const employeeName = employees.find(e => e.id === formData.employeeId)?.name || 'Employee';
                   exportToPDF(headers, rows, `${employeeName} - Advances Ledger & History`);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Download size={14}/> Export PDF
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1e1e1e]">
              <tr className="border-b border-[#333] text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-3">Date</th>
                <th className="p-3">Advance Amount</th>
                <th className="p-3">Amount Repaid</th>
                <th className="p-3">Pending Debt</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {aiData?.advances?.map((adv: any) => (
                <tr key={adv.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                  <td className="p-3 text-gray-300">{formatDateIST(adv.date)}</td>
                  <td className="p-3 font-bold text-white">{formatCurrency(Number(adv.amount))}</td>
                  <td className="p-3 text-green-400">{formatCurrency(Number(adv.amountRepaid))}</td>
                  <td className="p-3 font-bold text-red-400">{formatCurrency(Number(adv.amount) - Number(adv.amountRepaid))}</td>
                  <td className="p-3 text-gray-400">{adv.reason || 'N/A'}</td>
                </tr>
              ))}
              {(!aiData?.advances || aiData.advances.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">No advances recorded for this employee.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdvanceConfirm && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                 <Check className="text-red-500" /> Confirm Give Advance
              </h3>
              <p className="text-sm text-gray-400 mb-4 border-b border-[#333]/50 pb-2">
                 Please review the details below before giving the advance.
              </p>

              <div className="space-y-3 mb-6 text-sm text-gray-300">
                 <div className="flex justify-between">
                    <span className="text-gray-500">Employee Name:</span>
                    <span className="font-bold text-white">
                       {employees.find(emp => emp.id === formData.employeeId)?.name || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-gray-500">Advance Amount:</span>
                     <span className="font-bold text-red-500">{formatCurrency(parseFloat(formData.amount))}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-gray-500">Reason / Description:</span>
                     <span className="font-bold text-white">{formData.reason}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#333]/30 pt-2 text-xs text-gray-500">
                     <span>Log Date:</span>
                     <span>{formData.date ? formatDateIST(formData.date) : 'Current Time'}</span>
                  </div>
              </div>

              <div className="flex gap-4">
                 <button 
                    onClick={handleConfirmAdvance}
                    className="btn-primary flex-1 bg-red-600 hover:bg-red-700 font-bold"
                 >
                    Confirm & Give Advance
                 </button>
                 <button 
                    onClick={() => setShowAdvanceConfirm(false)}
                    className="px-4 py-2 bg-[#2a2a2a] text-gray-300 hover:text-white rounded font-bold border border-[#333]"
                 >
                    Edit / Cancel
                 </button>
              </div>
           </div>
        </div>
      )}

      {showRepayConfirm && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                 <Check className="text-green-500" /> Confirm Repayment / Deduction
              </h3>
              <p className="text-sm text-gray-400 mb-4 border-b border-[#333]/50 pb-2">
                 Please review the details below before recording the repayment.
              </p>

              <div className="space-y-3 mb-6 text-sm text-gray-300">
                 <div className="flex justify-between">
                    <span className="text-gray-500">Employee Name:</span>
                    <span className="font-bold text-white">
                       {employees.find(emp => emp.id === formData.employeeId)?.name || ''}
                    </span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Repayment Amount:</span>
                    <span className="font-bold text-green-400">{formatCurrency(parseFloat(repaymentData.amount) * multiplier)}</span>
                 </div>
                 <div className="flex justify-between border-t border-[#333]/30 pt-2 text-xs text-gray-500">
                    <span>Target:</span>
                    <span className="italic text-gray-400">Auto-applies to oldest pending advances</span>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button 
                    onClick={handleConfirmRepay}
                    className="btn-primary flex-1 bg-green-600 hover:bg-green-700 font-bold"
                 >
                    Confirm & Record
                 </button>
                 <button 
                    onClick={() => setShowRepayConfirm(false)}
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
