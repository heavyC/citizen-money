DROP INDEX "budgets_user_category_idx";--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "category_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "category_corrections" ALTER COLUMN "category_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "category_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_user_category_idx" ON "budgets" USING btree ("user_id","category_id");--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "category_corrections" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "category";