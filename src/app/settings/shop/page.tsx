import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/layout/AppShell';
import ShopSettingsClientView from '@/components/shop/ShopSettingsClientView';

export const dynamic = 'force-dynamic';

export default async function ShopSettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'OWNER') {
    redirect('/payment');
  }

  const shop = await prisma.shop.findUnique({
    where: { id: session.shop_id },
    include: {
      users: {
        where: { role: 'OWNER' },
        select: { name: true, phone: true, email: true },
        take: 1,
      },
    },
  });

  if (!shop) {
    redirect('/login');
  }

  const owner = shop.users[0];

  const shopData = {
    id: shop.id,
    shop_name: shop.shop_name,
    owner_name: owner?.name || session.name,
    phone: shop.phone || owner?.phone || '',
    email: shop.email || owner?.email || '',
    address: shop.address || '',
    city: shop.city || '',
    state: shop.state || '',
    pincode: shop.pincode || '',
    status: shop.status,
  };

  return (
    <AppShell user={session}>
      <ShopSettingsClientView initialShop={shopData} />
    </AppShell>
  );
}
