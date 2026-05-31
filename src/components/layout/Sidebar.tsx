'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, LogOut, Package, PackageOpen,
  Banknote, ShoppingCart, Users, Receipt,
  Trash2, TrendingUp, HandCoins, Building2, Briefcase,
  LineChart, Box, BookOpen, Activity, UserCog, ShieldCheck
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [activeRole, setActiveRole] = useState<string>('');

  useEffect(() => {
    if (session) {
      const realRole = ((session?.user as any)?.role || 'manager').toLowerCase();
      const saved = localStorage.getItem('simulated_role');
      if (realRole === 'owner' && saved) {
        setActiveRole(saved);
      } else {
        setActiveRole(realRole);
      }
    }
  }, [session]);

  if (pathname === '/login' || !session) return null;

  const realRole = ((session?.user as any)?.role || 'manager').toLowerCase();
  const displayRole = activeRole || realRole;

  const handleRoleToggle = (newRole: string) => {
    setActiveRole(newRole);
    localStorage.setItem('simulated_role', newRole);
  };

  const dashboardLink = displayRole === 'owner' ? '/owner/dashboard' : '/manager/dashboard';

  return (
    <div className="w-64 bg-[#141414] border-r border-[#333] h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-50">
      <div className="p-6 border-b border-[#333] bg-[#1a1a1a]">
        <h1 className="text-base font-bold text-white flex flex-col leading-tight tracking-wider">
          <span className="text-red-500 font-extrabold">VARSHNEY</span>
          <span className="text-[10px] text-gray-400 font-black tracking-widest mt-0.5">ELECTRICAL INDUSTRIES</span>
        </h1>
        <div className="flex flex-col gap-1.5 mt-2">
          <p className="text-xs text-gray-400 font-medium tracking-wide flex items-center gap-1">
            <ShieldCheck size={12} className="text-red-500" />
            REAL ROLE: {realRole.toUpperCase()}
          </p>
          {realRole === 'owner' && (
            <div className="flex items-center justify-between bg-[#222] p-1.5 rounded border border-[#333] mt-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-1 flex items-center gap-1">
                <UserCog size={10} /> Active View
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => handleRoleToggle('owner')}
                  className={`text-[9px] px-2 py-0.5 rounded font-black transition-all ${displayRole === 'owner' ? 'bg-red-500 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  OWNER
                </button>
                <button
                  onClick={() => handleRoleToggle('manager')}
                  className={`text-[9px] px-2 py-0.5 rounded font-black transition-all ${displayRole === 'manager' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  MGR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="mb-4">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Overview</h3>
          <div className="flex flex-col gap-1">
            <Link href={dashboardLink} className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === dashboardLink || pathname === '/' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
          </div>
        </div>

        {displayRole === 'manager' && (
           <>
              <div className="mb-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Inventory & Production</h3>
                <div className="flex flex-col gap-1">
                  <Link href="/shared/inventory/finished" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/shared/inventory/finished' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <PackageOpen size={18} />
                    Finished Goods Stock
                  </Link>
                  <Link href="/manager/market-price" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/manager/market-price' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <TrendingUp size={18} />
                    Market Price
                  </Link>
                  <Link href="/manager/production" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/manager/production' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Package size={18} />
                    Production Entry
                  </Link>
                  <Link href="/manager/scrap" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/manager/scrap' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Trash2 size={18} />
                    Scrap Management
                  </Link>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sales & Purchases</h3>
                <div className="flex flex-col gap-1">
                  <Link href="/manager/sales" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/manager/sales' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <ShoppingCart size={18} />
                    Sales Invoice
                  </Link>
                  <Link href="/manager/purchase" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/manager/purchase' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Package size={18} />
                    Purchase Entry
                  </Link>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Finance & Accounting</h3>
                <div className="flex flex-col gap-1">
                  <Link href="/manager/payments" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/manager/payments' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Banknote size={18} />
                    Payments
                  </Link>
                  <Link href="/manager/expenses" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/manager/expenses' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Receipt size={18} />
                    Factory Expenses
                  </Link>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">HR & Payroll</h3>
                <div className="flex flex-col gap-1">
                  <Link href="/manager/attendance" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/manager/attendance' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Users size={18} />
                    Attendance
                  </Link>
                  <Link href="/manager/advances" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/manager/advances' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <HandCoins size={18} />
                    Give Advance
                  </Link>
                </div>
              </div>
           </>
        )}

        {displayRole === 'owner' && (
           <>
              <div className="mb-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Finance & Accounting</h3>
                <div className="flex flex-col gap-1">
                  <Link href="/owner/financials" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/owner/financials' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <LineChart size={18} />
                    Financial Dashboard
                  </Link>
                  <Link href="/owner/expenses" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/owner/expenses' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Receipt size={18} />
                    Expenses Deep Dive
                  </Link>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Inventory & Production</h3>
                <div className="flex flex-col gap-1">
                  <Link href="/shared/inventory/finished" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/shared/inventory/finished' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <PackageOpen size={18} />
                    Finished Goods Stock
                  </Link>
                  <Link href="/owner/inventory" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/owner/inventory' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Package size={18} />
                    Raw Copper Analytics
                  </Link>
                  <Link href="/owner/products" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/owner/products' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Box size={18} />
                    Products & Brands
                  </Link>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stakeholders</h3>
                <div className="flex flex-col gap-1">
                  <Link href="/owner/stakeholders" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/owner/stakeholders' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Building2 size={18} />
                    Customers & Suppliers
                  </Link>
                  <Link href="/owner/directory" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/owner/directory' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <BookOpen size={18} />
                    Manage Directory
                  </Link>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">HR & Payroll</h3>
                <div className="flex flex-col gap-1">
                  <Link href="/owner/employees" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/owner/employees' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Briefcase size={18} />
                    Employee Management
                  </Link>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System</h3>
                <div className="flex flex-col gap-1">
                  <Link href="/owner/audit" className={`flex items-center gap-3 p-3 text-sm rounded-md transition-colors font-medium ${pathname === '/owner/audit' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                    <Activity size={18} />
                    System Audit Trail
                  </Link>
                </div>
              </div>
           </>
        )}
      </div>

      <div className="p-4 border-t border-[#333]">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center justify-center gap-2 w-full bg-red-950/20 hover:bg-red-900/50 text-red-500 p-2 rounded-md transition-colors font-medium text-sm border border-red-500/20"
        >
           <LogOut size={16} /> Secure Logout
        </button>
      </div>
    </div>
  );
}
