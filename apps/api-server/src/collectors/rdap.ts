import { db, phishEntriesTable } from "@workspace/db";
import { isNull, desc, eq, sql, or } from "drizzle-orm";
import { logger } from "../lib/logger";

const RDAP_BASE = "https://rdap.org/domain/";
const BATCH_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const HOSTING_PLATFORMS = new Set([
  "weebly.com", "wixsite.com", "wix.com", "blogspot.com", "wordpress.com",
  "sites.google.com", "github.io", "herokuapp.com", "netlify.app",
  "vercel.app", "pages.dev", "firebaseapp.com", "web.app",
  "azurewebsites.net", "squarespace.com", "godaddysites.com",
  "000webhostapp.com", "replit.app", "glitch.me", "surge.sh",
  "render.com", "fly.dev", "deno.dev", "workers.dev",
  "myshopify.com", "carrd.co", "webflow.io",
  "s3.amazonaws.com", "storage.googleapis.com",
]);

function extractRegisteredDomain(sanitizedUrl: string): string | null {
  try {
    const restored = sanitizedUrl
      .replace(/^hxxps/gi, "https")
      .replace(/^hxxp/gi, "http")
      .replace(/\[|\]/g, "");
    const parsed = new URL(restored);
    const hostname = parsed.hostname.toLowerCase();

    const parts = hostname.split(".");
    if (parts.length < 2) return null;

    const twoPartTld = parts.slice(-2).join(".");
    const threePartTld = parts.length >= 3 ? parts.slice(-3).join(".") : null;

    const knownTwoPartTlds = new Set([
      "co.uk", "co.jp", "co.kr", "co.in", "co.za", "co.nz", "co.id",
      "com.au", "com.br", "com.mx", "com.ar", "com.tr", "com.pl", "com.ng",
      "org.uk", "net.au", "ac.uk", "gov.uk", "edu.au", "or.jp",
    ]);

    let registeredDomain: string;
    if (threePartTld && parts.length >= 4 && knownTwoPartTlds.has(parts.slice(-2).join("."))) {
      registeredDomain = parts.slice(-3).join(".");
    } else {
      registeredDomain = twoPartTld;
    }

    if (HOSTING_PLATFORMS.has(registeredDomain) || HOSTING_PLATFORMS.has(twoPartTld)) {
      return null;
    }

    return registeredDomain;
  } catch {
    return null;
  }
}

interface RdapEvent {
  eventAction: string;
  eventDate: string;
}

interface RdapEntity {
  vcardArray?: [string, Array<[string, Record<string, string>, string, string]>];
  roles?: string[];
}

interface RdapResponse {
  events?: RdapEvent[];
  entities?: RdapEntity[];
}

function parseRdapResponse(data: RdapResponse): {
  registeredDate: Date | null;
  registrar: string | null;
  expirationDate: Date | null;
} {
  let registeredDate: Date | null = null;
  let registrar: string | null = null;
  let expirationDate: Date | null = null;

  if (data.events) {
    for (const event of data.events) {
      if (event.eventAction === "registration" && event.eventDate) {
        registeredDate = new Date(event.eventDate);
      }
      if (event.eventAction === "expiration" && event.eventDate) {
        expirationDate = new Date(event.eventDate);
      }
    }
  }

  if (data.entities) {
    for (const entity of data.entities) {
      if (entity.roles?.includes("registrar") && entity.vcardArray) {
        const vcard = entity.vcardArray[1];
        if (vcard) {
          for (const field of vcard) {
            if (field[0] === "fn") {
              registrar = field[3];
              break;
            }
          }
        }
      }
    }
  }

  return { registeredDate, registrar, expirationDate };
}

