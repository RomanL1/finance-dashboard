# syntax=docker/dockerfile:1
# oven/bun:1.4-slim (debian, glibc for the libsql native binding)
FROM oven/bun@sha256:cb3bbbb08e13a4a2ff400f24c7a2a1d5efa83f6ef8544d52d95a519631e2fc61 AS build
WORKDIR /app
COPY package.json bun.lock ./
# Dev deps only for `nest build`; skip native postinstall scripts (better-sqlite3 via @better-auth/cli).
RUN bun install --frozen-lockfile --ignore-scripts
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN bun run build

FROM oven/bun@sha256:cb3bbbb08e13a4a2ff400f24c7a2a1d5efa83f6ef8544d52d95a519631e2fc61 AS runtime
WORKDIR /app
# Image-internal defaults. Deployment config (secret, origins, seed) comes from the environment at run time.
ENV NODE_ENV=production \
    PORT=3000 \
    NO_COLOR=1 \
    DB_FILE_NAME=file:/data/local.db
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production && \
    mkdir /data && chown bun:bun /data
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
USER bun
EXPOSE 3000
CMD ["bun", "dist/main.js"]
