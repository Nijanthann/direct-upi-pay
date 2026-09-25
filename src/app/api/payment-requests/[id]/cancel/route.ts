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
    });

    if (!payment || payment.shop_id !== user.shop_id) {
      return jsonError('NOT_FOUND', 'Payment request not found.', 404);
    }

    if (user.role === 'CASHIER' && payment.cashier_id !== user.id) {
      return jsonError('FORBIDDEN', 'You can only cancel payment requests you created.', 403);
    }

    if (payment.status !== 'PENDING') {
      return jsonError(
        'CANNOT_CANCEL',
        `Payment request cannot be cancelled because its status is ${payment.status}.`
      );
    }

    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelled_at: new Date(),
      },
    });

    await logAuditEvent({
      shopId: user.shop_id,
      userId: user.id,
      action: 'CANCEL_PAYMENT_REQUEST',
      entityType: 'PAYMENT_REQUEST',
      entityId: id,
      metadata: {
        reference: payment.transaction_reference,
        amount: payment.amount,
      },
    });

    return jsonSuccess({ payment_request: updated });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    }
    console.error('Cancel payment error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to cancel payment request.', 500);
  }
}
