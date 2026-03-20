import { db } from "../index.js";
import { pipelineSubscribers, NewPipelineSubscriber } from "../schema.js";
import { eq } from "drizzle-orm";

export async function getSubscribersByPipeline(pipelineId: string) {
  const results = await db
    .select()
    .from(pipelineSubscribers)
    .where(eq(pipelineSubscribers.pipelineId, pipelineId));
  return results;
}

export async function createSubscriber(data: NewPipelineSubscriber) {
  const result = await db.insert(pipelineSubscribers).values(data).returning();
  return result[0] || null;
}

export async function deleteSubscriber(id: string) {
  const result = await db
    .delete(pipelineSubscribers)
    .where(eq(pipelineSubscribers.id, id))
    .returning();
  return result[0] || null;
}
