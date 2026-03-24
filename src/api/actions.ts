import { Router, Request, Response, NextFunction } from "express";
import {
  createAction,
  getActionsForPipeline,
  deleteAction,
} from "../db/query/pipeline_actions.js";
import { BadRequestError, InternalServerError } from "./errors.js";

export const actionsRouter = Router();

actionsRouter.get(
  "/:pipelineId/actions",
  async (
    req: Request<{ pipelineId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const actions = await getActionsForPipeline(req.params.pipelineId);
      res.status(200).json(actions);
    } catch (error) {
      console.error("Error fetching pipeline actions:", error);
      next(new InternalServerError("Failed to fetch pipeline actions"));
    }
  },
);

actionsRouter.post(
  "/:pipelineId/actions",
  async (
    req: Request<{ pipelineId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { pipelineId } = req.params;
      const { order, type, config } = req.body;

      if (order === undefined || !type) {
        throw new BadRequestError("Missing required fields: order, type");
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
      if (error instanceof BadRequestError) {
        return next(error);
      }
      next(new InternalServerError("Failed to create pipeline action"));
    }
  },
);

actionsRouter.delete(
  "/:pipelineId/actions/:id",
  async (
    req: Request<{ pipelineId: string; id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      await deleteAction(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting action:", error);
      next(new InternalServerError("Failed to delete pipeline action"));
    }
  },
);
