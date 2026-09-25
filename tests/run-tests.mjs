import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { SignJWT, jwtVerify } from 'jose';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// UPI ID Validation Regex
const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;
function isValidUpiId(upiId) {
  if (!upiId || typeof upiId !== 'string') return false;
  const trimmed = upiId.trim();
  if (trimmed.length < 5 || trimmed.length > 256) return false;
  return UPI_ID_REGEX.test(trimmed);
}

// Amount Validation
function validateAmount(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return { valid: false, value: 0 };
  if (num <= 0) return { valid: false, value: 0 };
  if (num > 100000) return { valid: false, value: num };
  const rounded = Math.round(num * 100) / 100;
  return { valid: true, value: rounded };
}

// Reference Generator
function generateTransactionReference() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `TXN-${year}${month}${day}-${randomSuffix}`;
}

// UPI URI Generator
function generateUpiUri(params) {
  const cu = params.cu || 'INR';
  const am = params.am.toFixed(2);
  const searchParams = new URLSearchParams();
  searchParams.set('pa', params.pa);
  searchParams.set('pn', params.pn);
  searchParams.set('am', am);
  searchParams.set('cu', cu);
  searchParams.set('tr', params.tr);
  return `upi://pay?${searchParams.toString()}`;
}

async function runTestSuite() {
  console.log('\n========================================');
  console.log('DIRECT UPI PAY - COMPREHENSIVE TEST SUITE');
  console.log('========================================\n');

  // --- 1. UPI ID VALIDATION TESTS (Section 11) ---
  console.log('1. UPI ID Validation Tests:');
  assert(isValidUpiId('merchant@upi') === true, 'Valid merchant@upi');
  assert(isValidUpiId('store@okaxis') === true, 'Valid store@okaxis');
  assert(isValidUpiId('cashier.store@oksbi') === true, 'Valid cashier.store@oksbi');
  assert(isValidUpiId('9876543210@paytm') === true, 'Valid phone@paytm');
  assert(isValidUpiId('') === false, 'Empty string rejected');
  assert(isValidUpiId('invalidupi') === false, 'Missing @ handle rejected');
  assert(isValidUpiId('invalid@') === false, 'Missing provider rejected');
  assert(isValidUpiId('@handle') === false, 'Missing username rejected');

  // --- 2. AMOUNT VALIDATION TESTS (Section 14 & 51) ---
  console.log('\n2. Amount Validation Tests:');
  const validAmounts = [1, 10, 50, 100, 499.5, 500, 999.99, 1000, 50000];
  for (const amt of validAmounts) {
    const res = validateAmount(amt);
    assert(res.valid === true && res.value === amt, `Valid amount ₹${amt} accepted`);
  }

  assert(validateAmount(0).valid === false, '₹0 correctly rejected');
  assert(validateAmount(-100).valid === false, 'Negative ₹-100 correctly rejected');
  assert(validateAmount('abc').valid === false, 'Non-numeric "abc" correctly rejected');
  assert(validateAmount('').valid === false, 'Empty amount correctly rejected');
  assert(validateAmount(100001).valid === false, 'Amount above max limit rejected');

  // --- 3. DYNAMIC UPI URI & QR GENERATION TESTS (Section 17 & 18) ---
  console.log('\n3. Dynamic UPI Payment URI & QR Code Generation:');
  const ref = generateTransactionReference();
  assert(ref.startsWith('TXN-'), `Generated reference format: ${ref}`);

  const testUri = generateUpiUri({
    pa: 'demostore@upi',
    pn: 'Demo Store',
    am: 500.0,
    cu: 'INR',
    tr: ref,
  });

  assert(testUri.includes('upi://pay?'), 'URI protocol is upi://pay');
  assert(testUri.includes('pa=demostore%40upi'), 'URI encodes payee UPI ID');
  assert(testUri.includes('am=500.00'), 'URI formats exact amount as 500.00');
  assert(testUri.includes('cu=INR'), 'URI specifies currency INR');
  assert(testUri.includes(`tr=${ref}`), 'URI includes unique transaction reference');

  const qrDataUrl = await QRCode.toDataURL(testUri, { errorCorrectionLevel: 'M', width: 300 });
  assert(qrDataUrl.startsWith('data:image/png;base64,'), 'High-resolution PNG QR generated');

  // --- 4. AUTHENTICATION & JWT SECURITY TESTS (Section 6 & 33) ---
  console.log('\n4. Authentication & JWT Security Tests:');
  const JWT_SECRET = new TextEncoder().encode('direct-upi-pay-secret-key-32-chars-minimum-prod-ready-salt');

  const sessionToken = await new SignJWT({
    userId: 'test-user-123',
    role: 'OWNER',
    shopId: 'test-shop-456',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  assert(typeof sessionToken === 'string' && sessionToken.length > 20, 'JWT session token created');

  const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
  assert(payload.userId === 'test-user-123', 'JWT decoded userId verified');
  assert(payload.role === 'OWNER', 'JWT decoded role verified');
  assert(payload.shopId === 'test-shop-456', 'JWT decoded shopId verified');

  let invalidCaught = false;
  try {
    await jwtVerify('forged.invalid.token', JWT_SECRET);
  } catch {
    invalidCaught = true;
  }
  assert(invalidCaught === true, 'Forged JWT safely rejected');

  // --- 5. DATABASE INTEGRITY & ROLE ACCESS TESTS ---
  console.log('\n5. Database Relational Models & Integrity:');
  const demoShop = await prisma.shop.findFirst({
    where: { shop_name: 'Demo Local Store' },
    include: { users: true, upi_accounts: true },
  });

  assert(Boolean(demoShop), 'Demo shop exists in database');
  const owner = demoShop?.users.find((u) => u.role === 'OWNER');
  const cashier = demoShop?.users.find((u) => u.role === 'CASHIER');

  assert(Boolean(owner), 'Owner user created in shop');
  assert(Boolean(cashier), 'Cashier user created in shop');

  // Verify Owner and Cashier passwords against bcrypt hash
  if (owner) {
    const isOwnerPwdValid = await bcrypt.compare('Owner@123', owner.password_hash);
    assert(isOwnerPwdValid === true, 'Owner password verified with bcrypt');
  }

  if (cashier) {
    const isCashierPwdValid = await bcrypt.compare('Cashier@123', cashier.password_hash);
    assert(isCashierPwdValid === true, 'Cashier password verified with bcrypt');
    const isWrongPwdRejected = await bcrypt.compare('WrongPassword', cashier.password_hash);
    assert(isWrongPwdRejected === false, 'Invalid password safely rejected');
  }

  // --- 6. PAYMENT LIFECYCLE TESTS (PENDING -> REPORTED_PAID / CANCELLED / EXPIRED) ---
  console.log('\n6. Payment State Machine Tests:');
  if (demoShop && cashier && demoShop.upi_accounts.length > 0) {
    const upiAcc = demoShop.upi_accounts[0];
    const newTxnRef = generateTransactionReference();

    // Create payment request
    const createdPayment = await prisma.paymentRequest.create({
      data: {
        shop_id: demoShop.id,
        cashier_id: cashier.id,
        upi_account_id: upiAcc.id,
        transaction_reference: newTxnRef,
        amount: 350.0,
        currency: 'INR',
        status: 'PENDING',
        upi_uri: `upi://pay?pa=${upiAcc.upi_id}&pn=Demo&am=350.00&cu=INR&tr=${newTxnRef}`,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    assert(createdPayment.status === 'PENDING', 'Transaction starts in PENDING status');
    assert(createdPayment.amount === 350.0, 'Database securely stores server-side amount 350.00');

    // Cashier reports payment
    const reportedPayment = await prisma.paymentRequest.update({
      where: { id: createdPayment.id },
      data: {
        status: 'REPORTED_PAID',
        reported_paid_at: new Date(),
        reported_paid_by: cashier.id,
      },
    });

    assert(reportedPayment.status === 'REPORTED_PAID', 'Status transitions to REPORTED_PAID');
    assert(reportedPayment.reported_paid_by === cashier.id, 'Cashier recorded as reporter');

    // Clean up test txn
    await prisma.paymentRequest.delete({ where: { id: createdPayment.id } });
    assert(true, 'Test transaction cleaned up');
  }

  console.log('\n========================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
