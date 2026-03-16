import { db } from "../index.js";
import { NewPipeline } from "../schema.js";
import { and, eq, sql } from "drizzle-orm";
export async function createPipeline(data: NewPipeline) {
  
}

export async function getAllPipelines() {
  // TODO: implement Drizzle select from `pipelines` table
  throw new Error("Not implemented");
}


export async function getPipelineById(id: string) {
  // TODO: implement Drizzle select from `pipelines` table where id = ?
  throw new Error("Not implemented");
}

export async function getPipelineByPathToken(token: string) {
  // TODO: implement Drizzle select from `pipelines` table where path_token = ?
  throw new Error("Not implemented");
}


export async function updatePipeline(id: string, data: any) {
  // TODO: implement Drizzle update on `pipelines` table
  throw new Error("Not implemented");
}


export async function deletePipeline(id: string) {
  // TODO: implement Drizzle delete on `pipelines` table
  throw new Error("Not implemented");
}
