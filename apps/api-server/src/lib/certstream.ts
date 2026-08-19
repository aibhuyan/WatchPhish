import { db, brandWatchlistTable, certAlertsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "./logger";
import { checkDomainAgainstWatchlist } from "./typosquat";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;
let cachedBrands: string[] = [];
const recentAlerts = new Set<string>();
const DEDUP_WINDOW_MS = 60 * 60 * 1000;

const CERTSTREAM_URLS = [
  "wss://certstream.calidog.io",
];
let currentUrlIndex = 0;

const RECONNECT_DELAY_MS = 5000;
const NO_DATA_TIMEOUT_MS = 30000;
let dataReceivedSinceConnect = false;
let noDataTimer: ReturnType<typeof setTimeout> | null = null;

async function loadBrands(): Promise<string[]> {
  const brands = await db.select().from(brandWatchlistTable);
  return brands.map(b => b.brandName);
}

function extractDomains(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const msg = data as Record<string, unknown>;
  if (msg.message_type !== 'certificate_update') return [];

  const certData = msg.data as Record<string, unknown> | undefined;
  if (!certData) return [];

  const leafCert = certData.leaf_cert as Record<string, unknown> | undefined;
  if (!leafCert) return [];

  const allDomains = leafCert.all_domains as string[] | undefined;
  if (!Array.isArray(allDomains)) return [];

  return allDomains.filter(d => typeof d === 'string' && d.length > 0 && !d.startsWith('*'));
}

function extractIssuer(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as Record<string, unknown>;
  const certData = msg.data as Record<string, unknown> | undefined;
  if (!certData) return null;
  const leafCert = certData.leaf_cert as Record<string, unknown> | undefined;
  if (!leafCert) return null;
  const issuer = leafCert.issuer as Record<string, unknown> | undefined;
  if (!issuer) return null;
  return (issuer.O as string) || (issuer.CN as string) || null;
}

function extractNotBefore(data: unknown): Date | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as Record<string, unknown>;
  const certData = msg.data as Record<string, unknown> | undefined;
  if (!certData) return null;
  const leafCert = certData.leaf_cert as Record<string, unknown> | undefined;
  if (!leafCert) return null;
  const notBefore = leafCert.not_before as number | undefined;
  if (typeof notBefore === 'number' && notBefore > 0) {
    return new Date(notBefore * 1000);
  }
  return null;
}

function dedupKey(domain: string, brand: string, matchType: string): string {
  return `${domain}|${brand}|${matchType}`;
}

async function insertAlert(domain: string, match: { brand: string; matchType: string; score: number }, issuer: string | null, certIssuedAt: Date | null): Promise<boolean> {
  const key = dedupKey(domain, match.brand, match.matchType);
  if (recentAlerts.has(key)) return false;

  recentAlerts.add(key);
  setTimeout(() => recentAlerts.delete(key), DEDUP_WINDOW_MS);

  try {
    const existing = await db.select({ id: certAlertsTable.id })
      .from(certAlertsTable)
      .where(and(
        eq(certAlertsTable.domain, domain),
        eq(certAlertsTable.matchedBrand, match.brand)
      ))
      .limit(1);

    if (existing.length > 0) return false;

    await db.insert(certAlertsTable).values({
      domain,
      matchedBrand: match.brand,
      matchType: match.matchType,
      matchScore: match.score,
      certIssuer: issuer,
      certIssuedAt,
      detectedAt: new Date(),
      dismissed: false,
    });
    logger.info({ domain, brand: match.brand, matchType: match.matchType, score: match.score }, "CertStream alert created");
    return true;
  } catch (dbErr) {
    logger.error({ err: dbErr, domain }, "Failed to insert cert alert");
    return false;
  }
}

async function handleMessage(event: MessageEvent): Promise<void> {
  dataReceivedSinceConnect = true;
  resetNoDataTimer();
  try {
    const rawData = typeof event.data === 'string' ? event.data : '';
    const data = JSON.parse(rawData);
    const domains = extractDomains(data);
    if (domains.length === 0) return;

    for (const domain of domains) {
      const match = checkDomainAgainstWatchlist(domain, cachedBrands);
      if (match) {
        const issuer = extractIssuer(data);
        const certIssuedAt = extractNotBefore(data);
        await insertAlert(domain, match, issuer, certIssuedAt);
      }
    }
  } catch (parseErr) {
    logger.warn({ err: parseErr }, "CertStream message parse/processing error");
  }
}

function clearNoDataTimer(): void {
  if (noDataTimer) {
    clearTimeout(noDataTimer);
    noDataTimer = null;
  }
}

function resetNoDataTimer(): void {
  clearNoDataTimer();
  if (!isRunning) return;
  noDataTimer = setTimeout(() => {
    if (ws) {
      logger.warn("CertStream: no data received in 30s, reconnecting with next server");
      currentUrlIndex = (currentUrlIndex + 1) % CERTSTREAM_URLS.length;
      const staleWs = ws;
      ws = null;
      try { staleWs.close(); } catch (_e) {}
      if (isRunning) {
        connect();
      }
    }
  }, NO_DATA_TIMEOUT_MS);
}

let socketGeneration = 0;

