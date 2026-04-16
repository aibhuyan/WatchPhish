import { db, phishEntriesTable } from "@workspace/db";
import { classifyAttackType, classifySector, sanitizeUrl } from "../lib/classifier";
import { logger } from "../lib/logger";


const API_URL = "https://urlhaus-api.abuse.ch/v1/urls/recent/";

export async function collectUrlhaus(): Promise<number> {
  logger.info("Starting URLhaus collection");
  let inserted = 0;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "URLhaus API returned non-OK status");
      return 0;
    }

    const data = await response.json() as { urls?: Array<{ url: string; threat?: string; country?: string }> };
    const urls = data.urls || [];

    for (const entry of urls.slice(0, 200)) {
      try {
        if (!entry.url) continue;

        const sanitized = sanitizeUrl(entry.url);

        const attackType = classifyAttackType(entry.url);
        const sector = classifySector(entry.url);

        const result = await db.insert(phishEntriesTable).values({
          url: sanitized,
          source: "urlhaus",
          attackType,
          sector,
          country: entry.country || null,
          dateDetected: new Date(),
          confidenceScore: 0.8,
          isActive: true,
        }).onConflictDoNothing();
        if (result.rowCount && result.rowCount > 0) inserted++;
      } catch (err) {
        logger.error({ err }, "Error inserting URLhaus entry");
      }
    }

    logger.info({ inserted }, "URLhaus collection complete");
  } catch (err) {
    logger.error({ err }, "URLhaus collection failed");
  }

  return inserted;
}