function computeDomainAge(registeredDate: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - registeredDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export async function enrichWithRdap(batchSize = 50): Promise<number> {
  logger.info({ batchSize }, "Starting RDAP enrichment run");

  const pending = await db
    .select()
    .from(phishEntriesTable)
    .where(
      or(
        isNull(phishEntriesTable.domainAge),
        isNull(phishEntriesTable.rdapRegistrar)
      )
    )
    .orderBy(desc(phishEntriesTable.dateDetected))
    .limit(batchSize);

  if (pending.length === 0) {
    logger.info("No entries to enrich with RDAP");
    return 0;
  }

  let enriched = 0;
  const domainCache = new Map<string, { domainAge: number | null; rdapRegisteredDate: Date | null; rdapRegistrar: string | null; rdapExpirationDate: Date | null }>();

  const uniqueDomains = new Map<string, typeof pending>();
  const skippedEntries: typeof pending = [];
  for (const entry of pending) {
    const domain = extractRegisteredDomain(entry.url);
    if (!domain) {
      skippedEntries.push(entry);
      continue;
    }
    if (!uniqueDomains.has(domain)) {
      uniqueDomains.set(domain, []);
    }
    uniqueDomains.get(domain)!.push(entry);
  }

  for (const entry of skippedEntries) {
    try {
      await db.update(phishEntriesTable)
        .set({
          rdapRegistrar: "N/A (hosting platform)",
          domainAge: -1,
          enrichmentSource: (entry.enrichmentSource || "") + (entry.enrichmentSource?.includes("rdap") ? "" : (entry.enrichmentSource ? ",rdap" : "rdap")),
        })
        .where(eq(phishEntriesTable.id, entry.id));
    } catch {}
  }

  let domainIdx = 0;
  const totalDomains = uniqueDomains.size;

  for (const [domain, entries] of uniqueDomains) {
    domainIdx++;

    let rdapResult = domainCache.get(domain);

    if (!rdapResult) {
      try {
        const response = await fetch(`${RDAP_BASE}${domain}`, {
          signal: AbortSignal.timeout(10000),
          headers: { Accept: "application/rdap+json" },
        });

        if (!response.ok) {
          if (domainIdx < totalDomains) await sleep(BATCH_DELAY_MS);
          continue;
        }

        const data = (await response.json()) as RdapResponse;
        const { registeredDate, registrar, expirationDate } = parseRdapResponse(data);

        rdapResult = {
          domainAge: registeredDate && !isNaN(registeredDate.getTime()) ? computeDomainAge(registeredDate) : null,
          rdapRegisteredDate: registeredDate && !isNaN(registeredDate.getTime()) ? registeredDate : null,
          rdapRegistrar: registrar,
          rdapExpirationDate: expirationDate && !isNaN(expirationDate.getTime()) ? expirationDate : null,
        };

        domainCache.set(domain, rdapResult);

        if (domainIdx < totalDomains) await sleep(BATCH_DELAY_MS);
      } catch (err) {
        logger.error({ err, domain }, "RDAP lookup failed");
        if (domainIdx < totalDomains) await sleep(BATCH_DELAY_MS);
        continue;
      }
    }

    for (const entry of entries) {
      try {
        const updateData: Record<string, unknown> = {};

        if (rdapResult.domainAge !== null && entry.domainAge === null) {
          updateData.domainAge = rdapResult.domainAge;
          updateData.rdapRegisteredDate = rdapResult.rdapRegisteredDate;
        }

        if (rdapResult.rdapRegistrar && !entry.rdapRegistrar) {
          updateData.rdapRegistrar = rdapResult.rdapRegistrar;
        }

        if (rdapResult.rdapExpirationDate && !entry.rdapExpirationDate) {
          updateData.rdapExpirationDate = rdapResult.rdapExpirationDate;
        }

        if (Object.keys(updateData).length === 0) continue;

        if (!entry.enrichedAt) {
          updateData.enrichedAt = new Date();
        }

        const currentSource = entry.enrichmentSource || "";
        if (!currentSource.includes("rdap")) {
          updateData.enrichmentSource = currentSource ? `${currentSource},rdap` : "rdap";
        }

        await db
          .update(phishEntriesTable)
          .set(updateData)
          .where(eq(phishEntriesTable.id, entry.id));

        enriched++;
      } catch (err) {
        logger.error({ err, entryId: entry.id }, "Error updating RDAP enrichment data");
      }
    }
  }

  logger.info({ enriched }, "RDAP enrichment run complete");
  return enriched;
}
