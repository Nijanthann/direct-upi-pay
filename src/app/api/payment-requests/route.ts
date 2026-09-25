import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  validateAmount,
  generateTransactionReference,
  generateUpiUri,
  generateQrDataUrl,
  getQrExpirationDate,
} from '@/lib/upi';
import { logAuditEvent } from '@/lib/audit';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);

    const statusParam = url.searchParams.get('status');
    const cashierIdParam = url.searchParams.get('cashier_id');
    const upiAccountIdParam = url.searchParams.get('upi_account_id');
    const dateRangeParam = url.searchParams.get('date_range');
    const startDateParam = url.searchParams.get('start_date');
    const endDateParam = url.searchParams.get('end_date');
    const searchParam = url.searchParams.get('search');
    const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {
      shop_id: user.shop_id,
    };

    // Role restriction: Cashier can only see their own transactions
    if (user.role === 'CASHIER') {
      where.cashier_id = user.id;
    } else if (cashierIdParam) {
      where.cashier_id = cashierIdParam;
    }

    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam;
    }

    if (upiAccountIdParam && upiAccountIdParam !== 'ALL') {
      where.upi_account_id = upiAccountIdParam;
    }

    if (searchParam && searchParam.trim()) {
      where.transaction_reference = {
        contains: searchParam.trim().toUpperCase(),
      };
    }

    // Date filtering
    const now = new Date();
    if (dateRangeParam === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.created_at = { gte: startOfDay };
    } else if (dateRangeParam === 'yesterday') {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.created_at = { gte: startOfYesterday, lt: endOfYesterday };
    } else if (dateRangeParam === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.created_at = { gte: sevenDaysAgo };
    } else if (dateRangeParam === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      where.created_at = { gte: thirtyDaysAgo };
    } else if (startDateParam && endDateParam) {
      where.created_at = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam),
      };
    }

    // Auto-expire any pending requests that have passed expires_at
    const expiredPending = await prisma.paymentRequest.updateMany({
      where: {
        shop_id: user.shop_id,
        status: 'PENDING',
        expires_at: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (expiredPending.count > 0) {
      console.log(`Auto-expired ${expiredPending.count} payment requests.`);
    }

    const payments = await prisma.paymentRequest.findMany({
      where,
      include: {
        cashier: {
          select: { id: true, name: true, email: true },
        },
        reporter: {
          select: { id: true, name: true, email: true },
        },
        upi_account: {
          select: { id: true, upi_id: true, display_name: true, provider_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: Math.min(limitParam, 100),
    });

    return jsonSuccess({ payment_requests: payments });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    }
    console.error('Fetch payment requests error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to retrieve transactions.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const { amount, upi_account_id } = body;

    // 1. Amount validation (Backend Authority)
    const amountVal = validateAmount(amount);
    if (!amountVal.valid) {
      return jsonError('INVALID_AMOUNT', amountVal.error || 'Please enter a valid amount greater than ₹0.');
    }

    // 2. UPI Account validation
    let upiAccount;
    if (upi_account_id) {
      upiAccount = await prisma.upiAccount.findUnique({
        where: { id: upi_account_id },
      });
    } else {
      // Default to shop default active UPI account
      upiAccount = await prisma.upiAccount.findFirst({
        where: { shop_id: user.shop_id, status: 'ACTIVE', is_default: true },
      });
      if (!upiAccount) {
        upiAccount = await prisma.upiAccount.findFirst({
          where: { shop_id: user.shop_id, status: 'ACTIVE' },
        });
      }
    }

    if (!upiAccount || upiAccount.shop_id !== user.shop_id) {
      return jsonError('UPI_NOT_FOUND', 'Selected UPI account was not found.');
    }

    if (upiAccount.status !== 'ACTIVE') {
      return jsonError('UPI_INACTIVE', 'This UPI account is currently inactive. Please select another account.');
    }

    // 3. Shop details for merchant name
    const shop = await prisma.shop.findUnique({
      where: { id: user.shop_id },
      select: { shop_name: true },
    });

    const shopName = shop?.shop_name || 'Merchant Store';

    // 4. Generate transaction reference and expiration
    const transactionReference = generateTransactionReference();
    const expiresAt = getQrExpirationDate();

    // 5. Generate standard UPI URI
    const upiUri = generateUpiUri({
      pa: upiAccount.upi_id,
      pn: shopName,
      am: amountVal.value,
      cu: 'INR',
      tr: transactionReference,
      tn: `Payment to ${shopName}`,
    });

    // 6. Generate QR Code Data URL
    const qrDataUrl = await generateQrDataUrl(upiUri);

    // 7. Store in database
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        shop_id: user.shop_id,
        cashier_id: user.id,
        upi_account_id: upiAccount.id,
        transaction_reference: transactionReference,
        amount: amountVal.value,
        currency: 'INR',
        status: 'PENDING',
        upi_uri: upiUri,
        expires_at: expiresAt,
      },
      include: {
        cashier: { select: { id: true, name: true, email: true } },
        upi_account: { select: { id: true, upi_id: true, display_name: true, provider_name: true } },
      },
    });

    await logAuditEvent({
      shopId: user.shop_id,
      userId: user.id,
      action: 'CREATE_PAYMENT_REQUEST',
      entityType: 'PAYMENT_REQUEST',
      entityId: paymentRequest.id,
      metadata: {
        reference: transactionReference,
        amount: amountVal.value,
        upi_id: upiAccount.upi_id,
      },
    });

    return jsonSuccess(
      {
        payment_request: {
          ...paymentRequest,
          qr_data_url: qrDataUrl,
          shop_name: shopName,
        },
      },
      201
    );
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    }
    console.error('Create payment request error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to generate payment QR code.', 500);
  }
}
