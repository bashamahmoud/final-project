import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import {
  createPipeline,
  getAllPipelines,
  getPipelineById,
  updatePipeline,
  deletePipeline,
} from "../db/query/pipelines.js";
import { NotFoundError, InternalServerError } from "./errors.js";

export const pipelinesRouter = Router();

/**
 * Create a new pipeline
 * ---------------------
 * Example Call: POST /api/pipelines
 * Body Example: { "name": "Support Router", "description": "Handles support tickets", "sourceSecret": "optional123" }
 */
pipelinesRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
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
      next(new InternalServerError("Failed to create pipeline"));
    }
  },
);

/**
 * List all pipelines
 * ---------------------
 * Example Call: GET /api/pipelines
 */
pipelinesRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pipelines = await getAllPipelines();
      res.status(200).json(pipelines);
    } catch (error) {
      console.error("Error fetching pipelines:", error);
      next(new InternalServerError("Failed to fetch pipelines"));
    }
  },
);

/**
 * Get a specific pipeline by its ID
 * ---------------------
 * Example Call: GET /api/pipelines/{id}
 */
pipelinesRouter.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const pipeline = await getPipelineById(req.params.id);
      if (!pipeline) {
        throw new NotFoundError("Pipeline not found");
      }
      res.status(200).json(pipeline);
    } catch (error) {
      console.error("Error fetching pipeline:", error);
      if (error instanceof NotFoundError) {
        return next(error);
      }
      next(new InternalServerError("Failed to fetch pipeline"));
    }
  },
);

/**
 * Update an existing pipeline
 * ---------------------
 * Example Call: PUT /api/pipelines/{id}
 * Body Example: { "name": "New Name", "description": "Updated description" }
 */
pipelinesRouter.put(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
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
        throw new NotFoundError("Pipeline not found");
      }
      res.status(200).json(updatedPipeline);
    } catch (error) {
      console.error("Error updating pipeline:", error);
      if (error instanceof NotFoundError) {
        return next(error);
      }
      next(new InternalServerError("Failed to update pipeline"));
    }
  },
);

/**
 * Delete a pipeline (Warning: this cascades and deletes all its actions, subscribers, and jobs!)
 * ---------------------
 * Example Call: DELETE /api/pipelines/{id}
 */
pipelinesRouter.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await deletePipeline(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pipeline:", error);
      next(new InternalServerError("Failed to delete pipeline"));
    }
  },
);
