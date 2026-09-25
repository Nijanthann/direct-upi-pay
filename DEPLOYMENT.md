# Free Deployment Guide — Direct UPI Pay

This guide explains how to deploy the Direct UPI Payment Web Application **100% free of charge**.

---

## ⚡ Option 1: Instant Live Public HTTPS URL (Already Active!)

Your local instance has been deployed to the public internet using a **Cloudflare Global Edge Tunnel**:

👉 **Live Public URL:** [https://article-recruitment-arm-terrorists.trycloudflare.com](https://article-recruitment-arm-terrorists.trycloudflare.com)

- **Cost:** ₹0 / Free forever
- **Features:** Valid SSL/TLS certificate, accessible from any mobile browser on any smartphone in India or globally.
- **Testing:** Open this URL on your phone or tablet, log in with Cashier demo credentials (`cashier@example.com` / `Cashier@123`), enter ₹1 or ₹500, generate the QR, and scan it with Google Pay, PhonePe, Paytm, or BHIM.

To restart the tunnel at any time:
```bash
cloudflared tunnel --url http://localhost:3000
```

---

## 🚀 Option 2: Permanent Free Cloud Deployment on Vercel (Recommended)

[Vercel](https://vercel.com) provides the most reliable free hosting for Next.js applications, and [Neon](https://neon.tech) / [Supabase](https://supabase.com) provides free cloud PostgreSQL.

### Step 1: Create Free PostgreSQL Database (Neon or Supabase)
1. Go to [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com) and sign up for a **Free Tier** account.
2. Create a new project/database.
3. Copy the pooled connection string, for example:
   ```text
   DATABASE_URL="postgresql://user:password@ep-cool-db.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

### Step 2: Initialize Git Repository
In your project folder (`direct-upi-pay`):
```bash
git init
git add .
git commit -m "feat: initial commit of direct upi pay"
```

### Step 3: Push to GitHub
1. Create a new repository on [GitHub](https://github.com/new).
2. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/direct-upi-pay.git
   git branch -M main
   git push -u origin main
   ```

### Step 4: Deploy on Vercel
1. Log in to [vercel.com](https://vercel.com) and click **"Add New" ➔ "Project"**.
2. Import your `direct-upi-pay` GitHub repository.
3. In **Environment Variables**, add:
   - `DATABASE_URL`: Your Neon/Supabase PostgreSQL connection string.
   - `AUTH_SECRET`: A secure 32+ character random string (e.g. `openssl rand -base64 32`).
   - `QR_EXPIRATION_MINUTES`: `5`
   - `NODE_ENV`: `production`
4. Click **Deploy**.
5. Once deployed, run your database migration and seed:
   ```bash
   npx prisma db push
   npm run seed
   ```
Your app is now live 24/7 on `https://your-project.vercel.app` at zero cost!

---

## 🐳 Option 3: Free Container Deployment on Render

[Render](https://render.com) offers a free web service plan.

1. Push your repository to GitHub.
2. In Render dashboard, click **New ➔ Blueprint**.
3. Connect your repository. Render will automatically detect [`render.yaml`](file:///C:/Users/admin/.gemini/antigravity-ide/scratch/direct-upi-pay/render.yaml) included in the project.
4. Render builds and launches your application with SQLite and zero configuration.

---

## 🔑 Pre-Configured Demo Credentials

- **Shop Owner:** `owner@example.com` / `Owner@123`
- **Cashier Staff:** `cashier@example.com` / `Cashier@123`
