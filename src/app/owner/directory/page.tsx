'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export default function DirectoryPage() {
  const [data, setData] = useState<any>({ customers: [], suppliers: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', contact: '', address: '', gst: '',
    transport: '', // Customer only
    bankDetails: '' // Supplier only
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/owner/directory');
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

    const initFetch = async () => {
      try {
        const res = await fetch('/api/owner/directory');
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
  }, []);

  const handleEdit = (item: any, type: 'customer' | 'supplier') => {
    setActiveTab(type);
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      contact: item.contact || '',
      address: item.address || '',
      gst: item.gst || '',
      transport: item.transport || '',
      bankDetails: item.bankDetails || ''
    });
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setFormData({ name: '', contact: '', address: '', gst: '', transport: '', bankDetails: '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      action: editingId ? 'UPDATE' : 'CREATE',
      type: activeTab.toUpperCase(),
      id: editingId || undefined,
      data: activeTab === 'customer'
        ? { name: formData.name, contact: formData.contact, address: formData.address, gst: formData.gst, transport: formData.transport }
        : { name: formData.name, contact: formData.contact, address: formData.address, gst: formData.gst, bankDetails: formData.bankDetails }
    };

    try {
      const res = await fetch('/api/owner/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(`${activeTab === 'customer' ? 'Customer' : 'Supplier'} saved successfully!`);
        setShowForm(false);
        fetchData();
      } else {
        const errJson = await res.json();
        alert(`Failed to save directory entry: ${errJson.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred while saving directory entry.');
    }
  };

  if (loading && data.customers.length === 0) return <div className="text-gray-400">Loading Master Directory...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="text-red-500" /> Master Directory
        </h2>
        <button onClick={handleCreateNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add New {activeTab === 'customer' ? 'Customer' : 'Supplier'}
        </button>
      </div>

      <div className="flex gap-4 mb-6">
         <button
           onClick={() => {setActiveTab('customer'); setShowForm(false);}}
           className={`px-6 py-2 rounded font-bold transition-colors ${activeTab === 'customer' ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}
         >
           Customers Directory
         </button>
         <button
           onClick={() => {setActiveTab('supplier'); setShowForm(false);}}
           className={`px-6 py-2 rounded font-bold transition-colors ${activeTab === 'supplier' ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}
         >
           Suppliers Directory
         </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card bg-[#1a1a1a] border-red-500/50 mb-8 p-6 space-y-4">
          <h3 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'Create New'} {activeTab === 'customer' ? 'Customer' : 'Supplier'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Company / Entity Name</label>
              <input type="text" className="input-field" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Details (Phone / Email)</label>
              <input type="text" className="input-field" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Full Business Address</label>
              <input type="text" className="input-field" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">GST Number</label>
              <input type="text" className="input-field" value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value})} />
            </div>
            {activeTab === 'customer' ? (
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Preferred Transport / Logistics</label>
                 <input type="text" className="input-field" value={formData.transport} onChange={e => setFormData({...formData, transport: e.target.value})} />
               </div>
            ) : (
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Bank Details (Acct & IFSC)</label>
                 <input type="text" className="input-field" value={formData.bankDetails} onChange={e => setFormData({...formData, bankDetails: e.target.value})} />
               </div>
            )}
          </div>
          <div className="flex gap-4 mt-6">
            <button type="submit" className="btn-primary">Save {activeTab === 'customer' ? 'Customer' : 'Supplier'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-[#2a2a2a] text-gray-300 hover:text-white rounded">Cancel</button>
          </div>
        </form>
      )}

      {activeTab === 'customer' && (() => {
        const agingTotals = data.customers.reduce(
          (acc: any, cust: any) => {
            const aging = cust.aging || { bucket0_30: 0, bucket31_60: 0, bucket61_90: 0, bucket90_plus: 0, total: 0 };
            return {
              bucket0_30: acc.bucket0_30 + Number(aging.bucket0_30),
              bucket31_60: acc.bucket31_60 + Number(aging.bucket31_60),
              bucket61_90: acc.bucket61_90 + Number(aging.bucket61_90),
              bucket90_plus: acc.bucket90_plus + Number(aging.bucket90_plus),
              total: acc.total + Number(aging.total)
            };
          },
          { bucket0_30: 0, bucket31_60: 0, bucket61_90: 0, bucket90_plus: 0, total: 0 }
        );

        return (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="card bg-[#1a1a1a] border-l-4 border-l-green-500 p-4">
              <span className="text-[10px] uppercase font-bold text-gray-500">0 - 30 Days (Current)</span>
              <p className="text-xl font-extrabold text-green-400 mt-1">{formatCurrency(agingTotals.bucket0_30)}</p>
            </div>
            <div className="card bg-[#1a1a1a] border-l-4 border-l-yellow-500 p-4">
              <span className="text-[10px] uppercase font-bold text-gray-500">31 - 60 Days (Overdue)</span>
              <p className="text-xl font-extrabold text-yellow-400 mt-1">{formatCurrency(agingTotals.bucket31_60)}</p>
            </div>
            <div className="card bg-[#1a1a1a] border-l-4 border-l-orange-500 p-4">
              <span className="text-[10px] uppercase font-bold text-gray-500">61 - 90 Days (Critical)</span>
              <p className="text-xl font-extrabold text-orange-400 mt-1">{formatCurrency(agingTotals.bucket61_90)}</p>
            </div>
            <div className="card bg-[#1a1a1a] border-l-4 border-l-red-500 p-4">
              <span className="text-[10px] uppercase font-bold text-gray-500">90+ Days (Risk)</span>
              <p className="text-xl font-extrabold text-red-500 mt-1">{formatCurrency(agingTotals.bucket90_plus)}</p>
            </div>
            <div className="card bg-[#1a1a1a] border-l-4 border-l-blue-500 p-4 bg-blue-950/10">
              <span className="text-[10px] uppercase font-bold text-gray-400">Total Outstanding AR</span>
              <p className="text-xl font-black text-blue-400 mt-1">{formatCurrency(agingTotals.total)}</p>
            </div>
          </div>
        );
      })()}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1e1e1e]">
              {activeTab === 'customer' ? (
                <tr className="border-b border-[#333] text-gray-400 text-xs uppercase tracking-wider">
                  <th className="p-3">Customer Entity</th>
                  <th className="p-3 text-right">Total O/S</th>
                  <th className="p-3 text-right">0-30 Days</th>
                  <th className="p-3 text-right">31-60 Days</th>
                  <th className="p-3 text-right">61-90 Days</th>
                  <th className="p-3 text-right">90+ Days</th>
                  <th className="p-3">Contact & GST</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              ) : (
                <tr className="border-b border-[#333] text-gray-400 text-xs uppercase tracking-wider">
                  <th className="p-3">Supplier Entity</th>
                  <th className="p-3">Contact Details</th>
                  <th className="p-3">GST No.</th>
                  <th className="p-3">Bank Details</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeTab === 'customer' ? (
                data.customers.map((item: any) => {
                  const aging = item.aging || { bucket0_30: 0, bucket31_60: 0, bucket61_90: 0, bucket90_plus: 0, total: 0 };
                  return (
                    <tr key={item.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                      <td className="p-3">
                        <span className="font-bold text-white block">{item.name}</span>
                        {item.transport && <span className="text-[10px] text-gray-500">Transport: {item.transport}</span>}
                      </td>
                      <td className="p-3 text-right font-extrabold text-blue-400 font-mono">{formatCurrency(item.creditBalance || 0)}</td>
                      <td className={`p-3 text-right font-mono ${aging.bucket0_30 > 0 ? 'text-green-400 font-bold' : 'text-gray-600'}`}>{aging.bucket0_30 > 0 ? formatCurrency(aging.bucket0_30) : '-'}</td>
                      <td className={`p-3 text-right font-mono ${aging.bucket31_60 > 0 ? 'text-yellow-400 font-bold' : 'text-gray-600'}`}>{aging.bucket31_60 > 0 ? formatCurrency(aging.bucket31_60) : '-'}</td>
                      <td className={`p-3 text-right font-mono ${aging.bucket61_90 > 0 ? 'text-orange-400 font-bold' : 'text-gray-600'}`}>{aging.bucket61_90 > 0 ? formatCurrency(aging.bucket61_90) : '-'}</td>
                      <td className={`p-3 text-right font-mono ${aging.bucket90_plus > 0 ? 'text-red-500 font-black' : 'text-gray-600'}`}>{aging.bucket90_plus > 0 ? formatCurrency(aging.bucket90_plus) : '-'}</td>
                      <td className="p-3 text-xs text-gray-400">
                        <span className="block text-white font-medium">{item.contact || 'No Contact'}</span>
                        <span className="block text-[10px] text-gray-500 font-mono">GST: {item.gst || '-'}</span>
                      </td>
                      <td className="p-3 text-right">
                         <button
                            onClick={() => handleEdit(item, 'customer')}
                            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 justify-end font-bold text-xs"
                         >
                            <Edit size={12} /> Edit
                         </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                data.suppliers.map((item: any) => (
                  <tr key={item.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                    <td className="p-3 font-bold text-white">{item.name}</td>
                    <td className="p-3 text-gray-300">{item.contact || '-'}</td>
                    <td className="p-3 text-gray-300">{item.gst || '-'}</td>
                    <td className="p-3 text-gray-300 font-mono text-xs">{item.bankDetails || '-'}</td>
                    <td className="p-3 text-right">
                       <button
                          onClick={() => handleEdit(item, 'supplier')}
                          className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 justify-end font-bold text-xs"
                       >
                          <Edit size={12} /> Edit
                       </button>
                    </td>
                  </tr>
                ))
              )}
              {(activeTab === 'customer' ? data.customers : data.suppliers).length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-gray-500">No entries found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
