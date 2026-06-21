import { validateJwt } from './validate-jwt.guard';
import { validateAdminJwt } from './validate-admin.guard';

export const isAuthenticatedGuard = [validateJwt];
export const isAdminGuard = validateAdminJwt;


