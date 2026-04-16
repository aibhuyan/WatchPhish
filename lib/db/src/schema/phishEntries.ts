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
});

export const insertPhishEntrySchema = createInsertSchema(phishEntriesTable).omit({ id: true });
export type InsertPhishEntry = z.infer<typeof insertPhishEntrySchema>;
export type PhishEntry = typeof phishEntriesTable.$inferSelect;
