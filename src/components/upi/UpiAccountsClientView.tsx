'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Star,
  ShieldCheck,
  Building,
  X,
} from 'lucide-react';
import { UpiAccountDto } from '@/types';

interface UpiAccountsClientViewProps {
  initialAccounts: UpiAccountDto[];
}

export default function UpiAccountsClientView({ initialAccounts }: UpiAccountsClientViewProps) {
  const [accounts, setAccounts] = useState<UpiAccountDto[]>(initialAccounts);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<UpiAccountDto | null>(null);

  // Form State
  const [displayName, setDisplayName] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [providerName, setProviderName] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const resetForm = () => {
    setDisplayName('');
    setUpiId('');
    setProviderName('');
    setIsDefault(false);
    setStatus('ACTIVE');
    setFormError('');
    setEditingAccount(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (account: UpiAccountDto) => {
    setEditingAccount(account);
    setDisplayName(account.display_name);
    setUpiId(account.upi_id);
    setProviderName(account.provider_name || '');
    setIsDefault(account.is_default);
    setStatus(account.status);
    setFormError('');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFormError('');

    if (!displayName.trim() || !upiId.trim()) {
      setFormError('Display Name and UPI ID are required.');
      return;
    }

    try {
      setSubmitting(true);
      const url = editingAccount
        ? `/api/upi-accounts/${editingAccount.id}`
        : '/api/upi-accounts';
      const method = editingAccount ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          upi_id: upiId.trim(),
          provider_name: providerName.trim() || null,
          is_default: isDefault,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error?.message || 'Operation failed.');
        setSubmitting(false);
        return;
      }

      // Refresh list
      const fetchRes = await fetch('/api/upi-accounts');
      const fetchData = await fetchRes.json();
      if (fetchRes.ok && fetchData.success) {
        setAccounts(fetchData.data.upi_accounts);
      }

      setShowAddModal(false);
      resetForm();
      setSubmitting(false);
    } catch {
      setFormError('Network error. Unable to save UPI account.');
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove or deactivate UPI ID "${name}"?`)) return;

    try {
      const res = await fetch(`/api/upi-accounts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        // Refresh
        const fetchRes = await fetch('/api/upi-accounts');
        const fetchData = await fetchRes.json();
        if (fetchRes.ok && fetchData.success) {
          setAccounts(fetchData.data.upi_accounts);
        }
      } else {
        alert(data.error?.message || 'Failed to remove UPI account.');
      }
    } catch {
      alert('Network error while deleting account.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <CreditCard className="w-5 h-5" />
            </span>
            <span>UPI Accounts</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your shop&apos;s bank-linked UPI IDs for direct customer payments.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New UPI ID</span>
        </button>
      </div>

      {/* Info notice */}
      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Ensure these UPI IDs belong to your shop&apos;s commercial or personal bank account. The cashier terminal generates dynamic QR codes pointing directly to your active accounts. Cashiers only see accounts set as <strong>Active</strong>.
        </p>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className={`bg-white rounded-2xl border p-5 transition-all shadow-2xs relative overflow-hidden flex flex-col justify-between ${
              acc.is_default
                ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-900 text-base">{acc.display_name}</h3>
                    {acc.is_default && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Star className="w-3 h-3 fill-emerald-600" /> Default
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs font-semibold text-emerald-700 mt-1">{acc.upi_id}</p>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    acc.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {acc.status}
                </span>
              </div>

              {acc.provider_name && (
                <div className="mt-4 flex items-center space-x-2 text-xs text-slate-500">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>{acc.provider_name}</span>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => openEditModal(acc)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                title="Edit account"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(acc.id, acc.display_name)}
                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                title="Delete or deactivate"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAccount ? 'Edit UPI Account' : 'Add New UPI Account'}
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
                <label className="text-xs font-bold text-slate-600 uppercase">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Store Counter 1 / HDFC Primary"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">UPI ID (VPA)</label>
                <input
                  type="text"
                  placeholder="e.g. yourshop@okhdfcbank or merchant@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <p className="text-[11px] text-slate-400">Must be a valid UPI format like name@bankhandle</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Bank / Provider Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ACTIVE">Active (Shown to Cashier)</option>
                    <option value="INACTIVE">Inactive (Hidden)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    id="is-default"
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <label htmlFor="is-default" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Set as Default Account
                  </label>
                </div>
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
                  {submitting ? 'Saving...' : editingAccount ? 'Update Account' : 'Save UPI ID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
