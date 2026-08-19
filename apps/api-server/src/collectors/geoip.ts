import { db, phishEntriesTable } from "@workspace/db";
import { isNull, desc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";

// IP geolocation + ASN enrichment via ip-api.com.
//
// The free endpoint (HTTP only, 45 req/min) resolves a hostname directly to
// its IP, country, coordinates and ASN, so we can map each phishing host onto
// the world without a separate DNS step or an API key.

const API_BASE = "http://ip-api.com/json/";
const FIELDS = "status,message,countryCode,lat,lon,isp,org,as,query";
const BATCH_DELAY_MS = 1500; // stay under 45 req/min

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractHost(sanitizedUrl: string): string | null {
  try {
    const restored = sanitizedUrl
      .replace(/^hxxps/gi, "https")
      .replace(/^hxxp/gi, "http")
      .replace(/\[|\]/g, "");
    return new URL(restored).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

interface GeoResult {
  ipAddress: string | null;
  geoCountryCode: string | null;
  geoLat: number | null;
  geoLon: number | null;
  asn: string | null;
  asnOrg: string | null;
}

interface IpApiResponse {
  status?: string;
  countryCode?: string;
  lat?: number;
  lon?: number;
  org?: string;
  isp?: string;
  as?: string; // e.g. "AS13335 Cloudflare, Inc."
  query?: string; // resolved IP
}

function parseGeo(data: IpApiResponse): GeoResult | null {
  if (data.status !== "success") return null;

  // Split "AS13335 Cloudflare, Inc." into ASN and org.
  let asn: string | null = null;
  let asnOrg: string | null = null;
  if (typeof data.as === "string" && data.as.length > 0) {
    const match = data.as.match(/^(AS\d+)\s*(.*)$/i);
    if (match) {
      asn = match[1].toUpperCase();
      asnOrg = match[2] || data.org || data.isp || null;
    } else {
      asnOrg = data.as;
    }
  } else {
    asnOrg = data.org || data.isp || null;
  }

  return {
    ipAddress: typeof data.query === "string" ? data.query : null,
    geoCountryCode: typeof data.countryCode === "string" ? data.countryCode : null,
    geoLat: typeof data.lat === "number" ? data.lat : null,
    geoLon: typeof data.lon === "number" ? data.lon : null,
    asn,
    asnOrg,
  };
}

export async function enrichWithGeo(batchSize = 50): Promise<number> {
  logger.info({ batchSize }, "Starting geo/IP enrichment run");

  const pending = await db
    .select()
    .from(phishEntriesTable)
    .where(isNull(phishEntriesTable.geoEnrichedAt))
    .orderBy(desc(phishEntriesTable.dateDetected))
    .limit(batchSize);

  if (pending.length === 0) {
    logger.info("No entries to enrich with geo/IP");
    return 0;
  }

  const cache = new Map<string, GeoResult | null>();

  // Group by host so repeated hosts cost a single lookup.
  const byHost = new Map<string, typeof pending>();
  for (const entry of pending) {
    const host = extractHost(entry.url);
    if (!host) continue;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host)!.push(entry);
  }

  let enriched = 0;
  let idx = 0;
  const total = byHost.size;

  for (const [host, entries] of byHost) {
    idx++;
    let geo = cache.get(host);

    if (geo === undefined) {
      try {
        const response = await fetch(`${API_BASE}${encodeURIComponent(host)}?fields=${FIELDS}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (response.status === 429) {
          logger.warn("ip-api rate limit hit, stopping geo run");
          break;
        }
        geo = response.ok ? parseGeo((await response.json()) as IpApiResponse) : null;
        cache.set(host, geo);
      } catch (err) {
        logger.error({ err, host }, "geo lookup failed");
        cache.set(host, null);
        geo = null;
      }
      if (idx < total) await sleep(BATCH_DELAY_MS);
    }

    const now = new Date();
    for (const entry of entries) {
      try {
        const currentSource = entry.enrichmentSource || "";
        await db
          .update(phishEntriesTable)
          .set({
            ipAddress: geo?.ipAddress ?? null,
            geoCountryCode: geo?.geoCountryCode ?? null,
            geoLat: geo?.geoLat ?? null,
            geoLon: geo?.geoLon ?? null,
            asn: geo?.asn ?? null,
            asnOrg: geo?.asnOrg ?? null,
            geoEnrichedAt: now,
            enrichedAt: entry.enrichedAt ?? now,
            enrichmentSource: currentSource.includes("geoip")
              ? currentSource
              : currentSource
                ? `${currentSource},geoip`
                : "geoip",
          })
          .where(eq(phishEntriesTable.id, entry.id));
        if (geo) enriched++;
      } catch (err) {
        logger.error({ err, entryId: entry.id }, "Error updating geo enrichment data");
      }
    }
  }

  logger.info({ enriched }, "Geo/IP enrichment run complete");
  return enriched;
}
