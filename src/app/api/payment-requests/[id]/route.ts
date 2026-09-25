import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateQrDataUrl } from '@/lib/upi';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const payment = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        shop: { select: { shop_name: true } },
        cashier: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } },
        upi_account: { select: { id: true, upi_id: true, display_name: true, provider_name: true } },
      },
    });

    if (!payment || payment.shop_id !== user.shop_id) {
      return jsonError('NOT_FOUND', 'Payment request not found.', 404);
    }

    if (user.role === 'CASHIER' && payment.cashier_id !== user.id) {
      return jsonError('FORBIDDEN', 'You do not have permission to view this transaction.', 403);
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

    return jsonSuccess({
      payment_request: {
        ...payment,
        status: currentStatus,
        qr_data_url: qrDataUrl,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    }
    console.error('Fetch payment request error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to retrieve transaction details.', 500);
  }
}
