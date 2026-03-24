# Webhook-Pipeliner

Webhook-Pipeliner is a robust, highly-available background processing and routing system. It is designed to ingest high-volume incoming HTTP payloads (like Facebook or Discord webhooks), run them through customizable processing rules, and dispatch the results to designated destination URLs based on the parsed data.

**Many-to-Many Architecture:** A single running instance of Webhook-Pipeliner can act as the central hub for multiple platforms simultaneously. While dispatching outward to new *Subscribers* (like Discord channels or Slack) is seamlessly automated via the API, connecting new incoming *Sources* (like Facebook, Jira, or GitHub) requires some manual code setup (e.g., adding specific platform verification endpoints or tweaking the action parsers to match their specific JSON payloads).

## 🏗 Architecture Overview

The system is fundamentally designed around an asynchronous pipeline to ensure strict timeout requirements from external providers (e.g., Facebook's 3-second rule) are never breached.

1. **Ingestion Layer (Express.js):**
   - Receives POST requests on public endpoints.
   - Instantly saves the raw JSON payload to a PostgreSQL database with a `queued` status.
   - Immediately returns a `202 Accepted` response.
2. **Background Worker (Node.js Loop):**
   - Runs independently from the HTTP server.
   - Polls the database for oldest `queued` jobs, claiming them atomically to prevent overlap.
   - Executes dynamic parsing logic (`Actions`) configured for the pipeline, extracting intent (e.g., `reservation`, `support`, `feedback`).
3. **Dispatch & Delivery:**
   - Matches the job's final classification category against registered `Subscribers`.
   - Sends HTTP POST requests directly to the target URLs of those subscribers.
   - Logs every single HTTP delivery attempt for full traceability.

## 🛠 Design Decisions

- **Database-Backed Queuing (Why PostgreSQL over Redis/RabbitMQ?):** While we could have used an in-memory runtime array or a specialized message broker like RabbitMQ/Redis for the job queue, inserting incoming webhooks directly into a PostgreSQL table provides two massive benefits for a project of this scale:
  1. **Durability:** If the Node.js container crashes, restarts, or deploys new code, zero incoming webhooks are lost from memory.
  2. **Reduced Infrastructure Sprawl:** It keeps the entire stack strictly limited to just Node + Postgres. You don't have to monitor, host, and maintain 3 separate stateful caching layers for the queue.
- **Dynamic Rules Context (Why DB Tables over Classes?):** By storing Pipelines, Actions, and Subscribers as rows in a database rather than hardcoding them as TypeScript classes/functions, the logic becomes entirely dynamic. An administrator can use an API or Dashboard to instantly add a new keyword trigger or a new Discord destination webhook without needing to write a single line of code, rebuild the app, or restart the server.
- **Complete Decoupling:** By decoupling the ingestion of the webhook from the processing of the webhook, the server avoids CPU-blocking operations during bursts of network traffic.
- **Strict REST Hierarchy:** The API is structured cleanly using nested sub-routers. Actions, Subscribers, and Jobs are explicitly isolated under `/api/pipelines/{pipelineId}/...` ensuring context is never lost.
- **Smart "Unclassified" Handling:** The system acts as a strict whitelist. If an incoming message cannot be categorized by the pipeline's actions, it is silently ignored and marked `failed: no matching subscriber` *unless* the administrator explicitly adds an `unclassified` catch-all action. This prevents spam or unrelated payloads from propagating through the system.

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- PostgreSQL

### 1. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=8080
DATABASE_URL=postgres://postgres:postgres@db:5432/final_project?sslmode=disable
FB_VERIFY_TOKEN=your_secure_random_string
```

### 2. Running with Docker (Recommended)
This will boot both the PostgreSQL database and the Node.js application container.
```bash
docker compose up --build
```

### 3. Exposing to the Public Internet (Only in deployment)
External platforms (like Facebook, GitHub, or Jira) **cannot** send webhooks to your `localhost`. If you are running this codebase on your personal machine for testing, you must expose your local port `8080` to the internet.

**Common Methods:**
- **Ngrok:** Run `ngrok http 8080` *(Fastest for temporary local development).*
- **LocalTunnel:** Run `npx localtunnel --port 8080`.
- **Cloud VM Reverse Tunnel:** *(Best for semi-permanent/free static endpoints)* Set up a free-tier Azure or AWS Linux Virtual Machine with a static public IP (using Nginx), and create an SSH reverse tunnel connecting the VM port to your local port `8080`.


## 📚 Core API Documentation

### 1. Pipelines
Pipelines are the root containers for logic.
- `POST /api/pipelines`: Create a new pipeline. Generates the secret `pathToken`.
- `GET /api/pipelines`: List all pipelines.
- `GET /api/pipelines/{id}`: Get specific pipeline configuration.
- `PUT /api/pipelines/{id}`: Update a pipeline's name, description, or custom token secret.
- `DELETE /api/pipelines/{id}`: Cascading deletion of the pipeline and all associated data.

### 2. Actions
Actions are the "rules" applied to incoming payloads.
- `POST /api/pipelines/{pipelineId}/actions`
  - Body: `{ "order": 1, "type": "support" }`
  - *Valid Types:* `reservation`, `support`, `feedback`, `unclassified`.
- `GET /api/pipelines/{pipelineId}/actions`: List configured actions.
- `DELETE /api/pipelines/{pipelineId}/actions/{id}`: Remove a specific action rule.

### 3. Subscribers
Subscribers are the destination URLs that listen for specific payload categories.
- `POST /api/pipelines/{pipelineId}/subscribers`
  - Body: `{ "targetUrl": "https://your-discord-webhook.com", "filters": { "category": "support" } }`
- `GET /api/pipelines/{pipelineId}/subscribers`: List destinations.
- `DELETE /api/pipelines/{pipelineId}/subscribers/{id}`: Remove a destination webhook.

### 4. Jobs
Jobs are individual incoming messages and their execution statuses.
- `GET /api/pipelines/{pipelineId}/jobs`: Lists history of all payloads (queued, processing, succeeded, failed).
- `GET /api/pipelines/{pipelineId}/jobs/{id}`: Detailed view. Contains the raw payload, the parsed result, and every logged outward delivery attempt.

### 5. The Webhook Entrypoint
This is the public-facing URL you provide to third-party services (Facebook, Jira, etc.)
- `GET /api/webhooks/{token}`: Verifies the endpoint (Facebook's challenge/verify\_token flow).
- `POST /api/webhooks/{token}`: Receives the live JSON payload and immediately queues it.

---
*Built with Node.js, Express, TypeScript, PostgreSQL, and Drizzle ORM.*
