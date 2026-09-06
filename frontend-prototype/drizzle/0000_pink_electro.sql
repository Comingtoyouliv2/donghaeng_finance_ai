CREATE TABLE `interviews` (
	`id` text PRIMARY KEY NOT NULL,
	`answers` text DEFAULT '[]' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`updated_at` text,
	`note` text DEFAULT '' NOT NULL,
	`checklist` text DEFAULT '[]' NOT NULL
);
