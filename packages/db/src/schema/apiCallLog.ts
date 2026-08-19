import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const apiCallLogTable = pgTable("api_call_log", {
  id: serial("id").primaryKey(),
  apiName: text("api_name").notNull(),
  calledAt: timestamp("called_at").notNull().defaultNow(),
  success: boolean("success").notNull().default(true),
  responseStatus: integer("response_status"),
});
