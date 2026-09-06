// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const interviews = sqliteTable("interviews", {
  id: text("id").primaryKey(),
  answers: text("answers").notNull().default("[]"),
  revision: integer("revision").notNull().default(0),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at"),
  note: text("note").notNull().default(""),
  checklist: text("checklist").notNull().default("[]"),
});
