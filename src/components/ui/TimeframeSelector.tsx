'use client';

import { Timeframe } from '@/lib/timeframe';

interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (value: Timeframe) => void;
}

export default function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  const options: { label: string; value: Timeframe }[] = [
    { label: 'Today', value: '1D' },
    { label: '1 Week', value: '1W' },
    { label: '1 Month', value: '1M' },
    { label: '3 Months', value: '3M' },
    { label: '6 Months', value: '6M' },
    { label: '1 Year', value: '1Y' },
    { label: 'Last FY', value: 'FY' },
    { label: '3 Years', value: '3Y' },
    { label: '5 Years', value: '5Y' },
    { label: '10 Years', value: '10Y' },
    { label: 'All Time', value: 'ALL' },
  ];

  return (
    <div className="flex items-center gap-2 mb-6 bg-[#1e1e1e] p-2 rounded-md border border-[#333] w-fit">
      <span className="text-gray-400 text-sm font-medium mr-2">Timeframe:</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              value === opt.value
                ? 'bg-red-500 text-white font-bold'
                : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
