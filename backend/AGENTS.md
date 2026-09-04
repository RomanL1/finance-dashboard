# Backend rules

Feature-sliced NestJS. Bun for scripts, vitest for tests, drizzle for persistence, better-auth for sessions.

## Layout

```
src/features/{feature}/
  api/          controllers + mappers (HTTP in, DTO out). No business rules.
  model/        drizzle table(s), domain types, DTOs, enums
  repository/   drizzle queries. Returns domain types, never raw rows across the boundary
  service/      business rules + orchestration. Throws kernel DomainErrors, never HttpException
  {feature}.module.ts
src/shared/infra/   config, db, auth, errors, app.setup.ts
src/shared/kernel/  DomainError family, Id helpers — no Nest, no drizzle imports
```

## Rules

- Controllers are thin: parse input (class-validator DTOs), call one service method, map to a DTO.
- Services throw `NotFoundError` / `ForbiddenError` / `ConflictError` / `ValidationError` from `shared/kernel`; `DomainExceptionFilter` maps them to HTTP.
- Persistence stays behind repositories. Inject the client with `@Inject(DRIZZLE) db: Db`.
- Tables live in `features/{feature}/model/{feature}.schema.ts` and are re-exported from `shared/infra/db/schema.ts` (drizzle-kit + better-auth read that barrel). After changing tables: `bun run db:generate && bun run db:migrate`.
- Every entity belongs to a household (user story M2), directly or through its parent (transaction → account → household). Scope repository queries by `householdId`, joining the parent when needed. No redundant `householdId` columns on child tables.
- Table relations form a tree. No cyclic foreign keys.
- Routes are protected by default. `@Public()` to opt out, `@CurrentUser()` to get the session user.
- ESM with `.js` extensions in relative imports. Never `import type` an injectable.
- Unit-test services with a fake repository (`*.spec.ts` next to the file). e2e specs in `test/` boot `AppModule` + `setupApp` against in-memory sqlite.
- Controllers are the API contract: keep `@ApiProperty`/`@ApiOkResponse` accurate, hey-api on the frontend generates from them. After API changes run `bun run openapi:generate` here and `bun run api:generate` in `frontend/`.
- Run `bun run typecheck && bun run lint && bun run test && bun run test:e2e` before committing.
