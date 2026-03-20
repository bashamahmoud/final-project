import { processNextJob } from "./jobProcessor.js";

const WORKER_INTERVAL_MS = 5000;
let isWorking = false;

export async function startWorker() {
  console.log(`[Worker] Started. Polling every ${WORKER_INTERVAL_MS}ms...`);

  setInterval(async () => {
    if (isWorking) return;

    isWorking = true;
    try {
      let hasJobs = true;
      while (hasJobs) {
        hasJobs = await processNextJob();
      }
    } catch (error) {
      console.error("[Worker] Error during polling loop:", error);
    } finally {
      isWorking = false;
    }
  }, WORKER_INTERVAL_MS);
}
