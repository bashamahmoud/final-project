import {
  getSubscribersByPipeline,
  getSubscriberById,
} from "../db/query/subscribers.js";
import {
  createDeliveryAttempt,
  updateDeliveryAttempt,
  getPendingRetries,
} from "../db/query/delivery.js";
import { getJobResult } from "../db/query/jobs.js";

// Shared helper: fires a single HTTP POST and logs the result on the attempt row
async function sendToUrl(
  attemptId: string,
  targetUrl: string,
  payload: unknown,
  nextAttemptNum: number,
) {
  const nextRetryAt =
    nextAttemptNum < 3 ? new Date(Date.now() + 5 * 60 * 1000) : null;
  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const responseBody = await response.text();
    await updateDeliveryAttempt(attemptId, {
      status: response.ok ? "succeeded" : "failed",
      responseStatusCode: response.status,
      responseBody,
      attemptNumber: nextAttemptNum,
      nextRetryAt: response.ok ? null : nextRetryAt,
    });
  } catch (error) {
    await updateDeliveryAttempt(attemptId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      attemptNumber: nextAttemptNum,
      nextRetryAt,
    });
  }
}

// Checks all subscribers for a pipeline, filters by category, and fires the initial delivery
export async function processDeliveries(
  jobId: string,
  pipelineId: string,
  payload: Record<string, unknown>,
): Promise<number> {
  const subscribers = await getSubscribersByPipeline(pipelineId);
  let deliveredCount = 0;

  for (const subscriber of subscribers) {
    // Skip subscribers whose filters don't match the payload
    if (subscriber.filters && typeof subscriber.filters === "object") {
      const filters = subscriber.filters as Record<string, unknown>;
      const payloadMap = new Map(Object.entries(payload));

      const matches = Object.entries(filters).every(([k, v]) => {
        return payloadMap.get(k) === v;
      });
      if (!matches) continue;
    }

    deliveredCount++;
    const attempt = await createDeliveryAttempt({
      jobId,
      subscriberId: subscriber.id,
      attemptNumber: 1,
      status: "pending",
    });
    if (attempt) await sendToUrl(attempt.id, subscriber.targetUrl, payload, 1);
  }

  return deliveredCount;
}

// Runs each worker tick — re-fires any failed delivery attempts that are now due
export async function retryFailedDeliveries() {
  const retries = await getPendingRetries();

  for (const attempt of retries) {
    const [subscriber, jobResult] = await Promise.all([
      getSubscriberById(attempt.subscriberId),
      getJobResult(attempt.jobId),
    ]);

    if (!subscriber || !jobResult) {
      await updateDeliveryAttempt(attempt.id, {
        status: "failed",
        errorMessage: "Subscriber or job result no longer exists",
        nextRetryAt: null,
      });
      continue;
    }

    await sendToUrl(
      attempt.id,
      subscriber.targetUrl,
      jobResult.resultPayload,
      attempt.attemptNumber + 1,
    );
  }
}
