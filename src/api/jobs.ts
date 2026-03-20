import { Router, Request, Response } from "express";
import {
  getJobsForPipeline,
  getJobById,
  getJobResult,
  getJobDeliveryAttempts,
} from "../db/query/jobs.js";

export const jobsRouter = Router();

jobsRouter.get(
  "/pipeline/:pipelineId",
  async (req: Request<{ pipelineId: string }>, res: Response) => {
    try {
      const jobs = await getJobsForPipeline(req.params.pipelineId);
      res.status(200).json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  },
);

jobsRouter.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const result = await getJobResult(job.id);
    const deliveryAttempts = await getJobDeliveryAttempts(job.id);

    res.status(200).json({
      ...job,
      result: result?.resultPayload || null,
      deliveryAttempts,
    });
  } catch (error) {
    console.error("Error fetching job details:", error);
    res.status(500).json({ error: "Failed to fetch job details" });
  }
});
