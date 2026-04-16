# WatchPhish

A full-stack phishing intelligence and interactive simulation platform. Collects live threat data from multiple feeds, enriches it with domain intelligence, and provides interactive phishing simulations for security awareness training.

## Features

### Live Threat Intelligence
- **Multi-source data collection** from OpenPhish, URLhaus, PhishTank, and ThreatFox
- **VirusTotal enrichment** with detection ratios and scan results
- **RDAP domain-age lookups** to identify newly registered phishing domains
- **Sector-based filtering** (Finance, Tech, Government, Healthcare, etc.)
- **Real-time dashboard** with threat distribution charts and daily volume trends

### Brand Monitor
- **Certificate Transparency (CT) log scanning** via crt.sh to detect lookalike domains
- **Typosquatting detection** for monitored brands
- **Watchlist management** with up to 10 monitored brands
- **Alert system** with match scoring and dismissal

### Attack Library
- Catalogued attack types with descriptions, red flags, and real-world examples
- Enrichment statistics per attack type (VirusTotal detection rates, domain age)

### Emerging Threats
- Tracks newly discovered attack techniques from the last 30 days
- Recent threat samples with enrichment data

### Interactive Phishing Simulations
Eight interactive scenarios for security awareness training:

| Scenario | Description |
|----------|-------------|
| Microsoft Login Phish | Credential harvesting via fake login page |
| PayPal Phishing Email | Brand impersonation with urgency tactics |
| SMS Delivery Scam | Smishing attack impersonating Posti (Finnish postal service) |
| Invoice Fraud | Business email compromise with fake banking details |
| QR Code Phishing | Quishing via fake corporate Wi-Fi portal |
| AI Spear Phishing | AI-generated targeted email with social engineering |
| Browser-in-the-Browser | Fake browser popup overlaying a legitimate site |
| AiTM Session Hijack | Adversary-in-the-middle MFA bypass attack |

Each simulation presents a realistic phishing mockup where users identify red flags by tapping suspicious elements. Includes hints, scoring, and educational takeaways.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS v4 |
| UI | Radix UI, Framer Motion, Recharts, Lucide Icons |
| API | Express 5, Node.js, TypeScript |
| Database | PostgreSQL with Drizzle ORM |
| API Spec | OpenAPI 3.1 with Zod validation |
| Data Sources | OpenPhish, URLhaus, PhishTank, ThreatFox, VirusTotal, crt.sh |

## Project Structure

```
watchphish/
├── artifacts/
│   ├── phishwatch/          # Frontend (React + Vite)
│   │   ├── src/
│   │   │   ├── components/  # UI components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── pages/       # Page components
│   │   │   └── lib/         # Utilities
│   │   └── public/          # Static assets
│   └── api-server/          # API server (Express)
│       └── src/
│           ├── routes/      # API endpoints
│           ├── collectors/  # Threat feed collectors
│           └── lib/         # Server utilities
├── lib/
│   ├── api-client-react/    # Generated API client hooks
│   ├── api-spec/            # OpenAPI specification
│   ├── api-zod/             # Zod validation schemas
│   └── db/                  # Database schema (Drizzle)
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/healthz` | Health check |
| GET | `/api/stats` | Dashboard statistics and charts |
| GET | `/api/feed` | Paginated threat feed with filtering |
| GET | `/api/feed/:id` | Single threat entry details |
| GET | `/api/attack-types` | Attack type catalog with stats |
| GET | `/api/attack-types/:slug` | Single attack type details |
| GET | `/api/emerging` | Emerging threat techniques |
| POST | `/api/collect` | Trigger data collection |
| POST | `/api/enrich` | Trigger VirusTotal/RDAP enrichment |
| GET | `/api/brands` | List watched brands |
| POST | `/api/brands` | Add brand to watchlist |
| DELETE | `/api/brands/:id` | Remove brand from watchlist |
| GET | `/api/cert-alerts` | Certificate transparency alerts |
| POST | `/api/cert-alerts/:id/dismiss` | Dismiss an alert |
| POST | `/api/ct-scan` | Trigger CT log scan |

## Deployment

See [DEPLOYMENT_GUIDE.md](exports/DEPLOYMENT_GUIDE.md) for complete step-by-step instructions.

**Quick overview:**

1. **Database**: Create a free PostgreSQL on [Supabase](https://supabase.com) (500 MB, no expiration)
2. **API Server**: Deploy to [Render](https://render.com) (free tier, auto-deploys from GitHub)
3. **Frontend**: Deploy to [Vercel](https://vercel.com) (free tier, static site hosting)

All three services are permanently free.

### Environment Variables

**API Server (Render):**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string from Supabase |
| `PORT` | Yes | Server port (use `10000` on Render) |
| `NODE_ENV` | Yes | Set to `production` |
| `VIRUSTOTAL_API_KEY` | No | VirusTotal API key for threat enrichment |

**Frontend (Vercel):**

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Your Render API URL (e.g., `https://watchphish-api.onrender.com`) |

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/watchphish.git
cd watchphish

# Install dependencies
pnpm install

# Set up environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/watchphish"

# Push database schema
pnpm --filter @workspace/db run push --force

# Start the API server
pnpm --filter @workspace/api-server run dev

# In another terminal, start the frontend
pnpm --filter @workspace/phishwatch run dev
```

The frontend runs on `http://localhost:5173` and the API on `http://localhost:3000`.

## Screenshots

The dashboard displays real-time phishing intelligence with threat distribution charts, daily volume trends, and enrichment statistics. The interactive simulations present realistic phishing scenarios across eight different attack types.

## License

MIT
