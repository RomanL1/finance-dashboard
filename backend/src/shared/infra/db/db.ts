import { drizzle } from 'drizzle-orm/libsql';
import { env } from '../config/env.js';

export const db = drizzle({ connection: { url: env.dbFileName } });
export type Db = typeof db;
