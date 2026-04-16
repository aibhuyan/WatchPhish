import { Router, type IRouter } from "express";
import { db, brandWatchlistTable, certAlertsTable } from "@workspace/db";
import { desc, eq, sql, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { restartCertStream, runCtScan } from "../lib/certstream";

const router: IRouter = Router();

router.get("/brands", async (_req, res) => {
  try {
    const brands = await db.select().from(brandWatchlistTable).orderBy(desc(brandWatchlistTable.addedAt));
    res.json(brands.map(b => ({
      id: b.id,
      brandName: b.brandName,
      addedAt: b.addedAt.toISOString(),
    })));
  } catch (err) {
    logger.error({ err }, "Error listing brands");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/brands", async (req, res) => {
  try {
    const { brandName } = req.body;
    if (!brandName || typeof brandName !== 'string' || brandName.trim().length === 0) {
      res.status(400).json({ error: "brandName is required" });
      return;
    }

    const name = brandName.trim().toLowerCase();
    if (name.length > 50) {
      res.status(400).json({ error: "Brand name must be 50 characters or less" });
      return;
    }

    const existing = await db.select().from(brandWatchlistTable);
    if (existing.length >= 10) {
      res.status(400).json({ error: "Maximum of 10 brands allowed" });
      return;
    }

    const duplicate = existing.find(b => b.brandName === name);
    if (duplicate) {
      res.status(400).json({ error: "Brand already exists in watchlist" });
      return;
    }

    const [inserted] = await db.insert(brandWatchlistTable).values({ brandName: name }).returning();

    restartCertStream().catch(err => logger.error({ err }, "Failed to restart CertStream after adding brand"));
    runCtScan().catch(err => logger.error({ err }, "CT scan after adding brand failed"));

    res.json({
      id: inserted.id,
      brandName: inserted.brandName,
      addedAt: inserted.addedAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Error adding brand");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/brands/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid brand ID" });
      return;
    }

    const deleted = await db.delete(brandWatchlistTable).where(eq(brandWatchlistTable.id, id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Brand not found" });
      return;
    }

    restartCertStream().catch(err => logger.error({ err }, "Failed to restart CertStream after removing brand"));

    res.json({ success: true, message: "Brand removed" });
  } catch (err) {
    logger.error({ err }, "Error removing brand");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cert-alerts", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const showDismissed = req.query.dismissed === 'true';

    const conditions = showDismissed ? undefined : eq(certAlertsTable.dismissed, false);

    const alerts = await db.select()
      .from(certAlertsTable)
      .where(conditions)
      .orderBy(desc(certAlertsTable.detectedAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db.select({ value: sql<number>`count(*)::int` })
      .from(certAlertsTable)
      .where(conditions);

    const [undismissedResult] = await db.select({ value: sql<number>`count(*)::int` })
      .from(certAlertsTable)
      .where(eq(certAlertsTable.dismissed, false));

    res.json({
      alerts: alerts.map(a => ({
        id: a.id,
        domain: a.domain,
        matchedBrand: a.matchedBrand,
        matchType: a.matchType,
        matchScore: a.matchScore,
        certIssuer: a.certIssuer,
        certIssuedAt: a.certIssuedAt?.toISOString() || null,
        detectedAt: a.detectedAt.toISOString(),
        dismissed: a.dismissed,
      })),
      total: totalResult.value,
      undismissedCount: undismissedResult.value,
    });
  } catch (err) {
    logger.error({ err }, "Error listing cert alerts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cert-alerts/:id/dismiss", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid alert ID" });
      return;
    }

    const updated = await db.update(certAlertsTable)
      .set({ dismissed: true })
      .where(eq(certAlertsTable.id, id))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    res.json({ success: true, message: "Alert dismissed" });
  } catch (err) {
    logger.error({ err }, "Error dismissing alert");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cert-alerts/count", async (_req, res) => {
  try {
    const [result] = await db.select({ value: sql<number>`count(*)::int` })
      .from(certAlertsTable)
      .where(eq(certAlertsTable.dismissed, false));
    res.json({ count: result.value });
  } catch (err) {
    logger.error({ err }, "Error getting alert count");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ct-scan", async (_req, res) => {
  try {
    runCtScan().catch(err => logger.error({ err }, "Manual CT scan failed"));
    res.json({ success: true, message: "CT scan triggered in background" });
  } catch (err) {
    logger.error({ err }, "Error triggering CT scan");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
