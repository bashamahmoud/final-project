ALTER TABLE "delivery_attempts" DROP CONSTRAINT "delivery_attempts_job_id_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "delivery_attempts" DROP CONSTRAINT "delivery_attempts_subscriber_id_pipeline_subscribers_id_fk";
--> statement-breakpoint
ALTER TABLE "job_results" DROP CONSTRAINT "job_results_job_id_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_pipeline_id_pipelines_id_fk";
--> statement-breakpoint
ALTER TABLE "pipeline_actions" DROP CONSTRAINT "pipeline_actions_pipeline_id_pipelines_id_fk";
--> statement-breakpoint
ALTER TABLE "pipeline_subscribers" DROP CONSTRAINT "pipeline_subscribers_pipeline_id_pipelines_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_subscriber_id_pipeline_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."pipeline_subscribers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_results" ADD CONSTRAINT "job_results_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jobs" ADD CONSTRAINT "jobs_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_actions" ADD CONSTRAINT "pipeline_actions_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_subscribers" ADD CONSTRAINT "pipeline_subscribers_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
