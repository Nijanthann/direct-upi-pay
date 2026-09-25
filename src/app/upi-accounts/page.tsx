import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/layout/AppShell';
import UpiAccountsClientView from '@/components/upi/UpiAccountsClientView';
import { UpiAccountDto } from '@/types';

export const dynamic = 'force-dynamic';

export default async function UpiAccountsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'OWNER') {
    redirect('/payment');
  }

  const accounts = await prisma.upiAccount.findMany({
    where: { shop_id: session.shop_id },
    orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
  });

  const formatted: UpiAccountDto[] = accounts.map((a) => ({
    id: a.id,
    shop_id: a.shop_id,
    upi_id: a.upi_id,
    display_name: a.display_name,
    provider_name: a.provider_name,
    is_default: a.is_default,
    status: a.status as 'ACTIVE' | 'INACTIVE',
    created_at: a.created_at.toISOString(),
    updated_at: a.updated_at.toISOString(),
  }));

  return (
    <AppShell user={session}>
      <UpiAccountsClientView initialAccounts={formatted} />
    </AppShell>
  );
}
