import { db } from "../index.js";
import { jobs, NewJob } from "../schema.js";
import { eq, asc } from "drizzle-orm";

export async function enqueueJob(data: NewJob) {
  const result = await db.insert(jobs).values(data).returning();
  return result[0] || null;
}

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
