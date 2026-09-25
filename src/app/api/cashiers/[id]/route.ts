import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner, hashPassword } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOwner();
    const { id } = await params;
    const body = await req.json();

    const { name, phone, status, password } = body;

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing || existing.shop_id !== user.shop_id || existing.role !== 'CASHIER') {
      return jsonError('NOT_FOUND', 'Cashier not found in this shop.', 404);
    }

    const updateData: {
      name?: string;
      phone?: string | null;
      status?: string;
      password_hash?: string;
    } = {};

    if (name && name.trim()) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (status) updateData.status = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (password && password.trim()) {
      if (password.length < 6) {
        return jsonError('WEAK_PASSWORD', 'Password must be at least 6 characters.');
      }
      updateData.password_hash = await hashPassword(password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        created_at: true,
      },
    });

    await logAuditEvent({
      shopId: user.shop_id,
      userId: user.id,
      action: 'UPDATE_CASHIER',
      entityType: 'USER',
      entityId: id,
      metadata: { name: updated.name, status: updated.status, passwordReset: Boolean(password) },
    });

    return jsonSuccess({ cashier: updated });
  } catch (error) {
    const err = error as Error;
    if (err.message === 'UNAUTHORIZED') return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    if (err.message === 'FORBIDDEN') return jsonError('FORBIDDEN', 'Only shop owners can edit cashiers.', 403);
    console.error('Update cashier error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to update cashier.', 500);
  }
}
