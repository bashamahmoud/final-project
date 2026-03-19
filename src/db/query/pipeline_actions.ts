import { db } from "../index.js";
import { pipelineActions } from "../schema.js";
import { eq, asc } from "drizzle-orm";

export async function getActionsForPipeline(pipelineId: string) {
  const results = await db
    .select()
    .from(pipelineActions)
    .where(eq(pipelineActions.pipelineId, pipelineId))
    .orderBy(asc(pipelineActions.order));
  return results;
}
