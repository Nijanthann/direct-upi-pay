# Direct UPI Payment Web Application

A complete, production-ready **Direct UPI Payment Web Application for Local Shopkeepers in India**.

The application allows local retail shops and cashiers to generate **dynamic UPI QR codes with an exact, amount-locked payment request** on their shop counter terminals.

Customers pay **directly from their preferred UPI app** (Google Pay, PhonePe, Paytm, BHIM, Cred, Navi) straight to the **shopkeeper's own UPI-linked bank account** across the NPCI UPI network.

---

## ⚡ Fundamental Principles & Architecture

1. **Zero Platform Fee (₹0)**:
   - Platform Fee = ₹0
   - Transaction Fee = ₹0
   - Wallet Commission = ₹0
   - If cashier enters ₹500, customer pays ₹500 directly to the shopkeeper's bank account.
2. **Direct Peer-to-Merchant (P2M) Flow**:
   - The application does **NOT** act as a payment gateway or payment aggregator.
   - The application does **NOT** receive, hold, route, or process customer funds.
   - **NO internal wallet, NO stored balances, NO stored UPI PINs, NO OTPs, NO banking passwords**.
3. **High-Speed Counter Workflow**:
   - Cashier enters amount ➔ Selects active UPI account ➔ Clicks **Generate QR** ➔ Shows customer ➔ Customer scans and pays ➔ Cashier confirms **Reported Paid** ➔ Transaction recorded.

---

