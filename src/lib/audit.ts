import { prisma } from './prisma';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_UPI'
  | 'UPDATE_UPI'
  | 'DELETE_UPI'
  | 'CREATE_PAYMENT_REQUEST'
  | 'CANCEL_PAYMENT_REQUEST'
  | 'REPORT_PAYMENT'
  | 'CREATE_CASHIER'
  | 'UPDATE_CASHIER'
  | 'UPDATE_SHOP';

export interface RecordAuditParams {
  shopId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logAuditEvent(params: RecordAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        shop_id: params.shopId,
        user_id: params.userId || null,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
