import QRCode from 'qrcode';

// Standard UPI ID validation regex
const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;

export function isValidUpiId(upiId: string): boolean {
  if (!upiId || typeof upiId !== 'string') return false;
  const trimmed = upiId.trim();
  if (trimmed.length < 5 || trimmed.length > 256) return false;
  return UPI_ID_REGEX.test(trimmed);
}

export function validateAmount(amount: number | string): { valid: boolean; value: number; error?: string } {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return { valid: false, value: 0, error: 'Please enter a valid numeric amount.' };
  }
  if (num <= 0) {
    return { valid: false, value: 0, error: 'Amount must be greater than ₹0.' };
  }
  if (num > 100000) {
    return { valid: false, value: num, error: 'Maximum transaction limit is ₹1,00,000 for standard UPI.' };
  }
  // Round to 2 decimal places
  const rounded = Math.round(num * 100) / 100;
  return { valid: true, value: rounded };
}

export function generateTransactionReference(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `TXN-${year}${month}${day}-${randomSuffix}`;
}

export interface UpiUriParams {
  pa: string; // Payee UPI ID
  pn: string; // Payee Name / Shop Name
  am: number; // Exact amount (e.g. 500.00)
  cu?: string; // Currency, defaults to INR
  tr: string; // Transaction reference
  tn?: string; // Transaction note
}

export function generateUpiUri(params: UpiUriParams): string {
  const cu = params.cu || 'INR';
  const am = params.am.toFixed(2);
  const searchParams = new URLSearchParams();
  searchParams.set('pa', params.pa);
  searchParams.set('pn', params.pn);
  searchParams.set('am', am);
  searchParams.set('cu', cu);
  searchParams.set('tr', params.tr);
  if (params.tn) {
    searchParams.set('tn', params.tn);
  }

  return `upi://pay?${searchParams.toString()}`;
}

export async function generateQrDataUrl(upiUri: string): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

export async function generateQrSvg(upiUri: string): Promise<string> {
  return QRCode.toString(upiUri, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

export function getQrExpirationDate(): Date {
  const minutes = parseInt(process.env.QR_EXPIRATION_MINUTES || '5', 10);
  const now = new Date();
  return new Date(now.getTime() + minutes * 60 * 1000);
}
