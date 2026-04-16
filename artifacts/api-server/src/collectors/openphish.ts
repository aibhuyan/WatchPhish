import { db, phishEntriesTable } from "@workspace/db";
import { classifyAttackType, classifySector, sanitizeUrl } from "../lib/classifier";
import { logger } from "../lib/logger";


const FEED_URL = "https://openphish.com/feed.txt";

export async function collectOpenPhish(): Promise<number> {
  logger.info("Starting OpenPhish collection");
  let inserted = 0;

  try {
    const response = await fetch(FEED_URL, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      logger.warn({ status: response.status }, "OpenPhish feed returned non-OK status");
      return 0;
    }

    const text = await response.text();
    const urls = text.split("\n").filter(line => line.trim().startsWith("http"));

    for (const rawUrl of urls.slice(0, 200)) {
      try {
        const sanitized = sanitizeUrl(rawUrl);

        const attackType = classifyAttackType(rawUrl);
        const sector = classifySector(rawUrl);

        const result = await db.insert(phishEntriesTable).values({
          url: sanitized,
          source: "openphish",
          attackType,
          sector,
          dateDetected: new Date(),
          confidenceScore: 0.7,
          isActive: true,
        }).onConflictDoNothing();
        if (result.rowCount && result.rowCount > 0) inserted++;
      } catch (err) {
        logger.error({ err, url: rawUrl.substring(0, 50) }, "Error inserting OpenPhish entry");
      }
    }

    logger.info({ inserted }, "OpenPhish collection complete");
  } catch (err) {
    logger.error({ err }, "OpenPhish collection failed");
  }

  return inserted;
}
