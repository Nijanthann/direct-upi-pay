'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ReceiptText,
  Search,
  Filter,
  Download,
  Calendar,
  ExternalLink,
  RotateCcw,
  CreditCard,
  User,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { PaymentRequestDto } from '@/types';

interface TransactionsClientViewProps {
  isOwner: boolean;
  upiAccounts: { id: string; display_name: string; upi_id: string }[];
  cashiers: { id: string; name: string }[];
}

export default function TransactionsClientView({
  isOwner,
  upiAccounts,
  cashiers,
}: TransactionsClientViewProps) {
  const [payments, setPayments] = useState<PaymentRequestDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter States
  const [dateRange, setDateRange] = useState<string>('all');
  const [status, setStatus] = useState<string>('ALL');
  const [cashierId, setCashierId] = useState<string>('');
  const [upiAccountId, setUpiAccountId] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange !== 'all') params.set('date_range', dateRange);
      if (status !== 'ALL') params.set('status', status);
      if (cashierId) params.set('cashier_id', cashierId);
      if (upiAccountId !== 'ALL') params.set('upi_account_id', upiAccountId);
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '100');

      const res = await fetch(`/api/payment-requests?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPayments(data.data.payment_requests);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [dateRange, status, cashierId, upiAccountId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments();
  };

  // CSV Export
  const handleExportCsv = () => {
    if (payments.length === 0) return;

    const headers = [
      'Transaction Reference',
      'Amount (INR)',
      'UPI Account',
      'Payee VPA',
      'Cashier',
      'Status',
      'Created At',
      'Reported Paid At',
    ];

    const rows = payments.map((p) => [
      p.transaction_reference,
      p.amount.toFixed(2),
      p.upi_account?.display_name || '',
      p.upi_account?.upi_id || '',
      p.cashier?.name || '',
      p.status,
      new Date(p.created_at).toISOString(),
      p.reported_paid_at ? new Date(p.reported_paid_at).toISOString() : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <ReceiptText className="w-5 h-5" />
            </span>
            <span>{isOwner ? 'Store Transaction History' : 'My Recent Transactions'}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Comprehensive audit log of all generated dynamic UPI QR payment requests.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={payments.length === 0}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Date Filter */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Date Period</label>
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED_PAID">Reported Paid</option>
              <option value="PENDING">Pending</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* UPI Account Filter */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">UPI Account</label>
            <select
              value={upiAccountId}
              onChange={(e) => setUpiAccountId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All UPI IDs</option>
              {upiAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name} ({a.upi_id})
                </option>
              ))}
            </select>
          </div>

          {/* Cashier Filter (Owner Only) */}
          {isOwner && cashiers.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cashier</label>
              <select
                value={cashierId}
                onChange={(e) => setCashierId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Cashiers</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search by Reference bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Transaction ID (e.g. TXN-20260925-104921)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setDateRange('all');
              setStatus('ALL');
              setCashierId('');
              setUpiAccountId('ALL');
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Transaction ID</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">UPI Account</th>
                <th className="px-6 py-3.5">Cashier</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5">Reported Paid</th>
                <th className="px-6 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin mb-2" />
                    <p className="text-xs">Loading transactions...</p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <ReceiptText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No transactions found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or date range.</p>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-900">
                      {p.transaction_reference}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{p.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-slate-800">{p.upi_account?.display_name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{p.upi_account?.upi_id}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {p.cashier?.name}
                    </td>
                    <td className="px-6 py-4">
                      {p.status === 'REPORTED_PAID' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Reported Paid
                        </span>
                      )}
                      {p.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                      {p.status === 'EXPIRED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                          Expired
                        </span>
                      )}
                      {p.status === 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" />
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(p.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      {new Date(p.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {p.reported_paid_at ? (
                        new Date(p.reported_paid_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/transactions/${p.id}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
                      >
                        <span>Details</span>
                        <ExternalLink className="w-3 h-3" />
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
  );
}
