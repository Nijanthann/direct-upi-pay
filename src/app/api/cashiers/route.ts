import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner, hashPassword } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireOwner();

    const cashiers = await prisma.user.findMany({
      where: {
        shop_id: user.shop_id,
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
      created_at: c.created_at,
      payment_count: c._count.created_payments,
    }));

    return jsonSuccess({ cashiers: formatted });
  } catch (error) {
    const err = error as Error;
    if (err.message === 'UNAUTHORIZED') return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    if (err.message === 'FORBIDDEN') return jsonError('FORBIDDEN', 'Only shop owners can access cashier management.', 403);
    return jsonError('INTERNAL_ERROR', 'Failed to retrieve cashiers.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOwner();
    const body = await req.json();

    const { name, email, phone, password, status } = body;

    if (!name || !email || !password) {
      return jsonError('MISSING_FIELDS', 'Name, email, and initial password are required.');
    }

    const emailTrimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return jsonError('INVALID_EMAIL', 'Please provide a valid email address.');
    }

    if (password.length < 6) {
      return jsonError('WEAK_PASSWORD', 'Password must be at least 6 characters.');
    }

    const existing = await prisma.user.findUnique({
      where: { email: emailTrimmed },
    });

    if (existing) {
      return jsonError('EMAIL_EXISTS', 'A user with this email already exists.');
    }

    const passwordHash = await hashPassword(password);

    const cashier = await prisma.user.create({
      data: {
        shop_id: user.shop_id,
        name: name.trim(),
        email: emailTrimmed,
        phone: phone?.trim() || null,
        password_hash: passwordHash,
        role: 'CASHIER',
        status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      },
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
      action: 'CREATE_CASHIER',
      entityType: 'USER',
      entityId: cashier.id,
      metadata: { name: cashier.name, email: cashier.email },
    });

    return jsonSuccess({ cashier }, 201);
  } catch (error) {
    const err = error as Error;
    if (err.message === 'UNAUTHORIZED') return jsonError('UNAUTHORIZED', 'Not authenticated', 401);
    if (err.message === 'FORBIDDEN') return jsonError('FORBIDDEN', 'Only shop owners can add cashiers.', 403);
    console.error('Create cashier error:', error);
    return jsonError('INTERNAL_ERROR', 'Failed to create cashier.', 500);
  }
}
