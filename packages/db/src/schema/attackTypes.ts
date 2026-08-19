import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attackTypesTable = pgTable("attack_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  firstSeen: timestamp("first_seen").notNull(),
  sampleCount: integer("sample_count").notNull().default(0),
  simulationHtml: text("simulation_html"),
});

export const insertAttackTypeSchema = createInsertSchema(attackTypesTable).omit({ id: true });
export type InsertAttackType = z.infer<typeof insertAttackTypeSchema>;
export type AttackType = typeof attackTypesTable.$inferSelect;
