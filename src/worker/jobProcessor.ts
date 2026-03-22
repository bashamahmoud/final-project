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
      throw new Error(
        "No formatting actions attached to this pipeline. Add them via API!",
      );
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

    await processDeliveries(job.id, job.pipelineId, resultPayload);
    await updateJobStatus(job.id, "succeeded");
    console.log(`Job ${job.id} succeeded.`);

    return true;
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await updateJobStatus(job.id, "failed", errorMessage);
    return true;
  }
}
