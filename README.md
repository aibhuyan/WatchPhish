# WatchPhish

A phishing intelligence and simulation platform. Collects live threat data from multiple feeds, enriches it with domain intelligence, and provides phishing simulations for security awareness.

🔗 **Live demo:** [watchphish.aibhuyan.com](https://watchphish.aibhuyan.com)

## Screenshots

### Live Dashboard

Real-time metrics, threat-type distribution, and a 7-day volume trend, all filterable by sector.

![WatchPhish live dashboard](docs/screenshots/01-dashboard.png)

### Global Threat Map & Risk Scoring

Phishing hosts are geolocated onto a world map (IP → ASN), alongside a risk-level distribution and a live feed where every entry carries a composite risk badge.

![Global threat map and risk distribution](docs/screenshots/02-threat-map.png)

### Threat Detail — Explainable Risk Scoring

Each threat gets a **0–100 risk score with a factor-by-factor breakdown**, plus IP / ASN hosting intelligence and related-infrastructure links.

![Threat detail panel with risk breakdown](docs/screenshots/03-threat-detail.png)

## Features

### Live Threat Intelligence

- **Multi-source data collection** from OpenPhish, URLhaus, PhishTank, and ThreatFox
- **Composite risk score (0–100)** — an explainable score blending VirusTotal detections, urlscan verdict, domain age, detection recency, and source trust, with a per-factor breakdown
- **urlscan.io enrichment** — page screenshots and verdicts pulled from urlscan's public search API
- **IP geolocation + ASN** — each host resolved to a country/ASN and plotted on a world **threat map**
- **VirusTotal enrichment** with detection ratios and scan results
- **RDAP domain-age lookups** to identify newly registered phishing domains
- **Sector-based filtering** (Finance, Tech, Government, Healthcare, etc.)
- **Real-time dashboard** with threat distribution charts, a global threat map, and daily volume trends

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

### Phishing Simulations

Eight interactive scenarios for security awareness:

| Scenario               | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| Microsoft Login Phish  | Credential harvesting via fake login page                    |
| PayPal Phishing Email  | Brand impersonation with urgency tactics                     |
| SMS Delivery Scam      | Smishing attack impersonating Posti (Finnish postal service) |
| Invoice Fraud          | Business email compromise with fake banking details          |
| QR Code Phishing       | Quishing via fake corporate Wi-Fi portal                     |
| AI Spear Phishing      | AI-generated targeted email with social engineering          |
| Browser-in-the-Browser | Fake browser popup overlaying a legitimate site              |
| AiTM Session Hijack    | Adversary-in-the-middle MFA bypass attack                    |

Each simulation presents a realistic phishing mockup where users identify red flags by tapping suspicious elements. Includes hints, scoring, and educational takeaways.

## Tech Stack

| Layer        | Technology                                                   |
| ------------ | ------------------------------------------------------------ |
| Frontend     | React 19, Vite 7, TypeScript, Tailwind CSS v4                |
| UI           | Radix UI, Framer Motion, Recharts, d3-geo (world map), Lucide Icons |
| API          | Express 5, Node.js, TypeScript                               |
| Database     | PostgreSQL with Drizzle ORM                                  |
| API Spec     | OpenAPI 3.1 with Zod validation                              |
| Data Sources | OpenPhish, URLhaus, PhishTank, ThreatFox, VirusTotal, urlscan.io, ip-api.com, crt.sh |

## Project Structure

```
watchphish/
├── apps/
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
├── packages/
│   ├── api-client-react/    # Generated API client hooks
│   ├── api-spec/            # OpenAPI specification
│   ├── api-zod/             # Zod validation schemas
│   └── db/                  # Database schema (Drizzle)
├── package.json            # npm workspaces root
├── package-lock.json
└── tsconfig.json
```

## API Endpoints

| Method | Endpoint                       | Description                                         |
| ------ | ------------------------------ | --------------------------------------------------- |
| GET    | `/api/healthz`                 | Health check                                        |
| GET    | `/api/stats`                   | Dashboard stats, charts, geo & risk breakdown       |
| GET    | `/api/feed`                    | Paginated threat feed (sector filter)               |
| GET    | `/api/threat/:id`              | Single threat detail (risk, screenshot, geo/ASN)    |
| GET    | `/api/threat/:id/related`      | Related threats sharing infrastructure              |
| GET    | `/api/attacks`                 | Attack type catalog with enrichment stats           |
| GET    | `/api/new-techniques`          | Emerging techniques (first seen in last 30 days)    |
| GET    | `/api/high-confidence`         | High-confidence recent threats                      |
| POST   | `/api/refresh`                 | Trigger data collectors                             |
| POST   | `/api/enrich`                  | Trigger enrichment (VirusTotal / RDAP / urlscan / geo) |
| POST   | `/api/test-enricher`           | Test an enricher connection                         |
| GET    | `/api/brands`                  | List watched brands                                 |
| POST   | `/api/brands`                  | Add brand to watchlist                              |
| DELETE | `/api/brands/:id`              | Remove brand from watchlist                         |
| GET    | `/api/cert-alerts`             | Certificate Transparency alerts                     |
| GET    | `/api/cert-alerts/count`       | Undismissed alert count                             |
| POST   | `/api/cert-alerts/:id/dismiss` | Dismiss an alert                                    |
| POST   | `/api/ct-scan`                 | Trigger a CT log scan                               |

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/watchphish.git
cd watchphish

# Install dependencies
npm install

# Set up environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/watchphish"

# Push database schema
npm run push-force --workspace @workspace/db

# Start the API server
npm run dev --workspace @workspace/api-server

# In another terminal, start the frontend
npm run dev --workspace @workspace/phishwatch
```

The frontend runs on `http://localhost:5173` and the API on `http://localhost:3000`.

### Optional enrichment keys

Every enricher degrades gracefully when unconfigured — the app runs without any of these:

- `VIRUSTOTAL_API_KEY` — enables VirusTotal detection ratios (the heaviest risk-score factor).
- `URLSCAN_API_KEY` — raises urlscan.io rate limits; screenshots still work without it via the public search API.
- IP geolocation (ip-api.com) and RDAP domain-age lookups need no key.

## License

MIT
