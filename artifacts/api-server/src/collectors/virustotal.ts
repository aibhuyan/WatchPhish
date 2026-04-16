import { db, phishEntriesTable } from "@workspace/db";
import { apiCallLogTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { eq } from "drizzle-orm";

const VT_API_BASE = "https://www.virustotal.com/api/v3/urls";

function getApiKey(): string | null {
  return process.env.VIRUSTOTAL_API_KEY || null;
}

function urlToVtId(url: string): string {
  const raw = url.replace(/^hxxps?/i, (m) => m.toLowerCase().replace("xx", "tt"));
  const encoded = Buffer.from(raw).toString("base64url").replace(/=+$/, "");
  return encoded;
}

export function isConfigured(): boolean {
  const key = getApiKey();
  return !!key && key.length > 0;
}

export async function enrichEntry(entryId: number, rawUrl: string): Promise<{
  vtMaliciousVotes: number | null;
  vtHarmlessVotes: number | null;
  vtDetectionRatio: string | null;
  vtCategories: string | null;
  vtCountry: string | null;
  vtRegistrar: string | null;
} | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const cleanUrl = rawUrl
    .replace(/^hxxps/gi, "https")
    .replace(/^hxxp/gi, "http")
    .replace(/\[([^\]]+)\]/g, "$1");

  const urlId = urlToVtId(cleanUrl);

  try {
    const response = await fetch(`${VT_API_BASE}/${urlId}`, {
      headers: { "x-apikey": apiKey },
      signal: AbortSignal.timeout(15000),
    });

    await db.insert(apiCallLogTable).values({
      apiName: "virustotal",
      success: response.ok,
      responseStatus: response.status,
    });

    if (response.status === 429) {
      logger.warn("VirusTotal rate limit hit, stopping enrichment run");
      return null;
    }

    if (response.status === 404) {
      return {
        vtMaliciousVotes: null,
        vtHarmlessVotes: null,
        vtDetectionRatio: null,
        vtCategories: null,
        vtCountry: null,
        vtRegistrar: null,
      };
    }

    if (!response.ok) {
      logger.warn({ status: response.status }, "VirusTotal returned non-OK");
      return null;
    }

    const raw: unknown = await response.json();

    const data = raw as Record<string, unknown> | null;
    const inner = (data && typeof data === "object" && "data" in data)
      ? data.data as Record<string, unknown> | null
      : null;
    const attrs = (inner && typeof inner === "object" && "attributes" in inner)
      ? inner.attributes as Record<string, unknown>
      : {} as Record<string, unknown>;

    const analysisStats = (attrs.last_analysis_stats && typeof attrs.last_analysis_stats === "object")
      ? attrs.last_analysis_stats as Record<string, number>
      : {} as Record<string, number>;

    const malicious = analysisStats.malicious || 0;
    const harmless = analysisStats.harmless || 0;
    const total = malicious + harmless + (analysisStats.undetected || 0) + (analysisStats.suspicious || 0);

    const categories = attrs.categories;
    const country = typeof attrs.country === "string" ? attrs.country : null;
    const registrar = typeof attrs.registrar === "string" ? attrs.registrar : null;

    return {
      vtMaliciousVotes: malicious,
      vtHarmlessVotes: harmless,
      vtDetectionRatio: total > 0 ? `${malicious}/${total}` : null,
      vtCategories: categories && typeof categories === "object" ? JSON.stringify(categories) : null,
      vtCountry: country,
      vtRegistrar: registrar,
    };
  } catch (err) {
    logger.error({ err }, "VirusTotal enrichment error");
    return null;
  }
}

export async function testConnection(): Promise<{ success: boolean; message: string; responseStatus: number | null }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { success: false, message: "API key not configured", responseStatus: null };
  }

  try {
    const testUrl = urlToVtId("https://example.com");
    const response = await fetch(`${VT_API_BASE}/${testUrl}`, {
      headers: { "x-apikey": apiKey },
      signal: AbortSignal.timeout(10000),
    });

    return {
      success: response.ok || response.status === 404,
      message: response.ok ? "Connection successful" : `Status: ${response.status}`,
      responseStatus: response.status,
    };
  } catch (err) {
    return { success: false, message: String(err), responseStatus: null };
  }
}
