import { NextFunction, Request, Response } from 'express';
import { Container } from 'typedi';
import { UnauthorizedError } from '../errors/unauthorized.error';
import { ResHandlerService } from '../services/res-handler.service';
import { AdminAuthService } from '../services/admin-auth.service';

const resService = Container.get(ResHandlerService);
const adminAuthService = Container.get(AdminAuthService);

export const validateAdminJwt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return resService.handleError(res, new UnauthorizedError('general.error.no_token', 'No authorization token provided', new Error('No token')));
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded = adminAuthService.verifyAdminJWT(token);

        if (!decoded || !decoded.isAdmin) {
            return resService.handleError(res, new UnauthorizedError('general.error.invalid_token', 'Invalid or expired admin token', new Error('Invalid token')));
        }

        const admin = await adminAuthService.getAdminById(decoded.id);
        
        if (!admin || !admin.isActive) {
            return resService.handleError(res, new UnauthorizedError('general.error.admin_not_found', 'Admin account not found or disabled', new Error('Admin not found')));
        }

        // Attach admin to request
        (req as any).admin = admin;
        (req as any).isAdmin = true;

        return next();
    } catch (error) {
        return resService.handleError(res, new UnauthorizedError('general.error.auth_failed', 'Authentication failed', error));
    }
};

