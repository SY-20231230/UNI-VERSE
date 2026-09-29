# Docker

## Local development

From the repository root, start the frontend, Spring backend, AI API, and MySQL:

```sh
docker compose up --build
```

- Frontend: http://localhost:5173
- Spring API: http://localhost:8080
- AI API docs: http://localhost:8000/docs
- MySQL: localhost:3306

Host ports can be overridden with `FRONTEND_HOST_PORT`, `BACKEND_HOST_PORT`, `AI_HOST_PORT`, and `MYSQL_HOST_PORT` if those defaults are already in use.

Compose uses local-only database and JWT defaults. Override them with environment variables before starting if needed. For PowerShell:

```powershell
$env:MYSQL_PASSWORD = "your-local-db-password"
$env:MYSQL_ROOT_PASSWORD = "your-local-root-password"
$env:JWT_SECRET_KEY = "your-long-local-secret"
docker compose up --build
```

The MySQL schema is imported only when its named volume is first created. `docker compose down` preserves database and uploads; `docker compose down -v` deletes them.

## Production images

The Compose frontend target runs Vite for development. Build the production frontend target separately for ECS; it serves static assets on port 8080. The backend and AI Dockerfiles build runtime images by default.

```sh
docker build -f frontend/Dockerfile --target production -t universe-frontend:local frontend
docker build -f backend/Dockerfile -t universe-backend:local backend
docker build -f ai-server/Dockerfile -t universe-ai-server:local ai-server
```

## Before ECS

- Push versioned images to ECR and replace local image names with ECR URIs in ECS task definitions.
- Use RDS instead of the Compose MySQL container and provide its JDBC URL and credentials through Secrets Manager.
- Provide `JWT_SECRET_KEY` and SMTP credentials through Secrets Manager; do not use Compose development defaults in AWS.
- Give the backend a private service-discovery URL for the AI API using ECS Service Connect or Cloud Map.
- Route `/api/*`, `/uploads/*`, and `/ws-stomp` from the load balancer to Spring; route other paths to the frontend target group.
- Local uploads currently use the backend container filesystem. Use S3 or EFS before deploying tasks that can be replaced or scaled.
- Set ECS task CPU/memory, execution/task roles, subnets, security groups, target groups, and deployment health checks for the chosen AWS account and region.