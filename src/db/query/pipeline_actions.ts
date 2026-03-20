import { db } from "../index.js";
import { pipelineActions, NewPipelineAction } from "../schema.js";
import { eq, asc } from "drizzle-orm";

export async function getActionsForPipeline(pipelineId: string) {
  const results = await db
    .select()
    .from(pipelineActions)
    .where(eq(pipelineActions.pipelineId, pipelineId))
    .orderBy(asc(pipelineActions.order));
  return results;
}

export async function createAction(data: NewPipelineAction) {
  const result = await db.insert(pipelineActions).values(data).returning();
  return result[0] || null;
}

export async function deleteAction(id: string) {
  const result = await db
    .delete(pipelineActions)
    .where(eq(pipelineActions.id, id))
    .returning();
  return result[0] || null;
}
