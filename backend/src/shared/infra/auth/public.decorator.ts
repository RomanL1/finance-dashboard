import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Marks a route as reachable without a session. Everything else is guarded by default. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
