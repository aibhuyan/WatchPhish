import cron from "node-cron";
import { logger } from "./logger";
import { collectOpenPhish } from "../collectors/openphish";
import { collectUrlhaus } from "../collectors/urlhaus";
import { collectPhishTank } from "../collectors/phishtank";
import { collectThreatFox } from "../collectors/threatfox";
import { enrichPending } from "../collectors/enricher";
import { enrichWithRdap } from "../collectors/rdap";
import { startCertStream, runCtScan } from "./certstream";
import { classifySector } from "./classifier";
import { db, phishEntriesTable } from "@workspace/db";
import { isNull, eq } from "drizzle-orm";

async function runAllCollectors(): Promise<void> {
  logger.info("Running all collectors...");
  try {
    const [op, uh, pt, tf] = await Promise.allSettled([
      collectOpenPhish(),
      collectUrlhaus(),
      collectPhishTank(),
      collectThreatFox(),
    ]);
    logger.info({
      openphish: op.status === "fulfilled" ? op.value : "failed",
      urlhaus: uh.status === "fulfilled" ? uh.value : "failed",
      phishtank: pt.status === "fulfilled" ? pt.value : "failed",
      threatfox: tf.status === "fulfilled" ? tf.value : "failed",
    }, "All collectors finished");
  } catch (err) {
    logger.error({ err }, "Error running collectors");
  }
}

async function runEnrichment(): Promise<void> {
  logger.info("Running enrichment...");
  try {
    const count = await enrichPending(50);
    logger.info({ enriched: count }, "Enrichment finished");
  } catch (err) {
    logger.error({ err }, "Error running enrichment");
  }
}

async function reclassifySectors(): Promise<void> {
  logger.info("Reclassifying sectors for entries without a sector...");
  try {
    const entries = await db.select({ id: phishEntriesTable.id, url: phishEntriesTable.url })
      .from(phishEntriesTable)
      .where(isNull(phishEntriesTable.sector));

    let updated = 0;
    for (const entry of entries) {
      const sector = classifySector(entry.url);
      if (sector) {
        await db.update(phishEntriesTable)
          .set({ sector })
          .where(eq(phishEntriesTable.id, entry.id));
        updated++;
      }
    }
    logger.info({ total: entries.length, updated }, "Sector reclassification complete");
  } catch (err) {
    logger.error({ err }, "Error reclassifying sectors");
  }
}

async function runBulkRdap(): Promise<void> {
  logger.info("Running bulk RDAP enrichment...");
  try {
    const count = await enrichWithRdap(500);
    logger.info({ enriched: count }, "Bulk RDAP enrichment finished");
  } catch (err) {
    logger.error({ err }, "Error running bulk RDAP enrichment");
  }
}

export function startScheduler(): void {
  cron.schedule("0 */6 * * *", () => {
    runAllCollectors().catch(err => logger.error({ err }, "Scheduled collector run failed"));
  });

  cron.schedule("0 */2 * * *", () => {
    runEnrichment().catch(err => logger.error({ err }, "Scheduled enrichment run failed"));
  });

  cron.schedule("0 */4 * * *", () => {
    runCtScan().catch(err => logger.error({ err }, "Scheduled CT scan failed"));
  });

  logger.info("Scheduler started: collectors every 6h, enrichment every 2h, CT scan every 4h");

  setTimeout(() => {
    reclassifySectors().catch(err => logger.error({ err }, "Sector reclassification failed"));
  }, 2000);

  setTimeout(() => {
    runAllCollectors().catch(err => logger.error({ err }, "Initial collector run failed"));
  }, 5000);

  setTimeout(() => {
    startCertStream().catch(err => logger.error({ err }, "CertStream startup failed"));
  }, 3000);

  setTimeout(() => {
    runCtScan().catch(err => logger.error({ err }, "Initial CT scan failed"));
  }, 8000);

  setTimeout(() => {
    runBulkRdap().catch(err => logger.error({ err }, "Bulk RDAP enrichment failed"));
  }, 10000);
}

export { runAllCollectors, runEnrichment };
