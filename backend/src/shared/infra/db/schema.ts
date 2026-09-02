// Single barrel for drizzle-kit and the better-auth adapter.
// Each feature owns its tables under features/{feature}/model; auth tables live in shared/infra/auth.
export * from '../auth/auth.schema.js';
export * from '../../../features/household/model/household.schema.js';
export * from '../../../features/category/model/category.schema.js';
