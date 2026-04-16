# WatchPhish — Deployment Guide

WatchPhish has three services that need to be deployed separately:

1. **Database** (PostgreSQL) → **Supabase** (free tier, no expiration)
2. **API Server** (Express + background jobs) → **Render** (free tier)
3. **Frontend** (React/Vite static site) → **Vercel** (free tier)

---

## Step 0: Extract the Project

```bash
tar xzf watchphish-project.tar.gz
cd watchphish-project
```

You'll see this structure:

```
watchphish-project/
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # Monorepo workspace definition
├── pnpm-lock.yaml            # Dependency lockfile (required for deploys)
├── tsconfig.json             # Root TypeScript config
├── artifacts/
│   ├── phishwatch/           # Frontend (React + Vite)
│   └── api-server/           # API server (Express + Node.js)
└── lib/
    ├── api-client-react/     # API client hooks
    ├── api-spec/             # OpenAPI spec
    ├── api-zod/              # Zod validation schemas
    └── db/                   # Database schema (Drizzle ORM)
```

---

## Part 1: Create a Free PostgreSQL Database on Supabase

The database must be ready first, so the API server can connect to it on startup.

### Step 1: Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **"New Project"**
3. Fill in:
   - **Project Name**: `watchphish`
   - **Database Password**: Choose a strong password — save it somewhere safe
   - **Region**: Pick the closest to your users (e.g., Frankfurt for EU)
   - **Plan**: **Free** (500 MB, no expiration)
4. Click **"Create New Project"**
5. Wait for the project to finish setting up (takes ~1 minute)

### Step 2: Copy the connection string

1. In your Supabase project, go to **Settings** → **Database**
2. Scroll down to **"Connection string"** and select the **URI** tab
3. Copy the connection string. It looks like:
   ```
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with the database password you chose in Step 1

> **Important**: Use the **"Transaction" pooler** connection string (port `6543`) for best compatibility. This is the default shown in the dashboard.

---

## Part 2: Push the Project to GitHub

Both Render and Vercel will deploy from the same GitHub repository.

### Step 1: Create a GitHub repository

1. Go to [github.com](https://github.com) and create a new repository named `watchphish`
2. Make it **private** (recommended — contains your project code)

### Step 2: Push the code

```bash
cd watchphish-project
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/watchphish.git
git push -u origin main
```

---

## Part 3: Deploy the API Server on Render (Free)

The API must be live before the frontend, so the frontend knows where to send requests.

### Step 1: Create the API web service on Render

1. Go to [render.com](https://render.com) and sign up (free)
2. From the dashboard, click **"New +"** → **"Web Service"**
3. Connect your GitHub repository (`watchphish`)
4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `watchphish-api` |
   | **Region** | Same region as your Supabase project |
   | **Runtime** | **Node** |
   | **Build Command** | `pnpm install --no-frozen-lockfile && pnpm --filter @workspace/db run push --force && pnpm --filter @workspace/api-server run build` |
   | **Start Command** | `node artifacts/api-server/dist/index.mjs` |
   | **Plan** | **Free** |

5. Under **"Environment Variables"**, add:

   | Variable | Value |
   |----------|-------|
   | `PORT` | `10000` |
   | `DATABASE_URL` | Paste your Supabase connection string from Part 1 |
   | `NODE_ENV` | `production` |
   | `VIRUSTOTAL_API_KEY` | Your VirusTotal API key (optional — get one free at virustotal.com) |

6. Click **"Create Web Service"**
7. Wait for the build to finish (takes 2–5 minutes)
8. Once deployed, note your API URL. It will look like:
   ```
   https://watchphish-api.onrender.com
   ```

### Step 2: Verify the API is working

Open your browser or run:
```bash
curl https://watchphish-api.onrender.com/api/healthz
```
You should see: `{"status":"ok"}`

> **Note about Render's free tier**: The server "sleeps" after 15 minutes of no traffic. The first request after sleeping takes ~30 seconds to wake up. After that it runs normally until the next idle period.

---

## Part 4: Deploy the Frontend on Vercel

The frontend code is already configured to read the API URL from an environment variable. No code changes needed — just set the variable in Vercel's dashboard.

### Step 1: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (free account)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import"** next to your `watchphish` GitHub repository
4. Configure the build settings:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Other |
   | **Root Directory** | *(leave empty — use project root)* |
   | **Build Command** | `pnpm --filter @workspace/phishwatch run build` |
   | **Output Directory** | `artifacts/phishwatch/dist/public` |
   | **Install Command** | `pnpm install --no-frozen-lockfile` |

5. Expand **"Environment Variables"** and add:

   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | `https://watchphish-api.onrender.com` |

   Replace with your actual Render URL.

