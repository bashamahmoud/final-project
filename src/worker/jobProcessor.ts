import { claimJob, updateJobStatus, saveJobResult } from "../db/query/jobs.js";
import { getActionsForPipeline } from "../db/query/pipeline_actions.js";
import { runActions } from "./actions.js";
import { processDeliveries } from "./deliveryService.js";
export async function processNextJob() {
  const job = await claimJob();

  if (!job) {
    return false;
  }

  console.log(`Processing job ${job.id} for pipeline ${job.pipelineId}...`);

  try {
    const actions = await getActionsForPipeline(job.pipelineId);

    if (actions.length === 0) {
      await updateJobStatus(
        job.id,
        "failed",
        "No actions configured for this pipeline",
      );
      console.log(
        `Job ${job.id} failed: no actions configured for pipeline ${job.pipelineId}.`,
      );
      return true;
    }

    const payload = job.payload as Record<string, unknown>;

    const actionParams = actions.map((a) => ({
      type: a.type,
      config: a.config,
    }));

    const resultPayload = await runActions(actionParams, payload);

    await saveJobResult({
      jobId: job.id,
      resultPayload,
    });

    const isUnclassified = resultPayload.category === "unclassified";
    const unclassifiedDefined = actions.some((a) => a.type === "unclassified");

    if (isUnclassified && !unclassifiedDefined) {
      await updateJobStatus(job.id, "ignored", "Message ignored: unclassified");
      return true;
    }

    const deliveredCount = await processDeliveries(
      job.id,
      job.pipelineId,
      resultPayload,
    );

    if (deliveredCount === 0) {
      await updateJobStatus(
        job.id,
        "failed",
        `No subscriber matched category: ${String(resultPayload.category)}`,
      );
      console.log(
        `Job ${job.id} failed: no matching subscriber for category '${String(resultPayload.category)}'.`,
      );
    } else {
      await updateJobStatus(job.id, "succeeded");
      console.log(`Job ${job.id} succeeded.`);
    }

    return true;
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await updateJobStatus(job.id, "failed", errorMessage);
    return true;
  }
}
