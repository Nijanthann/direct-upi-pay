/**
 * PaymentVerificationService
 * 
 * Abstraction layer for future automated bank / NPCI / merchant aggregator verification.
 * In v1.0, payments are direct UPI transfers between customer and merchant with cashier confirmation (REPORTED_PAID).
 * This service provides the architecture to plug in automated bank statement webhooks,
 * NPCI UPI Switch webhooks, or Soundbox APIs in future updates without refactoring core logic.
 */

export interface VerificationRequest {
  transactionReference: string;
  expectedAmount: number;
  merchantUpiId: string;
  currency: string;
}

export interface VerificationResult {
  verified: boolean;
  status: 'VERIFIED_SUCCESS' | 'PENDING' | 'FAILED';
  providerReference?: string;
  bankPayerVpa?: string;
  verifiedAt?: Date;
  rawResponse?: Record<string, unknown>;
  message?: string;
}

export interface IPaymentVerificationProvider {
  name: string;
  verifyTransaction(request: VerificationRequest): Promise<VerificationResult>;
}

/**
 * Default v1 Mock/Stub Provider
 * Explains clearly that automated bank verification is a future integration module.
 */
class ManualCashierVerificationProvider implements IPaymentVerificationProvider {
  name = 'ManualCashierVerification';

  async verifyTransaction(request: VerificationRequest): Promise<VerificationResult> {
    return {
      verified: false,
      status: 'PENDING',
      message:
        'Direct UPI payments are currently verified manually by the cashier upon customer notification. Automatic bank gateway verification can be activated by plugging in a bank/UPI merchant webhook provider.',
    };
  }
}

class PaymentVerificationService {
  private provider: IPaymentVerificationProvider;

  constructor(provider?: IPaymentVerificationProvider) {
    this.provider = provider || new ManualCashierVerificationProvider();
  }

  public setProvider(provider: IPaymentVerificationProvider) {
    this.provider = provider;
  }

  public async verify(request: VerificationRequest): Promise<VerificationResult> {
    return this.provider.verifyTransaction(request);
  }
}

export const paymentVerificationService = new PaymentVerificationService();
