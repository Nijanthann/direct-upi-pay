import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/auth';
import { isValidUpiId } from '@/lib/upi';
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

    const { upi_id, display_name, provider_name, is_default, status } = body;

    const existing = await prisma.upiAccount.findUnique({
      where: { id },
    });

    if (!existing || existing.shop_id !== user.shop_id) {
      return jsonError('NOT_FOUND', 'UPI account not found or does not belong to this shop.', 404);
    }

    let trimmedUpi = existing.upi_id;
    if (upi_id && upi_id.trim() !== existing.upi_id) {
      trimmedUpi = upi_id.trim().toLowerCase();
      if (!isValidUpiId(trimmedUpi)) {
        return jsonError('INVALID_UPI_FORMAT', 'Invalid UPI ID format.');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (is_default === true) {
        await tx.upiAccount.updateMany({
          where: { shop_id: user.shop_id, is_default: true, id: { not: id } },
          data: { is_default: false },
        });
      }

      return tx.upiAccount.update({
        where: { id },
        data: {
          upi_id: trimmedUpi,
          display_name: display_name ? display_name.trim() : existing.display_name,
          provider_name: provider_name !== undefined ? (provider_name?.trim() || null) : existing.provider_name,
          is_default: is_default !== undefined ? Boolean(is_default) : existing.is_default,
          status: status ? (status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') : existing.status,
        },
      });
    });

    await logAuditEvent({
      shopId: user.shop_id,
      userId: user.id,
      action: 'UPDATE_UPI',
      entityType: 'UPI_ACCOUNT',
      entityId: updated.id,
      metadata: { display_name: updated.display_name, status: updated.status, is_default: updated.is_default },
    });

    return jsonSuccess({ upi_account: updated });
  } catch (error) {
    const err = error as Error;
    if (err.message === 'UNAUTHORIZED') return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    if (err.message === 'FORBIDDEN') return jsonError('FORBIDDEN', 'Only shop owners can edit UPI accounts.', 403);
    console.error('Update UPI error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to update UPI account.', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOwner();
    const { id } = await params;

    const existing = await prisma.upiAccount.findUnique({
      where: { id },
      include: { _count: { select: { payment_requests: true } } },
    });

    if (!existing || existing.shop_id !== user.shop_id) {
      return jsonError('NOT_FOUND', 'UPI account not found.', 404);
    }

    // If transactions reference this UPI account, deactivate rather than hard delete to maintain audit integrity
    if (existing._count.payment_requests > 0) {
      await prisma.upiAccount.update({
        where: { id },
        data: { status: 'INACTIVE', is_default: false },
      });

      await logAuditEvent({
        shopId: user.shop_id,
        userId: user.id,
        action: 'UPDATE_UPI',
        entityType: 'UPI_ACCOUNT',
        entityId: id,
        metadata: { reason: 'Deactivated due to existing transaction history' },
      });

      return jsonSuccess({ message: 'UPI account deactivated to preserve transaction records.' });
    }

    await prisma.upiAccount.delete({
      where: { id },
    });

    await logAuditEvent({
      shopId: user.shop_id,
      userId: user.id,
      action: 'DELETE_UPI',
      entityType: 'UPI_ACCOUNT',
      entityId: id,
      metadata: { upi_id: existing.upi_id },
    });

    return jsonSuccess({ message: 'UPI account deleted successfully.' });
  } catch (error) {
    const err = error as Error;
    if (err.message === 'UNAUTHORIZED') return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    if (err.message === 'FORBIDDEN') return jsonError('FORBIDDEN', 'Only shop owners can delete UPI accounts.', 403);
    console.error('Delete UPI error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to delete UPI account.', 500);
  }
}
