'use client';

import { useState, useEffect } from 'react';
import TimeframeSelector from '@/components/ui/TimeframeSelector';
import { Timeframe } from '@/lib/timeframe';
import { formatDateIST } from '@/lib/format';
import { Activity, Search, Filter, Download, RotateCcw } from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPDF } from '@/lib/export/pdf';

export default function AuditDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/audit?timeframe=${timeframe}&module=${moduleFilter}&action=${actionFilter}`);
      const json = await res.json();
      setLogs(json.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (logId: string) => {
    if (!confirm("Are you absolutely sure you want to rollback and reverse this action? This will undo the creation of the record in the database.")) return;
    setRollingBackId(logId);
    try {
      const res = await fetch('/api/owner/audit/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId })
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Rollback failed");
      } else {
        alert("Rollback successful! The transaction has been reversed.");
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setRollingBackId(null);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [timeframe, moduleFilter, actionFilter]);

  const getActionColor = (action: string) => {
    switch(action) {
      case 'CREATE': return 'text-green-500 bg-green-950/40 border-green-500/20';
      case 'UPDATE': return 'text-blue-500 bg-blue-950/40 border-blue-500/20';
      case 'DELETE': return 'text-red-500 bg-red-950/40 border-red-500/20';
      default: return 'text-gray-400 bg-gray-800 border-gray-700';
    }
  };

  const getIsRollbackable = (log: any) => {
    if (log.action !== 'CREATE') return false;
    try {
      if (!log.details) return false;
      const details = JSON.parse(log.details);
      return !!details.id;
    } catch {
      return false;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="text-purple-500" /> System Audit Trail
        </h2>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>

      <div className="card flex gap-4 items-end">
         <div className="flex-1">
           <label className="block text-sm text-gray-400 mb-1">Filter by Module</label>
           <select
             className="input-field w-full"
             value={moduleFilter}
             onChange={(e) => setModuleFilter(e.target.value)}
           >
             <option value="ALL">All Modules</option>
             <option value="Sales">Sales</option>
             <option value="Purchases">Purchases</option>
             <option value="Production">Production</option>
             <option value="Payments">Payments</option>
             <option value="Advances">Advances</option>
             <option value="Expenses">Expenses</option>
           </select>
         </div>
         <div className="flex-1">
           <label className="block text-sm text-gray-400 mb-1">Filter by Action</label>
           <select
             className="input-field w-full"
             value={actionFilter}
             onChange={(e) => setActionFilter(e.target.value)}
           >
             <option value="ALL">All Actions</option>
             <option value="CREATE">Creates</option>
             <option value="UPDATE">Updates</option>
             <option value="DELETE">Deletes</option>
           </select>
         </div>
         <button onClick={fetchLogs} className="btn-primary flex items-center gap-2 h-11">
            <Search size={16}/> Refresh
         </button>
         <button onClick={() => exportToExcel(logs, `Audit_Logs_${timeframe}`)} className="bg-[#1f2937] hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-2 h-11">
            <Download size={16}/> Export Excel
         </button>
         <button onClick={() => {
            const headers = ['Timestamp', 'User Role', 'Module', 'Action', 'Description'];
            const rows = logs.map(log => [
               formatDateIST(log.date),
               log.user,
               log.module,
               log.action,
               log.description
            ]);
            exportToPDF(headers, rows, `System Audit Trail (${timeframe})`);
         }} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-2 h-11">
            <Download size={16}/> Export PDF
         </button>
      </div>

      <div className="card">
         {loading ? (
            <div className="text-gray-400 p-4">Loading audit logs...</div>
         ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#333] text-gray-400 text-sm">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">User Role</th>
                    <th className="p-3">Module</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Raw Details (JSON)</th>
                    <th className="p-3 text-right">System Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                      <td className="p-3 text-gray-300 whitespace-nowrap">{formatDateIST(log.date)}</td>
                      <td className="p-3">
                         <span className={`px-2 py-1 rounded text-xs font-bold ${log.user === 'OWNER' ? 'bg-red-950/40 text-red-400' : 'bg-blue-950/40 text-blue-400'}`}>
                            {log.user}
                         </span>
                      </td>
                      <td className="p-3 text-gray-300 font-bold">{log.module}</td>
                      <td className="p-3">
                         <span className={`px-2 py-1 rounded text-xs font-bold border ${getActionColor(log.action)}`}>
                            {log.action}
                         </span>
                      </td>
                      <td className="p-3 text-gray-300">{log.description}</td>
                      <td className="p-3 text-gray-500 font-mono text-xs max-w-xs truncate" title={log.details}>
                         {log.details || '-'}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                         {getIsRollbackable(log) ? (
                            <button
                              disabled={rollingBackId === log.id}
                              onClick={() => handleRollback(log.id)}
                              className="px-3 py-1 bg-red-950/30 hover:bg-red-900/50 text-red-500 border border-red-500/20 text-xs rounded transition-all flex items-center gap-1 font-bold ml-auto"
                            >
                               <RotateCcw size={12} className={rollingBackId === log.id ? "animate-spin" : ""} />
                               {rollingBackId === log.id ? "Undoing..." : "Rollback"}
                            </button>
                         ) : (
                            <span className="text-xs text-gray-600 font-medium italic select-none pr-2">Permanent Record</span>
                         )}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-gray-500">No activity logs found for the selected criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
         )}
      </div>
    </div>
  );
}
