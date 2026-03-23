import { Router, Request, Response, NextFunction } from "express";
import { getPipelineByPathToken } from "../db/query/pipelines.js";
import { enqueueJob } from "../db/query/jobs.js";
import {
  NotFoundError,
  ForbiddenError,
  InternalServerError,
} from "./errors.js";

export const webhooksRouter = Router();

// Facebook verification route
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
