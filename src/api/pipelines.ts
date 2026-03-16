import { Router, Request, Response } from "express";

export const pipelinesRouter = Router();

pipelinesRouter.post("/", async (req: Request, res: Response) => {
  try {
    
  } catch (error) {
    
  }
});

pipelinesRouter.get("/", async (req: Request, res: Response) => {
  res.status(200).json({ message: "Get all pipelines - Not implemented" });
});

pipelinesRouter.get("/:id", async (req: Request, res: Response) => {
  res.status(200).json({ message: `Get pipeline ${req.params.id} - Not implemented` });
});

pipelinesRouter.put("/:id", async (req: Request, res: Response) => {
  res.status(200).json({ message: `Update pipeline ${req.params.id} - Not implemented` });
});

pipelinesRouter.delete("/:id", async (req: Request, res: Response) => {
  res.status(200).json({ message: `Delete pipeline ${req.params.id} - Not implemented` });
});
