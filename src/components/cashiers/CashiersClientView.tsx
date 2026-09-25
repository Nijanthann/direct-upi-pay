'use client';

import React, { useState } from 'react';
import {
  Users,
  Plus,
  UserCheck,
  UserX,
  KeyRound,
  Edit,
  Phone,
  Mail,
  Receipt,
  X,
  Shield,
} from 'lucide-react';

interface CashierItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  payment_count: number;
}

interface CashiersClientViewProps {
  initialCashiers: CashierItem[];
}

export default function CashiersClientView({ initialCashiers }: CashiersClientViewProps) {
  const [cashiers, setAccounts] = useState<CashierItem[]>(initialCashiers);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<boolean>(false);
  const [activeCashier, setActiveCashier] = useState<CashierItem | null>(null);

  // Add/Edit Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [status, setStatus] = useState<string>('ACTIVE');
  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setStatus('ACTIVE');
    setFormError('');
    setActiveCashier(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (c: CashierItem) => {
    setActiveCashier(c);
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone || '');
    setStatus(c.status);
    setPassword('');
    setFormError('');
    setShowAddModal(true);
  };

  const openResetPasswordModal = (c: CashierItem) => {
    setActiveCashier(c);
    setPassword('');
    setFormError('');
    setShowResetPasswordModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFormError('');

    try {
      setSubmitting(true);
      const url = activeCashier ? `/api/cashiers/${activeCashier.id}` : '/api/cashiers';
      const method = activeCashier ? 'PATCH' : 'POST';

      const payload: Record<string, string | null> = {
        name: name.trim(),
        phone: phone.trim() || null,
        status,
      };

      if (!activeCashier) {
        payload.email = email.trim().toLowerCase();
        payload.password = password;
      } else if (password.trim()) {
        payload.password = password.trim();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error?.message || 'Operation failed.');
        setSubmitting(false);
        return;
      }

      // Refresh list
      const fetchRes = await fetch('/api/cashiers');
      const fetchData = await fetchRes.json();
      if (fetchRes.ok && fetchData.success) {
        setAccounts(fetchData.data.cashiers);
      }

      setShowAddModal(false);
      setShowResetPasswordModal(false);
      resetForm();
      setSubmitting(false);
    } catch {
      setFormError('Network error. Unable to save cashier.');
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (c: CashierItem) => {
    const nextStatus = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/cashiers/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((item) => (item.id === c.id ? { ...item, status: nextStatus } : item))
        );
      }
    } catch {
      alert('Failed to update cashier status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
              <Users className="w-5 h-5" />
            </span>
            <span>Cashier Staff Management</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Authorize cashiers to generate QR codes on their counter screens.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Cashier</span>
        </button>
      </div>

      {/* Permissions Box */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Enforced Cashier Scope:</strong> Cashiers can only access the New Payment terminal and view their own generated requests. Cashiers cannot modify UPI IDs, add cashiers, or change shop bank accounts.
        </p>
      </div>

      {/* Cashier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cashiers.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{c.name}</h3>
                  <div className="mt-1 space-y-1 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.email}</span>
                    </p>
                    {c.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleStatus(c)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                    c.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                  }`}
                  title="Click to toggle Active/Inactive"
                >
                  {c.status}
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  <span>Total Payments:</span>
                </span>
                <span className="font-bold text-slate-800 font-mono">{c.payment_count}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 text-xs">
              <button
                onClick={() => openResetPasswordModal(c)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                title="Reset password"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Password</span>
              </button>
              <button
                onClick={() => openEditModal(c)}
                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1 cursor-pointer"
                title="Edit cashier"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {activeCashier ? 'Edit Cashier Details' : 'Add New Cashier'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Cashier Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunil Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {!activeCashier && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Cashier Email (Login ID)</label>
                  <input
                    type="email"
                    placeholder="e.g. cashier@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 91234 56789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {!activeCashier && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Initial Password</label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ACTIVE">Active (Can Login to POS)</option>
                  <option value="INACTIVE">Inactive (Suspended)</option>
                </select>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : activeCashier ? 'Update Cashier' : 'Create Cashier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && activeCashier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Reset Cashier Password</h3>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Set a new login password for <strong>{activeCashier.name}</strong> ({activeCashier.email}).
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">New Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {formError}
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
