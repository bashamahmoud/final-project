import { Router, Request, Response } from "express";
import {
  createSubscriber,
  getSubscribersByPipeline,
  deleteSubscriber,
} from "../db/query/subscribers.js";

export const subscribersRouter = Router();

subscribersRouter.get(
  "/pipeline/:pipelineId",
  async (req: Request<{ pipelineId: string }>, res: Response) => {
    try {
      const subscribers = await getSubscribersByPipeline(req.params.pipelineId);
      res.status(200).json(subscribers);
    } catch (error) {
      console.error("Error fetching pipeline subscribers:", error);
      res.status(500).json({ error: "Failed to fetch pipeline subscribers" });
    }
  },
);

subscribersRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { pipelineId, targetUrl, filters } = req.body;

    if (!pipelineId || !targetUrl || !filters) {
      res.status(400).json({
        error: "Missing required fields: pipelineId, targetUrl, filters",
      });
      return;
    }

    const newSubscriber = await createSubscriber({
      pipelineId,
      targetUrl,
      filters,
    });

    res.status(201).json(newSubscriber);
  } catch (error) {
    console.error("Error creating subscriber:", error);
    res.status(500).json({ error: "Failed to create pipeline subscriber" });
  }
});

subscribersRouter.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      await deleteSubscriber(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      res.status(500).json({ error: "Failed to delete pipeline subscriber" });
    }
  },
);
