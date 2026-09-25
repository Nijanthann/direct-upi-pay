import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSessionToken, setAuthCookie } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      shopName,
      name,
      email,
      password,
      phone,
      address,
      city,
      state,
      pincode,
      upiId,
    } = body;

    if (!shopName || !name || !email || !password) {
      return jsonError('MISSING_FIELDS', 'Shop name, your name, email, and password are required.');
    }

    const emailTrimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return jsonError('INVALID_EMAIL', 'Please provide a valid email address.');
    }

    if (password.length < 6) {
      return jsonError('WEAK_PASSWORD', 'Password must be at least 6 characters long.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: emailTrimmed },
    });

    if (existingUser) {
      return jsonError('EMAIL_EXISTS', 'An account with this email already exists.');
    }

    const passwordHash = await hashPassword(password);

    // Create Shop and Owner inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          shop_name: shopName.trim(),
          phone: phone?.trim() || null,
          email: emailTrimmed,
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          pincode: pincode?.trim() || null,
          status: 'ACTIVE',
        },
      });

      const user = await tx.user.create({
        data: {
          shop_id: shop.id,
          name: name.trim(),
          email: emailTrimmed,
          phone: phone?.trim() || null,
          password_hash: passwordHash,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });

      await tx.shop.update({
        where: { id: shop.id },
        data: { owner_id: user.id },
      });

      // Create an initial default UPI account if provided, or generated from shop name
      const defaultUpi = (upiId?.trim() || `${shopName.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi`).toLowerCase();
      await tx.upiAccount.create({
        data: {
          shop_id: shop.id,
          upi_id: defaultUpi,
          display_name: 'Store Main UPI',
          provider_name: 'Primary Bank',
          is_default: true,
          status: 'ACTIVE',
        },
      });

      return { user, shop };
    });

    const token = await createSessionToken({
      userId: result.user.id,
      role: result.user.role,
      shopId: result.shop.id,
    });

    await setAuthCookie(token);

    await logAuditEvent({
      shopId: result.shop.id,
      userId: result.user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: result.user.id,
      metadata: { event: 'REGISTER_AND_LOGIN' },
    });

    return jsonSuccess({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        shopId: result.shop.id,
        shopName: result.shop.shop_name,
      },
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return jsonError('INTERNAL_ERROR', 'Registration failed. Please check inputs and try again.', 500);
  }
}
