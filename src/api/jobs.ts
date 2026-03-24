import { Router, Request, Response, NextFunction } from "express";
import {
  getJobsForPipeline,
  getJobById,
  getJobResult,
  getJobDeliveryAttempts,
} from "../db/query/jobs.js";
import { NotFoundError, InternalServerError } from "./errors.js";

export const jobsRouter = Router();

/**
 * List all past processing jobs for a pipeline
 * ---------------------
 * Example Call: GET /api/pipelines/{pipelineId}/jobs
 * Returns: Array of jobs with their status (queued, processing, succeeded, failed, ignored)
 */
jobsRouter.get(
  "/:pipelineId/jobs",
  async (
    req: Request<{ pipelineId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const jobs = await getJobsForPipeline(req.params.pipelineId);
      res.status(200).json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      next(new InternalServerError("Failed to fetch jobs"));
    }
  },
);

/**
 * Get the full details of a specific job
 * ---------------------
 * Example Call: GET /api/pipelines/{pipelineId}/jobs/{id}
 * Returns: The job details, plus its processed payload result, plus all delivery attempts HTTP responses
 */
jobsRouter.get(
  "/:pipelineId/jobs/:id",
  async (
    req: Request<{ pipelineId: string; id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const job = await getJobById(req.params.id);
      if (!job) {
        throw new NotFoundError("Job not found");
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
      if (error instanceof NotFoundError) {
        return next(error);
      }
      next(new InternalServerError("Failed to fetch job details"));
    }
  },
);
