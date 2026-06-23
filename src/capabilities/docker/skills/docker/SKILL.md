---
name: "docker"
description: "Containerise the application for consistent, portable deployments with Docker."
whenToUse: "Use when containerising an application, writing a Dockerfile, setting up docker-compose for local development, or when Docker/docker-compose files are needed for the project."
applyTo: "Dockerfile*,**/Dockerfile*,**/docker-compose*,**/.dockerignore,**/Dockerfile.*"
---

# Skill: Docker Support

## Description
Containerise the application for consistent, portable deployments using Docker best practices.

## Guidelines

### Project Layout
- Place `Dockerfile` (and variant `Dockerfile.*` files) at the project root alongside the source.
- Place all supporting Docker files — `docker-compose.yml`, `.dockerignore`, env files, entrypoint scripts — inside a `docker/` directory.
- Use a single `docker/docker-compose.yml` for the entire project when Dockerfiles are present.

### Dockerfile
- Use multi-stage builds: builder stage then minimal runtime image.
- Pin base image versions (e.g. `node:22-alpine`, `python:3.12-slim`).
- Prefer Alpine or distroless base images for smaller attack surface.
- Never run the container process as root — create and switch to a non-root `USER`.
- Use `COPY --chown=` to match the non-root user.
- Sort `RUN` commands logically: install system deps → install app deps → copy source.
- Use `--mount=type=cache` for package manager caches during build (BuildKit).

### docker-compose
- Provide exactly one `docker/docker-compose.yml` for the entire project.
- Include all service dependencies (databases, caches, queues, etc.).
- Use named volumes for persistent data so it survives container restarts.
- Set `restart: unless-stopped` for production services.
- Use `${VARIABLE:-default}` syntax for environment defaults.
- Pin service image versions for dependencies (e.g. `postgres:16-alpine`).
- Keep the compose file environment-agnostic — use `.env` files or `--env-file` for per-environment overrides.

### .dockerignore
- Exclude `node_modules`, `.git`, secrets, build artifacts, local env files, IDE config.
- Explicitly list only what is needed for the build to avoid leaking sensitive files.

### Security
- Never run as root — always use a non-root `USER`.
- Never bake secrets, tokens, or keys into images — use Docker secrets, build args (for non-sensitive values), or runtime env vars.
- Use `RUN --mount=type=secret` (BuildKit) for build-time secrets instead of `COPY`.
- Scan images for vulnerabilities (e.g. `docker scout`, `trivy`).
- Set `USER` at the end of the Dockerfile, after all `RUN` commands that need root.

### Image Efficiency
- Keep layers small — chain `RUN` commands and clean up package managers in the same layer.
- Use `--no-cache` or equivalent to avoid caching package indexes in the image.
- Use `apt-get purge` or `yum remove` to delete build-only dependencies in the same layer.
- Remove temporary files and cache directories in the same `RUN` where they are created.
- Combine related operations into single `RUN` commands to reduce layer count.
