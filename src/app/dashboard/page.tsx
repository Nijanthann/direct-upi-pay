import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/layout/AppShell';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  ShieldAlert,
  QrCode,
  CreditCard,
  Users,
  Store,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Only Owner can view executive dashboard; Cashiers are directed to /payment
  if (session.role !== 'OWNER') {
    redirect('/payment');
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Auto-expire past-due pending requests
  await prisma.paymentRequest.updateMany({
    where: {
      shop_id: session.shop_id,
      status: 'PENDING',
      expires_at: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });

  const whereShop = { shop_id: session.shop_id };

  // Fetch metrics in parallel
  const [todayPayments, totalRequests, pendingCount, reportedPaidCount, expiredCount, recentPayments] =
    await Promise.all([
      prisma.paymentRequest.findMany({
        where: {
          shop_id: session.shop_id,
          created_at: { gte: startOfToday },
        },
        select: { amount: true, status: true },
      }),
      prisma.paymentRequest.count({ where: whereShop }),
      prisma.paymentRequest.count({ where: { ...whereShop, status: 'PENDING' } }),
      prisma.paymentRequest.count({
        where: { ...whereShop, status: { in: ['REPORTED_PAID', 'VERIFIED_SUCCESS'] } },
      }),
      prisma.paymentRequest.count({ where: { ...whereShop, status: 'EXPIRED' } }),
      prisma.paymentRequest.findMany({
        where: whereShop,
        include: {
          cashier: { select: { name: true } },
          upi_account: { select: { display_name: true, upi_id: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 8,
      }),
    ]);

  const todayCollectionRequests = todayPayments.reduce((acc, p) => acc + p.amount, 0);
  const todayReportedAmount = todayPayments
    .filter((p) => p.status === 'REPORTED_PAID' || p.status === 'VERIFIED_SUCCESS')
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <AppShell user={session}>
      <div className="space-y-8">
        {/* Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Executive Shop Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time monitoring of direct merchant UPI QR payment requests.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/payment"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-sm transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>Open POS Payment</span>
            </Link>
          </div>
        </div>

        {/* Essential Architecture Notice Banner (Section 7) */}
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs md:text-sm flex items-start gap-3 shadow-2xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">
              Clear Accounting Distinction: Collection Requests vs. Bank Settled Funds
            </p>
            <p className="text-amber-800/90 leading-relaxed text-xs">
              The metrics below track cashier-generated payment requests and customer confirmations. Customer funds
              transfer directly from the customer’s UPI app to your linked merchant bank account with <strong>0% fee</strong>.
              Reported Paid reflects cashier manual confirmation and does not represent an internal wallet or automated bank settlement.
            </p>
          </div>
        </div>

        {/* 5 Core Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Today's Collection Requests */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Today's Requests
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3">
              <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                ₹{todayCollectionRequests.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                Reported Paid: ₹{todayReportedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Card 2: Total Payment Requests */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Requests
              </span>
              <QrCode className="w-4 h-4 text-slate-600" />
            </div>
            <div className="mt-3">
              <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {totalRequests}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">All generated requests</p>
            </div>
          </div>

          {/* Card 3: Pending */}
          <div className="bg-white rounded-2xl p-5 border border-amber-200 bg-amber-50/20 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Pending
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-3">
              <p className="text-2xl md:text-3xl font-black text-amber-700 tracking-tight">
                {pendingCount}
              </p>
              <p className="text-[11px] text-amber-600 mt-1">Awaiting customer payment</p>
            </div>
          </div>

          {/* Card 4: Reported Paid */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-200 bg-emerald-50/20 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Reported Paid
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3">
              <p className="text-2xl md:text-3xl font-black text-emerald-700 tracking-tight">
                {reportedPaidCount}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">Cashier confirmed</p>
            </div>
          </div>

          {/* Card 5: Expired */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Expired
              </span>
              <AlertOctagon className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-3">
              <p className="text-2xl md:text-3xl font-black text-slate-700 tracking-tight">
                {expiredCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Past 5-min timeout</p>
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/upi-accounts"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">UPI Accounts</p>
                <p className="text-xs text-slate-500">Configure bank UPI IDs</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-transform" />
          </Link>

          <Link
            href="/cashiers"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Manage Cashiers</p>
                <p className="text-xs text-slate-500">Add & supervise staff</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-transform" />
          </Link>

          <Link
            href="/settings/shop"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Shop Profile</p>
                <p className="text-xs text-slate-500">Address & settings</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-transform" />
          </Link>
        </div>

        {/* Section 8: Recent Payments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Payment Requests</h2>
              <p className="text-xs text-slate-500 mt-0.5">Click any transaction to inspect details & audit logs</p>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Transaction ID</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">UPI Account</th>
                  <th className="px-6 py-3.5">Cashier</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Time</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                      No transactions recorded yet. Click &quot;Open POS Payment&quot; to create your first QR.
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-medium text-slate-900">
                        {p.transaction_reference}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        ₹{p.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-slate-800">{p.upi_account.display_name}</p>
                        <p className="text-[11px] font-mono text-slate-400">{p.upi_account.upi_id}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {p.cashier.name}
                      </td>
                      <td className="px-6 py-4">
                        {p.status === 'REPORTED_PAID' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Reported Paid
                          </span>
                        )}
                        {p.status === 'PENDING' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                            Pending
                          </span>
                        )}
                        {p.status === 'EXPIRED' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                            Expired
                          </span>
                        )}
                        {p.status === 'CANCELLED' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(p.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/transactions/${p.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 inline-flex items-center"
                          title="View details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
