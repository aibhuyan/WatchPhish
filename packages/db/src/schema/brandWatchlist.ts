import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const brandWatchlistTable = pgTable("brand_watchlist", {
  id: serial("id").primaryKey(),
  brandName: text("brand_name").notNull().unique(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export type BrandWatchlistEntry = typeof brandWatchlistTable.$inferSelect;