6. Click **"Deploy"**
7. Wait for the build (takes 1–3 minutes)
8. Once done, Vercel gives you a URL like: `https://watchphish-abc123.vercel.app`

### Step 2 (Optional): Set up a custom domain

1. In your Vercel project, go to **Settings** → **Domains**
2. Click **"Add"** and type your domain (e.g., `watchphish.yourdomain.com`)
3. Vercel will show you a DNS record to add at your domain registrar:

   | Type | Name | Value |
   |------|------|-------|
   | **CNAME** | `watchphish` | `cname.vercel-dns.com` |

4. Add the DNS record, wait for propagation (1–30 minutes)
5. Vercel automatically sets up HTTPS

---

## Part 5: Update CORS on the API Server

Your API server needs to accept requests from your Vercel domain.

### Edit `artifacts/api-server/src/app.ts`

Change the `cors()` line to include your domains:

```typescript
app.use(cors({
  origin: [
    "https://watchphish-abc123.vercel.app",   // Your Vercel URL
    "https://watchphish.yourdomain.com",       // Your custom domain (if any)
    "http://localhost:5173",                    // Local development
  ],
}));
```

Replace the domains with your actual URLs. Then commit and push:

```bash
git add .
git commit -m "Update CORS for production domains"
git push
```

Render will automatically redeploy with the new CORS settings.

---

## Architecture Overview

```
                    +-----------------------+
  Your domain       |   Vercel (free)       |
  or vercel.app --> |   Static frontend     |
                    |   React + Vite        |
                    +-----------+-----------+
                                | API calls
                                v
                    +-----------------------+
                    |   Render (free)       |
                    |   Express API         |
                    |   + CertStream        |
                    |   + Cron schedulers   |
                    +-----------+-----------+
                                | SQL queries
                                v
                    +-----------------------+
                    |   Supabase (free)     |
                    |   PostgreSQL 500 MB   |
                    |   No expiration       |
                    +-----------------------+
```

---

## Verification Checklist

After all three services are deployed, verify everything works:

- [ ] API health: `curl https://your-render-url/api/healthz` returns `{"status":"ok"}`
- [ ] Frontend loads at your Vercel URL
- [ ] Dashboard shows statistics and Threat Distribution chart
- [ ] Live Threat Feed table shows phishing entries
- [ ] "Refresh Data" button triggers data collection
- [ ] Brand Monitor: adding a brand to the watchlist works
- [ ] Attack Library: clicking "Simulate Attack" opens the simulation modal
- [ ] Simulations: tapping red flags works on both desktop and mobile

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Frontend shows no data | Check browser console (F12) for errors. Verify `VITE_API_URL` matches your Render URL exactly (no trailing slash) |
| CORS errors in browser console | Update the `cors()` origin list in `app.ts` with your exact frontend domain, push to redeploy |
| API returns 500 errors | Check Render logs. Most likely `DATABASE_URL` is wrong — verify the Supabase connection string and make sure you replaced `[YOUR-PASSWORD]` with your actual password |
| "Connection refused" from database | Make sure you're using the **pooler** connection string (port `6543`), not the direct connection (port `5432`) |
| First load is very slow | Normal for Render free tier — the server wakes up after sleeping. Subsequent requests are fast |
| Brand Monitor not detecting certs | CertStream needs the server running. On Render free tier, it disconnects when the server sleeps |
| Domain age shows "-" for all entries | Enrichment runs every 2 hours. Trigger manually: `curl -X POST https://your-render-url/api/enrich` |
| Build fails on Vercel | Make sure **Root Directory** is set to `artifacts/phishwatch` and build command starts with `cd ../..` |
| Build fails on Render | Check that `pnpm-lock.yaml` is committed. Render needs it to install dependencies |
| Vercel shows "Module not found" | Make sure the build command is: `cd ../.. && pnpm install && pnpm --filter @workspace/phishwatch run build` |

---

## Cost Summary

| Service | Cost |
|---------|------|
| **Vercel** (frontend) | Free — 100 GB bandwidth/month |
| **Render** (API server) | Free — 750 hours/month, sleeps after 15 min idle |
| **Supabase** (PostgreSQL) | Free — 500 MB, no expiration |
| **VirusTotal** (optional) | Free — 4 requests/minute, 500/day |
| **Total** | **$0/month** |

> Unlike Render's built-in PostgreSQL (which expires after 90 days), Supabase's free tier has no expiration. Your data persists indefinitely as long as you stay within the 500 MB limit.
