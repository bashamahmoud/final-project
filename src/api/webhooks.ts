import { Router, Request, Response, NextFunction } from "express";
import { getPipelineByPathToken } from "../db/query/pipelines.js";
import { enqueueJob } from "../db/query/jobs.js";
import {
  NotFoundError,
  ForbiddenError,
  InternalServerError,
} from "./errors.js";

export const webhooksRouter = Router();

/**
 * A required method to verify the connection with the Facebook API.
 * ---------------------
 * Example Call: No need to call, its used by Facebook only for now.
 */
webhooksRouter.get(
  "/:token",
  async (
    req: Request<{ token: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const mode = req.query["hub.mode"];
      const verifyToken = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && verifyToken === process.env.FB_VERIFY_TOKEN) {
        console.log(`[FB-Verify] Webhook verified successfully!`);
        res.status(200).send(challenge);
      } else {
        throw new ForbiddenError("Verification failed. Tokens didn't match.");
      }
    } catch (error) {
      console.error("Error during webhook verification:", error);
      if (error instanceof ForbiddenError) {
        return next(error);
      }
      next(new InternalServerError("Verification failed."));
    }
  },
);

/**
 * The main entrypoint! This is where external apps (like Facebook/Discord) POST data to trigger the pipeline.
 * ---------------------
 * Example Call: POST /api/webhooks/{token}
 * Body Example: { "entry": [{ "messaging": [{ "message": { "text": "I need help" } }] }] }
 * Note: It immediately responds with "202 Accepted" and queues the job for the background worker to handle.
 */
webhooksRouter.post(
  "/:token",
  async (
    req: Request<{ token: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { token } = req.params;

      const pipeline = await getPipelineByPathToken(token);
      if (!pipeline) {
        throw new NotFoundError("Pipeline not found or invalid token.");
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
      if (error instanceof NotFoundError) {
        return next(error);
      }
      next(new InternalServerError("Failed to process incoming webhook."));
    }
  },
);
