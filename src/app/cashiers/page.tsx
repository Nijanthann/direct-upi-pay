import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/layout/AppShell';
import CashiersClientView from '@/components/cashiers/CashiersClientView';

export const dynamic = 'force-dynamic';

export default async function CashiersPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'OWNER') {
    redirect('/payment');
  }

  const cashiers = await prisma.user.findMany({
    where: {
      shop_id: session.shop_id,
      role: 'CASHIER',
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      created_at: true,
      _count: {
        select: {
          created_payments: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const formatted = cashiers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    status: c.status,
    created_at: c.created_at.toISOString(),
    payment_count: c._count.created_payments,
  }));

  return (
    <AppShell user={session}>
      <CashiersClientView initialCashiers={formatted} />
    </AppShell>
  );
}