function connect(): void {
  if (ws) {
    try { ws.close(); } catch (closeErr) {
      logger.warn({ err: closeErr }, "Error closing previous CertStream WebSocket");
    }
    ws = null;
  }

  if (typeof globalThis.WebSocket === 'undefined') {
    logger.error("WebSocket is not available in this runtime, CertStream monitor cannot start");
    isRunning = false;
    return;
  }

  const url = CERTSTREAM_URLS[currentUrlIndex];
  dataReceivedSinceConnect = false;
  const gen = ++socketGeneration;

  try {
    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
      if (gen !== socketGeneration) return;
      logger.info({ url }, "CertStream WebSocket connected");
      resetNoDataTimer();
    };

    socket.onmessage = (event) => {
      if (gen !== socketGeneration) return;
      handleMessage(event).catch((err) => {
        logger.warn({ err }, "Unhandled error in CertStream message handler");
      });
    };

    socket.onerror = () => {
      if (gen !== socketGeneration) return;
      logger.error({ url }, "CertStream WebSocket error");
    };

    socket.onclose = () => {
      if (gen !== socketGeneration) return;
      logger.info("CertStream WebSocket closed");
      clearNoDataTimer();
      ws = null;
      if (isRunning) {
        scheduleReconnect();
      }
    };
  } catch (err) {
    logger.error({ err }, "Failed to create CertStream WebSocket");
    if (isRunning) {
      scheduleReconnect();
    }
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (isRunning && cachedBrands.length > 0) {
      connect();
    }
  }, RECONNECT_DELAY_MS);
}

export async function startCertStream(): Promise<void> {
  if (typeof globalThis.WebSocket === 'undefined') {
    logger.error("WebSocket is not available in this runtime, CertStream monitor disabled");
    return;
  }

  cachedBrands = await loadBrands();
  if (cachedBrands.length === 0) {
    logger.info("No brands in watchlist, CertStream not started");
    return;
  }

  isRunning = true;
  logger.info({ brandCount: cachedBrands.length }, "Starting CertStream monitor");
  connect();
}

export async function restartCertStream(): Promise<void> {
  stopCertStream();
  await startCertStream();
}

export function stopCertStream(): void {
  isRunning = false;
  clearNoDataTimer();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    try { ws.close(); } catch (closeErr) {
      logger.warn({ err: closeErr }, "Error closing CertStream WebSocket during stop");
    }
    ws = null;
  }
  logger.info("CertStream monitor stopped");
}

export function isCertStreamRunning(): boolean {
  return isRunning;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let ctScanInFlight = false;

function generateTyposquatQueries(brand: string): string[] {
  const queries: string[] = [];
  const b = brand.toLowerCase();
  
  for (let i = 0; i < b.length && queries.length < 3; i++) {
    const typo = b.slice(0, i) + b.slice(i + 1);
    if (typo.length >= 3) queries.push(typo);
  }
  
  const suspiciousPrefixes = [`${b}-login`, `${b}-verify`, `${b}-secure`, `${b}login`, `${b}secure`];
  queries.push(...suspiciousPrefixes);
  
  const suspiciousSuffixes = [`login-${b}`, `secure-${b}`, `my-${b}`, `my${b}`];
  queries.push(...suspiciousSuffixes);
  
  return queries;
}

export async function scanCrtSh(brands: string[]): Promise<number> {
  if (ctScanInFlight) {
    logger.info("CT scan already in progress, skipping");
    return 0;
  }
  ctScanInFlight = true;

  let totalInserted = 0;
  const domainRegex = /^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)+$/;
  
  try {
  for (const brand of brands) {
    let brandInserted = 0;
    const queries = generateTyposquatQueries(brand);
    
    for (const q of queries) {
      try {
        const url = `https://crt.sh/?q=${encodeURIComponent(q)}&output=json`;
        
        const response = await fetch(url, {
          signal: AbortSignal.timeout(20000),
          headers: { 'User-Agent': 'PhishWatch/1.0' },
        });
        
        if (!response.ok) {
          if (response.status === 429) {
            logger.warn({ brand, query: q }, "crt.sh rate limited, stopping brand scan");
            break;
          }
          continue;
        }
        
        const certs = await response.json() as Array<{
          common_name?: string;
          name_value?: string;
          issuer_name?: string;
          not_before?: string;
        }>;
        
        if (certs.length === 0) continue;
        
        const seenDomains = new Set<string>();
        
        for (const cert of certs.slice(0, 50)) {
          const nameValues = (cert.name_value || '').split('\n');
          const allNames = [cert.common_name, ...nameValues].filter(Boolean) as string[];
          
          for (const rawName of allNames) {
            const name = rawName.toLowerCase().trim();
            if (!name || name.startsWith('*') || seenDomains.has(name)) continue;
            if (!domainRegex.test(name)) continue;
            seenDomains.add(name);
            
            const match = checkDomainAgainstWatchlist(name, [brand]);
            if (match) {
              const issuer = cert.issuer_name || null;
              const certIssuedAt = cert.not_before ? new Date(cert.not_before) : null;
              const inserted = await insertAlert(name, match, issuer, certIssuedAt);
              if (inserted) brandInserted++;
            }
          }
        }
        
        await sleep(2000);
      } catch (err) {
        if ((err as Error)?.name === 'TimeoutError') {
          logger.warn({ brand, query: q }, "crt.sh query timed out, skipping");
        } else {
          logger.error({ err, brand, query: q }, "crt.sh scan error");
        }
      }
    }
    
    totalInserted += brandInserted;
    logger.info({ brand, alertsFound: brandInserted }, "crt.sh scan complete for brand");
    await sleep(1000);
  }
  } finally {
    ctScanInFlight = false;
  }
  
  return totalInserted;
}

export async function runCtScan(): Promise<number> {
  const brands = await loadBrands();
  if (brands.length === 0) {
    logger.info("No brands in watchlist, CT scan skipped");
    return 0;
  }
  
  logger.info({ brandCount: brands.length }, "Starting Certificate Transparency log scan via crt.sh");
  return scanCrtSh(brands);
}
