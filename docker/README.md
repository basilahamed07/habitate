# Habitat Docker Guide

This folder contains all Docker files and compose stacks for local development and production.

## Folder layout

- `docker/docker-compose.dev.yml`: Local development (hot reload, bind mounts)
- `docker/docker-compose.prod.yml`: Production-like build
- `docker/docker-compose.yml`: Simple API + DB stack
- `docker/backend/Dockerfile.dev`: FastAPI dev image (uvicorn --reload)
- `docker/backend/Dockerfile.prod`: FastAPI prod image
- `docker/frontend/Dockerfile.dev`: Next.js dev image
- `docker/frontend/Dockerfile.prod`: Next.js prod image

## Requirements

- Docker Engine and Docker Compose installed

## Development (recommended)

From the repo root:

```
docker compose -f docker/docker-compose.dev.yml up --build
```

Services:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000/api`
- Database: `localhost:5432` (postgres/postgres, db: habits)

Stop:

```
docker compose -f docker/docker-compose.dev.yml down
```

## Production-like build

```
docker compose -f docker/docker-compose.prod.yml up --build -d
```

Stop:

```
docker compose -f docker/docker-compose.prod.yml down
```

## Simple API + DB

```
docker compose -f docker/docker-compose.yml up --build
```

This does not run the frontend.

## API base URL

Frontend uses `NEXT_PUBLIC_API_BASE`. In dev compose it is set to:

```
http://localhost:8000/api
```

If you access from another device on your LAN, set it to your host IP:

```
NEXT_PUBLIC_API_BASE=http://192.168.1.50:8000/api
```

Then rebuild the frontend container.

## Swagger auth (Bearer token)

Open `http://localhost:8000/docs` and click **Authorize**.

- Paste the token only (do not add `Bearer `).

## Logs

Auth logs are written to:

```
backend/app/logs/auth/auth.log
```

To watch:

```
tail -f backend/app/logs/auth/auth.log
```

Inside the dev container:

```
docker exec -it habitat_api_dev cat /app/app/logs/auth/auth.log
```

## Common troubleshooting

1) CORS errors
- For LAN access, set `CORS_ORIGINS="*"` or list your host IP in `backend/app/core/config.py`

2) 401 Unauthorized
- Log in to get a JWT token
- Ensure the frontend stores `habitatAuthToken` in localStorage

3) Database is empty
- Use the app signup to create a user
- Use psql to inspect data:
```
docker exec -it habitat_db_dev psql -U postgres -d habits
```

4) Admin access
- Create a user, then update role:
```
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```
