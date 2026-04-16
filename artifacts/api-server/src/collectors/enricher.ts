import { db, phishEntriesTable } from "@workspace/db";
import { isNull, desc, eq, and, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import * as virustotal from "./virustotal";
import { enrichWithRdap } from "./rdap";

const SLEEP_MS = 15000;

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

export async function enrichPending(batchSize = 50): Promise<number> {
  logger.info({ batchSize }, "Starting enrichment run");

  const [vtResult, rdapResult] = await Promise.allSettled([
    enrichWithVirusTotal(batchSize),
    enrichWithRdap(batchSize),
  ]);

  const vtEnriched = vtResult.status === "fulfilled" ? vtResult.value : 0;
  const rdapEnriched = rdapResult.status === "fulfilled" ? rdapResult.value : 0;

  if (vtResult.status === "rejected") logger.error({ err: vtResult.reason }, "VT enrichment failed");
  else logger.info({ vtEnriched }, "VT enrichment finished");

  if (rdapResult.status === "rejected") logger.error({ err: rdapResult.reason }, "RDAP enrichment failed");
  else logger.info({ rdapEnriched }, "RDAP enrichment finished");

  logger.info({ vtEnriched, rdapEnriched }, "Enrichment run complete");
  return vtEnriched + rdapEnriched;
}
