import { Router, Request, Response } from "express";
import {
  createAction,
  getActionsForPipeline,
  deleteAction,
} from "../db/query/pipeline_actions.js";

export const actionsRouter = Router();

actionsRouter.get(
  "/pipeline/:pipelineId",
  async (req: Request<{ pipelineId: string }>, res: Response) => {
    try {
      const actions = await getActionsForPipeline(req.params.pipelineId);
      res.status(200).json(actions);
    } catch (error) {
      console.error("Error fetching pipeline actions:", error);
      res.status(500).json({ error: "Failed to fetch pipeline actions" });
    }
  },
);

actionsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { pipelineId, order, type, config } = req.body;

    if (!pipelineId || order === undefined || !type) {
      res
        .status(400)
        .json({ error: "Missing required fields: pipelineId, order, type" });
      return;
    }

    const newAction = await createAction({
      pipelineId,
      order,
      type,
      config: config || {},
    });

    res.status(201).json(newAction);
  } catch (error) {
    console.error("Error creating action:", error);
    res.status(500).json({ error: "Failed to create pipeline action" });
  }
});

actionsRouter.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      await deleteAction(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting action:", error);
      res.status(500).json({ error: "Failed to delete pipeline action" });
    }
  },
);
