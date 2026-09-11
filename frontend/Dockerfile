# syntax=docker/dockerfile:1
# oven/bun:1.4-slim
FROM oven/bun@sha256:cb3bbbb08e13a4a2ff400f24c7a2a1d5efa83f6ef8544d52d95a519631e2fc61 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# nginxinc/nginx-unprivileged:1.29-alpine (runs as uid 101, listens on 8080)
FROM nginxinc/nginx-unprivileged@sha256:0c79d56aee561a1d81c63f00eee5fb5fe29279560cdc55e91425133104c7fbe6 AS runtime
# Backend address, substituted into the config at container start. Override per deployment.
ENV API_UPSTREAM=api:3000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/finance-dashboard/browser /usr/share/nginx/html
EXPOSE 8080
