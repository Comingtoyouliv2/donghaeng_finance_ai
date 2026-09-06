ALTER TABLE `interviews` ADD `disposition` text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `review_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `review_updated_at` text;