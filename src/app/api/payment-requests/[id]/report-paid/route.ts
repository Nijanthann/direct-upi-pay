import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const payment = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        upi_account: { select: { upi_id: true } },
      },
    });

    if (!payment || payment.shop_id !== user.shop_id) {
      return jsonError('NOT_FOUND', 'Payment request not found.', 404);
    }

    if (user.role === 'CASHIER' && payment.cashier_id !== user.id) {
      return jsonError('FORBIDDEN', 'You can only update payment requests you created.', 403);
    }

    // Check if expired
    if (new Date() > payment.expires_at && payment.status === 'PENDING') {
      await prisma.paymentRequest.update({
        where: { id: payment.id },
        data: { status: 'EXPIRED' },
      });
      return jsonError('QR_EXPIRED', 'This payment request has already expired. Please create a new QR code.');
    }

    if (payment.status !== 'PENDING') {
      return jsonError(
        'INVALID_STATUS',
        `Payment request cannot be marked as reported paid because it is currently ${payment.status}.`
      );
    }

    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'REPORTED_PAID',
        reported_paid_at: new Date(),
        reported_paid_by: user.id,
      },
      include: {
        cashier: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } },
        upi_account: { select: { id: true, upi_id: true, display_name: true } },
      },
    });

    await logAuditEvent({
      shopId: user.shop_id,
      userId: user.id,
      action: 'REPORT_PAYMENT',
      entityType: 'PAYMENT_REQUEST',
      entityId: id,
      metadata: {
        reference: payment.transaction_reference,
        amount: payment.amount,
        upi_id: payment.upi_account?.upi_id,
        note: 'Payment reported by cashier. Not automatic bank verification.',
      },
    });

    return jsonSuccess({
      payment_request: updated,
      disclaimer: 'Payment reported by cashier. This does not represent automatic bank verification.',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    }
    console.error('Report paid error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to update payment status.', 500);
  }
}
