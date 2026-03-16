import express from "express";
import { healthHandler } from "./api/health.js";
import { errorHandler, middlewareLogResponses } from "./api/middleware.js";
import { pipelinesRouter } from "./api/pipelines.js";

const app = express();
const port = process.env.PORT ?? 8080;
app.use(middlewareLogResponses);
app.use("/app", express.static("./src/app"));
app.get("/api/health", async (req, res, next) => {
  try {
    await healthHandler(req, res);
  } catch (err) {
    next(err);
  }
});
app.use("/api/pipelines", pipelinesRouter);
app.use(errorHandler);
app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Server is running at http://localhost:${port}`);
});
