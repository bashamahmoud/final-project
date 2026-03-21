import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  pathToken: varchar("path_token", { length: 255 }).notNull().unique(),
  sourceSecret: varchar("source_secret", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type NewPipeline = typeof pipelines.$inferInsert;

export const pipelineActions = pgTable("pipeline_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineId: uuid("pipeline_id")
    .references(() => pipelines.id)
    .notNull(),
  order: integer("order").notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  config: jsonb("config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type NewPipelineAction = typeof pipelineActions.$inferInsert;
export const pipelineSubscribers = pgTable("pipeline_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineId: uuid("pipeline_id")
    .references(() => pipelines.id)
    .notNull(),
  targetUrl: text("target_url").notNull(),
  filters: jsonb("filters"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type NewPipelineSubscriber = typeof pipelineSubscribers.$inferInsert;
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineId: uuid("pipeline_id")
    .references(() => pipelines.id)
    .notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});
export type NewJob = typeof jobs.$inferInsert;
export const jobResults = pgTable("job_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .references(() => jobs.id)
    .notNull(),
  resultPayload: jsonb("result_payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type NewJobResult = typeof jobResults.$inferInsert;
export const deliveryAttempts = pgTable("delivery_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .references(() => jobs.id)
    .notNull(),
  subscriberId: uuid("subscriber_id")
    .references(() => pipelineSubscribers.id)
    .notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  responseStatusCode: integer("response_status_code"),
  responseBody: text("response_body"),
  errorMessage: text("error_message"),
  nextRetryAt: timestamp("next_retry_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type NewDeliveryAttempt = typeof deliveryAttempts.$inferInsert;
