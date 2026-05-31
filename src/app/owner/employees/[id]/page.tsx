'use client';

import { formatDateIST } from '@/lib/format';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import TimeframeSelector from '@/components/ui/TimeframeSelector';
import { Timeframe } from '@/lib/timeframe';
import { User, Star, AlertCircle, TrendingUp, Calendar, FileText, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

function EmployeeDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const initialTimeframe = (searchParams.get('timeframe') as Timeframe) || '1M';
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);

  const [showSalaryUpdate, setShowSalaryUpdate] = useState(false);
  const [salaryUpdateData, setSalaryUpdateData] = useState({ newSalary: '', reason: '' });

  const handleTimeframeChange = (newTf: Timeframe) => {
     setTimeframe(newTf);
     router.replace(`/owner/employees/${id}?timeframe=${newTf}`);
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/employees/detail?id=${id}&timeframe=${timeframe}`);
      const json = await res.json();
      setData(json.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const initFetch = async () => {
      try {
        const res = await fetch(`/api/owner/employees/detail?id=${id}&timeframe=${timeframe}`);
        const json = await res.json();
        if (isMounted) setData(json.data);
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initFetch();
    return () => { isMounted = false; };
  }, [id, timeframe]);

  const handleSalaryUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/owner/employees/detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...salaryUpdateData })
    });
    alert('Salary updated successfully!');
    setShowSalaryUpdate(false);
    setSalaryUpdateData({ newSalary: '', reason: '' });
    fetchDetail();
  };

  if (loading && !data) return <div className="text-gray-400">Loading employee profile...</div>;

  const chartData = data?.salaryHistory.map((s: any) => ({
    date: formatDateIST(s.date),
    salary: s.amount
  }));

  // Add current salary as final point if missing
  if (chartData && chartData.length > 0) {
     chartData.push({
         date: 'Current',
         salary: data.employee.baseSalary
     });
  }

  // Construct unified Advance history feed
  const advanceFeed: any[] = [];
  if (data?.advances) {
      data.advances.forEach((adv: any) => {
          advanceFeed.push({
              id: `adv-${adv.id}`,
              date: new Date(adv.date),
              amount: adv.amount,
              type: 'ADVANCE',
              reason: adv.reason || 'General Advance'
          });
          if (adv.repayments && adv.repayments.length > 0) {
              adv.repayments.forEach((rep: any) => {
                  advanceFeed.push({
                      id: `rep-${rep.id}`,
                      date: new Date(rep.date),
                      amount: rep.amount,
                      type: 'REPAYMENT',
                      reason: `Repayment for ${adv.reason || 'Advance'}`
                  });
              });
          }
      });
  }
  // Sort feed descending by date
  advanceFeed.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 bg-[#2a2a2a] px-3 py-1 rounded w-fit text-sm"
      >
        <ArrowLeft size={16} /> Back to Employees
      </button>

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <User className="text-red-500" /> {data?.employee.name}
          </h2>
          <div className="text-gray-400 text-sm">{data?.employee.role}</div>
        </div>
        <TimeframeSelector value={timeframe} onChange={handleTimeframeChange} />
      </div>

      {!loading && data && (
        <>
          <div className="card border-l-4 border-l-blue-500 mb-6 bg-gradient-to-r from-[#1e1e1e] to-[#252525]">
             <h3 className="text-sm text-gray-400 mb-1 flex items-center gap-2"><Star size={16} className="text-yellow-500" /> System Evaluation & Rating</h3>
             <div className="flex items-center gap-6">
                <div className="text-4xl font-black text-white">{data.metrics.rating} <span className="text-lg text-gray-500">/ 5.0</span></div>
                <div className={`font-medium ${data.metrics.recommendationColor} bg-[#2a2a2a] p-3 rounded flex-1`}>
                   AI Recommendation: {data.metrics.recommendation}
                </div>
             </div>
          </div>

          {showSalaryUpdate && (
             <form onSubmit={handleSalaryUpdate} className="card bg-[#1a1a1a] border-green-500/50 mb-6 flex gap-4 items-end">
               <div className="flex-1">
                 <label className="block text-sm text-gray-400 mb-1">New Base Salary (₹)</label>
                 <input
                   type="number" className="input-field" required
                   value={salaryUpdateData.newSalary} onChange={e => setSalaryUpdateData({...salaryUpdateData, newSalary: e.target.value})}
                 />
               </div>
               <div className="flex-[2]">
                 <label className="block text-sm text-gray-400 mb-1">Reason for Change (e.g. Annual Appraisal)</label>
                 <input
                   type="text" className="input-field" required
                   value={salaryUpdateData.reason} onChange={e => setSalaryUpdateData({...salaryUpdateData, reason: e.target.value})}
                 />
               </div>
               <button type="submit" className="btn-primary h-10 px-6 bg-green-600 hover:bg-green-700">Update Salary</button>
             </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card relative group">
              <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><TrendingUp size={16} /> Current Base Salary</div>
              <div className="text-3xl font-bold text-white">₹ {data.employee.baseSalary.toLocaleString('en-IN')}/mo</div>
              <button
                 onClick={() => setShowSalaryUpdate(!showSalaryUpdate)}
                 className="absolute top-2 right-2 text-xs bg-[#2a2a2a] px-2 py-1 rounded text-gray-400 hover:text-white"
              >
                 Edit Salary
              </button>
            </div>
            <div className="card">
              <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Clock size={16} /> Estimated Productivity</div>
              <div className="text-3xl font-bold text-white">₹ {data.metrics.productivityRate.toLocaleString('en-IN', {maximumFractionDigits:0})}/hr</div>
              <div className="text-xs text-gray-500 mt-1">Effective Cost based on {data.metrics.effectiveHours} hours worked</div>
            </div>
            <div className="card">
              <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Calendar size={16} /> Attendance ({timeframe})</div>
              <div className="text-2xl font-bold text-white mt-1">
                <span className="text-green-500">{data.metrics.presentDays} Present</span> / <span className="text-red-500">{data.metrics.absentDays} Absent</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="card">
                <h3 className="text-xl font-bold mb-4">Salary Progression</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#a3a3a3" />
                      <YAxis stroke="#a3a3a3" domain={['dataMin - 5000', 'dataMax + 5000']} />
                      <RechartsTooltip
                         contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }}
                         formatter={(value: any) => `₹ ${Number(value).toLocaleString('en-IN')}`}
                      />
                      <Line type="monotone" dataKey="salary" stroke="#ef4444" strokeWidth={3} dot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2"><FileText size={20} className="text-red-500"/> Advance History (All-Time)</h3>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Current Pending Balance</div>
                    <div className={`font-bold ${data.metrics.totalAdvances > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                       ₹ {data.metrics.totalAdvances.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div className="overflow-y-auto max-h-64 custom-scrollbar">
                   {advanceFeed.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center p-3 border-b border-[#333] last:border-0">
                         <div>
                            <div className={`font-bold ${item.type === 'ADVANCE' ? 'text-orange-400' : 'text-green-400'}`}>
                               {item.type === 'ADVANCE' ? '-' : '+'} ₹ {item.amount.toLocaleString('en-IN')}
                            </div>
                            <div className="text-xs text-gray-500">
                               {item.type === 'ADVANCE' ? 'Advance Taken' : 'Repayment'} • {item.reason}
                            </div>
                         </div>
                         <div className="text-sm text-gray-400">{formatDateIST(item.date)}</div>
                      </div>
                   ))}
                   {advanceFeed.length === 0 && <div className="text-gray-500 p-4 text-center">No advance history found.</div>}
                </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function EmployeeDetail() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading employee profile...</div>}>
       <EmployeeDetailContent />
    </Suspense>
  );
}
