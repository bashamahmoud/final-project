import { Router, Request, Response } from "express";
import { getPipelineByPathToken } from "../db/query/pipelines.js";
import { enqueueJob } from "../db/query/jobs.js";

export const webhooksRouter = Router();

// Facebook verification route
webhooksRouter.get(
  "/:token",
  async (req: Request<{ token: string }>, res: Response) => {
    try {
      const mode = req.query["hub.mode"];
      const verifyToken = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];


      if (mode === "subscribe" && verifyToken === process.env.FB_VERIFY_TOKEN) {
        console.log(`[FB-Verify] Webhook verified successfully!`);
        res.status(200).send(challenge);
      } else {
        console.error(
          "[FB-Verify] Verification failed. Tokens didn't match.",
        );
        res.sendStatus(403);
      }
    } catch (error) {
      console.error("Error during webhook verification:", error);
      res.status(500).send("Verification failed.");
    }
  },
);

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
