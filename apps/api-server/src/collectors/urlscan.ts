import { db } from "@workspace/db";
import { apiCallLogTable } from "@workspace/db";
import { logger } from "../lib/logger";

// urlscan.io enrichment.
//
// Uses the public *search* API (no key required) to find an existing scan of a
// URL/domain and pull its screenshot + verdict score. A URLSCAN_API_KEY, when
// present, is sent to raise rate limits. We deliberately do NOT submit new
// scans here — submission is async (the scan takes ~10-30s to finish) and would
// need polling; search covers already-scanned phishing infrastructure well.

const SEARCH_BASE = "https://urlscan.io/api/v1/search/";
const RESULT_BASE = "https://urlscan.io/api/v1/result/";

export interface UrlscanResult {
  urlscanUuid: string;
  urlscanScreenshot: string | null;
  urlscanScore: number | null;
  urlscanScannedAt: Date | null;
}

function getApiKey(): string | null {
  return process.env.URLSCAN_API_KEY || null;
}

export function isConfigured(): boolean {
  const key = getApiKey();
  return !!key && key.length > 0;
}

function headers(): Record<string, string> {
  const key = getApiKey();
  return key ? { "API-Key": key } : {};
}

function cleanUrl(rawUrl: string): string {
  return rawUrl
    .replace(/^hxxps/gi, "https")
    .replace(/^hxxp/gi, "http")
    .replace(/\[([^\]]+)\]/g, "$1");
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

interface SearchHit {
  _id?: string;
  screenshot?: string;
  task?: { time?: string };
}

async function search(query: string): Promise<SearchHit | null> {
  const url = `${SEARCH_BASE}?q=${encodeURIComponent(query)}&size=1`;
  const response = await fetch(url, {
    headers: { ...headers(), Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  await db.insert(apiCallLogTable).values({
    apiName: "urlscan",
    success: response.ok,
    responseStatus: response.status,
  });

  if (response.status === 429) {
    logger.warn("urlscan rate limit hit during search");
    return null;
  }
  if (!response.ok) return null;

  const raw = (await response.json()) as { results?: SearchHit[] } | null;
  const hit = raw?.results?.[0];
  return hit && hit._id ? hit : null;
}

async function fetchVerdictScore(uuid: string): Promise<number | null> {
  try {
    const response = await fetch(`${RESULT_BASE}${uuid}/`, {
      headers: { ...headers(), Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    const raw = (await response.json()) as {
      verdicts?: { overall?: { score?: number } };
    } | null;
    const score = raw?.verdicts?.overall?.score;
    return typeof score === "number" ? score : null;
  } catch {
    return null;
  }
}

export async function enrichEntry(rawUrl: string): Promise<UrlscanResult | null> {
  const url = cleanUrl(rawUrl);

  try {
    // Prefer an exact page-url match, fall back to a domain match.
    let hit = await search(`page.url:"${url}"`);
    if (!hit) {
      const host = hostOf(url);
      if (host) hit = await search(`page.domain:"${host}"`);
    }
    if (!hit || !hit._id) return null;

    const score = await fetchVerdictScore(hit._id);

    return {
      urlscanUuid: hit._id,
      urlscanScreenshot: typeof hit.screenshot === "string" ? hit.screenshot : null,
      urlscanScore: score,
      urlscanScannedAt: hit.task?.time ? new Date(hit.task.time) : new Date(),
    };
  } catch (err) {
    logger.error({ err }, "urlscan enrichment error");
    return null;
  }
}

export async function testConnection(): Promise<{ success: boolean; message: string; responseStatus: number | null }> {
  try {
    const response = await fetch(`${SEARCH_BASE}?q=domain:example.com&size=1`, {
      headers: { ...headers(), Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    return {
      success: response.ok,
      message: response.ok ? "Connection successful" : `Status: ${response.status}`,
      responseStatus: response.status,
    };
  } catch (err) {
    return { success: false, message: String(err), responseStatus: null };
  }
}
