import { db } from "../index.js";
import { jobs, NewJob } from "../schema.js";
import { eq, asc, desc } from "drizzle-orm";
import { jobResults, NewJobResult, deliveryAttempts } from "../schema.js";

// Instantly saves raw incoming webhook data to the database so we don't block the Facebook API response
export async function enqueueJob(data: NewJob) {
  const result = await db.insert(jobs).values(data).returning();
  return result[0] || null;
}

// The background worker uses this to locate the oldest queued job and "lock" it by marking it as processing
export async function claimJob() {
  const result = await db
    .update(jobs)
    .set({ status: "processing", updatedAt: new Date() })
    .where(
      eq(
        jobs.id,
        db
          .select({ id: jobs.id })
          .from(jobs)
          .where(eq(jobs.status, "queued"))
          .orderBy(asc(jobs.createdAt))
          .limit(1),
      ),
    )
    .returning();
  return result[0] || null;
}

// Updates the job status to reflect whether it succeeded, failed, or was ignored
export async function updateJobStatus(
  id: string,
  status: string,
  errorMessage?: string,
) {
  const result = await db
    .update(jobs)
    .set({
      status,
      errorMessage: errorMessage ?? null,
      processedAt:
        status === "succeeded" || status === "failed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, id))
    .returning();
  return result[0] || null;
}

// Saves the final parsed category and data (like partySize or sentiment) after the worker runs the actions
export async function saveJobResult(data: NewJobResult) {
  const result = await db.insert(jobResults).values(data).returning();
  return result[0] || null;
}

// Fetches the most recent 50 jobs for a pipeline (used by the dashboard/API)
export async function getJobsForPipeline(pipelineId: string, limit = 50) {
  return await db
    .select()
    .from(jobs)
    .where(eq(jobs.pipelineId, pipelineId))
    .orderBy(desc(jobs.createdAt))
    .limit(limit);
}

// Fetches a single specific job
export async function getJobById(jobId: string) {
  const result = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  return result[0] || null;
}

// Fetches the parsed result data for a specific job
export async function getJobResult(jobId: string) {
  const result = await db
    .select()
    .from(jobResults)
    .where(eq(jobResults.jobId, jobId))
    .limit(1);
  return result[0] || null;
}

// Fetches every HTTP attempt made to send this job to a subscriber
export async function getJobDeliveryAttempts(jobId: string) {
  return await db
    .select()
    .from(deliveryAttempts)
    .where(eq(deliveryAttempts.jobId, jobId))
    .orderBy(asc(deliveryAttempts.attemptNumber));
}
