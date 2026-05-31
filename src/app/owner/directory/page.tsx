'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit } from 'lucide-react';

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
      type: activeTab,
      id: editingId,
      data: activeTab === 'customer'
        ? { name: formData.name, contact: formData.contact, address: formData.address, gst: formData.gst, transport: formData.transport }
        : { name: formData.name, contact: formData.contact, address: formData.address, gst: formData.gst, bankDetails: formData.bankDetails }
    };

    await fetch('/api/owner/directory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    alert(`${activeTab === 'customer' ? 'Customer' : 'Supplier'} saved successfully!`);
    setShowForm(false);
    fetchData();
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

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1e1e1e]">
              <tr className="border-b border-[#333] text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-3">Entity Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3">GST No.</th>
                {activeTab === 'customer' ? <th className="p-3">Transport</th> : <th className="p-3">Bank Details</th>}
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'customer' ? data.customers : data.suppliers).map((item: any) => (
                <tr key={item.id} className="border-b border-[#333] last:border-0 hover:bg-[#2a2a2a] text-sm">
                  <td className="p-3 font-bold text-white">{item.name}</td>
                  <td className="p-3 text-gray-300">{item.contact || '-'}</td>
                  <td className="p-3 text-gray-300">{item.gst || '-'}</td>
                  <td className="p-3 text-gray-300">{activeTab === 'customer' ? item.transport : item.bankDetails || '-'}</td>
                  <td className="p-3 text-right">
                     <button
                        onClick={() => handleEdit(item, activeTab)}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 justify-end w-full"
                     >
                        <Edit size={14} /> Edit
                     </button>
                  </td>
                </tr>
              ))}
              {(activeTab === 'customer' ? data.customers : data.suppliers).length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">No entries found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
