'use client';

import { formatDateIST } from '@/lib/format';

import { getCurrentISTInput } from '@/lib/format';


import { useState, useEffect } from 'react';

export default function AttendancePage() {
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
  const [attendance, setAttendance] = useState<Record<string, {status: string, hours: string}>>({});
  const [date, setDate] = useState(getCurrentISTInput());

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if(data.employees) {
           setEmployees(data.employees);
           const initial: Record<string, {status: string, hours: string}> = {};
           data.employees.forEach((e: any) => {
             initial[e.id] = { status: 'Present', hours: '' };
           });
           setAttendance(initial);
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/manager/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendance, date })
    });
    alert('Attendance marked successfully!');
  };

  const handleStatusChange = (id: string, status: string) => {
    setAttendance(prev => ({...prev, [id]: { ...prev[id], status }}));
  };

  const handleHoursChange = (id: string, hours: string) => {
    setAttendance(prev => ({...prev, [id]: { ...prev[id], hours }}));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-red-500">Mark</span> Daily Attendance
        </h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Date of Record:</label>
          <input
            type="datetime-local"
            className="input-field max-w-[200px]"
            min="2000-01-01"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#333] text-gray-400 text-sm">
                <th className="p-3">Employee Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Hours (If Custom)</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-[#333] last:border-0">
                  <td className="p-3 font-medium">{emp.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(emp.id, 'Present')}
                        className={`w-8 h-8 rounded font-bold text-sm transition-colors ${attendance[emp.id]?.status === 'Present' ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.4)]' : 'bg-[#1e1e1e] border border-[#333] text-gray-400 hover:border-green-600 hover:text-green-500'}`}
                        title="Present"
                      >
                        P
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(emp.id, 'Absent')}
                        className={`w-8 h-8 rounded font-bold text-sm transition-colors ${attendance[emp.id]?.status === 'Absent' ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]' : 'bg-[#1e1e1e] border border-[#333] text-gray-400 hover:border-red-600 hover:text-red-500'}`}
                        title="Absent"
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(emp.id, 'Half_day')}
                        className={`w-8 h-8 rounded font-bold text-sm transition-colors ${attendance[emp.id]?.status === 'Half_day' ? 'bg-yellow-600 text-white shadow-[0_0_10px_rgba(202,138,4,0.4)]' : 'bg-[#1e1e1e] border border-[#333] text-gray-400 hover:border-yellow-600 hover:text-yellow-500'}`}
                        title="Half-day"
                      >
                        H
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(emp.id, 'Custom')}
                        className={`w-8 h-8 rounded font-bold text-sm transition-colors ${attendance[emp.id]?.status === 'Custom' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-[#1e1e1e] border border-[#333] text-gray-400 hover:border-blue-600 hover:text-blue-500'}`}
                        title="Custom Hours"
                      >
                        C
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    {attendance[emp.id]?.status === 'Custom' ? (
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        placeholder="Hrs"
                        className="bg-[#1e1e1e] border border-blue-600 text-white px-2 py-1 h-8 rounded w-16 text-sm outline-none"
                        value={attendance[emp.id]?.hours}
                        onChange={(e) => handleHoursChange(emp.id, e.target.value)}
                        required
                        autoFocus
                      />
                    ) : (
                      <span className="text-gray-600 text-xs">
                        {attendance[emp.id]?.status === 'Present' && '8.5 hrs'}
                        {attendance[emp.id]?.status === 'Absent' && '0 hrs'}
                        {attendance[emp.id]?.status === 'Half_day' && '4.25 hrs'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="submit" className="btn-primary mt-6 w-full">Save Attendance</button>
      </form>
    </div>
  );
}
