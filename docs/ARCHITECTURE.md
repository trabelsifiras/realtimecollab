# Architecture & System Design

This document explains the full architecture, domain model, business logic, backend and
frontend structure, deployment topology, and every environment variable of the **Real-Time
Collaboration Platform** (Slack/Jira/Notion-style). It is intended as the single source of
truth for anyone onboarding onto the codebase or operating it.

---

## Table of contents

1. [Overview](#1-overview)
2. [High-level architecture](#2-high-level-architecture)
3. [Technology stack](#3-technology-stack)
4. [Domain model & business logic](#4-domain-model--business-logic)
5. [Backend structure](#5-backend-structure)
6. [Frontend structure](#6-frontend-structure)
7. [Database](#7-database)
8. [Realtime (WebSocket / STOMP)](#8-realtime-websocket--stomp)
9. [Security model](#9-security-model)
10. [Error handling](#10-error-handling)
11. [Deployment](#11-deployment)
12. [Environment variables](#12-environment-variables)
13. [Running locally](#13-running-locally)
14. [Testing](#14-testing)

---

## 1. Overview

The platform is a single application composed of two deployable artifacts:

- **Backend** — a Spring Boot **modular monolith** exposing a REST API (`/api/v1`) and a
  WebSocket/STOMP endpoint (`/ws`) for realtime events.
- **Frontend** — an **Angular 17 SPA** (single-page application) that consumes the API and
  renders a Slack-like workspace shell with projects (Kanban), tasks (Jira-like), chat,
  HR/time-tracking, and a backoffice admin area.

Data is persisted in **PostgreSQL**, schema is managed by **Liquibase**. Authentication uses
**JWT** (access + refresh) with **Spring Security**. The whole stack is containerized and
deployed with **Docker Compose**, built by a **Jenkins** CI/CD pipeline.

```
┌─────────────────────────────┐        ┌──────────────────────────────────────┐
│         Browser (SPA)       │        │            Backend (Java)            │
│  Angular 17 + Material      │  HTTP  │  Spring Boot modular monolith        │
│                             ├───────►│  REST /api/v1  +  WS /ws (STOMP)     │
│                             │  WS    │                                      │
└─────────────┬───────────────┘        └───────────────┬──────────────────────┘
              │ nginx (prod)                           │ JPA / Hibernate
              │ reverse proxy                          ▼
              ▼                             ┌──────────────────────┐
        (frontend static)                   │   PostgreSQL          │
                                            │   (Liquibase schema) │
                                            └──────────────────────┘
```

---

## 2. High-level architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Client | Angular 17 (standalone components), Angular Material | UI, routing, realtime via STOMP |
| API | Spring Boot 3.3, Spring MVC | REST endpoints, validation, auth |
| Realtime | Spring WebSocket + STOMP | Push events (tasks, comments, notifications, presence, typing) |
| Security | Spring Security, JWT, BCrypt | Authentication, authorization, roles |
| Persistence | Spring Data JPA, Hibernate | ORM, repositories, optimistic locking |
| Database | PostgreSQL | Relational storage |
| Migrations | Liquibase | Versioned, reproducible schema |
| Deployment | Docker, Docker Compose, nginx, Jenkins | Containerization, reverse proxy, CI/CD |

The backend is a **modular monolith**: one deployable JAR, organized into feature modules
(`auth`, `workspace`, `task`, `hr`, …). This keeps deployment simple while enforcing clean
module boundaries (each feature owns its own `domain`, `repository`, `dto`, `service`,
`controller`). If the product grows, individual modules can be extracted into microservices.

---

## 3. Technology stack

**Backend**

- Java **17** (compiled for 17; the Docker image uses a Java 21 runtime, which is backward compatible)
- Spring Boot **3.3.5** / Spring Framework 6.1
- Spring Web MVC, Spring Security, Spring Data JPA, Spring WebSocket, Spring Actuator
- JJWT **0.12.6** (JWT), springdoc-openapi (Swagger UI), Lombok
- Liquibase, PostgreSQL driver, HikariCP
- Testcontainers (integration tests), JUnit 5, Mockito, AssertJ

**Frontend**

- Angular **17** (standalone components, signals, `withComponentInputBinding`)
- Angular Material **17**
- `@stomp/stompjs` **7** (WebSocket client), RxJS
- Karma/Jasmine (unit tests)

**Infrastructure**

- Docker, Docker Compose v2, nginx, Jenkins LTS (CI/CD)

---

## 4. Domain model & business logic

### 4.1 Core entities

All entities extend `BaseEntity`, which provides a generated `UUID` primary key plus
`createdAt` / `updatedAt` (managed by JPA auditing).

| Entity | Purpose | Key fields |
|---|---|---|
| `User` | Account | email, username, firstName, lastName, passwordHash, avatarUrl, presence `status`, `role` (`USER`/`ROOT_ADMIN`), `active` |
| `Workspace` | Top-level tenant (the "organization") | name, slug, ownerId |
| `WorkspaceMember` | Membership + role within a workspace | workspaceId, userId, `role` (`OWNER`/`ADMIN`/`HR`/`MEMBER`/`GUEST`) |
| `Project` | Container for tasks (Jira-like board) | workspaceId, name, key, status |
| `Task` | The work item | projectId, auto `key` (`PROJ-123`), title, description, `type` (Epic/Story/Task/Bug/Sub-task), `status`, `priority`, assignee, creator, parent, epic, story points, labels, watchers, dates, time estimates, `version` (optimistic lock) |
| `TaskActivity` | Append-only audit/history | taskId, actorId, type, field, oldValue, newValue |
| `TaskAttachment` | File uploaded to a task | taskId, fileName, contentType, size, storagePath |
| `TaskLink` | Linked issues | sourceTaskId, targetTaskId, linkType (`blocks`/`relates to`/`duplicates`/`clones`) |
| `Comment` | Comment on a task | taskId, authorId, content, soft-delete flag |
| `Channel` / `ChannelMember` | Chat room within a workspace + membership | workspaceId, name, type |
| `Message` | Chat message | channelId, senderId, content |
| `Notification` | User notification | userId, type, title, body, resource ref, read flag |
| `TimeEntry` | Timesheet entry | workspaceId, userId, projectId/taskId, date, minutes, description, `status` (Draft/Submitted/Approved/Rejected) |
| `LeaveRequest` | Time-off request | workspaceId, userId, `type` (Vacation/Sick/…), start/end, reason, `status` (Pending/Approved/Rejected/Cancelled) |

### 4.2 Relationships

```
User ─┬─ WorkspaceMember ──┬─ Workspace
      │                    │
      │                    ├─ Project ── Task ─┬─ TaskActivity
      │                    │                  ├─ TaskAttachment
      │                    │                  ├─ TaskLink
      │                    │                  └─ Comment
      │                    │
      │                    ├─ Channel ── Message
      │                    ├─ TimeEntry
      │                    └─ LeaveRequest
      │
      └─ Notification
```

- A user joins workspaces via `WorkspaceMember` (many-to-many).
- Everything below a workspace is **tenant-scoped** by `workspaceId` (or via `projectId`,
  which belongs to a workspace). This is the core multi-tenancy boundary.
- `Task` is self-referential: `parentId` (sub-tasks) and `epicId` (epic link).

### 4.3 Key business flows

**Authentication & authorization**
- `register` — creates a user. The **first registered user** automatically becomes `ROOT_ADMIN`.
- `login` — returns an **access token** (short-lived) + **refresh token** (long-lived, stored hashed).
- `refresh` — rotates refresh tokens to get a new access token.
- Deactivated users (`active = false`) are blocked at login, refresh, and on **every request**
  (the JWT filter checks the user is still active/exists).

**Workspaces & roles**
- A user can be a member of many workspaces with a `WorkspaceRole`.
- Role assignment is centralized: the **root admin** assigns roles in the backoffice.
- **No one can change their own role** (guard in both the workspace API and the admin API).
- A workspace must always retain at least one `OWNER` (guard against demoting/removing the last one).

**Tasks (Jira-like)**
- Creating a task auto-generates a globally-unique key (`PROJ-123`) from a DB sequence.
- Tasks move through a status workflow: `TODO → IN_PROGRESS → IN_REVIEW → BLOCKED → DONE`.
- Full issue detail: assignee, reporter, priority, type, story points, labels, watchers,
  epic link, sub-tasks, start/due dates, time tracking, attachments, linked issues, and an
  **activity log** (every field change is recorded as a `TaskActivity`).
- Concurrent edits are protected with **optimistic locking** (`version`); stale writes return
  `409 RESOURCE_VERSION_CONFLICT`.

**HR / time tracking**
- Employees log hours (`TimeEntry`) against a project (and optional task), per day.
- Entries follow `DRAFT → SUBMITTED → APPROVED/REJECTED`.
- Employees request time off (`LeaveRequest`): `PENDING → APPROVED/REJECTED/CANCELLED`.
- Roles `HR`, `ADMIN`, and `OWNER` can view the team's entries/leave and run the **HR overview**
  (per-employee hours and leave days over a date range).

**Backoffice (root admin)**
- List/search users, promote/demote `ROOT_ADMIN`, suspend/reactivate accounts.
- Browse all workspaces, list members, assign roles, remove members.

---

## 5. Backend structure

The backend lives under `backend/src/main/java/com/collab/` and follows a **layered,
feature-modular** layout. Each feature module is self-contained:

```
com.collab
├── CollabApplication.java        # Spring Boot entry point
├── common/                       # cross-cutting concerns
│   ├── api/                      #   ErrorResponse, PageResponse
│   ├── domain/                   #   BaseEntity (id/createdAt/updatedAt)
│   ├── event/                    #   DomainEvent (realtime event payload)
│   ├── exception/                #   exception hierarchy + GlobalExceptionHandler
│   └── security/                 #   JWT, filters, principal, CORS props
├── config/                       # SecurityConfig, WebSocketConfig, JpaConfig, OpenApiConfig
├── auth/                         # register/login/refresh/logout/me
├── user/                         # user profile, search, password change
├── workspace/                    # workspaces + membership + roles
├── project/                      # projects
├── task/                         # tasks (Jira features) + attachments + links + activity
├── comment/                      # task comments
├── channel/                      # chat channels + membership
├── chat/                         # channel messages
├── notification/                 # user notifications
├── presence/                     # user presence
├── hr/                           # time entries + leave requests + HR report
├── admin/                        # backoffice (root admin)
└── realtime/                     # STOMP interceptors, event publisher, controller
```

Each feature module has the same vertical layering:

```
feature/
├── domain/        # JPA entities + enums
├── repository/    # Spring Data repositories (+ custom queries/aggregations)
├── dto/           # request/response records (with Jakarta validation)
├── service/       # business logic, transactions, authorization checks
└── controller/    # REST endpoints (thin, delegate to services)
```

### 5.1 `common` package (cross-cutting)

- **`api`** — `ErrorResponse` (timestamp, status, code, message, path, resourceId, fieldErrors)
  and `PageResponse` (content, page, size, totalElements, totalPages).
- **`domain`** — `BaseEntity` superclass.
- **`event`** — `DomainEvent`, the payload published on every state change and forwarded to
  WebSocket subscribers by `RealtimeEventPublisher`.
- **`exception`** — the exception hierarchy (see [Error handling](#10-error-handling)).
- **`security`** — `JwtService`, `JwtProperties`, `JwtAuthenticationFilter`,
  `UserPrincipal`, `SecurityUtils.currentUserId()`, `CorsProperties`.

### 5.2 `config` package

- **`SecurityConfig`** — stateless security: disables CSRF, sets `SessionCreationPolicy.STATELESS`,
  permits public paths (`/auth/*`, actuator health, Swagger, `/ws`), requires auth elsewhere,
  registers the JWT filter, and configures CORS from `app.cors.allowed-origins`. Custom 401/403
  JSON responses.
- **`WebSocketConfig`** — registers the `/ws` STOMP endpoint, enables a simple broker on
  `/topic` + `/queue`, sets `/app` as the app destination prefix and `/user` for user queues.
- **`JpaConfig`** — enables JPA auditing.
- **`OpenApiConfig`** — Swagger/OpenAPI.

### 5.3 `realtime` package

- **`WebSocketHandshakeInterceptor`** — validates the JWT from the `?token=` query param and
  stores the principal on the session.
- **`StompChannelInterceptor`** — authorizes SUBSCRIBE/SEND per destination (workspace/channel
  membership checks) via `RealtimeAuthorizationService`.
- **`RealtimeEventPublisher`** — bridges application events to `/topic/...` destinations.
- **`StompRealtimeController`** — inbound STOMP messages (e.g. typing indicators).

---

## 6. Frontend structure

The frontend lives under `frontend/src/app/` and uses **Angular standalone components**
(no NgModules), lazy-loaded routes, and Angular Material for UI.

```
src/app
├── app.config.ts            # app bootstrap: router, HTTP, auth interceptor, animations
├── app.routes.ts            # lazy routes (with component input binding)
├── core/                    # app-wide, reusable
│   ├── guards/              #   auth.guard (redirects to /login)
│   ├── interceptors/        #   auth.interceptor (attaches token, refresh on 401)
│   ├── models/              #   typed interfaces (task, workspace, hr, …)
│   └── services/            #   auth, workspace, project, task, hr, admin, realtime, …
├── features/                # feature components (one folder per domain)
│   ├── auth/                #   login, register
│   ├── workspace/           #   workspace list + detail (members)
│   ├── project/             #   project list
│   ├── task/                #   task board (Kanban) + task details
│   ├── chat/                #   channels + chat
│   ├── hr/                  #   timesheet (calendar), leave, hr dashboard
│   ├── admin/               #   backoffice
│   ├── dashboard/           #   home dashboard
│   ├── notification/        #   notifications list
│   └── profile/             #   profile settings
├── layout/                  # shell chrome
│   ├── app-shell/           #   sidenav + content container
│   ├── sidebar/             #   navigation (workspaces, HR & Time, administration)
│   └── topbar/              #   search, notifications, profile menu
└── shared/
    └── utils/               #   avatar, date helpers
```

**Key patterns**

- **Services in `core/services`** wrap the HTTP API and expose `Observable`s; components are
  thin and subscribe to them.
- **Models** mirror the backend DTOs one-to-one (e.g. `Task`, `TimeEntry`, `HrOverview`).
- **`RealtimeService`** owns a single STOMP `Client`, reconnects with backoff, and exposes an
  `events()` stream; components subscribe to project/task/channel topics.
- **Routing** uses `withComponentInputBinding()`, so route params (`workspaceId`, `taskId`, …)
  are injected as component `@Input()`s.
- **Accessibility** — semantic HTML, `aria-label`s on icon buttons, `role="alert"`/`aria-live`
  regions, keyboard-focusable controls.

Top-level routes: `/dashboard`, `/workspaces`, `/workspaces/:id`, `/workspaces/:id/projects`,
`/projects/:id`, `/projects/:id/tasks/:taskId`, `/workspaces/:id/channels`, `/channels/:id`,
`/notifications`, `/profile`, `/timesheet`, `/leave`, `/hr`, `/backoffice`.

---

## 7. Database

Schema is managed by **Liquibase** (`backend/src/main/resources/db/changelog/`), which is
included in order via `db.changelog-master.yaml`. Hibernate runs with `ddl-auto: validate`,
so the schema **must** match the JPA entities exactly.

Migration files:

| File | Contents |
|---|---|
| `001-users.yaml` | users table |
| `002-workspaces.yaml` | workspaces, workspace_members |
| `003-projects.yaml` | projects |
| `004-tasks.yaml` | tasks (base) |
| `005-chat.yaml` | channels, channel_members, messages |
| `006-notifications.yaml` | notifications |
| `007-task-jira-features.yaml` | task key/type/parent/epic/story points/estimates, labels, watchers, activities, attachments, links |
| `008-fix-task-keys.yaml` | global `task_key_seq` sequence + unique key |
| `009-hr.yaml` | time_entries, leave_requests |
| `010-backoffice.yaml` | users.role + users.active |

Every migration adds foreign keys (with `ON DELETE CASCADE`/`SET NULL` as appropriate) and
indexes on the most-queried columns (`workspace_id`, `entry_date`, `status`, etc.).

---

## 8. Realtime (WebSocket / STOMP)

- **Endpoint**: `/ws` (STOMP over SockJS-less WebSocket). Auth is via `?token=<accessToken>`.
- **Broker**: simple in-memory broker (single instance). Destinations:
  - `/topic/workspaces/{workspaceId}` — workspace-wide events
  - `/topic/projects/{projectId}` — project/task events
  - `/topic/tasks/{taskId}` — task changes, comments
  - `/topic/channels/{channelId}` — chat messages
  - `/user/queue/notifications` — per-user notifications
- **Publishing**: services publish a `DomainEvent` (via Spring `ApplicationEventPublisher`);
  `RealtimeEventPublisher` relays it to the matching `/topic/...`.
- **Inbound**: `/app/channels/{id}/typing` for typing indicators, plus message send.

Events are used by the frontend to refresh boards/lists optimistically (e.g. another user
moves a card, posts a comment, or assigns a task → the UI updates without a refresh).

---

## 9. Security model

- **Authentication** — stateless JWT. Access token (~15 min) + refresh token (~7 days, stored
  as SHA-256 hash, rotated on refresh).
- **Passwords** — BCrypt.
- **Authorization** — two dimensions:
  1. **Workspace role** (`OWNER`/`ADMIN`/`HR`/`MEMBER`/`GUEST`) — gates workspace/project/task/HR
     operations via `WorkspaceAccessService` (`requireMember`, `requireAdmin`, `requireHr`).
  2. **Global role** (`ROOT_ADMIN`) — gates the backoffice (`AdminService.requireRootAdmin`).
- **Self-protection rules** — a user cannot change their own role, suspend themselves, or
  demote/remove the last workspace owner.
- **Account suspension** — `active=false` blocks login, refresh, and (via the JWT filter) all
  in-flight requests.

---

## 10. Error handling

A single `@RestControllerAdvice` (`GlobalExceptionHandler`) translates every exception into a
consistent `ErrorResponse`. Exceptions are **strictly separated** into two families:

- **Logic (`BusinessException`)** — expected, domain-driven errors with a stable `code` and a
  client-safe message. Subclasses: `NotFoundException` (404), `ConflictException` (409),
  `BadRequestException` (400), `ForbiddenException` (403), `UnauthorizedException` (401).
- **Technical (`TechnicalException`)** — unexpected infrastructure errors (I/O, hashing, …).
  The message is **logged only**; clients receive a generic `INTERNAL_ERROR` (500), so no
  implementation detail leaks.

Additional mapped technical cases: validation errors (400 + `fieldErrors`), malformed JSON
(400), bad parameter types (400), optimistic-lock (409), data-integrity (409), unsupported
method (405), unknown route (404), and any unhandled `Exception` (500, logged).

---

## 11. Deployment

### 11.1 Containerization

- **Backend** (`backend/Dockerfile`) — multi-stage: Maven (Temurin 21) builds the jar, then a
  slim JRE image runs it.
- **Frontend** (`frontend/Dockerfile`) — multi-stage: Node 20 builds the Angular production
  bundle, then **nginx:alpine** serves it.

### 11.2 Why nginx for the frontend

The Angular app is a **SPA** and compiles to static assets. nginx is used in production for:

1. **Static serving** — nginx is extremely fast and lightweight at serving static files.
2. **SPA fallback** — `try_files $uri $uri/ /index.html` rewrites deep links
   (`/projects/123/tasks/456`) to `index.html` so client-side routing works on refresh.
3. **Reverse proxy** — `/api/` is proxied to the backend, so the browser only ever talks to
   **one origin** (no CORS in production, cookies/tokens simpler).
4. **WebSocket proxy** — `/ws` is proxied with `Upgrade`/`Connection` headers so STOMP realtime
   keeps working through the same origin.
5. **Future TLS** — nginx is the natural place to terminate HTTPS.

The `frontend/nginx.conf` proxies `/api/` → `http://backend:8080` and `/ws` → the same backend
with WebSocket upgrade headers. The production Angular build uses relative URLs
(`environment.prod.ts`: `{origin}/api/v1` and `{origin}/ws`).

### 11.3 docker-compose topology

`docker-compose.yml` runs three services:

| Service | Image | Port | Notes |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5432` | persistent volume, healthcheck |
| `backend` | `collab-backend` (built from `backend/`) | `8080` | waits for postgres healthy; mounts uploads volume |
| `frontend` | `collab-frontend` (built from `frontend/`) | `8081` | nginx → proxies to backend |

```
Browser ──► nginx (frontend:8081) ──► /api, /ws ──► backend (8080) ──► postgres (5432)
```

### 11.4 CI/CD (Jenkins)

The `Jenkinsfile` defines a declarative pipeline:

1. **Checkout** — clone from Git.
2. **Backend — Build & Unit Tests** — `mvn clean test` + JUnit report.
3. **Frontend — Build** — `npm ci && npm run build`.
4. **Build Docker Images** — `docker compose build`.
5. **Deploy** — `docker compose up -d`.

The Jenkins controller runs in Docker with the host Docker socket mounted and the Docker
CLI + Compose plugin installed (`jenkins/Dockerfile`), so the pipeline can build and deploy
containers on the same machine.

---

## 12. Environment variables

Configuration is externalized via Spring's `${VAR:default}` placeholders and Docker Compose.

### 12.1 Backend

| Variable | Purpose | Default (dev) | Docker Compose value |
|---|---|---|---|
| `DB_URL` | JDBC URL | `jdbc:postgresql://localhost:5433/collab` | `jdbc:postgresql://postgres:5432/collab` |
| `DB_USERNAME` | DB user | `collab` | `collab` |
| `DB_PASSWORD` | DB password | `collab` | `collab` |
| `JWT_SECRET` | HMAC signing key (**≥ 32 bytes** / 256 bits) | `change-me-in-production-…` (insecure default) | `${JWT_SECRET:-<long default>}` |
| `JWT_ACCESS_EXPIRATION` | Access token TTL (ms) | `900000` (15 min) | `900000` |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL (ms) | `604800000` (7 days) | `604800000` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed browser origins | `http://localhost:4200` | `http://localhost:4200,http://localhost:8081` |
| `FILE_STORAGE_PATH` | Directory for uploaded attachments | `./uploads` | `/data/uploads` |

> The JDBC default in the `dev` profile points at `localhost:5433` (a local dev Postgres);
> Docker Compose overrides `DB_URL` to reach the `postgres` service over the internal network.

### 12.2 docker-compose only

| Variable | Purpose | Default |
|---|---|---|
| `DB_NAME` | Database name created in the Postgres container | `collab` |

### 12.3 Non-environment config (application.yml)

- `spring.profiles.active` = `dev`
- `server.port` = `8080`
- `spring.jpa.hibernate.ddl-auto` = `validate` (schema validated against entities; migrations own the schema)
- `spring.liquibase.change-log` = `classpath:db/changelog/db.changelog-master.yaml`
- `app.jwt.issuer` = `collab-platform`
- `spring.servlet.multipart.max-file-size` / `max-request-size` = `10MB` (attachment upload limit)

### 12.4 Frontend

Frontend configuration is **compile-time** (not environment variables), in
`src/environments/`:

- `environment.ts` (dev) — `apiUrl: http://localhost:8080/api/v1`, `wsUrl: ws://localhost:8080/ws`
- `environment.prod.ts` (production, swapped in via `angular.json` `fileReplacements`) —
  `apiUrl: {origin}/api/v1`, `wsUrl: {origin}/ws` (resolves relative to the nginx origin).

---

## 13. Running locally

**Full stack (Docker Compose):**

```bash
cp .env.example .env          # set a strong JWT_SECRET
docker compose up --build
# frontend → http://localhost:8081
# backend  → http://localhost:8080
# swagger  → http://localhost:8080/swagger-ui
```

**Backend only (IDE), against a local Postgres on 5433:**

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Frontend only (dev server):**

```bash
cd frontend
npm install
npm start                     # http://localhost:4200
```

---

## 14. Testing

```bash
cd backend
mvn test       # unit tests (surefire) — no Docker required
mvn verify     # unit + integration tests (failsafe) — requires Docker (Testcontainers)
```

- Unit tests use Mockito and cover services (auth, tasks, HR, admin, JWT).
- Integration test `AuthFlowIT` spins up a real PostgreSQL via Testcontainers and exercises
  the register → workspace → project → task flow end-to-end.

Frontend:

```bash
cd frontend
npm test       # Karma/Jasmine
npm run build  # production build (type-checking + bundle)
```
