# Real-Time Collaboration Platform

A production-ready real-time collaboration web application (Slack / Jira / Notion style).

## Stack

- **Frontend:** Angular (standalone architecture)
- **Backend:** Spring Boot 3.x (Java 17+), modular monolith
- **Database:** PostgreSQL (Liquibase migrations)
- **Realtime:** WebSocket + STOMP
- **Auth:** Spring Security + JWT (access + refresh tokens, BCrypt)

## Repository structure

```
backend/            Spring Boot modular monolith
frontend/           Angular app (separate repo step)
infrastructure/     nginx, monitoring (future)
docs/               architecture, api, websocket, database docs
docker-compose.yml  local dev environment
.env.example        environment template
```

## Backend modules

`auth`, `user`, `workspace`, `project`, `task`, `comment`, `channel`, `chat`,
`notification`, `presence`, `realtime`, `common`, `config`.

## Running locally (Docker)

1. Copy `.env.example` to `.env` and set a strong `JWT_SECRET`.
2. `docker compose up --build`
3. Backend: http://localhost:8080
4. Swagger UI: http://localhost:8080/swagger-ui
5. Health: http://localhost:8080/actuator/health

## Running the backend directly

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Requires a local PostgreSQL (see `.env.example` for defaults).

## API

Base path: `/api/v1`. See `/swagger-ui` for full OpenAPI docs.

WebSocket endpoint: `/ws`. Destinations:

- `/topic/workspaces/{workspaceId}`
- `/topic/projects/{projectId}`
- `/topic/tasks/{taskId}`
- `/topic/channels/{channelId}`
- `/user/queue/notifications`

## Testing

```bash
cd backend
mvn test
```

Integration/repository tests use Testcontainers (PostgreSQL).
