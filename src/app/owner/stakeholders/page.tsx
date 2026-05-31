'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/format';

export default function StakeholdersDashboard() {
  const router = useRouter();
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/owner/stakeholders');
        const json = await res.json();
        if (isMounted) setStakeholders(json.stakeholders);
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, []);

  if (loading) return <div className="text-gray-400">Loading ledger data...</div>;

  const customers = stakeholders.filter(s => s.type === 'Customer');
  const suppliers = stakeholders.filter(s => s.type === 'Supplier');

  const StakeholderTable = ({ title, data, pendingLabel }: { title: string, data: any[], pendingLabel: string }) => (
    <div className="card mb-8">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#333] text-gray-400 text-sm">
              <th className="p-3">Name</th>
              <th className="p-3">Lifetime Volume (Tons)</th>
              <th className="p-3">Total Value</th>
              <th className="p-3 text-red-400">{pendingLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr
                key={item.id}
                className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                onClick={() => router.push(`/owner/stakeholders/${item.type.toLowerCase()}/${item.id}`)}
              >
                <td className="p-3 font-bold text-blue-400 hover:underline">{item.name}</td>
                <td className="p-3 text-gray-300">{Number(item.totalVolume).toFixed(2)}</td>
                <td className="p-3 text-gray-300">{formatCurrency(item.totalBilled)}</td>
                <td className={`p-3 font-bold ${title === 'Customers' ? (item.pendingAmount > 0 ? 'text-green-500' : item.pendingAmount < 0 ? 'text-red-400' : 'text-gray-500') : (item.pendingAmount > 0 ? 'text-red-500' : item.pendingAmount < 0 ? 'text-green-400' : 'text-gray-500')}`}>
                  {item.pendingAmount < 0 ? '-' : ''}{formatCurrency(Math.abs(item.pendingAmount))}
                  {item.pendingAmount < 0 && <span className="ml-1 text-xs text-gray-500 font-normal">(Credit)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <span className="text-red-500">Ledger</span> & Stakeholders
      </h2>

      <StakeholderTable
        title="Customers"
        data={customers}
        pendingLabel="Pending Payment (They Owe Us)"
      />

      <StakeholderTable
        title="Suppliers"
        data={suppliers}
        pendingLabel="Pending Payment (We Owe Them)"
      />
    </div>
  );
}
