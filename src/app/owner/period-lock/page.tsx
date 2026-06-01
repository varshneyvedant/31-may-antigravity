'use client';

import { useState, useEffect } from 'react';
import { Lock, Unlock, Calendar, ShieldAlert } from 'lucide-react';
import { formatDateIST } from '@/lib/format';

export default function PeriodLockPage() {
  const [locks, setLocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchLocks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/owner/period-lock');
      const json = await res.json();
      if (json.locks) {
        setLocks(json.locks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocks();
    
    // Set default month input to current month (format: YYYY-MM)
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    setSelectedMonth(`${yyyy}-${mm}`);
  }, []);

  const handleToggleLock = async (yearMonth: string, currentLockState: boolean) => {
    const actionStr = currentLockState ? 'UNLOCK' : 'LOCK';
    if (!confirm(`Are you absolutely sure you want to ${actionStr} the accounting period for ${yearMonth}?`)) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/owner/period-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth, locked: !currentLockState })
      });
      if (res.ok) {
        alert(`Successfully ${currentLockState ? 'unlocked' : 'locked'} period ${yearMonth}!`);
        fetchLocks();
      } else {
        const errJson = await res.json();
        alert(`Failed: ${errJson.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMonth) return;

    setSaving(true);
    try {
      const res = await fetch('/api/owner/period-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth: selectedMonth, locked: true })
      });
      if (res.ok) {
        alert(`Successfully locked and closed period ${selectedMonth}!`);
        fetchLocks();
      } else {
        const errJson = await res.json();
        alert(`Failed: ${errJson.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Lock className="text-red-500" /> Owner Period Locking Controls
        </h2>
        <p className="text-gray-400 text-sm mt-1">Protect historical transaction logs from backdated modifications and retroactive changes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Lock calendar form */}
        <div className="md:col-span-1">
          <form onSubmit={handleAddNewPeriod} className="card bg-[#1a1a1a] border-t-4 border-t-red-500 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
               <Calendar size={18} className="text-red-500" /> Close & Lock Month
            </h3>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Select Year & Month</label>
              <input 
                type="month" className="input-field font-bold text-lg"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                required
              />
            </div>

            <div className="p-3 bg-red-950/20 rounded border border-red-500/10 flex items-start gap-2 text-xs text-gray-400">
               <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={14} />
               <p>
                 <strong>Period Lockdown:</strong> Locking a month closes all accounting registers (Sales, Purchases, Production, Expenses, Advances, Payments). No manager can add, edit, or reverse transactions in locked months.
               </p>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="btn-primary py-2.5 font-bold flex items-center justify-center gap-2"
            >
               <Lock size={16} /> Close & Lock Period
            </button>
          </form>
        </div>

        {/* Closed periods listing */}
        <div className="md:col-span-2 card bg-[#1a1a1a]/70 backdrop-blur-sm border border-[#333]">
          <h3 className="text-lg font-bold text-white mb-4 pb-3 border-b border-[#333]">Accounting Periods Control Board</h3>
          
          {loading ? (
            <div className="text-gray-400 py-8 text-center text-sm">Querying period lock settings...</div>
          ) : locks.length === 0 ? (
            <div className="text-gray-500 py-8 text-center text-sm italic">No accounting periods are currently locked. All months are open for postings.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#333] text-gray-400 text-xs uppercase font-black">
                    <th className="p-3">Accounting Month</th>
                    <th className="p-3">Audit Lock Status</th>
                    <th className="p-3">Closed / Locked At</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locks.map((period) => (
                    <tr key={period.id} className="border-b border-[#333] last:border-0 hover:bg-[#252525] transition-colors">
                      <td className="p-3 font-bold text-white text-base">{period.yearMonth}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black uppercase border ${period.locked ? 'bg-red-950/40 text-red-400 border-red-500/20' : 'bg-green-950/40 text-green-400 border-green-500/20'}`}>
                          {period.locked ? <Lock size={10} /> : <Unlock size={10} />}
                          {period.locked ? 'LOCKED & CLOSED' : 'OPEN'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-gray-400">{formatDateIST(period.lockedAt)}</td>
                      <td className="p-3 text-right">
                        <button
                          disabled={saving}
                          onClick={() => handleToggleLock(period.yearMonth, period.locked)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded border transition-all ${period.locked ? 'bg-green-950/20 hover:bg-green-900/40 text-green-400 border-green-500/10' : 'bg-red-950/20 hover:bg-red-900/40 text-red-400 border-red-500/10'}`}
                        >
                          {period.locked ? <Unlock size={12} /> : <Lock size={12} />}
                          {period.locked ? 'Unlock Period' : 'Lock Period'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
