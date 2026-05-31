'use client';

import { useState } from 'react';

export default function MarketPricePage() {
  const [price, setPrice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/manager/market-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price })
    });
    alert('Daily Market Price updated successfully!');
    setPrice('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="text-red-500">Update</span> Daily Copper Market Price
      </h2>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Today's Market Price per KG (₹)</label>
          <input
            type="number"
            step="0.01"
            className="input-field text-xl font-bold text-white h-16"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="e.g. 825.00"
            required
          />
        </div>

        <p className="text-gray-500 text-sm mt-2">
          This value is used by the system to dynamically calculate the current stock valuation and net profit/loss for the owner dashboard.
        </p>

        <button type="submit" className="btn-primary mt-4">Update Global Market Price</button>
      </form>
    </div>
  );
}
