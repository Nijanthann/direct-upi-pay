import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateQrDataUrl } from '@/lib/upi';
import AppShell from '@/components/layout/AppShell';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  User,
  Building2,
  Download,
  Printer,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  const payment = await prisma.paymentRequest.findUnique({
    where: { id },
    include: {
      shop: true,
      cashier: { select: { id: true, name: true, email: true } },
      reporter: { select: { id: true, name: true, email: true } },
      upi_account: true,
    },
  });

  if (!payment || payment.shop_id !== session.shop_id) {
    notFound();
  }

  if (session.role === 'CASHIER' && payment.cashier_id !== session.id) {
    redirect('/transactions');
  }

  // Auto-expire check
  let currentStatus = payment.status;
  if (currentStatus === 'PENDING' && new Date() > payment.expires_at) {
    await prisma.paymentRequest.update({
      where: { id: payment.id },
      data: { status: 'EXPIRED' },
    });
    currentStatus = 'EXPIRED';
  }

  const qrDataUrl = await generateQrDataUrl(payment.upi_uri);

  // Fetch related audit logs
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      shop_id: session.shop_id,
      entity_id: payment.id,
    },
    include: { user: { select: { name: true } } },
    orderBy: { created_at: 'desc' },
  });

  return (
    <AppShell user={session}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back navigation */}
        <Link
          href="/transactions"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Transactions</span>
        </Link>

        {/* Transaction Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="bg-slate-900 text-white p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-bold tracking-widest text-emerald-400">Transaction Details</p>
              <h1 className="text-3xl md:text-4xl font-black text-white mt-1">₹{payment.amount.toFixed(2)}</h1>
              <p className="text-xs font-mono text-slate-400 mt-1">{payment.transaction_reference}</p>
            </div>

            <div>
              {currentStatus === 'REPORTED_PAID' && (
                <div className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-2 text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>REPORTED PAID</span>
                </div>
              )}
              {currentStatus === 'PENDING' && (
                <div className="px-4 py-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center space-x-2 text-sm font-bold animate-pulse">
                  <Clock className="w-4 h-4" />
                  <span>PENDING PAYMENT</span>
                </div>
              )}
              {currentStatus === 'EXPIRED' && (
                <div className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-2 text-sm font-bold">
                  <Clock className="w-4 h-4" />
                  <span>EXPIRED</span>
                </div>
              )}
              {currentStatus === 'CANCELLED' && (
                <div className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 flex items-center space-x-2 text-sm font-bold">
                  <XCircle className="w-4 h-4" />
                  <span>CANCELLED</span>
                </div>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase">Receiving UPI Account</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{payment.upi_account.display_name}</p>
                  <p className="font-mono text-xs text-slate-500">{payment.upi_account.upi_id}</p>
                  {payment.upi_account.provider_name && (
                    <p className="text-[11px] text-slate-400">{payment.upi_account.provider_name}</p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase">Created By Cashier</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{payment.cashier.name}</p>
                  <p className="text-xs text-slate-500">{payment.cashier.email}</p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase">Currency</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{payment.currency}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase">Created Timestamp</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {new Date(payment.created_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase">QR Expiration Time</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {new Date(payment.expires_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    })}
                  </p>
                </div>

                {payment.reported_paid_at && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-800 uppercase">Reported Paid Details</span>
                    <p className="text-xs font-medium text-emerald-900 mt-1">
                      Confirmed At:{' '}
                      {new Date(payment.reported_paid_at).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })}
                    </p>
                    <p className="text-xs text-emerald-800">
                      Reported By: {payment.reporter?.name || payment.cashier.name}
                    </p>
                  </div>
                )}

                {payment.cancelled_at && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-xs font-bold text-rose-800 uppercase">Cancellation Time</span>
                    <p className="text-xs font-medium text-rose-900 mt-1">
                      {new Date(payment.cancelled_at).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* UPI Payment URI & QR Preview */}
            <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center gap-6">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="UPI QR" className="w-32 h-32" />
              </div>

              <div className="space-y-2 text-xs w-full overflow-hidden">
                <span className="font-semibold text-slate-500 uppercase">Generated Dynamic UPI URI</span>
                <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all">
                  {payment.upi_uri}
                </p>
                <p className="text-slate-400 text-[11px]">
                  Direct P2M URI specifying merchant UPI ID, exact amount, and reference code.
                </p>
              </div>
            </div>
          </div>

          {/* Audit trail */}
          {auditLogs.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-100 p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Audit Log History</h3>
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-800">{log.action}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">by {log.user?.name || 'System'}</span>
                    </div>
                    <span className="text-slate-400 font-mono">
                      {new Date(log.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
