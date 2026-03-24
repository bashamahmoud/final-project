import { db } from "../index.js";
import { NewPipeline, pipelines } from "../schema.js";
import { eq } from "drizzle-orm";

// Creates a new routing pipeline in the database and returns it
export async function createPipeline(data: NewPipeline) {
  const result = await db.insert(pipelines).values(data).returning();
  return result[0] || null;
}

// Fetches a list of all pipelines
export async function getAllPipelines() {
  const results = await db.select().from(pipelines);
  return results;
}

// Fetches a single pipeline by its database UUID
export async function getPipelineById(id: string) {
  const result = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.id, id))
    .limit(1);
  return result[0] || null;
}

// Used by the webhook entrypoint to securely look up a pipeline using its secret URL token
export async function getPipelineByPathToken(token: string) {
  const result = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.pathToken, token))
    .limit(1);
  return result[0] || null;
}

// Updates a pipeline's name, description, or secret
export async function updatePipeline(id: string, data: Partial<NewPipeline>) {
  const result = await db
    .update(pipelines)
    .set(data)
    .where(eq(pipelines.id, id))
    .returning();
  return result[0] || null;
}

// Deletes a pipeline (Note: Due to database cascades, this also deletes all its jobs, actions, and subscribers!)
export async function deletePipeline(id: string) {
  await db.delete(pipelines).where(eq(pipelines.id, id));
}
