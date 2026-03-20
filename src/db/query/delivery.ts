import { db } from "../index.js";
import { deliveryAttempts, NewDeliveryAttempt } from "../schema.js";
import { eq, lte, lt, and } from "drizzle-orm";

export async function createDeliveryAttempt(data: NewDeliveryAttempt) {
  const result = await db.insert(deliveryAttempts).values(data).returning();
  return result[0] || null;
}

export async function updateDeliveryAttempt(
  id: string,
  data: Partial<NewDeliveryAttempt>,
) {
  const result = await db
    .update(deliveryAttempts)
    .set(data)
    .where(eq(deliveryAttempts.id, id))
    .returning();
  return result[0] || null;
}

export async function getPendingRetries() {
  return await db
    .select()
    .from(deliveryAttempts)
    .where(
      and(
        eq(deliveryAttempts.status, "failed"),
        lte(deliveryAttempts.nextRetryAt, new Date()),
        lt(deliveryAttempts.attemptNumber, 3),
      ),
    );
}
