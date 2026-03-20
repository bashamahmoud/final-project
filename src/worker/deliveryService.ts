import { getSubscribersByPipeline } from "../db/query/subscribers.js";
import {
  createDeliveryAttempt,
  updateDeliveryAttempt,
} from "../db/query/delivery.js";

export async function processDeliveries(
  jobId: string,
  pipelineId: string,
  payload: Record<string, unknown>,
) {
  const subscribers = await getSubscribersByPipeline(pipelineId);

  for (const subscriber of subscribers) {
    const attempt = await createDeliveryAttempt({
      jobId,
      subscriberId: subscriber.id,
      attemptNumber: 1,
      status: "pending",
    });

    if (!attempt) continue;

    try {
      const response = await fetch(subscriber.targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();

      if (response.ok) {
        await updateDeliveryAttempt(attempt.id, {
          status: "succeeded",
          responseStatusCode: response.status,
          responseBody,
        });
      } else {
        const nextRetryAt = new Date(Date.now() + 5 * 60 * 1000);
        await updateDeliveryAttempt(attempt.id, {
          status: "failed",
          responseStatusCode: response.status,
          responseBody,
          nextRetryAt,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown network error";
      const nextRetryAt = new Date(Date.now() + 5 * 60 * 1000);
      await updateDeliveryAttempt(attempt.id, {
        status: "failed",
        errorMessage,
        nextRetryAt,
      });
    }
  }
}
