import { Router, type IRouter } from "express";
import { db, phishEntriesTable, attackTypesTable } from "@workspace/db";
import { apiCallLogTable } from "@workspace/db";
import { desc, sql, eq, and, gte, isNotNull, or, ne, count as drizzleCount } from "drizzle-orm";
import {
  GetStatsResponse,
  GetAttacksResponse,
  GetFeedResponse,
  GetNewTechniquesResponse,
  GetHighConfidenceResponse,
  TriggerRefreshResponse,
  TriggerEnrichResponse,
  TestEnricherResponse,
  GetThreatDetailResponse,
  GetThreatRelatedResponse,
} from "@workspace/api-zod";
import { runAllCollectors, runEnrichment } from "../lib/scheduler";
import * as virustotal from "../collectors/virustotal";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/stats", async (req, res) => {
  try {
    const sectorFilter = req.query.sector as string | undefined;
    const sectorCondition = sectorFilter ? sql`lower(${phishEntriesTable.sector}) = ${sectorFilter.toLowerCase()}` : undefined;

    const [totalResult] = await db.select({ value: sql<number>`count(*)::int` }).from(phishEntriesTable).where(sectorCondition);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [newTodayResult] = await db.select({ value: sql<number>`count(*)::int` })
      .from(phishEntriesTable)
      .where(sectorCondition ? and(gte(phishEntriesTable.dateDetected, today), sectorCondition) : gte(phishEntriesTable.dateDetected, today));

    const attackTypesCount = await db.select({ value: sql<number>`count(distinct attack_type)::int` }).from(phishEntriesTable).where(sectorCondition);
    const countriesCount = await db.select({ value: sql<number>`count(distinct country)::int` }).from(phishEntriesTable).where(sectorCondition);

    const attackTypeBreakdown = await db.select({
      type: phishEntriesTable.attackType,
      count: sql<number>`count(*)::int`,
    })
      .from(phishEntriesTable)
      .where(sectorCondition)
      .groupBy(phishEntriesTable.attackType)
      .orderBy(desc(sql`count(*)`));

    const sectorBreakdown = await db.select({
      sector: phishEntriesTable.sector,
      count: sql<number>`count(*)::int`,
    })
      .from(phishEntriesTable)
      .where(sectorCondition ? and(isNotNull(phishEntriesTable.sector), sectorCondition) : isNotNull(phishEntriesTable.sector))
      .groupBy(phishEntriesTable.sector)
      .orderBy(desc(sql`count(*)`));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyCounts = await db.select({
      date: sql<string>`to_char(date_detected, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
      .from(phishEntriesTable)
      .where(sectorCondition ? and(gte(phishEntriesTable.dateDetected, sevenDaysAgo), sectorCondition) : gte(phishEntriesTable.dateDetected, sevenDaysAgo))
      .groupBy(sql`to_char(date_detected, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(date_detected, 'YYYY-MM-DD')`);

    const topSources = await db.select({
      source: phishEntriesTable.source,
      count: sql<number>`count(*)::int`,
    })
      .from(phishEntriesTable)
      .where(sectorCondition)
      .groupBy(phishEntriesTable.source)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    const [enrichedCount] = await db.select({ value: sql<number>`count(*)::int` })
      .from(phishEntriesTable)
      .where(sectorCondition ? and(isNotNull(phishEntriesTable.enrichedAt), sectorCondition) : isNotNull(phishEntriesTable.enrichedAt));

    const [avgVt] = await db.select({
      value: sql<number>`avg(
        case when vt_detection_ratio is not null and position('/' in vt_detection_ratio) > 0
        then split_part(vt_detection_ratio, '/', 1)::float / nullif(split_part(vt_detection_ratio, '/', 2)::float, 0)
        else null end
      )`,
    }).from(phishEntriesTable).where(sectorCondition);

    const topCountries = await db.select({
      country: phishEntriesTable.vtCountry,
      count: sql<number>`count(*)::int`,
    })
      .from(phishEntriesTable)
      .where(sectorCondition ? and(isNotNull(phishEntriesTable.vtCountry), sectorCondition) : isNotNull(phishEntriesTable.vtCountry))
      .groupBy(phishEntriesTable.vtCountry)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    const apisActive: string[] = [];
    if (virustotal.isConfigured()) apisActive.push("VirusTotal");
    apisActive.push("RDAP");

    const recentlyRegisteredCondition = sectorCondition
      ? and(isNotNull(phishEntriesTable.domainAge), sql`${phishEntriesTable.domainAge} >= 0`, sql`${phishEntriesTable.domainAge} < 7`, sectorCondition)
      : and(isNotNull(phishEntriesTable.domainAge), sql`${phishEntriesTable.domainAge} >= 0`, sql`${phishEntriesTable.domainAge} < 7`);
    const [recentlyRegistered] = await db.select({ value: sql<number>`count(*)::int` })
      .from(phishEntriesTable)
      .where(recentlyRegisteredCondition);

    const result = GetStatsResponse.parse({
      totalEntries: totalResult.value,
      newToday: newTodayResult.value,
      attackTypesCount: attackTypesCount[0].value,
      countriesCount: countriesCount[0].value,
      attackTypeBreakdown,
      sectorBreakdown: sectorBreakdown.map(s => ({ sector: s.sector || "Unknown", count: s.count })),
      dailyCounts,
      topSources,
      enrichment: {
        totalEnriched: enrichedCount.value,
        avgVtDetectionRatio: avgVt.value ? Math.round(avgVt.value * 100) / 100 : null,
        topCountries: topCountries.map(c => ({ country: c.country || "Unknown", count: c.count })),
        apisActive,
        recentlyRegisteredCount: recentlyRegistered.value,
      },
    });

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error getting stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/threat/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [entry] = await db.select().from(phishEntriesTable).where(eq(phishEntriesTable.id, id));
    if (!entry) {
      res.status(404).json({ error: "Threat not found" });
      return;
    }

    const result = GetThreatDetailResponse.parse({
      id: entry.id,
      url: entry.url,
      source: entry.source,
      attackType: entry.attackType,
      sector: entry.sector,
      country: entry.country,
      dateDetected: entry.dateDetected.toISOString(),
      confidenceScore: entry.confidenceScore,
      isActive: entry.isActive,
      vtDetectionRatio: entry.vtDetectionRatio,
      vtMaliciousVotes: entry.vtMaliciousVotes,
      vtHarmlessVotes: entry.vtHarmlessVotes,
      vtCategories: entry.vtCategories,
      vtCountry: entry.vtCountry,
      vtRegistrar: entry.vtRegistrar,
      enrichedAt: entry.enrichedAt?.toISOString() || null,
      enrichmentSource: entry.enrichmentSource,
    });

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error getting threat detail");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/threat/:id/related", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [entry] = await db.select().from(phishEntriesTable).where(eq(phishEntriesTable.id, id));
    if (!entry) {
      res.status(404).json({ error: "Threat not found" });
      return;
    }

    const rdapReg = entry.rdapRegistrar && entry.rdapRegistrar !== "N/A (hosting platform)" ? entry.rdapRegistrar : null;
    const matchRdapRegistrar = rdapReg ? eq(phishEntriesTable.rdapRegistrar, rdapReg) : undefined;
    const matchVtRegistrar = entry.vtRegistrar ? eq(phishEntriesTable.vtRegistrar, entry.vtRegistrar) : undefined;
    const matchVtCountry = entry.vtCountry ? eq(phishEntriesTable.vtCountry, entry.vtCountry) : undefined;
    const matchCountry = entry.country ? eq(phishEntriesTable.country, entry.country) : undefined;

    const orConditions = [matchRdapRegistrar, matchVtRegistrar, matchVtCountry, matchCountry].filter(
      (c): c is NonNullable<typeof c> => c !== undefined
    );

    if (orConditions.length === 0) {
      res.json([]);
      return;
    }

    const related = await db.select().from(phishEntriesTable)
      .where(and(ne(phishEntriesTable.id, id), or(...orConditions)))
      .orderBy(desc(phishEntriesTable.dateDetected))
      .limit(20);

    const result = GetThreatRelatedResponse.parse(
      related.map(r => {
        let matchReason = "country";
        if (rdapReg && r.rdapRegistrar === rdapReg) matchReason = "registrar";
        else if (entry.vtRegistrar && r.vtRegistrar === entry.vtRegistrar) matchReason = "registrar";
        else if (entry.vtCountry && r.vtCountry === entry.vtCountry) matchReason = "hosting_country";
        return {
          id: r.id,
          url: r.url,
          source: r.source,
          attackType: r.attackType,
          sector: r.sector,
          country: r.country,
          dateDetected: r.dateDetected.toISOString(),
          vtDetectionRatio: r.vtDetectionRatio,
          vtRegistrar: r.vtRegistrar || r.rdapRegistrar,
          vtCountry: r.vtCountry,
          matchReason,
        };
      })
    );

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error getting related threats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/attacks", async (_req, res) => {
  try {
    const attacks = await db.select().from(attackTypesTable).orderBy(attackTypesTable.name);

    const enrichmentStats = await db.select({
      attackType: phishEntriesTable.attackType,
      avgVt: sql<number>`avg(
        case when vt_detection_ratio is not null and position('/' in vt_detection_ratio) > 0
        then split_part(vt_detection_ratio, '/', 1)::float / nullif(split_part(vt_detection_ratio, '/', 2)::float, 0)
        else null end
      )`,
    })
      .from(phishEntriesTable)
      .groupBy(phishEntriesTable.attackType);

    const statsMap = new Map(enrichmentStats.map(s => [s.attackType, s]));

    const result = GetAttacksResponse.parse(
      attacks.map(a => {
        const stats = statsMap.get(a.name);
        return {
          id: a.id,
          name: a.name,
          description: a.description,
          firstSeen: a.firstSeen.toISOString(),
          sampleCount: a.sampleCount,
          simulationHtml: a.simulationHtml,
          avgVtRatio: stats?.avgVt ? Math.round(stats.avgVt * 100) / 100 : null,
        };
      })
    );

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error getting attacks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/feed", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const sectorFilter = req.query.sector as string | undefined;
    const whereClause = sectorFilter ? sql`lower(${phishEntriesTable.sector}) = ${sectorFilter.toLowerCase()}` : undefined;

    const [countResult] = await db.select({ value: sql<number>`count(*)::int` })
      .from(phishEntriesTable)
      .where(whereClause);

    const entries = await db.select()
      .from(phishEntriesTable)
      .where(whereClause)
      .orderBy(desc(phishEntriesTable.dateDetected))
      .limit(limit)
      .offset(offset);

    const result = GetFeedResponse.parse({
      entries: entries.map(e => ({
        id: e.id,
        sanitizedUrl: e.url,
        source: e.source,
        attackType: e.attackType,
        sector: e.sector,
        country: e.country,
        dateDetected: e.dateDetected.toISOString(),
        confidenceScore: e.confidenceScore,
        isActive: e.isActive,
        vtDetectionRatio: e.vtDetectionRatio,
        vtMaliciousVotes: e.vtMaliciousVotes,
        enrichedAt: e.enrichedAt?.toISOString() || null,
        enrichmentSource: e.enrichmentSource,
        domainAge: e.domainAge ?? null,
        rdapRegistrar: e.rdapRegistrar ?? null,
        rdapRegisteredDate: e.rdapRegisteredDate?.toISOString() ?? null,
      })),
      total: countResult.value,
      limit,
      offset,
    });

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error getting feed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/new-techniques", async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const techniques = await db.select()
      .from(attackTypesTable)
      .where(gte(attackTypesTable.firstSeen, thirtyDaysAgo))
      .orderBy(desc(attackTypesTable.firstSeen));

    const result = GetNewTechniquesResponse.parse(
      techniques.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        firstSeen: t.firstSeen.toISOString(),
        sampleCount: t.sampleCount,
        simulationHtml: t.simulationHtml,
      }))
    );

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error getting new techniques");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/high-confidence", async (_req, res) => {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const entries = await db.select()
      .from(phishEntriesTable)
      .where(
        and(
          gte(phishEntriesTable.vtMaliciousVotes, 5),
          gte(phishEntriesTable.dateDetected, twentyFourHoursAgo)
        )
      )
      .orderBy(desc(phishEntriesTable.dateDetected))
      .limit(50);

    const result = GetHighConfidenceResponse.parse(
      entries.map(e => ({
        id: e.id,
        sanitizedUrl: e.url,
        source: e.source,
        attackType: e.attackType,
        sector: e.sector,
        country: e.country,
        dateDetected: e.dateDetected.toISOString(),
        confidenceScore: e.confidenceScore,
        isActive: e.isActive,
        vtDetectionRatio: e.vtDetectionRatio,
        vtMaliciousVotes: e.vtMaliciousVotes,
        enrichedAt: e.enrichedAt?.toISOString() || null,
        enrichmentSource: e.enrichmentSource,
        domainAge: e.domainAge ?? null,
        rdapRegistrar: e.rdapRegistrar ?? null,
        rdapRegisteredDate: e.rdapRegisteredDate?.toISOString() ?? null,
      }))
    );

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error getting high-confidence entries");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/refresh", async (_req, res) => {
  try {
    runAllCollectors().catch(err => logger.error({ err }, "Background collector run failed"));
    const result = TriggerRefreshResponse.parse({
      success: true,
      message: "Data collection triggered in background",
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error triggering refresh");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/enrich", async (_req, res) => {
  try {
    runEnrichment().catch(err => logger.error({ err }, "Background enrichment run failed"));
    const result = TriggerEnrichResponse.parse({
      success: true,
      message: "Enrichment triggered in background",
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error triggering enrichment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/test-enricher", async (req, res) => {
  try {
    const source = req.query.source as string;

    let testResult: { success: boolean; message: string; responseStatus: number | null };

    if (source === "virustotal") {
      testResult = await virustotal.testConnection();
    } else {
      res.status(400).json({ error: "Invalid source. Use 'virustotal'" });
      return;
    }

    const result = TestEnricherResponse.parse({
      source,
      configured: virustotal.isConfigured(),
      success: testResult.success,
      message: testResult.message,
      responseStatus: testResult.responseStatus,
    });

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error testing enricher");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
