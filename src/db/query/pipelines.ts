import { db } from "../index.js";
import { NewPipeline, pipelines } from "../schema.js";
import { eq } from "drizzle-orm";

export async function createPipeline(data: NewPipeline) {
  const result = await db.insert(pipelines).values(data).returning();
  return result[0] || null;
}

export async function getAllPipelines() {
  const results = await db.select().from(pipelines);
  return results;
}

export async function getPipelineById(id: string) {
  const result = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getPipelineByPathToken(token: string) {
  const result = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.pathToken, token))
    .limit(1);
  return result[0] || null;
}

export async function updatePipeline(id: string, data: Partial<NewPipeline>) {
  const result = await db
    .update(pipelines)
    .set(data)
    .where(eq(pipelines.id, id))
    .returning();
  return result[0] || null;
}

export async function deletePipeline(id: string) {
  await db.delete(pipelines).where(eq(pipelines.id, id));
}
