import type { Request, Response, NextFunction } from "express";

import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  InternalServerError,
} from "./errors.js";

export function middlewareLogResponses(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.on("finish", () => {
    const statusCode = res.statusCode;
    if (statusCode >= 300) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
    }
  });
  next();
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof BadRequestError) {
    return res.status(400).json({ error: err.message });
  } else if (err instanceof UnauthorizedError) {
    return res.status(401).json({ error: err.message });
  } else if (err instanceof ForbiddenError) {
    return res.status(403).json({ error: err.message });
  } else if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  } else if (err instanceof InternalServerError) {
    return res.status(500).json({ error: err.message });
  }

  return _next(err);
}
