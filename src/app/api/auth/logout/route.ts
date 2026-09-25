import { getSession, clearAuthCookie } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { jsonSuccess } from '@/lib/api-response';

export async function POST() {
  const session = await getSession();
  if (session) {
    await logAuditEvent({
      shopId: session.shop_id,
      userId: session.id,
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: session.id,
    });
  }

  await clearAuthCookie();
  return jsonSuccess({ message: 'Logged out successfully' });
}
