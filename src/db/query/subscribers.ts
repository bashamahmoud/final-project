import { db } from "../index.js";
import { pipelineSubscribers } from "../schema.js";
import { eq } from "drizzle-orm";

export async function getSubscribersByPipeline(pipelineId: string) {
  const results = await db
    .select()
    .from(pipelineSubscribers)
    .where(eq(pipelineSubscribers.pipelineId, pipelineId));
  return results;
}
