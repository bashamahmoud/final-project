import { Router, Request, Response } from "express";
import crypto from "crypto";
import {
  createPipeline,
  getAllPipelines,
  getPipelineById,
  updatePipeline,
  deletePipeline,
} from "../db/query/pipelines.js";

export const pipelinesRouter = Router();

pipelinesRouter.post("/", async (req: Request, res: Response) => {
  type CreatePipelineBody = {
    name: string;
    description?: string;
    sourceSecret?: string;
  };

  try {
    const { name, description, sourceSecret }: CreatePipelineBody = req.body;

    const pathToken = crypto.randomUUID();

    const newPipeline = await createPipeline({
      name,
      description,
      pathToken,
      sourceSecret,
    });

    res.status(201).json(newPipeline);
  } catch (error) {
    console.error("Error creating pipeline:", error);
    res.status(500).json({ error: "Failed to create pipeline" });
  }
});

pipelinesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const pipelines = await getAllPipelines();
    res.status(200).json(pipelines);
  } catch (error) {
    console.error("Error fetching pipelines:", error);
    res.status(500).json({ error: "Failed to fetch pipelines" });
  }
});

pipelinesRouter.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const pipeline = await getPipelineById(req.params.id);
      if (!pipeline) {
        res.status(404).json({ error: "Pipeline not found" });
        return;
      }
      res.status(200).json(pipeline);
    } catch (error) {
      console.error("Error fetching pipeline:", error);
      res.status(500).json({ error: "Failed to fetch pipeline" });
    }
  },
);

pipelinesRouter.put(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    type UpdatePipelineBody = {
      name?: string;
      description?: string;
      sourceSecret?: string;
    };
    try {
      const { name, description, sourceSecret }: UpdatePipelineBody = req.body;
      const updatedPipeline = await updatePipeline(req.params.id, {
        name,
        description,
        sourceSecret,
      });
      if (!updatedPipeline) {
        res.status(404).json({ error: "Pipeline not found" });
        return;
      }
      res.status(200).json(updatedPipeline);
    } catch (error) {
      console.error("Error updating pipeline:", error);
      res.status(500).json({ error: "Failed to update pipeline" });
    }
  },
);

pipelinesRouter.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      await deletePipeline(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pipeline:", error);
      res.status(500).json({ error: "Failed to delete pipeline" });
    }
  },
);
