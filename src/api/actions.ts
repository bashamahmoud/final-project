import { Router, Request, Response, NextFunction } from "express";
import {
  createAction,
  getActionsForPipeline,
  deleteAction,
} from "../db/query/pipeline_actions.js";
import { BadRequestError, InternalServerError } from "./errors.js";

export const actionsRouter = Router();

actionsRouter.get(
  "/pipeline/:pipelineId",
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
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pipelineId, order, type, config } = req.body;

      if (!pipelineId || order === undefined || !type) {
        throw new BadRequestError(
          "Missing required fields: pipelineId, order, type",
        );
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
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await deleteAction(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting action:", error);
      next(new InternalServerError("Failed to delete pipeline action"));
    }
  },
);
