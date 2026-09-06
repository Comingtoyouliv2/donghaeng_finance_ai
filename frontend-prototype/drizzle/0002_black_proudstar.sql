ALTER TABLE `interviews` ADD `plan_choice` text;--> statement-breakpoint
ALTER TABLE `interviews` ADD `execution_records` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `institution_id` text;--> statement-breakpoint
ALTER TABLE `interviews` ADD `preparation_documents` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `preparation_owner` text DEFAULT '사장님 + 담당 상담사' NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `review_period` text DEFAULT '2주 후 점검' NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `preparation_reviewed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `workspace_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `workspace_updated_at` text;