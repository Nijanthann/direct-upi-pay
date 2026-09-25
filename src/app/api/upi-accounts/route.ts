import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireOwner } from '@/lib/auth';
import { isValidUpiId } from '@/lib/upi';
import { logAuditEvent } from '@/lib/audit';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireAuth();

    // Cashiers only see active UPI accounts; owners see all accounts
    const whereClause: { shop_id: string; status?: string } = {
      shop_id: user.shop_id,
    };

    if (user.role === 'CASHIER') {
      whereClause.status = 'ACTIVE';
    }

    const accounts = await prisma.upiAccount.findMany({
      where: whereClause,
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
    });

    return jsonSuccess({ upi_accounts: accounts });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return jsonError('UNAUTHORIZED', 'Please login to access UPI accounts.', 401);
    }
    return jsonError('INTERNAL_ERROR', 'Failed to retrieve UPI accounts.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOwner();
    const body = await req.json();

    const { upi_id, display_name, provider_name, is_default, status } = body;

    if (!upi_id || !display_name) {
      return jsonError('MISSING_FIELDS', 'UPI ID and Display Name are required.');
    }

    const trimmedUpi = upi_id.trim().toLowerCase();
    if (!isValidUpiId(trimmedUpi)) {
      return jsonError(
        'INVALID_UPI_FORMAT',
        'Invalid UPI ID format. Standard format is username@bank (e.g. merchant@upi, store@okaxis).'
      );
    }

    // Check if duplicate for this shop
    const existing = await prisma.upiAccount.findFirst({
      where: {
        shop_id: user.shop_id,
        upi_id: trimmedUpi,
      },
    });

    if (existing) {
      return jsonError('DUPLICATE_UPI', 'This UPI ID is already registered for your shop.');
    }

    const makeDefault = Boolean(is_default);

    const account = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        // Unset any existing default
        await tx.upiAccount.updateMany({
          where: { shop_id: user.shop_id, is_default: true },
          data: { is_default: false },
        });
      }

      return tx.upiAccount.create({
        data: {
          shop_id: user.shop_id,
          upi_id: trimmedUpi,
          display_name: display_name.trim(),
          provider_name: provider_name?.trim() || null,
          is_default: makeDefault,
          status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        },
      });
    });

    await logAuditEvent({
      shopId: user.shop_id,
      userId: user.id,
      action: 'CREATE_UPI',
      entityType: 'UPI_ACCOUNT',
      entityId: account.id,
      metadata: { upi_id: account.upi_id, display_name: account.display_name },
    });

    return jsonSuccess({ upi_account: account }, 201);
  } catch (error) {
    const err = error as Error;
    if (err.message === 'UNAUTHORIZED') return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    if (err.message === 'FORBIDDEN') return jsonError('FORBIDDEN', 'Only shop owners can add UPI IDs.', 403);
    console.error('Create UPI error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to create UPI account.', 500);
  }
}
