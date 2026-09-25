import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/layout/AppShell';
import TransactionsClientView from '@/components/transactions/TransactionsClientView';
import { PaymentRequestDto, UpiAccountDto } from '@/types';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const isOwner = session.role === 'OWNER';

  // Fetch active and all UPI accounts for filtering
  const upiAccounts = await prisma.upiAccount.findMany({
    where: { shop_id: session.shop_id },
    select: { id: true, display_name: true, upi_id: true },
  });

  // Fetch cashiers for owner filter
  const cashiers = isOwner
    ? await prisma.user.findMany({
        where: { shop_id: session.shop_id, role: 'CASHIER' },
        select: { id: true, name: true },
      })
    : [];

  return (
    <AppShell user={session}>
      <TransactionsClientView
        isOwner={isOwner}
        upiAccounts={upiAccounts}
        cashiers={cashiers}
      />
    </AppShell>
  );
}
