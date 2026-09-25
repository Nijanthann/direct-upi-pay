export type UserRole = 'OWNER' | 'CASHIER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type PaymentStatus =
  | 'PENDING'
  | 'REPORTED_PAID'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'VERIFIED_SUCCESS';

export interface AuthUser {
  id: string;
  shop_id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  shop?: {
    id: string;
    shop_name: string;
    owner_id?: string | null;
    phone?: string | null;
    email?: string | null;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface UpiAccountDto {
  id: string;
  shop_id: string;
  upi_id: string;
  display_name: string;
  provider_name?: string | null;
  is_default: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface PaymentRequestDto {
  id: string;
  shop_id: string;
  cashier_id: string;
  upi_account_id: string;
  transaction_reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  upi_uri: string;
  qr_data_url?: string;
  created_at: string;
  expires_at: string;
  reported_paid_at?: string | null;
  reported_paid_by?: string | null;
  cancelled_at?: string | null;
  cashier?: {
    id: string;
    name: string;
    email: string;
  };
  reporter?: {
    id: string;
    name: string;
    email: string;
  } | null;
  upi_account?: {
    id: string;
    upi_id: string;
    display_name: string;
    provider_name?: string | null;
  };
}

export interface DashboardStatsDto {
  today_collection: number;
  total_requests: number;
  pending_count: number;
  reported_paid_count: number;
  expired_count: number;
  recent_payments: PaymentRequestDto[];
}
