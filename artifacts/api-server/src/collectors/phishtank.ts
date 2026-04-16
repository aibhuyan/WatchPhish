import { db, phishEntriesTable } from "@workspace/db";
import { classifyAttackType, classifySector, sanitizeUrl } from "../lib/classifier";
import { logger } from "../lib/logger";


const FEED_URL = "https://data.phishtank.com/data/online-valid.json";

interface PhishTankEntry {
  url: string;
  phish_detail_url?: string;
  submission_time?: string;
  verified?: string;
  target?: string;
}

export async function collectPhishTank(): Promise<number> {
  logger.info("Starting PhishTank collection");
  let inserted = 0;

  try {
    const response = await fetch(FEED_URL, { signal: AbortSignal.timeout(60000) });

    if (!response.ok) {
      logger.warn({ status: response.status }, "PhishTank feed returned non-OK status");
      return 0;
    }

    let entries: PhishTankEntry[];
    try {
      entries = await response.json() as PhishTankEntry[];
    } catch {
      logger.warn("PhishTank response was not valid JSON, trying alternate approach");
      return 0;
    }

    if (!Array.isArray(entries)) {
      logger.warn("PhishTank data is not an array");
      return 0;
    }

    const recent = entries.slice(0, 200);

    for (const entry of recent) {
      try {
        if (!entry.url) continue;

        const sanitized = sanitizeUrl(entry.url);

        const attackType = classifyAttackType(entry.url);
        const sector = classifySector(entry.url);

        const result = await db.insert(phishEntriesTable).values({
          url: sanitized,
          source: "phishtank",
          attackType,
          sector,
          dateDetected: entry.submission_time ? new Date(entry.submission_time) : new Date(),
          confidenceScore: 0.9,
          isActive: true,
        }).onConflictDoNothing();
        if (result.rowCount && result.rowCount > 0) inserted++;
      } catch (err) {
        logger.error({ err }, "Error inserting PhishTank entry");
      }
    }

    logger.info({ inserted }, "PhishTank collection complete");
  } catch (err) {
    logger.error({ err }, "PhishTank collection failed");
  }

  return inserted;
}
