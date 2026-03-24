import { db } from "../index.js";
import { pipelineSubscribers, NewPipelineSubscriber } from "../schema.js";
import { eq } from "drizzle-orm";

// Fetches all the destination URLs waiting to receive messages from this pipeline
export async function getSubscribersByPipeline(pipelineId: string) {
  const results = await db
    .select()
    .from(pipelineSubscribers)
    .where(eq(pipelineSubscribers.pipelineId, pipelineId));
  return results;
}

// Adds a new destination URL with specific category filters
export async function createSubscriber(data: NewPipelineSubscriber) {
  const result = await db.insert(pipelineSubscribers).values(data).returning();
  return result[0] || null;
}

// Removes a destination URL so it stops receiving webhooks
export async function deleteSubscriber(id: string) {
  const result = await db
    .delete(pipelineSubscribers)
    .where(eq(pipelineSubscribers.id, id))
    .returning();
  return result[0] || null;
}

// Fetches a single subscriber by its ID — used by the retry worker to re-send failed deliveries
export async function getSubscriberById(id: string) {
  const result = await db
    .select()
    .from(pipelineSubscribers)
    .where(eq(pipelineSubscribers.id, id))
    .limit(1);
  return result[0] || null;
}
