'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Printer,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Check,
  X,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { UpiAccountDto, PaymentRequestDto } from '@/types';

interface PosPaymentScreenProps {
  upiAccounts: UpiAccountDto[];
  shopName: string;
  cashierName: string;
}

export default function PosPaymentScreen({
  upiAccounts,
  shopName,
  cashierName,
}: PosPaymentScreenProps) {
  // POS Form state
  const defaultAccount = upiAccounts.find((a) => a.is_default) || upiAccounts[0];
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccount?.id || '');
  const [amountInput, setAmountInput] = useState<string>('');
  const [inputError, setInputError] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Active Payment State
  const [activePayment, setActivePayment] = useState<
    (PaymentRequestDto & { shop_name?: string }) | null
  >(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [timerExpired, setTimerExpired] = useState<boolean>(false);

  // Modal dialog states
  const [showConfirmPaidModal, setShowConfirmPaidModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Auto focus amount input on mount or when returning to new payment
  useEffect(() => {
    if (!activePayment) {
      amountInputRef.current?.focus();
    }
  }, [activePayment]);

  // Countdown timer for active payment
  useEffect(() => {
    if (!activePayment || activePayment.status !== 'PENDING') return;

    const expiresAt = new Date(activePayment.expires_at).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        setTimerExpired(true);
        setActivePayment((prev) => (prev ? { ...prev, status: 'EXPIRED' } : null));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activePayment]);

  // Quick amount buttons
  const quickAmounts = [50, 100, 200, 500, 1000, 2000];

  const handleQuickAmount = (val: number) => {
    setAmountInput(val.toString());
    setInputError('');
    amountInputRef.current?.focus();
  };

  const handleGenerateQr = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGenerating) return;

    setInputError('');

    const numericAmount = parseFloat(amountInput);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setInputError('Please enter a valid amount greater than ₹0.');
      amountInputRef.current?.focus();
      return;
    }

    if (numericAmount > 100000) {
      setInputError('Standard UPI transaction limit is ₹1,00,000.');
      return;
    }

    if (!selectedAccountId) {
      setInputError('Please select an active UPI account.');
      return;
    }

    try {
      setIsGenerating(true);
      const res = await fetch('/api/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numericAmount,
          upi_account_id: selectedAccountId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setInputError(data.error?.message || 'Failed to generate payment QR code.');
        setIsGenerating(false);
        return;
      }

      setActivePayment(data.data.payment_request);
      setTimerExpired(false);
      setIsGenerating(false);
    } catch {
      setInputError('Network error. Unable to generate QR.');
      setIsGenerating(false);
    }
  };

  // Mark payment as REPORTED_PAID
  const handleConfirmReportedPaid = async () => {
    if (!activePayment || isSubmittingAction) return;
    try {
      setIsSubmittingAction(true);
      setActionError('');

      const res = await fetch(`/api/payment-requests/${activePayment.id}/report-paid`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setActionError(data.error?.message || 'Failed to update payment status.');
        setIsSubmittingAction(false);
        return;
      }

      setActivePayment((prev) => (prev ? { ...prev, status: 'REPORTED_PAID' } : null));
      setShowConfirmPaidModal(false);
      setIsSubmittingAction(false);
    } catch {
      setActionError('Network error updating status.');
      setIsSubmittingAction(false);
    }
  };

  // Cancel payment request
  const handleCancelPayment = async () => {
    if (!activePayment || isSubmittingAction) return;
    try {
      setIsSubmittingAction(true);
      setActionError('');

      const res = await fetch(`/api/payment-requests/${activePayment.id}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setActionError(data.error?.message || 'Failed to cancel payment.');
        setIsSubmittingAction(false);
        return;
      }

      setActivePayment((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      setShowCancelModal(false);
      setIsSubmittingAction(false);
    } catch {
      setActionError('Network error cancelling payment.');
      setIsSubmittingAction(false);
    }
  };

  const handleReset = () => {
    setActivePayment(null);
    setAmountInput('');
    setInputError('');
    setActionError('');
  };

  const handleDownloadQr = () => {
    if (!activePayment?.qr_data_url) return;
    const a = document.createElement('a');
    a.href = activePayment.qr_data_url;
    a.download = `UPI-QR-${activePayment.transaction_reference}-${activePayment.amount}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const selectedAccount = upiAccounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Printable Receipt Section (Only visible during print) */}
      {activePayment && (
        <div id="printable-receipt" className="hidden print:block p-6 text-center font-mono">
          <h2 className="text-xl font-bold uppercase">{shopName}</h2>
          <p className="text-sm">UPI Payment Request</p>
          <div className="my-3 border-t border-b border-dashed border-black py-2">
            <p className="text-2xl font-bold">₹{activePayment.amount.toFixed(2)}</p>
            <p className="text-xs">Txn Ref: {activePayment.transaction_reference}</p>
            <p className="text-xs">UPI: {activePayment.upi_account?.upi_id}</p>
            <p className="text-xs">Cashier: {cashierName}</p>
            <p className="text-xs">Date: {new Date(activePayment.created_at).toLocaleString('en-IN')}</p>
            <p className="text-xs">Status: {activePayment.status}</p>
          </div>
          {activePayment.qr_data_url && (
            <div className="flex justify-center my-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activePayment.qr_data_url} alt="QR Code" className="w-48 h-48" />
            </div>
          )}
          <p className="text-xs">Scan with Google Pay, PhonePe, Paytm, BHIM</p>
          <p className="text-[10px] mt-4">Direct peer-to-merchant payment. Zero platform fee.</p>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <QrCode className="w-5 h-5" />
            </span>
            <span>Point of Sale UPI Payment</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Dynamic QR code with exact amount. Customer pays directly to your UPI account.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-400 font-medium">Terminal Cashier:</span>
          <span className="font-semibold text-slate-700">{cashierName}</span>
        </div>
      </div>

      {/* Main Payment View Toggle */}
      {!activePayment ? (
        /* ================= 1. AMOUNT ENTRY / POS FORM ================= */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Fast Cashier Entry
            </span>
            <span className="text-xs text-slate-400">Zero Intermediary Fee (0%)</span>
          </div>

          <form onSubmit={handleGenerateQr} className="p-6 md:p-8 space-y-6">
            {/* UPI Account Selector */}
            <div className="space-y-2">
              <label htmlFor="upi-account" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Receiving UPI Account
              </label>
              {upiAccounts.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  No active UPI accounts found for this shop. Please ask the shop owner to add an active UPI ID.
                </div>
              ) : (
                <div className="relative">
                  <select
                    id="upi-account"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm appearance-none cursor-pointer"
                  >
                    {upiAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.display_name} — {account.upi_id} {account.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                  <CreditCard className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Primary Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="amount-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Payment Amount
                </label>
                <span className="text-xs text-slate-400">Exact amount customer will pay</span>
              </div>

              <div className="relative rounded-2xl border-2 border-slate-300 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all bg-slate-50/50">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <span className="text-slate-400 text-3xl md:text-4xl font-semibold">₹</span>
                </div>
                <input
                  id="amount-input"
                  ref={amountInputRef}
                  type="number"
                  step="0.01"
                  min="1"
                  max="100000"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setInputError('');
                  }}
                  className="w-full bg-transparent pl-12 md:pl-14 pr-16 py-4 md:py-6 text-3xl md:text-5xl font-bold tracking-tight text-slate-900 focus:outline-hidden placeholder:text-slate-300"
                  autoFocus
                />
                {amountInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmountInput('');
                      setInputError('');
                      amountInputRef.current?.focus();
                    }}
                    className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Clear input"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>

              {inputError && (
                <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 mt-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {inputError}
                </p>
              )}
            </div>

            {/* Quick Amount Chips */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500">Quick Amounts:</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-slate-700 text-sm font-semibold transition-all cursor-pointer shadow-2xs text-center active:scale-95"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button: Generate QR */}
            <button
              type="submit"
              disabled={isGenerating || upiAccounts.length === 0}
              className="w-full py-4 px-6 rounded-xl font-bold text-base md:text-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Dynamic UPI Request...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-5 h-5" />
                  <span>GENERATE PAYMENT QR</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Explanatory Banner */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center gap-3 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Customer funds transfer directly from their UPI app to your linked bank account via the NPCI UPI network. No middleman balance or gateway charges.
            </span>
          </div>
        </div>
      ) : (
        /* ================= 2. ACTIVE QR PAYMENT DISPLAY ================= */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
            {/* Top Bar with Status Badge */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-sm">{shopName}</span>
              </div>

              {/* Status Indicator */}
              <div>
                {activePayment.status === 'PENDING' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Waiting for Payment
                  </span>
                )}
                {activePayment.status === 'REPORTED_PAID' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    REPORTED PAID
                  </span>
                )}
                {activePayment.status === 'EXPIRED' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    QR EXPIRED
                  </span>
                )}
                {activePayment.status === 'CANCELLED' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
                    <XCircle className="w-3.5 h-3.5" />
                    CANCELLED
                  </span>
                )}
              </div>
            </div>

            {/* Main QR Card */}
            <div className="p-6 md:p-10 flex flex-col items-center text-center">
              {/* Amount Display */}
              <p className="text-xs uppercase font-bold tracking-widest text-slate-400">Total Amount Due</p>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mt-1 mb-4">
                ₹{activePayment.amount.toFixed(2)}
              </h1>

              {/* QR Code Container */}
              <div className="relative p-4 md:p-6 bg-white rounded-2xl border-2 border-slate-900 shadow-xl max-w-xs w-full flex items-center justify-center">
                {activePayment.status === 'PENDING' && activePayment.qr_data_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={activePayment.qr_data_url}
                    alt="Scan to Pay QR Code"
                    className="w-full h-auto aspect-square rounded-lg object-contain"
                  />
                ) : activePayment.status === 'REPORTED_PAID' ? (
                  <div className="aspect-square w-full flex flex-col items-center justify-center bg-emerald-50 rounded-xl p-4 text-emerald-800">
                    <CheckCircle2 className="w-20 h-20 text-emerald-600 mb-2 animate-bounce" />
                    <span className="font-bold text-lg">Payment Reported</span>
                    <span className="text-xs text-emerald-700 mt-1">Confirmed by Cashier</span>
                  </div>
                ) : activePayment.status === 'EXPIRED' ? (
                  <div className="aspect-square w-full flex flex-col items-center justify-center bg-slate-100 rounded-xl p-4 text-slate-500">
                    <Clock className="w-16 h-16 text-slate-400 mb-2" />
                    <span className="font-bold text-lg text-slate-800">QR Code Expired</span>
                    <span className="text-xs text-slate-500 mt-1">Please generate a new payment</span>
                  </div>
                ) : (
                  <div className="aspect-square w-full flex flex-col items-center justify-center bg-rose-50 rounded-xl p-4 text-rose-800">
                    <XCircle className="w-16 h-16 text-rose-600 mb-2" />
                    <span className="font-bold text-lg">Payment Cancelled</span>
                  </div>
                )}
              </div>

              {/* Payee Info */}
              <div className="mt-5 space-y-1">
                <p className="text-sm font-semibold text-slate-800">{shopName}</p>
                <p className="text-xs font-mono font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-600 inline-block">
                  UPI ID: {activePayment.upi_account?.upi_id}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ref: <span className="font-mono">{activePayment.transaction_reference}</span>
                </p>
              </div>

              {/* Countdown / Expiration Timer */}
              {activePayment.status === 'PENDING' && (
                <div className="mt-4 flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-full bg-slate-100 border border-slate-200">
                  <Clock className={`w-4 h-4 ${remainingSeconds < 60 ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`} />
                  <span className={remainingSeconds < 60 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                    QR expires in {formatTimer(remainingSeconds)}
                  </span>
                </div>
              )}

              {/* Customer apps hint */}
              <p className="text-xs text-slate-400 mt-4">
                Customer scans using <strong>Google Pay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, or <strong>BHIM</strong>
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
                {activePayment.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => setShowConfirmPaidModal(true)}
                      className="w-full sm:flex-1 py-3.5 px-6 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Check className="w-5 h-5" />
                      <span>PAYMENT COMPLETED</span>
                    </button>

                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full sm:w-auto py-3.5 px-5 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReset}
                    className="w-full py-4 px-6 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>START NEW PAYMENT</span>
                  </button>
                )}
              </div>

              {/* Utilities: Download QR and Print */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center space-x-4 text-xs font-medium text-slate-600">
                <button
                  onClick={handleDownloadQr}
                  className="flex items-center space-x-1 hover:text-slate-900 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR</span>
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={handlePrintSlip}
                  className="flex items-center space-x-1 hover:text-slate-900 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-1 hover:text-slate-900 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>New Request</span>
                </button>
              </div>
            </div>

            {/* Disclaimer Footer (Sections 21 & 22) */}
            <div className="bg-amber-50/70 border-t border-amber-200/60 px-6 py-3 text-center text-xs text-amber-900">
              <span className="font-semibold">Notice:</span> Confirming payment marks the request as{' '}
              <span className="font-bold underline">REPORTED PAID</span> by the cashier. This does not represent automatic bank gateway verification.
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRM REPORTED PAID MODAL ================= */}
      {showConfirmPaidModal && activePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-slate-900">Confirm Payment Received</h3>
            <p className="text-xs text-center text-slate-500 mt-1">
              Customer says the UPI payment has completed on their phone.
            </p>

            <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">₹{activePayment.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payee UPI:</span>
                <span className="font-mono text-xs text-slate-700">{activePayment.upi_account?.upi_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono text-xs text-slate-700">{activePayment.transaction_reference}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 leading-tight mb-4">
              <strong>Cashier Verification:</strong> This records the transaction as <em>REPORTED PAID</em> in shop records. The application does not hold or verify bank credentials.
            </div>

            {actionError && <p className="text-xs text-rose-600 mb-3 text-center">{actionError}</p>}

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmPaidModal(false)}
                disabled={isSubmittingAction}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmReportedPaid}
                disabled={isSubmittingAction}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-sm cursor-pointer"
              >
                {isSubmittingAction ? 'Updating...' : 'Yes, Confirm Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CANCEL PAYMENT MODAL ================= */}
      {showCancelModal && activePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-slate-900">Cancel Payment Request?</h3>
            <p className="text-xs text-center text-slate-500 mt-1">
              Are you sure you want to cancel the request for ₹{activePayment.amount.toFixed(2)}?
            </p>

            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 text-center font-mono">
              Ref: {activePayment.transaction_reference}
            </div>

            {actionError && <p className="text-xs text-rose-600 mb-3 text-center">{actionError}</p>}

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isSubmittingAction}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Keep Waiting
              </button>
              <button
                type="button"
                onClick={handleCancelPayment}
                disabled={isSubmittingAction}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-white shadow-sm cursor-pointer"
              >
                {isSubmittingAction ? 'Cancelling...' : 'Cancel Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
