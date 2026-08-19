import { pgTable, serial, text, timestamp, boolean, real } from "drizzle-orm/pg-core";

export const certAlertsTable = pgTable("cert_alerts", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(),
  matchedBrand: text("matched_brand").notNull(),
  matchType: text("match_type").notNull(),
  matchScore: real("match_score"),
  certIssuer: text("cert_issuer"),
  certIssuedAt: timestamp("cert_issued_at"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  dismissed: boolean("dismissed").notNull().default(false),
});

export type CertAlert = typeof certAlertsTable.$inferSelect;
