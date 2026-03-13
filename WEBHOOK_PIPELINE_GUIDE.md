## 1. Overview & Navigation

- **1.1**: [High-Level Summary](#11-high-level-summary)
- **1.2**: [What Is Zapier (Analogy)](#12-what-is-zapier-analogy)
- **1.3**: [Big-Picture Architecture](#13-big-picture-architecture)

- **2.1**: [Core Components](#21-core-components)
- **2.2**: [Docker Compose Layout](#22-docker-compose-layout)

- **3.1**: [Database Tables](#31-database-tables)
- **3.2**: [Relationships & Purpose](#32-relationships--purpose)

- **4.1**: [Separation of Concerns](#41-separation-of-concerns)
- **4.2**: [Suggested Folder Structure](#42-suggested-folder-structure)

- **5.1**: [Processing Action Types](#51-processing-action-types)
- **5.2**: [Action Processor Design](#52-action-processor-design)

- **6.1**: [Job Lifecycle](#61-job-lifecycle)
- **6.2**: [Retry Logic](#62-retry-logic)

- **7.1**: [Git & GitHub Initial Setup](#71-git--github-initial-setup)
- **7.2**: [Branching Strategy](#72-branching-strategy)
- **7.3**: [Feature Size & Parallel Work](#73-feature-size--parallel-work)

- **8.1**: [Development Roadmap Overview](#81-development-roadmap-overview)
- **8.2**: [Phase 1 — Foundations](#82-phase-1--foundations-day-12)
- **8.3**: [Phase 2 — DB & Models](#83-phase-2--database--core-models-day-23)
- **8.4**: [Phase 3 — Pipeline CRUD API](#84-phase-3--pipeline-crud-api-day-34)
- **8.5**: [Phase 4 — Webhook Ingestion](#85-phase-4--webhook-ingestion--queuing-day-45)
- **8.6**: [Phase 5 — Worker & Processing](#86-phase-5--worker--basic-processing-day-56)
- **8.7**: [Phase 6 — Delivery, Retries, Status API](#87-phase-6--delivery--retries--job-status-api-day-67)
- **8.8**: [Phase 7 — Docker & CI/CD](#88-phase-7--docker--cicd-day-78)
- **8.9**: [Phase 8 — Polish & Stretch](#89-phase-8--polish--stretch-ideas-remaining-time)

- **9.1**: [Zapier vs Your Project](#91-zapier-vs-your-project-mental-model)

- **10.1**: [GitHub Actions Concepts](#101-github-actions-conceptually)

- **11.1**: [Working on Multiple Features](#111-working-on-multiple-features-at-once)

---

## 1. Overview & Navigation

### 1.1 High-Level Summary

- **Goal**: Build a mini Zapier-like service:
  - Incoming HTTP webhook → queued job → background worker runs processing actions → sends result to one or more subscriber URLs → expose APIs to inspect job history and delivery attempts.

### 1.2 What Is Zapier (Analogy)

- **Zapier in plain terms**:
  - Zapier lets non-developers connect apps: “When X happens in app A, do Y in app B.”
  - Each “Zap” contains:
    - **Trigger**: inbound event (e.g. new row in Google Sheets).
    - **Actions**: transformations / side effects (e.g. format text; send Slack message).
  - Your **pipeline** in this project is analogous:
    - **Trigger** → pipeline source URL (webhook endpoint).
    - **Actions** → processing actions you implement.
    - **Destinations** → subscriber URLs that receive the processed result.

### 1.3 Big-Picture Architecture

- You will build four main parts:
  - **API service** (TypeScript/Node):
    - CRUD for pipelines.
    - Webhook ingestion endpoint.
    - API to query job status/history.
  - **Worker service** (TypeScript/Node):
    - Reads pending jobs from a queue (stored in the database).
    - Executes processing actions.
    - Delivers results to subscribers with retry logic.
  - **Database** (PostgreSQL):
    - Stores pipelines, jobs, actions, subscribers, and delivery attempts.
  - **Infrastructure**:
    - `docker-compose.yaml` defining `api`, `worker`, and `db` services.
    - GitHub Actions workflow (CI/CD) for linting, tests, and optionally building Docker images.

---

## 2. System Architecture

### 2.1 Core Components

- **API Service (Node/TypeScript)**:
  - Exposes REST API for:
    - Managing pipelines (CRUD).
    - Ingesting webhooks and enqueuing jobs.
    - Querying job status and history.
- **Worker Service (Node/TypeScript)**:
  - Consumes queued jobs from the database.
  - Runs the pipeline’s processing actions.
  - Stores processed results.
  - Delivers results to subscribers with retries.
- **Database (PostgreSQL)**:
  - Central source of truth for:
    - Pipelines, actions, subscribers.
    - Jobs and job results.
    - Delivery attempts and retry scheduling.
- **Infrastructure & DevOps**:
  - Containerization with Docker.
  - Orchestration with Docker Compose.
  - CI/CD with GitHub Actions for:
    - Automated linting.
    - Type checking and testing.
    - Optionally Docker build.

### 2.2 Docker Compose Layout

- In `docker-compose.yaml`, you will likely define:
  - **Service `api`**:
    - Runs the HTTP API and webhook endpoints.
    - Depends on `db`.
  - **Service `worker`**:
    - Runs a background process that polls the database for queued jobs and pending retries.
    - Shares the same codebase or image as `api` (or a separate worker image).
  - **Service `db`**:
    - PostgreSQL instance with mounted volume for persistence.

---

## 3. Database Design

### 3.1 Database Tables

- **`pipelines`**
  - **Columns**:
    - `id` (PK, UUID).
    - `name`.
    - `description`.
    - `source_secret` (optional, for webhook signature verification).
    - `created_at`, `updated_at`.
  - **Purpose**:
    - Defines a pipeline’s core properties.

- **`pipeline_sources`** (optional separate table; can also be merged into `pipelines`)
  - **Columns**:
    - `id` (PK, UUID).
    - `pipeline_id` (FK → `pipelines.id`).
    - `path_token` (unique string to build URLs like `/webhooks/:path_token`).
    - `created_at`.
  - **Purpose**:
    - Provides unique tokens and URLs for webhook sources.

- **`pipeline_actions`**
  - **Columns**:
    - `id` (PK).
    - `pipeline_id` (FK → `pipelines.id`).
    - `order` (integer, defines execution order).
    - `type` (e.g. `UPPERCASE_FIELD`, `EXTRACT_FIELD`, `ADD_TIMESTAMP`, `HTTP_ENRICH`).
    - `config` (JSONB with action-specific configuration).
    - `created_at`.
  - **Purpose**:
    - Defines one or more processing actions for each pipeline.

- **`pipeline_subscribers`**
  - **Columns**:
    - `id` (PK).
    - `pipeline_id` (FK → `pipelines.id`).
    - `target_url`.
    - `created_at`.
  - **Purpose**:
    - Stores subscriber URLs where processed results will be delivered.

- **`jobs`**
  - **Columns**:
    - `id` (PK, UUID).
    - `pipeline_id` (FK → `pipelines.id`).
    - `payload` (JSONB, raw webhook body).
    - `status` (e.g. `queued`, `processing`, `succeeded`, `failed`).
    - `error_message` (nullable; last or main error).
    - `created_at`, `updated_at`, `processed_at` (nullable).
  - **Purpose**:
    - Represents a single unit of work (a queued pipeline execution).

- **`job_results`**
  - **Columns**:
    - `id` (PK).
    - `job_id` (FK → `jobs.id`).
    - `result_payload` (JSONB, processed output).
    - `created_at`.
  - **Purpose**:
    - Stores final processed data separate from raw input.

- **`delivery_attempts`**
  - **Columns**:
    - `id` (PK).
    - `job_id` (FK → `jobs.id`).
    - `subscriber_id` (FK → `pipeline_subscribers.id`).
    - `attempt_number` (integer, starting at 1).
    - `status` (e.g. `pending`, `succeeded`, `failed_permanent`).
    - `response_status_code` (nullable).
    - `response_body` (nullable).
    - `error_message` (nullable).
    - `next_retry_at` (nullable, timestamp for scheduling retries).
    - `created_at`.
  - **Purpose**:
    - Tracks each HTTP POST attempt to subscriber URLs, enabling retry logic and audit history.

### 3.2 Relationships & Purpose

- **One `pipeline`**:
  - Has many `pipeline_actions`.
  - Has many `pipeline_subscribers`.
  - Has many `jobs`.
- **One `job`**:
  - Belongs to one `pipeline`.
  - Has zero or one `job_results` record.
  - Has many `delivery_attempts`.
- **One `subscriber`**:
  - Belongs to one `pipeline`.
  - Has many `delivery_attempts` via jobs.
- This schema supports:
  - Clear separation of raw vs processed data.
  - Audit trail of deliveries and retries.
  - Multiple actions and destinations per pipeline.

---

## 4. Separation of Concerns & Project Structure

### 4.1 Separation of Concerns Principles

- **Routing / HTTP layer**:
  - Receives HTTP requests, validates input, and routes to controllers/handlers.
- **Controllers / handlers**:
  - Translate HTTP requests into application-level commands.
  - Do minimal work: call services, format responses, handle errors.
- **Services (application logic)**:
  - Contain orchestrating logic such as:
    - Creating a job and changing its status.
    - Running a pipeline’s actions to produce a result.
    - Initiating delivery attempts and setting up retries.
- **Repositories (data access)**:
  - Encapsulate database CRUD and queries.
  - Do not contain business rules.
- **Domain models / types**:
  - TypeScript interfaces, types, and enums for:
    - Pipelines, jobs, actions, subscribers.
    - Job status, attempt status, etc.
  - Prefer pure logic here when possible.
- **Infrastructure**:
  - Technical concerns such as:
    - Database connections.
    - HTTP client for calling subscriber URLs.
    - Logging, configuration, environment management.
- **Worker**:
  - Background process that:
    - Pulls jobs from the database queue.
    - Uses the same services and repositories as the API where possible.
    - Handles processing and delivery in a loop.

### 4.2 Suggested Folder Structure

- **`src/`**
  - `api/`
    - `index.ts` — server bootstrap.
    - `routes/`
      - `pipelines.routes.ts`.
      - `webhooks.routes.ts`.
      - `jobs.routes.ts`.
    - `controllers/`
      - `pipelines.controller.ts`.
      - `webhooks.controller.ts`.
      - `jobs.controller.ts`.
  - `worker/`
    - `index.ts` — worker main loop entrypoint.
    - `jobProcessor.ts` — core job processing logic.
  - `domain/`
    - `pipeline.ts`.
    - `job.ts`.
    - `enums.ts` — job status, delivery attempt status, action types.
  - `services/`
    - `pipelineService.ts`.
    - `jobService.ts`.
    - `deliveryService.ts` — HTTP delivery plus retry rules.
    - `actionProcessor.ts` — implements the processing action types.
  - `repositories/`
    - `pipelineRepository.ts`.
    - `jobRepository.ts`.
    - `deliveryRepository.ts`.
  - `infra/`
    - `db.ts` — PostgreSQL client setup.
    - `httpClient.ts` — HTTP client wrapper for outbound requests.
    - `logger.ts` — logging helpers.
    - `config.ts` — environment/configuration loading.
- **`tests/`**
  - Unit and integration tests for:
    - Services.
    - Action processing.
    - Worker behavior.

- Key principles:
  - **Thin controllers, fat services**.
  - Domain rules live in **services/domain**, not in controllers or repositories.
  - **Repositories are “dumb”**: only perform data access.
  - Avoid circular dependencies between modules.

---

## 5. Processing Actions

### 5.1 Processing Action Types (At Least Three)

You must implement at least three processing actions. Examples:

- **`UPPERCASE_FIELD`**:
  - Config: `{ fieldPath: "message" }`.
  - Behavior: looks up `payload.message` and transforms it to uppercase.

- **`EXTRACT_FIELD`**:
  - Config: `{ fieldPath: "data.user.email", outputKey: "userEmail" }`.
  - Behavior: extracts a nested value from the payload and inserts it into the result under `outputKey`.

- **`ADD_TIMESTAMP`**:
  - Config: possibly none, or `{ outputKey: "processed_at" }`.
  - Behavior: adds a timestamp of processing time to the result.

- **`HTTP_ENRICH`** (more advanced, optional but interesting):
  - Config: `{ url: "https://...", method: "GET" or "POST", ... }`.
  - Behavior: calls an external API using some data from the payload and enriches the result with the response.

### 5.2 Action Processor Design

- **Action type enum**:
  - Example: `type ActionType = "UPPERCASE_FIELD" | "EXTRACT_FIELD" | "ADD_TIMESTAMP" | "HTTP_ENRICH";`
- **Action processor**:
  - Input: `inputData` (starting from the raw payload or an intermediate object) and the pipeline’s list of actions.
  - Behavior:
    - Iterate through actions in `order`.
    - For each action type, apply the relevant transformation using its `config`.
    - Return the final `result_payload`.
- **Design goals**:
  - Keep each action’s logic as **pure** as possible.
  - Make actions easy to **unit test**.
  - Allow for new action types to be added without major refactoring (e.g. switch statement or map of handlers).

---

## 6. Job Lifecycle & Retry Logic

### 6.1 Job Lifecycle

- **Ingestion**:
  - Webhook hits `POST /webhooks/:token`.
  - The system:
    - Validates the request and maps `:token` to a `pipeline`.
    - Inserts a new `jobs` row with:
      - `pipeline_id` pointing to the matched pipeline.
      - `payload` set to the raw webhook body.
      - `status = "queued"`.
  - The API responds with **HTTP 202 Accepted** (signals asynchronous processing).

- **Worker Loop** (simplified version):
  - Periodically (every few seconds):
    - Fetch a batch of `jobs` where `status = "queued"`.
    - Use row-level locking (e.g. `FOR UPDATE SKIP LOCKED`) to avoid multiple workers handling the same job.
    - Mark selected jobs as `status = "processing"`.

- **Processing**:
  - For each job:
    - Load its associated pipeline and actions.
    - Call the `actionProcessor` to run the actions and produce `result_payload`.
    - Insert into `job_results` with the processed data.

- **Delivery**:
  - For each subscriber of the pipeline:
    - Create a `delivery_attempts` row with:
      - `attempt_number = 1`.
      - `status` set initially (e.g. `pending` or similar).
    - Send an HTTP POST to the subscriber’s `target_url` with the processed result.
    - On **success**:
      - Update `delivery_attempts.status = "succeeded"`.
    - On **failure**:
      - Decide whether to retry based on `attempt_number` and max attempts.

- **Final Job Status**:
  - If processing succeeded and all required deliveries eventually succeed:
    - Set `jobs.status = "succeeded"`.
  - If processing fails (exceptions, invalid config, etc.):
    - Set `jobs.status = "failed"`.
    - Record `error_message`.
  - If all delivery attempts are exhausted for all subscribers:
    - Optionally set `jobs.status = "failed"` and record a delivery-related `error_message`.

### 6.2 Retry Logic

- **Max attempts**:
  - Decide a constant or config (e.g. 3–5 attempts per subscriber).

- **Backoff strategy**:
  - Simple approach (e.g. exponential backoff):
    - 1st failure → `next_retry_at` = now + 1 minute.
    - 2nd failure → `next_retry_at` = now + 5 minutes.
    - 3rd failure → `next_retry_at` = now + 30 minutes.

- **Worker handling of retries**:
  - In addition to queued jobs, the worker:
    - Periodically selects `delivery_attempts` where:
      - `status` is `pending` or `failed` (depending on your design).
      - `next_retry_at <= now()`.
      - `attempt_number < max_attempts`.
    - Retries the HTTP POST.
    - Updates `attempt_number`, `status`, and `next_retry_at` on each failure.
  - When `attempt_number` reaches `max_attempts` and still fails:
    - Mark as `failed_permanent`.

- **Job-level impact**:
  - You can compute overall job status based on:
    - Processing success/failure.
    - Whether all required deliveries have succeeded or hit permanent failure.

---

## 7. Git & GitHub Workflow

### 7.1 Git & GitHub Initial Setup

- **Local repository setup**:
  - Run `git init` in your project directory.
  - Add a `.gitignore` for:
    - `node_modules/`.
    - Build artifacts (`dist/`, etc.).
    - Logs, temporary files, environment files.
  - Make an initial commit:
    - Message example: `"chore: initial project setup"`.

- **Create GitHub repository**:
  - On GitHub, create a new (empty) repository.
  - Add the remote from your local repo:
    - `git remote add origin <your-repo-url>`.
  - Push your main branch:
    - `git push -u origin main` (or `master`, depending on your default).

### 7.2 Branching Strategy

- **Main branch**:
  - `main` should always represent a stable, deployable state.

- **Feature branches** (recommended naming `feature/<short-name>`):
  - Examples:
    - `feature/project-skeleton`.
    - `feature/pipeline-crud-api`.
    - `feature/job-worker`.
    - `feature/retries`.
    - `feature/docker-compose`.
    - `feature/github-actions`.

- **Typical feature branch workflow**:
  - Create branch:
    - `git checkout -b feature/pipeline-crud-api`.
  - Work in small, logical commits:
    - Example messages: `"feat: add pipeline entity"`, `"feat: implement POST /pipelines"`, `"test: add pipeline CRUD tests"`.
  - Push branch to GitHub:
    - `git push -u origin feature/pipeline-crud-api`.
  - Open a **Pull Request** into `main`:
    - Provide a clear description of the changes.
    - Link to an issue if you are tracking tasks via GitHub issues.
  - After review (or self-review if solo):
    - Merge or squash-merge into `main`.

### 7.3 Feature Size & Parallel Work

- **Feature size guidelines**:
  - One feature branch should represent a focused change that can be reviewed in 30–60 minutes.
  - Example: “CRUD for pipelines” is a good feature; “entire app” is too big.

- **Working on multiple features at once**:
  - As a beginner, prefer one feature branch at a time.
  - If you must parallelize:
    - Choose **independent** features (e.g. docs vs worker logic).
    - Keep branches small and up to date with `main` to reduce merge conflicts.

- **Pull requests**:
  - Keep PRs small and focused:
    - One main responsibility (e.g. “add job table + repository”).
  - Avoid mixing unrelated changes in the same PR.

---

## 8. Development Roadmap (1–2 Weeks)

### 8.1 Development Roadmap Overview

- Phased approach over roughly 1–2 weeks:
  - **Phase 1**: Foundations.
  - **Phase 2**: Database schema & core models.
  - **Phase 3**: Pipeline CRUD API.
  - **Phase 4**: Webhook ingestion & queuing.
  - **Phase 5**: Worker & processing.
  - **Phase 6**: Delivery, retries, and job status API.
  - **Phase 7**: Docker & CI/CD.
  - **Phase 8**: Polish and stretch goals.

### 8.2 Phase 1 – Foundations (Day 1–2)

- **Decide exact tools**:
  - HTTP framework: Express, Fastify, or NestJS (Express is a simple default).
  - DB layer: Knex, Prisma, TypeORM, or direct `pg` (Prisma or Knex are common choices).
- **Set up project skeleton**:
  - Create `package.json`.
  - Set up TypeScript (tsconfig).
  - Install and configure ESLint and Prettier.
  - Establish base folder structure (`src/api`, `src/worker`, etc.).
- **Git workflow**:
  - Create feature branch `feature/project-skeleton`.
  - Implement a very basic server (e.g. `/health` endpoint returning “OK”).
  - Commit early and often.

### 8.3 Phase 2 – Database & Core Models (Day 2–3)

- **Design and implement migrations** for tables:
  - `pipelines`.
  - `pipeline_actions`.
  - `pipeline_subscribers`.
  - `jobs`.
  - `job_results`.
  - `delivery_attempts`.
- **Implement repositories**:
  - For pipelines and jobs at minimum.
- **Branches**:
  - `feature/db-schema`.
  - `feature/pipeline-repository`.

### 8.4 Phase 3 – Pipeline CRUD API (Day 3–4)

- **Routes** to implement:
  - `POST /pipelines`.
  - `GET /pipelines/:id`.
  - `GET /pipelines`.
  - `PUT /pipelines/:id`.
  - `DELETE /pipelines/:id`.
- **Subscribers and actions**:
  - Encode subscribers and actions either:
    - Inside the pipeline create/update endpoints, or
    - Via separate endpoints like `/pipelines/:id/subscribers` and `/pipelines/:id/actions`.
- **Tests**:
  - Basic tests for creating, retrieving, and updating pipelines.
- **Branch**:
  - `feature/pipeline-crud-api`.

### 8.5 Phase 4 – Webhook Ingestion & Queuing (Day 4–5)

- **Webhook route**:
  - `POST /webhooks/:token`.
  - Map `:token` to a specific pipeline source or pipeline.
  - Create a `jobs` row:
    - `status = "queued"`.
    - Store the incoming request body as `payload`.
  - Respond with **HTTP 202 Accepted**, not 200, to indicate async processing.
- **Branch**:
  - `feature/webhook-ingestion`.

### 8.6 Phase 5 – Worker & Basic Processing (Day 5–6)

- **Worker application**:
  - Separate entrypoint, e.g. `src/worker/index.ts`.
  - Main loop that:
    - Fetches `queued` jobs with a limited batch size.
    - Marks them as `processing`.
    - Loads pipeline and actions.
    - Runs `actionProcessor` to produce `result_payload`.
    - Inserts `job_results` rows.
- **Initial delivery**:
  - Implement a first version of delivery attempts:
    - For each subscriber, send an HTTP POST with the result.
    - Record success or failure in `delivery_attempts`.
  - Full retry backoff can be finished in the next phase.
- **Branch**:
  - `feature/worker-processing`.

### 8.7 Phase 6 – Delivery, Retries, Job Status API (Day 6–7)

- **Delivery service**:
  - Extract delivery logic into a dedicated `deliveryService`.
  - Implement:
    - HTTP POST to subscriber URLs.
    - Retry scheduling using `next_retry_at` and `attempt_number`.
    - Max attempts and backoff logic.
- **Job status API**:
  - Endpoints such as:
    - `GET /jobs/:id` → job details, result (if any), and high-level delivery status.
    - Optionally `GET /pipelines/:id/jobs` for listing jobs per pipeline.
- **Branches**:
  - `feature/delivery-retries`.
  - `feature/job-status-endpoints`.

### 8.8 Phase 7 – Docker & CI/CD (Day 7–8)

- **Docker**:
  - Create `Dockerfile` for the app:
    - Install dependencies.
    - Build TypeScript.
    - Run the appropriate command(s) for `api` and `worker`.
  - Create `docker-compose.yaml` with services:
    - `api` (exposes HTTP port).
    - `worker`.
    - `db` (PostgreSQL).
- **GitHub Actions**:
  - Add workflow file `.github/workflows/ci.yml`:
    - **Triggers**: `on: [push, pull_request]`.
    - **Jobs**:
      - `build-and-test`:
        - Checkout code.
        - Set up Node.
        - Install dependencies.
        - Run lint and tests.
      - Optionally, `docker-build` job to ensure Dockerfile builds.
- **Branches**:
  - `feature/docker-compose`.
  - `feature/github-actions`.

### 8.9 Phase 8 – Polish & Stretch Ideas (Remaining Time)

- **Documentation & design decisions**:
  - Write a comprehensive README including:
    - Setup instructions.
    - Running the stack with Docker Compose.
    - Sample `curl` commands or API examples.
    - High-level architecture explanation.
    - Design decisions and trade-offs.
- **Reliability improvements**:
  - Better logging and structured logs.
  - Configurable timeouts and retry limits.
- **Possible stretch goals** (choose 1–2 at most):
  - Authentication for management APIs.
  - Webhook signature verification using `source_secret`.
  - Rate limiting.
  - Pipeline chaining (output of one pipeline becomes input to another).
  - A simple dashboard UI.
  - Metrics endpoints (e.g. for Prometheus).

---

## 9. Zapier vs Your Project

### 9.1 Zapier vs Your Project (Mental Model)

- **Zapier Trigger**:
  - Similar to your **pipeline source URL** (webhook endpoint).
- **Zapier Actions**:
  - Similar to your **processing actions** (e.g. uppercase field, extract field, enrich, etc.).
- **Zapier “Apps”** (Slack, Gmail, etc.):
  - Similar to your **subscribers** (generic webhook URLs that receive payloads).
- **Zapier Run History**:
  - Similar to your combination of:
    - `jobs`.
    - `job_results`.
    - `delivery_attempts`.
- Overall:
  - You are building an engineering-focused core of what Zapier does, without a full UI and rich pre-built integrations.

---

## 10. GitHub Actions (CI/CD)

### 10.1 GitHub Actions Conceptually

- **Workflow file**:
  - Located at `.github/workflows/ci.yml`.

- **Triggers**:
  - Typically run on:
    - `push`.
    - `pull_request`.

- **Jobs**:
  - Example job `build-and-test`:
    - Checks out the code from the repository.
    - Sets up the Node.js environment.
    - Installs dependencies.
    - Runs:
      - Linting.
      - Tests.
  - Optional job `docker-build`:
    - Builds the Docker image to verify that the Dockerfile is valid.

- **Purpose of CI**:
  - Catch broken tests, type errors, or lint problems before merging to `main`.
  - Demonstrate that the project is reproducible and automated.

---

## 11. Working on Multiple Features

### 11.1 Working on Multiple Features at Once

- **Beginner recommendation**:
  - Prefer working on **one feature branch at a time** until it is merged into `main`.

- **When parallelizing work**:
  - Choose features that are **independent** to reduce conflicts:
    - Example: documentation updates vs worker logic.
  - Keep branches:
    - Small in scope.
    - Frequently rebased or merged from `main` to avoid large conflicts.

- **Using GitHub issues**:
  - Use issues as a **todo list**:
    - One issue per feature, bug, or task.
  - Recommended mapping:
    - One **issue** → one **feature branch** → one **pull request**.

