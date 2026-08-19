import { db, phishEntriesTable } from "@workspace/db";
import { isNull, desc, eq, and, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import * as virustotal from "./virustotal";
import * as urlscan from "./urlscan";
import { enrichWithRdap } from "./rdap";
import { enrichWithGeo } from "./geoip";
import { computeRiskScore } from "../lib/risk";

const SLEEP_MS = 15000;
const URLSCAN_SLEEP_MS = 4000;
const URLSCAN_MAX = 20; // urlscan search API is rate-limited; keep runs small

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enrichWithVirusTotal(batchSize: number): Promise<number> {
  const pending = await db.select()
    .from(phishEntriesTable)
    .where(
      and(
        isNull(phishEntriesTable.vtDetectionRatio),
        or(
          isNull(phishEntriesTable.enrichmentSource),
          sql`${phishEntriesTable.enrichmentSource} NOT LIKE '%virustotal%'`
        )
      )
    )
    .orderBy(desc(phishEntriesTable.dateDetected))
    .limit(batchSize);

  if (pending.length === 0) {
    logger.info("No entries pending VT enrichment");
    return 0;
  }

  let enriched = 0;

  for (let i = 0; i < pending.length; i++) {
    const entry = pending[i];

    let vtData: Awaited<ReturnType<typeof virustotal.enrichEntry>> = null;
    if (virustotal.isConfigured()) {
      vtData = await virustotal.enrichEntry(entry.id, entry.url);

      if (vtData === null && i > 0) {
        logger.warn("VT returned null (possible rate limit), stopping batch");
        break;
      }

      if (i < pending.length - 1 && virustotal.isConfigured()) {
        await sleep(SLEEP_MS);
      }
    }

    try {
      if (!vtData) continue;

      const updateData: Record<string, unknown> = {
        vtMaliciousVotes: vtData.vtMaliciousVotes,
        vtHarmlessVotes: vtData.vtHarmlessVotes,
        vtDetectionRatio: vtData.vtDetectionRatio,
        vtCategories: vtData.vtCategories,
        vtCountry: vtData.vtCountry,
        vtRegistrar: vtData.vtRegistrar,
      };

      const currentSource = entry.enrichmentSource || "";
      if (!currentSource.includes("virustotal")) {
        updateData.enrichmentSource = currentSource
          ? `${currentSource},virustotal`
          : "virustotal";
      }

      if (!entry.enrichedAt) {
        updateData.enrichedAt = new Date();
      }

      // Recompute risk with the freshly merged VT signal.
      updateData.riskScore = computeRiskScore({
        vtDetectionRatio: vtData.vtDetectionRatio,
        urlscanScore: entry.urlscanScore,
        domainAge: entry.domainAge,
        dateDetected: entry.dateDetected,
        confidenceScore: entry.confidenceScore,
        isActive: entry.isActive,
      }).score;

      await db.update(phishEntriesTable)
        .set(updateData)
        .where(eq(phishEntriesTable.id, entry.id));

      enriched++;

      if (enriched % 10 === 0) {
        logger.info({ enriched, total: pending.length }, "VT enrichment batch checkpoint");
      }
    } catch (err) {
      logger.error({ err, entryId: entry.id }, "Error updating VT enrichment data");
    }
  }

  return enriched;
}

async function enrichWithUrlscan(batchSize: number): Promise<number> {
  const limit = Math.min(batchSize, URLSCAN_MAX);
  const pending = await db.select()
    .from(phishEntriesTable)
    .where(isNull(phishEntriesTable.urlscanScannedAt))
    .orderBy(desc(phishEntriesTable.dateDetected))
    .limit(limit);

  if (pending.length === 0) {
    logger.info("No entries pending urlscan enrichment");
    return 0;
  }

  let enriched = 0;
  const now = new Date();

  for (let i = 0; i < pending.length; i++) {
    const entry = pending[i];
    const result = await urlscan.enrichEntry(entry.url);

    try {
      const updateData: Record<string, unknown> = {
        // Mark attempted either way so we don't re-query the rate-limited API.
        urlscanScannedAt: result?.urlscanScannedAt ?? now,
        urlscanUuid: result?.urlscanUuid ?? null,
        urlscanScreenshot: result?.urlscanScreenshot ?? null,
        urlscanScore: result?.urlscanScore ?? null,
      };

      if (result) {
        const currentSource = entry.enrichmentSource || "";
        if (!currentSource.includes("urlscan")) {
          updateData.enrichmentSource = currentSource ? `${currentSource},urlscan` : "urlscan";
        }
        if (!entry.enrichedAt) updateData.enrichedAt = now;

        updateData.riskScore = computeRiskScore({
          vtDetectionRatio: entry.vtDetectionRatio,
          urlscanScore: result.urlscanScore,
          domainAge: entry.domainAge,
          dateDetected: entry.dateDetected,
          confidenceScore: entry.confidenceScore,
          isActive: entry.isActive,
        }).score;
        enriched++;
      }

      await db.update(phishEntriesTable)
        .set(updateData)
        .where(eq(phishEntriesTable.id, entry.id));
    } catch (err) {
      logger.error({ err, entryId: entry.id }, "Error updating urlscan enrichment data");
    }

    if (i < pending.length - 1) await sleep(URLSCAN_SLEEP_MS);
  }

  return enriched;
}

// Recompute the composite risk score for the most recent entries (or all when
// no limit is given). Cheap arithmetic; keeps riskScore consistent after RDAP
// and other passes that don't recompute inline.
export async function recomputeRiskScores(limit?: number): Promise<number> {
  const base = db
    .select({
      id: phishEntriesTable.id,
      riskScore: phishEntriesTable.riskScore,
      vtDetectionRatio: phishEntriesTable.vtDetectionRatio,
      urlscanScore: phishEntriesTable.urlscanScore,
      domainAge: phishEntriesTable.domainAge,
      dateDetected: phishEntriesTable.dateDetected,
      confidenceScore: phishEntriesTable.confidenceScore,
      isActive: phishEntriesTable.isActive,
    })
    .from(phishEntriesTable)
    .orderBy(desc(phishEntriesTable.dateDetected));

  const rows = limit ? await base.limit(limit) : await base;

  let updated = 0;
  for (const row of rows) {
    const score = computeRiskScore(row).score;
    if (score !== row.riskScore) {
      await db.update(phishEntriesTable)
        .set({ riskScore: score })
        .where(eq(phishEntriesTable.id, row.id));
      updated++;
    }
  }
  if (updated > 0) logger.info({ updated }, "Risk scores recomputed");
  return updated;
}

export async function enrichPending(batchSize = 50): Promise<number> {
  logger.info({ batchSize }, "Starting enrichment run");

  const [vtResult, rdapResult, geoResult, urlscanResult] = await Promise.allSettled([
    enrichWithVirusTotal(batchSize),
    enrichWithRdap(batchSize),
    enrichWithGeo(batchSize),
    enrichWithUrlscan(batchSize),
  ]);

  const vtEnriched = vtResult.status === "fulfilled" ? vtResult.value : 0;
  const rdapEnriched = rdapResult.status === "fulfilled" ? rdapResult.value : 0;
  const geoEnriched = geoResult.status === "fulfilled" ? geoResult.value : 0;
  const urlscanEnriched = urlscanResult.status === "fulfilled" ? urlscanResult.value : 0;

  if (vtResult.status === "rejected") logger.error({ err: vtResult.reason }, "VT enrichment failed");
  if (rdapResult.status === "rejected") logger.error({ err: rdapResult.reason }, "RDAP enrichment failed");
  if (geoResult.status === "rejected") logger.error({ err: geoResult.reason }, "Geo enrichment failed");
  if (urlscanResult.status === "rejected") logger.error({ err: urlscanResult.reason }, "urlscan enrichment failed");

  // RDAP recomputes nothing inline; sweep recent entries so domain-age changes
  // are reflected in the score.
  await recomputeRiskScores(Math.max(batchSize * 4, 200));

  logger.info({ vtEnriched, rdapEnriched, geoEnriched, urlscanEnriched }, "Enrichment run complete");
  return vtEnriched + rdapEnriched + geoEnriched + urlscanEnriched;
}
