import { pgTable, serial, text, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const phishEntriesTable = pgTable("phish_entries", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  source: text("source").notNull(),
  attackType: text("attack_type").notNull(),
  sector: text("sector"),
  country: text("country"),
  dateDetected: timestamp("date_detected").notNull().defaultNow(),
  confidenceScore: real("confidence_score").notNull().default(0.5),
  isActive: boolean("is_active").notNull().default(true),

  vtMaliciousVotes: integer("vt_malicious_votes"),
  vtHarmlessVotes: integer("vt_harmless_votes"),
  vtDetectionRatio: text("vt_detection_ratio"),
  vtCategories: text("vt_categories"),
  vtCountry: text("vt_country"),
  vtRegistrar: text("vt_registrar"),

  enrichedAt: timestamp("enriched_at"),
  enrichmentSource: text("enrichment_source"),

  domainAge: integer("domain_age"),
  rdapRegistrar: text("rdap_registrar"),
  rdapRegisteredDate: timestamp("rdap_registered_date"),
  rdapExpirationDate: timestamp("rdap_expiration_date"),

  // urlscan.io enrichment
  urlscanUuid: text("urlscan_uuid"),
  urlscanScreenshot: text("urlscan_screenshot"),
  urlscanScore: integer("urlscan_score"),
  urlscanScannedAt: timestamp("urlscan_scanned_at"),

  // IP geolocation / network enrichment
  ipAddress: text("ip_address"),
  geoCountryCode: text("geo_country_code"),
  geoLat: real("geo_lat"),
  geoLon: real("geo_lon"),
  asn: text("asn"),
  asnOrg: text("asn_org"),
  geoEnrichedAt: timestamp("geo_enriched_at"),

  // composite risk score (0-100)
  riskScore: integer("risk_score"),
});

export const insertPhishEntrySchema = createInsertSchema(phishEntriesTable).omit({ id: true });
export type InsertPhishEntry = z.infer<typeof insertPhishEntrySchema>;
export type PhishEntry = typeof phishEntriesTable.$inferSelect;
