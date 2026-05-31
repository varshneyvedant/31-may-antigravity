'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ChevronRight, Box, Tag } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function FinishedGoodsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const role = (session?.user as any)?.role;

  useEffect(() => {
    fetch('/api/shared/inventory/finished')
      .then(res => res.json())
      .then(json => {
         if (json.success) setData(json.tree);
         setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-gray-400">Loading finished goods inventory...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <span className="text-red-500">Finished Goods</span> Inventory
      </h2>
      <p className="text-gray-400 mb-8">
         Real-time physical stock currently sitting in the warehouse. Click on any specific size to view its exact production history log.
      </p>

      {data.length === 0 && (
         <div className="card text-center text-gray-500 py-12">
            No finished goods are currently in stock.
         </div>
      )}

      {data.map((category: any) => (
         <div key={category.name} className="mb-10">
            <div className="flex justify-between items-end border-b-2 border-red-500/50 pb-2 mb-6">
               <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Package className="text-red-500" /> {category.name}
               </h3>
               <div className="text-lg font-bold text-gray-400">
                  Total Category Stock: <span className="text-white">{Number(category.totalStock).toFixed(2)} Tons</span>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {category.brands.map((brand: any) => (
                  <div key={brand.name} className="card bg-[#1a1a1a] border border-[#333]">
                     <div className="flex justify-between items-center mb-4 border-b border-[#333] pb-3">
                        <h4 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                           <Tag size={18} className="text-blue-400" /> {brand.name}
                        </h4>
                        <div className="font-bold text-blue-400 bg-blue-950/30 px-3 py-1 rounded">
                           {Number(brand.totalStock).toFixed(2)} Tons
                        </div>
                     </div>

                     <div className="flex flex-col gap-2">
                        {brand.sizes.map((size: any) => (
                           <div
                              key={size.size}
                              onClick={() => router.push(`/shared/inventory/finished/detail?category=${encodeURIComponent(category.name)}&brand=${encodeURIComponent(brand.name)}&size=${encodeURIComponent(size.size)}`)}
                              className="flex justify-between items-center p-3 bg-[#222] rounded hover:bg-[#2a2a2a] cursor-pointer transition-colors group"
                           >
                              <div className="flex items-center gap-3">
                                 <Box size={16} className="text-gray-500 group-hover:text-green-400 transition-colors" />
                                 <span className="font-medium text-gray-300">{size.size}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="text-right">
                                    <span className="font-bold text-white text-lg">{Number(size.available).toFixed(2)} T</span>
                                 </div>
                                 <ChevronRight size={16} className="text-gray-600 group-hover:text-white" />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
         </div>
      ))}
    </div>
  );
}
