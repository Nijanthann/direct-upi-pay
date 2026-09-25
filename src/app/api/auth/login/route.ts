import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken, setAuthCookie } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return jsonError('MISSING_CREDENTIALS', 'Email and password are required.');
    }

    const emailTrimmed = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: emailTrimmed },
      include: {
        shop: {
          select: {
            id: true,
            shop_name: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return jsonError('INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      return jsonError('ACCOUNT_INACTIVE', 'This account has been deactivated. Please contact the shop owner.');
    }

    if (user.shop && user.shop.status !== 'ACTIVE') {
      return jsonError('SHOP_INACTIVE', 'The shop associated with this account is inactive.');
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return jsonError('INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const token = await createSessionToken({
      userId: user.id,
      role: user.role,
      shopId: user.shop_id,
    });

    await setAuthCookie(token);

    await logAuditEvent({
      shopId: user.shop_id,
      userId: user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      metadata: { role: user.role },
    });

    return jsonSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shop_id,
        shopName: user.shop?.shop_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonError('INTERNAL_ERROR', 'Login failed. Please try again.', 500);
  }
}
