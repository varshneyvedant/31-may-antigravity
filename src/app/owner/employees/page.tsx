'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Plus } from 'lucide-react';

export default function EmployeesDashboard() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', role: 'Worker', baseSalary: '' });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/owner/employees');
      const json = await res.json();
      setEmployees(json.employees);
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
        const res = await fetch('/api/owner/employees');
        const json = await res.json();
        if (isMounted) setEmployees(json.employees);
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initFetch();
    return () => { isMounted = false; };
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/owner/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmp)
    });
    alert('Employee added successfully!');
    setShowAddForm(false);
    setNewEmp({ name: '', role: 'Worker', baseSalary: '' });
    fetchEmployees();
  };

  if (loading && employees.length === 0) return <div className="text-gray-400">Loading workforce data...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <span className="text-red-500">Employee</span> & Advance Tracking
        </h2>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add New Employee
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddEmployee} className="card bg-[#1a1a1a] border-red-500/50 mb-8 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Full Name</label>
            <input
              type="text" className="input-field" required
              value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Role</label>
            <input
              type="text" className="input-field" required
              value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Base Salary (₹)</label>
            <input
              type="number" className="input-field" required
              value={newEmp.baseSalary} onChange={e => setNewEmp({...newEmp, baseSalary: e.target.value})}
            />
          </div>
          <button type="submit" className="btn-primary h-10 px-6">Save</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map(emp => (
          <div
            key={emp.id}
            className="card relative overflow-hidden hover:border-red-500 cursor-pointer transition-colors"
            onClick={() => router.push(`/owner/employees/${emp.id}`)}
          >
            {emp.advanceWarning && (
              <div className="absolute top-0 right-0 bg-red-600 text-white text-xs px-2 py-1 rounded-bl flex items-center gap-1 font-bold">
                <AlertCircle size={12} /> High Advance
              </div>
            )}

            <h3 className="text-xl font-bold text-white mb-1 hover:text-blue-400">{emp.name}</h3>
            <p className="text-gray-400 text-sm mb-4">{emp.role}</p>

            <div className="space-y-3">
              <div className="flex justify-between border-b border-[#333] pb-2">
                <span className="text-gray-500 text-sm">Base Salary</span>
                <span className="font-bold text-gray-200">₹ {emp.baseSalary.toLocaleString('en-IN')}/mo</span>
              </div>
              <div className="flex justify-between border-b border-[#333] pb-2">
                <span className="text-gray-500 text-sm">Total Pending Advance</span>
                <span className={`font-bold ${emp.advanceWarning ? 'text-red-500' : 'text-gray-200'}`}>
                  ₹ {emp.totalAdvances.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500 text-sm">Advance Ratio</span>
                <span className="font-bold text-gray-200">{emp.monthsAdvance}x Monthly Salary</span>
              </div>
            </div>

            {emp.advanceWarning && (
              <div className="mt-4 p-2 bg-red-950/30 border border-red-500/50 rounded text-xs text-red-400">
                Warning: Advance exceeds 4 months of base salary. Recommendation: Do not approve further advances until cleared.
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[#333] text-center text-sm text-gray-500 hover:text-white transition-colors">
               Click for Full Analytics & Salary Manager →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
