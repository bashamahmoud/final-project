import { db } from "../index.js";
import { pipelineActions, NewPipelineAction } from "../schema.js";
import { eq, asc } from "drizzle-orm";

// Fetches all processing rules for a pipeline, strictly sorted by their order number
export async function getActionsForPipeline(pipelineId: string) {
  const results = await db
    .select()
    .from(pipelineActions)
    .where(eq(pipelineActions.pipelineId, pipelineId))
    .orderBy(asc(pipelineActions.order));
  return results;
}

// Adds a new processing rule (like checking for 'support' keywords) to a pipeline
export async function createAction(data: NewPipelineAction) {
  const result = await db.insert(pipelineActions).values(data).returning();
  return result[0] || null;
}

// Permanently removes a processing rule
export async function deleteAction(id: string) {
  const result = await db
    .delete(pipelineActions)
    .where(eq(pipelineActions.id, id))
    .returning();
  return result[0] || null;
}
