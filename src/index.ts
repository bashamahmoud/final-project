import express from "express";
import { healthHandler } from "./api/health.js";

const app = express();
const port = process.env.PORT ?? 8080;

app.get("/api/health", healthHandler);

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Server is running at http://localhost:${port}`);
});

