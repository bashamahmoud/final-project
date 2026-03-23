import { Router, Request, Response, NextFunction } from "express";
import {
  createSubscriber,
  getSubscribersByPipeline,
  deleteSubscriber,
} from "../db/query/subscribers.js";
import { BadRequestError, InternalServerError } from "./errors.js";

export const subscribersRouter = Router();

subscribersRouter.get(
  "/pipeline/:pipelineId",
  async (
    req: Request<{ pipelineId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const subscribers = await getSubscribersByPipeline(req.params.pipelineId);
      res.status(200).json(subscribers);
    } catch (error) {
      console.error("Error fetching pipeline subscribers:", error);
      next(new InternalServerError("Failed to fetch pipeline subscribers"));
    }
  },
);

subscribersRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pipelineId, targetUrl, filters } = req.body;

      if (!pipelineId || !targetUrl || !filters) {
        throw new BadRequestError(
          "Missing required fields: pipelineId, targetUrl, filters",
        );
      }

      const newSubscriber = await createSubscriber({
        pipelineId,
        targetUrl,
        filters,
      });

      res.status(201).json(newSubscriber);
    } catch (error) {
      console.error("Error creating subscriber:", error);
      if (error instanceof BadRequestError) {
        return next(error);
      }
      next(new InternalServerError("Failed to create pipeline subscriber"));
    }
  },
);

subscribersRouter.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await deleteSubscriber(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      next(new InternalServerError("Failed to delete pipeline subscriber"));
    }
  },
);
