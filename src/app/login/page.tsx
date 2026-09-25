'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || 'Login failed. Please check credentials.');
        setLoading(false);
        return;
      }

      // Route according to role (Section 6)
      if (data.data.user.role === 'OWNER') {
        router.push('/dashboard');
      } else {
        router.push('/payment');
      }
      router.refresh();
    } catch {
      setError('Network connection error. Please try again.');
      setLoading(false);
    }
  };

  const fillDemoOwner = () => {
    setEmail('owner@example.com');
    setPassword('Owner@123');
    setError('');
  };

  const fillDemoCashier = () => {
    setEmail('cashier@example.com');
    setPassword('Cashier@123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 font-black text-2xl text-slate-950 shadow-lg shadow-emerald-500/25 mb-3">
            ₹
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Direct UPI Pay
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Merchant Point-of-Sale Terminal • Zero Platform Fee
          </p>
        </div>

        {/* Demo Fast Login Buttons */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg backdrop-blur-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> 1-Click Demo Testing Credentials
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillDemoOwner}
              className="px-3 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-left border border-slate-600/50 text-xs transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white group-hover:text-emerald-300">Shop Owner</span>
                <span className="text-[10px] text-amber-400 font-semibold">Dashboard</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">owner@example.com</p>
            </button>

            <button
              type="button"
              onClick={fillDemoCashier}
              className="px-3 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-left border border-slate-600/50 text-xs transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white group-hover:text-emerald-300">Counter Cashier</span>
                <span className="text-[10px] text-emerald-400 font-semibold">POS Screen</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">cashier@example.com</p>
            </button>
          </div>
        </div>

        {/* Login Form Box */}
        <div className="mt-4 bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Staff / Owner Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              New shopkeeper?{' '}
              <Link href="/register" className="font-bold text-emerald-600 hover:text-emerald-700">
                Register Your Store
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Direct P2M • No wallet balance • 100% peer payment</span>
        </div>
      </div>
    </div>
  );
}