## 🛠 Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) 16 (App Router with Turbopack, React 19, TypeScript)
- **Styling**: Vanilla CSS & Tailwind CSS v4 design system
- **Database & ORM**: PostgreSQL / SQLite with [Prisma](https://www.prisma.io/) ORM
- **Authentication**: Stateless, secure HTTP-only cookies with JWT (`jose`) and `bcryptjs` password hashing
- **QR Code Engine**: High-resolution PNG DataURL & SVG vector generation via `qrcode`
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Quick Start Guide

### 1. Requirements
- Node.js 20+ / 24+ LTS
- npm 10+ / 11+

### 2. Installation
```bash
# Navigate to project directory
cd direct-upi-pay

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Default development `.env`:
```env
# For zero-config local testing (SQLite):
DATABASE_URL="file:./dev.db"

# For production PostgreSQL:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/upi_pay?schema=public"

# Auth Session Secret
AUTH_SECRET="direct-upi-pay-secret-key-32-chars-minimum-prod-ready-salt"

# Application URL
APP_URL="http://localhost:3000"

# Dynamic QR code expiration window in minutes
QR_EXPIRATION_MINUTES=5

NODE_ENV="development"
```

### 4. Database Setup & Seeding
```bash
# Push schema and generate Prisma client
npx prisma db push

# Seed demo shop, owner, cashier, UPI accounts & sample transactions
npm run seed
```

### 5. Running the Application
```bash
# Start local development server
npm run dev

# Open in browser
http://localhost:3000
```

### 6. Running Automated Tests
```bash
npm run test
```

### 7. Production Build & Start
```bash
# Build optimized production bundle
npm run build

# Start production server
npm run start
```

---

## 🔑 Demo Credentials

| Role | Email | Password | Landing Page | Accessible Features |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | `owner@example.com` | `Owner@123` | `/dashboard` | Executive stats, UPI Accounts, Cashiers, Shop Settings, All Transactions |
| **Cashier** | `cashier@example.com` | `Cashier@123` | `/payment` | POS New Payment, Amount QR, Countdown, Cancel, Report Paid, Recent Txns |

*(Both demo accounts are pre-seeded and available with 1-click fill on the `/login` screen).*

---

## 📱 User Roles & Permissions

### Owner (`OWNER`)
- View executive metrics: Today's Collection Requests, Total Requests, Pending, Reported Paid, Expired.
- View accounting disclaimer clearly distinguishing collection requests from bank-settled revenue.
- Manage UPI IDs (`/upi-accounts`): Add, Edit, Toggle Active/Inactive, Set Default.
- Manage Cashiers (`/cashiers`): Add staff, Reset password, Toggle status, Inspect payment count.
- Manage Shop Profile (`/settings/shop`): Name, Owner, Phone, Email, Address, City, State, PIN.
- View & filter all store transactions (`/transactions`) and export to CSV.

### Cashier (`CASHIER`)
- High-speed POS payment screen (`/payment`).
- Primary focus amount input with quick-fill chips (₹50, ₹100, ₹200, ₹500, ₹1000, ₹2000).
- Idempotency & double-click protection.
- Large, high-contrast dynamic QR code with live countdown timer (default 5 minutes).
- Action modals: Confirm **Reported Paid** and **Cancel Payment**.
- Thermal/POS receipt printing & QR image download.
- Restricted scope: Cannot edit UPI accounts, modify shop settings, or manage cashiers (enforced on backend).

---

## 📡 REST API Reference

All responses conform to standardized JSON formats:
- Success: `{ "success": true, "data": { ... } }`
- Error: `{ "success": false, "error": { "code": "...", "message": "..." } }`

### Authentication
- `POST /api/auth/register` — Register shop and owner
- `POST /api/auth/login` — Sign in with email and password
- `POST /api/auth/logout` — Clear auth cookie and log audit event
- `GET /api/auth/me` — Retrieve current user and shop session

### Shop Profile
- `GET /api/shop` — Retrieve shop details (Authenticated)
- `PATCH /api/shop` — Update shop details (Owner only)

### UPI Accounts
- `GET /api/upi-accounts` — Active accounts for Cashier; All accounts for Owner
- `POST /api/upi-accounts` — Add new UPI ID with format validation (Owner only)
- `PATCH /api/upi-accounts/:id` — Update status, provider, or default flag (Owner only)
- `DELETE /api/upi-accounts/:id` — Deactivate / remove UPI account (Owner only)

### Cashier Management
- `GET /api/cashiers` — List shop cashiers with payment count (Owner only)
- `POST /api/cashiers` — Create cashier staff login (Owner only)
- `PATCH /api/cashiers/:id` — Update cashier or reset password (Owner only)

### Payments & POS Transactions
- `POST /api/payment-requests` — Generate dynamic UPI QR with idempotency & amount lock
- `GET /api/payment-requests` — Transaction history with date/status/cashier/UPI filters
- `GET /api/payment-requests/:id` — Inspect transaction details & QR
- `POST /api/payment-requests/:id/report-paid` — Cashier marks transaction as `REPORTED_PAID`
- `POST /api/payment-requests/:id/cancel` — Cashier cancels active request

### Executive Dashboard
- `GET /api/dashboard` — Today's totals, status breakdowns, and recent transactions (Owner only)

---

## 🔗 UPI QR Code Architecture

Standard UPI Intent/URI generated per payment:
```text
upi://pay?pa=shopname@upi&pn=Demo+Store&am=500.00&cu=INR&tr=TXN-20260925-000001&tn=Payment+to+Demo+Store
```

Parameters:
- `pa`: Payee UPI VPA (e.g. `merchant@okhdfcbank`)
- `pn`: Payee business/shop name
- `am`: Exact amount formatted to 2 decimal places (e.g. `500.00`)
- `cu`: Currency (`INR`)
- `tr`: Unique transaction reference (`TXN-YYYYMMDD-XXXXXX`)
- `tn`: Transaction note

Customer scans using **Google Pay, PhonePe, Paytm, BHIM, Cred, or any UPI app**. The app auto-locks the payee and amount, allowing the customer to enter their UPI PIN inside their own bank-backed application.

---

## 🔄 Future Automated Payment Verification

The system includes a dedicated service abstraction:
`src/services/payment/payment-verification.service.ts`

### Status Progression
```text
PENDING ➔ REPORTED_PAID (Cashier confirmed) ➔ VERIFIED_SUCCESS (Future bank webhook)
```

In future releases:
1. **Bank Webhooks**: Plug in ICICI/HDFC/Axis Merchant UPI webhooks or NPCI switch notifications into `IPaymentVerificationProvider`.
2. **Soundbox / SMS Scraping**: Ingest real-time merchant soundbox confirmation to automatically trigger `VERIFIED_SUCCESS`.

---

## 📱 Mobile App Architecture (Android & iOS)

The Next.js backend APIs are designed to serve future React Native / Flutter mobile applications:
- Authentication: Session tokens / Bearer JWT headers
- POS Flow: `/api/payment-requests` and `/api/upi-accounts`
- Offline Fallback: Local UPI URI builder when offline
- Sound Notifications: Push notifications on `REPORTED_PAID`

---

## 🔒 Security Best Practices

- **Zero Credential Exposure**: Never store or request UPI PINs, OTPs, or customer banking cards.
- **Server-Side Authority**: Amount validation, expiration calculation, and role authorization are strictly enforced on backend endpoints.
- **Password Protection**: Passwords hashed with `bcryptjs` (salt rounds: 10).
- **Audit Logging**: Important mutations (`LOGIN`, `LOGOUT`, `CREATE_UPI`, `CREATE_PAYMENT_REQUEST`, `REPORT_PAYMENT`, `CANCEL_PAYMENT_REQUEST`) are stored in `audit_logs`.
