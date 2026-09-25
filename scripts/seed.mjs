import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database for Direct UPI Pay ---');

  // Clean existing seed data
  await prisma.auditLog.deleteMany({});
  await prisma.paymentRequest.deleteMany({});
  await prisma.upiAccount.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.shop.deleteMany({});

  console.log('Cleaned up previous records.');

  // 1. Create Demo Shop
  const shop = await prisma.shop.create({
    data: {
      shop_name: 'Demo Local Store',
      phone: '+91 98765 43210',
      email: 'owner@example.com',
      address: 'Shop No. 14, MG Road, Commercial Market',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      status: 'ACTIVE',
    },
  });

  console.log(`Created Shop: ${shop.shop_name} (ID: ${shop.id})`);

  // 2. Hash passwords
  const ownerPasswordHash = await bcrypt.hash('Owner@123', 10);
  const cashierPasswordHash = await bcrypt.hash('Cashier@123', 10);

  // 3. Create Owner
  const owner = await prisma.user.create({
    data: {
      shop_id: shop.id,
      name: 'Ramesh Sharma (Owner)',
      email: 'owner@example.com',
      phone: '+91 98765 43210',
      password_hash: ownerPasswordHash,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  await prisma.shop.update({
    where: { id: shop.id },
    data: { owner_id: owner.id },
  });

  console.log(`Created Owner: ${owner.email} / Owner@123`);

  // 4. Create Cashier
  const cashier = await prisma.user.create({
    data: {
      shop_id: shop.id,
      name: 'Sunil Kumar (Cashier)',
      email: 'cashier@example.com',
      phone: '+91 91234 56789',
      password_hash: cashierPasswordHash,
      role: 'CASHIER',
      status: 'ACTIVE',
    },
  });

  console.log(`Created Cashier: ${cashier.email} / Cashier@123`);

  // 5. Create UPI Accounts
  const mainUpi = await prisma.upiAccount.create({
    data: {
      shop_id: shop.id,
      upi_id: 'demostore@upi',
      display_name: 'Store Main (HDFC)',
      provider_name: 'HDFC Bank Merchant VPA',
      is_default: true,
      status: 'ACTIVE',
    },
  });

  const backupUpi = await prisma.upiAccount.create({
    data: {
      shop_id: shop.id,
      upi_id: 'storebackup@oksbi',
      display_name: 'Counter Backup (SBI)',
      provider_name: 'State Bank of India',
      is_default: false,
      status: 'ACTIVE',
    },
  });

  const inactiveUpi = await prisma.upiAccount.create({
    data: {
      shop_id: shop.id,
      upi_id: 'oldaccount@icici',
      display_name: 'Old Terminal (ICICI)',
      provider_name: 'ICICI Bank',
      is_default: false,
      status: 'INACTIVE',
    },
  });

  console.log('Created UPI Accounts:');
  console.log(` - ${mainUpi.display_name} (${mainUpi.upi_id}) [Default, Active]`);
  console.log(` - ${backupUpi.display_name} (${backupUpi.upi_id}) [Active]`);
  console.log(` - ${inactiveUpi.display_name} (${inactiveUpi.upi_id}) [Inactive]`);

  // 6. Create Seed Transactions
  const now = new Date();

  // A. REPORTED_PAID transaction
  const txn1 = await prisma.paymentRequest.create({
    data: {
      shop_id: shop.id,
      cashier_id: cashier.id,
      upi_account_id: mainUpi.id,
      transaction_reference: 'TXN-20260925-104921',
      amount: 850.0,
      currency: 'INR',
      status: 'REPORTED_PAID',
      upi_uri: `upi://pay?pa=${encodeURIComponent(mainUpi.upi_id)}&pn=${encodeURIComponent(shop.shop_name)}&am=850.00&cu=INR&tr=TXN-20260925-104921`,
      created_at: new Date(now.getTime() - 45 * 60 * 1000),
      expires_at: new Date(now.getTime() - 40 * 60 * 1000),
      reported_paid_at: new Date(now.getTime() - 42 * 60 * 1000),
      reported_paid_by: cashier.id,
    },
  });

  // B. Another REPORTED_PAID transaction
  const txn2 = await prisma.paymentRequest.create({
    data: {
      shop_id: shop.id,
      cashier_id: cashier.id,
      upi_account_id: mainUpi.id,
      transaction_reference: 'TXN-20260925-110243',
      amount: 2450.5,
      currency: 'INR',
      status: 'REPORTED_PAID',
      upi_uri: `upi://pay?pa=${encodeURIComponent(mainUpi.upi_id)}&pn=${encodeURIComponent(shop.shop_name)}&am=2450.50&cu=INR&tr=TXN-20260925-110243`,
      created_at: new Date(now.getTime() - 25 * 60 * 1000),
      expires_at: new Date(now.getTime() - 20 * 60 * 1000),
      reported_paid_at: new Date(now.getTime() - 22 * 60 * 1000),
      reported_paid_by: cashier.id,
    },
  });

  // C. Active PENDING transaction (expires in 4 minutes)
  const txn3 = await prisma.paymentRequest.create({
    data: {
      shop_id: shop.id,
      cashier_id: cashier.id,
      upi_account_id: mainUpi.id,
      transaction_reference: 'TXN-20260925-112005',
      amount: 500.0,
      currency: 'INR',
      status: 'PENDING',
      upi_uri: `upi://pay?pa=${encodeURIComponent(mainUpi.upi_id)}&pn=${encodeURIComponent(shop.shop_name)}&am=500.00&cu=INR&tr=TXN-20260925-112005`,
      created_at: new Date(now.getTime() - 1 * 60 * 1000),
      expires_at: new Date(now.getTime() + 4 * 60 * 1000),
    },
  });

  // D. EXPIRED transaction
  const txn4 = await prisma.paymentRequest.create({
    data: {
      shop_id: shop.id,
      cashier_id: cashier.id,
      upi_account_id: backupUpi.id,
      transaction_reference: 'TXN-20260925-095112',
      amount: 250.0,
      currency: 'INR',
      status: 'EXPIRED',
      upi_uri: `upi://pay?pa=${encodeURIComponent(backupUpi.upi_id)}&pn=${encodeURIComponent(shop.shop_name)}&am=250.00&cu=INR&tr=TXN-20260925-095112`,
      created_at: new Date(now.getTime() - 120 * 60 * 1000),
      expires_at: new Date(now.getTime() - 115 * 60 * 1000),
    },
  });

  // E. CANCELLED transaction
  const txn5 = await prisma.paymentRequest.create({
    data: {
      shop_id: shop.id,
      cashier_id: cashier.id,
      upi_account_id: mainUpi.id,
      transaction_reference: 'TXN-20260925-093011',
      amount: 1200.0,
      currency: 'INR',
      status: 'CANCELLED',
      upi_uri: `upi://pay?pa=${encodeURIComponent(mainUpi.upi_id)}&pn=${encodeURIComponent(shop.shop_name)}&am=1200.00&cu=INR&tr=TXN-20260925-093011`,
      created_at: new Date(now.getTime() - 150 * 60 * 1000),
      expires_at: new Date(now.getTime() - 145 * 60 * 1000),
      cancelled_at: new Date(now.getTime() - 148 * 60 * 1000),
    },
  });

  // 7. Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        shop_id: shop.id,
        user_id: owner.id,
        action: 'LOGIN',
        entity_type: 'USER',
        entity_id: owner.id,
        metadata: JSON.stringify({ ip: '127.0.0.1' }),
      },
      {
        shop_id: shop.id,
        user_id: owner.id,
        action: 'CREATE_UPI',
        entity_type: 'UPI_ACCOUNT',
        entity_id: mainUpi.id,
        metadata: JSON.stringify({ upi_id: mainUpi.upi_id }),
      },
      {
        shop_id: shop.id,
        user_id: owner.id,
        action: 'CREATE_CASHIER',
        entity_type: 'USER',
        entity_id: cashier.id,
        metadata: JSON.stringify({ name: cashier.name, email: cashier.email }),
      },
      {
        shop_id: shop.id,
        user_id: cashier.id,
        action: 'CREATE_PAYMENT_REQUEST',
        entity_type: 'PAYMENT_REQUEST',
        entity_id: txn1.id,
        metadata: JSON.stringify({ reference: txn1.transaction_reference, amount: txn1.amount }),
      },
      {
        shop_id: shop.id,
        user_id: cashier.id,
        action: 'REPORT_PAYMENT',
        entity_type: 'PAYMENT_REQUEST',
        entity_id: txn1.id,
        metadata: JSON.stringify({ reference: txn1.transaction_reference, amount: txn1.amount }),
      },
    ],
  });

  console.log('Sample transactions & audit logs seeded successfully!');
  console.log('--- Ready for Manual Testing ---');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
