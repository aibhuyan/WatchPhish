import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const statsTable = pgTable("stats", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  totalNew: integer("total_new").notNull().default(0),
  topAttackType: text("top_attack_type"),
  topSector: text("top_sector"),
  topCountry: text("top_country"),
});

export const insertStatsSchema = createInsertSchema(statsTable).omit({ id: true });
export type InsertStats = z.infer<typeof insertStatsSchema>;
export type Stats = typeof statsTable.$inferSelect;
