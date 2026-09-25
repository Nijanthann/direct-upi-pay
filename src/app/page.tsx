import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  QrCode,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingDown,
  Building,
  Store,
  CreditCard,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();

  // If already authenticated, redirect according to role
  if (session) {
    if (session.role === 'OWNER') {
      redirect('/dashboard');
    } else {
      redirect('/payment');
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 font-black text-xl text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/20">
              ₹
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white tracking-tight text-lg">Direct UPI Pay</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  0% Fee
                </span>
              </div>
              <p className="text-[11px] text-slate-400">For Local Retailers in India</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
            >
              Register Shop
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Direct Peer-to-Merchant Payment Utility</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Dynamic UPI QR Codes with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                Zero Platform Fee
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
              Generate instant, amount-locked UPI payment QR codes on your shop counter terminal.
              Customers pay directly from Google Pay, PhonePe, Paytm, or BHIM straight to your shopkeeper bank account.
            </p>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <TrendingDown className="w-5 h-5 text-emerald-400 mb-1.5" />
                <h2 className="font-bold text-white text-xs">₹0 Platform Fee</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">No gateway commissions or wallet deductions</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <ShieldCheck className="w-5 h-5 text-teal-400 mb-1.5" />
                <h2 className="font-bold text-white text-xs">Zero Middleman</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">We never hold, route, or touch your money</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <Zap className="w-5 h-5 text-amber-400 mb-1.5" />
                <h2 className="font-bold text-white text-xs">Fast Cashier POS</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Generate amount QR in 2 clicks on counter</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <span>Launch POS Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm text-slate-200 border border-slate-700 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Store className="w-4 h-4 text-slate-400" />
                <span>Register Store</span>
              </Link>
            </div>
          </div>

          {/* Interactive POS Preview Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-slate-800/90 border border-slate-700/80 p-6 shadow-2xl backdrop-blur-md space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Live Demo Counter</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">04:45 Remaining</span>
              </div>

              <div className="text-center space-y-1">
                <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Demo Store Payment</p>
                <p className="text-4xl font-black text-white">₹500.00</p>
                <p className="text-xs font-mono text-emerald-400">demostore@upi</p>
              </div>

              {/* QR Mock */}
              <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center shadow-inner">
                <QrCode className="w-44 h-44 text-slate-900" />
                <p className="text-[11px] font-semibold text-slate-600 mt-2">Scan with Any UPI App</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-center">
                <p className="text-xs text-slate-300">
                  Try 1-Click login with credentials:
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Link
                    href="/login"
                    className="px-3 py-1 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-600/50"
                  >
                    Owner Demo
                  </Link>
                  <Link
                    href="/login"
                    className="px-3 py-1 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold hover:bg-indigo-600/50"
                  >
                    Cashier Demo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>Direct UPI Payment Web Application • Local Retail India • Zero Intermediary Commission</p>
      </footer>
    </div>
  );
}
