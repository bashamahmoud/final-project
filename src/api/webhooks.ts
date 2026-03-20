import { Router, Request, Response } from "express";
import { getPipelineByPathToken } from "../db/query/pipelines.js";
import { enqueueJob } from "../db/query/jobs.js";

export const webhooksRouter = Router();

webhooksRouter.post(
  "/:token",
  async (req: Request<{ token: string }>, res: Response) => {
    try {
      const { token } = req.params;

      const pipeline = await getPipelineByPathToken(token);
      if (!pipeline) {
        res.status(404).json({ error: "Pipeline not found or invalid token." });
        return;
      }

      await enqueueJob({
        pipelineId: pipeline.id,
        payload: req.body,
        status: "queued",
      });

      res
        .status(202)
        .json({ message: "Webhook accepted and queued for processing." });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Failed to process incoming webhook." });
    }
  },
);
