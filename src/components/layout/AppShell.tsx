'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  QrCode,
  ReceiptText,
  CreditCard,
  Users,
  Store,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { AuthUser } from '@/types';

interface AppShellProps {
  user: AuthUser;
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isOwner = user.role === 'OWNER';

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const navItems = [
    ...(isOwner
      ? [
          {
            label: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
          },
        ]
      : []),
    {
      label: 'New Payment',
      href: '/payment',
      icon: QrCode,
      badge: 'POS',
    },
    {
      label: isOwner ? 'All Transactions' : 'Recent Transactions',
      href: '/transactions',
      icon: ReceiptText,
    },
    ...(isOwner
      ? [
          {
            label: 'UPI Accounts',
            href: '/upi-accounts',
            icon: CreditCard,
          },
          {
            label: 'Cashiers',
            href: '/cashiers',
            icon: Users,
          },
          {
            label: 'Shop Settings',
            href: '/settings/shop',
            icon: Store,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-800">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950">
            ₹
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight text-white">{user.shop?.shop_name || 'UPI Store'}</h1>
            <p className="text-xs text-slate-400 capitalize">{user.role.toLowerCase()} • {user.name.split(' ')[0]}</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Desktop & Tablet Sidebar */}
      <aside
        className={`fixed md:sticky top-0 z-30 inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-xl text-slate-950 shadow-md shadow-emerald-500/20">
            ₹
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-white text-base tracking-tight">Direct UPI</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
                0% Fee
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate" title={user.shop?.shop_name || 'Retail Terminal'}>
              {user.shop?.shop_name || 'Retail Terminal'}
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
          <div className="truncate mr-2">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isOwner
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
            }`}
          >
            {user.role}
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm shadow-emerald-500/20'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-emerald-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer info: Zero platform fee disclaimer & Logout */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <div className="px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-[11px] text-emerald-300/90 leading-tight">
            <span className="font-semibold text-emerald-400">Direct Merchant P2M</span>
            <p className="mt-0.5 text-slate-400">Zero intermediary fee. Payments settle straight to shopkeeper bank.</p>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:bg-rose-950/30 hover:text-rose-200 transition-colors border border-transparent hover:border-rose-900/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-20 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Desktop Breadcrumb / Header */}
        <div className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{user.shop?.shop_name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-semibold capitalize">
              {pathname === '/payment'
                ? 'POS Payment'
                : pathname === '/dashboard'
                ? 'Executive Dashboard'
                : pathname.replace('/', '').replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200 text-xs font-medium text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>UPI Network Online</span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-800">{user.name}</p>
              <p className="text-[11px] text-slate-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
        </div>

        {/* Page Content Body */}
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
