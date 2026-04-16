import { db, phishEntriesTable } from "@workspace/db";
import { classifyAttackType, classifySector, sanitizeUrl } from "../lib/classifier";
import { logger } from "../lib/logger";


const API_URL = "https://threatfox-api.abuse.ch/api/v1/";

interface ThreatFoxIOC {
  ioc: string;
  ioc_type: string;
  threat_type: string;
  malware?: string;
  confidence_level?: number;
  reporter?: string;
  tags?: string[];
}

interface ThreatFoxResponse {
  query_status: string;
  data?: ThreatFoxIOC[];
}

export async function collectThreatFox(): Promise<number> {
  logger.info("Starting ThreatFox collection");
  let inserted = 0;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "get_iocs", days: 1 }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "ThreatFox API returned non-OK status");
      return 0;
    }

    const data = (await response.json()) as ThreatFoxResponse;

    if (data.query_status !== "ok" || !data.data) {
      logger.warn({ status: data.query_status }, "ThreatFox query returned no data");
      return 0;
    }

    const urlAndDomainIOCs = data.data.filter(
      (ioc) => ioc.ioc_type === "url" || ioc.ioc_type === "domain"
    );

    for (const entry of urlAndDomainIOCs.slice(0, 200)) {
      try {
        if (!entry.ioc) continue;

        let rawUrl = entry.ioc;
        if (entry.ioc_type === "domain") {
          rawUrl = `http://${rawUrl}`;
        }

        const sanitized = sanitizeUrl(rawUrl);

        const attackType = classifyAttackType(rawUrl);
        const sector = classifySector(rawUrl);

        const confidence = entry.confidence_level
          ? Math.min(entry.confidence_level / 100, 1)
          : 0.75;

        const result = await db.insert(phishEntriesTable).values({
          url: sanitized,
          source: "threatfox",
          attackType,
          sector,
          country: null,
          dateDetected: new Date(),
          confidenceScore: confidence,
          isActive: true,
        }).onConflictDoNothing();
        if (result.rowCount && result.rowCount > 0) inserted++;
      } catch (err) {
        logger.error({ err }, "Error inserting ThreatFox entry");
      }
    }

    logger.info({ inserted }, "ThreatFox collection complete");
  } catch (err) {
    logger.error({ err }, "ThreatFox collection failed");
  }

  return inserted;
}
