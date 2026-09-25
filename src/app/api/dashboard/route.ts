import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireAuth();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Auto-expire past-due pending requests
    await prisma.paymentRequest.updateMany({
      where: {
        shop_id: user.shop_id,
        status: 'PENDING',
        expires_at: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    const whereShop = { shop_id: user.shop_id };

    // Today's total requested amount
    const todayPayments = await prisma.paymentRequest.findMany({
      where: {
        shop_id: user.shop_id,
        created_at: { gte: startOfToday },
      },
      select: { amount: true, status: true },
    });

    const todayCollectionRequests = todayPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const todayReportedPaidAmount = todayPayments
      .filter((p) => p.status === 'REPORTED_PAID' || p.status === 'VERIFIED_SUCCESS')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const [totalRequests, pendingCount, reportedPaidCount, expiredCount] = await Promise.all([
      prisma.paymentRequest.count({ where: whereShop }),
      prisma.paymentRequest.count({ where: { ...whereShop, status: 'PENDING' } }),
      prisma.paymentRequest.count({
        where: { ...whereShop, status: { in: ['REPORTED_PAID', 'VERIFIED_SUCCESS'] } },
      }),
      prisma.paymentRequest.count({ where: { ...whereShop, status: 'EXPIRED' } }),
    ]);

    // Recent payments (10 most recent)
    const recentPayments = await prisma.paymentRequest.findMany({
      where: whereShop,
      include: {
        cashier: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } },
        upi_account: { select: { id: true, upi_id: true, display_name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return jsonSuccess({
      stats: {
        today_collection_requests: todayCollectionRequests,
        today_reported_paid_amount: todayReportedPaidAmount,
        total_requests: totalRequests,
        pending_count: pendingCount,
        reported_paid_count: reportedPaidCount,
        expired_count: expiredCount,
      },
      recent_payments: recentPayments,
      disclaimer:
        'Reported Paid represents cashier manual confirmations upon customer completion. The application does not collect, hold, or auto-verify bank funds.',
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    }
    console.error('Dashboard stats error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to retrieve dashboard stats.', 500);
  }
}
