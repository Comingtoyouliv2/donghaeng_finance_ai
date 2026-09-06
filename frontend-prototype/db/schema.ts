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
  disposition: text("disposition").notNull().default("PENDING"),
  reviewRevision: integer("review_revision").notNull().default(0),
  reviewUpdatedAt: text("review_updated_at"),
  planChoice: text("plan_choice"),
  executionRecords: text("execution_records").notNull().default("[]"),
  institutionId: text("institution_id"),
  preparationDocuments: text("preparation_documents").notNull().default("[]"),
  preparationOwner: text("preparation_owner").notNull().default("사장님 + 담당 상담사"),
  reviewPeriod: text("review_period").notNull().default("2주 후 점검"),
  preparationReviewed: integer("preparation_reviewed", { mode: "boolean" }).notNull().default(false),
  workspaceRevision: integer("workspace_revision").notNull().default(0),
  workspaceUpdatedAt: text("workspace_updated_at"),
});
