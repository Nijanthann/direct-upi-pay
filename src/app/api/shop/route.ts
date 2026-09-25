import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireOwner } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireAuth();

    const shop = await prisma.shop.findUnique({
      where: { id: user.shop_id },
      include: {
        users: {
          where: { role: 'OWNER' },
          select: { name: true, email: true, phone: true },
          take: 1,
        },
      },
    });

    if (!shop) {
      return jsonError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }

    const owner = shop.users[0];

    return jsonSuccess({
      shop: {
        id: shop.id,
        shop_name: shop.shop_name,
        owner_name: owner?.name || '',
        phone: shop.phone || owner?.phone || '',
        email: shop.email || owner?.email || '',
        address: shop.address || '',
        city: shop.city || '',
        state: shop.state || '',
        pincode: shop.pincode || '',
        status: shop.status,
        created_at: shop.created_at,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return jsonError('UNAUTHORIZED', 'Please login to access shop details.', 401);
    }
    return jsonError('INTERNAL_ERROR', 'Failed to retrieve shop details.', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireOwner();
    const body = await req.json();

    const {
      shop_name,
      owner_name,
      phone,
      email,
      address,
      city,
      state,
      pincode,
    } = body;

    if (!shop_name || !shop_name.trim()) {
      return jsonError('INVALID_INPUT', 'Shop name is required.');
    }

    const updatedShop = await prisma.shop.update({
      where: { id: user.shop_id },
      data: {
        shop_name: shop_name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        pincode: pincode?.trim() || null,
      },
    });

    if (owner_name && owner_name.trim()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: owner_name.trim() },
      });
    }

    await logAuditEvent({
      shopId: user.shop_id,
      userId: user.id,
      action: 'UPDATE_SHOP',
      entityType: 'SHOP',
      entityId: user.shop_id,
      metadata: { shop_name, city, state },
    });

    return jsonSuccess({
      shop: {
        id: updatedShop.id,
        shop_name: updatedShop.shop_name,
        owner_name: owner_name?.trim() || user.name,
        phone: updatedShop.phone,
        email: updatedShop.email,
        address: updatedShop.address,
        city: updatedShop.city,
        state: updatedShop.state,
        pincode: updatedShop.pincode,
        status: updatedShop.status,
      },
    });
  } catch (error) {
    const err = error as Error;
    if (err.message === 'UNAUTHORIZED') return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    if (err.message === 'FORBIDDEN') return jsonError('FORBIDDEN', 'Only shop owners can modify shop settings.', 403);
    console.error('Update shop error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to update shop details.', 500);
  }
}
