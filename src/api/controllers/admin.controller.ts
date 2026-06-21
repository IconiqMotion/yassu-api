import { plainToInstance } from 'class-transformer';
import { Request, Response } from 'express';
import { Container } from 'typedi';
import { ResHandlerService } from '../services/res-handler.service';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminService } from '../services/admin.service';
import { BadRequestError } from '../errors';
import { AdminLoginDTO } from '../dto/admin/admin-login.dto';
import { AdminListEventsDTO } from '../dto/admin/admin-list-events.dto';
import { AdminListTransactionsDTO } from '../dto/admin/admin-list-transactions.dto';
import { AdminListUsersDTO } from '../dto/admin/admin-list-users.dto';
import { AdminListGreetingsDTO } from '../dto/admin/admin-list-greetings.dto';
import { AdminListInternalTransactionsDTO } from '../dto/admin/admin-list-internal-transactions.dto';
import { AdminListGroupsDTO } from '../dto/admin/admin-list-groups.dto';
import { AdminUpdateEventDTO } from '../dto/admin/admin-update-event.dto';

const resService = Container.get(ResHandlerService);
const adminAuthService = Container.get(AdminAuthService);
const adminService = Container.get(AdminService);

// ========== AUTH ==========

export const login = async (req: Request, res: Response) => {
    try {
        const dto = plainToInstance(AdminLoginDTO, req.body) as AdminLoginDTO;
        const result = await adminAuthService.login(dto);
        return resService.handleSuccess(res, result);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            e.errorMsgCode || 'general.error',
            e.message || 'Login failed',
            e
        ));
    }
};

export const me = async (req: Request, res: Response) => {
    try {
        const admin = (req as any).admin;
        return resService.handleSuccess(res, {
            id: admin.id,
            username: admin.username,
            fullName: admin.fullName,
            email: admin.email
        });
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to get admin info',
            e
        ));
    }
};

// ========== DASHBOARD ==========

export const getDashboard = async (req: Request, res: Response) => {
    try {
        const stats = await adminService.getDashboardStats();
        return resService.handleSuccess(res, stats);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to get dashboard stats',
            e
        ));
    }
};

// ========== EVENTS ==========

export const listEvents = async (req: Request, res: Response) => {
    try {
        const dto = plainToInstance(AdminListEventsDTO, req.query) as AdminListEventsDTO;
        const result = await adminService.listEvents(dto);
        return resService.handleSuccess(res, result);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to list events',
            e
        ));
    }
};

export const getEvent = async (req: Request, res: Response) => {
    try {
        const eventId = parseInt(req.params.id);
        const event = await adminService.getEventById(eventId);
        if (!event) {
            return resService.handleError(res, new BadRequestError(
                'general.error.not_found',
                'Event not found'
            ));
        }
        return resService.handleSuccess(res, event);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to get event',
            e
        ));
    }
};

export const listPendingEvents = async (req: Request, res: Response) => {
    try {
        const dto = plainToInstance(AdminListEventsDTO, req.query) as AdminListEventsDTO;
        const result = await adminService.listPendingEvents(dto);
        return resService.handleSuccess(res, result);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to list pending events',
            e
        ));
    }
};

export const markEventAsPaid = async (req: Request, res: Response) => {
    try {
        const eventId = parseInt(req.params.id);
        const dto = plainToInstance(AdminUpdateEventDTO, req.body) as AdminUpdateEventDTO;
        const result = await adminService.markEventAsPaid(eventId, dto);
        return resService.handleSuccess(res, result);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            e.message || 'Failed to update event',
            e
        ));
    }
};

// ========== INTERNAL TRANSACTIONS (Withdraw Requests) ==========

export const listInternalTransactions = async (req: Request, res: Response) => {
    try {
        const dto = plainToInstance(AdminListInternalTransactionsDTO, req.query) as AdminListInternalTransactionsDTO;
        const result = await adminService.listInternalTransactions(dto);
        return resService.handleSuccess(res, result);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to list internal transactions',
            e
        ));
    }
};

export const getInternalTransaction = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const transaction = await adminService.getInternalTransactionById(id);
        if (!transaction) {
            return resService.handleError(res, new BadRequestError(
                'general.error.not_found',
                'Internal transaction not found'
            ));
        }
        return resService.handleSuccess(res, transaction);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to get internal transaction',
            e
        ));
    }
};

export const markInternalTransactionAsPaid = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const dto = plainToInstance(AdminUpdateEventDTO, req.body) as AdminUpdateEventDTO;
        const result = await adminService.markInternalTransactionAsPaid(id, dto);
        return resService.handleSuccess(res, result);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            e.message || 'Failed to update internal transaction',
            e
        ));
    }
};

// ========== TRANSACTIONS ==========

export const listTransactions = async (req: Request, res: Response) => {
    try {
        const dto = plainToInstance(AdminListTransactionsDTO, req.query) as AdminListTransactionsDTO;
        const result = await adminService.listTransactions(dto);
        return resService.handleSuccess(res, result);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to list transactions',
            e
        ));
    }
};

export const getTransaction = async (req: Request, res: Response) => {
    try {
        const transactionId = parseInt(req.params.id);
        const transaction = await adminService.getTransactionById(transactionId);
        if (!transaction) {
            return resService.handleError(res, new BadRequestError(
                'general.error.not_found',
                'Transaction not found'
            ));
        }
        return resService.handleSuccess(res, transaction);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to get transaction',
            e
        ));
    }
};

// ========== GREETINGS ==========

export const listGreetings = async (req: Request, res: Response) => {
    try {
        const dto = plainToInstance(AdminListGreetingsDTO, req.query) as AdminListGreetingsDTO;
        const result = await adminService.listGreetings(dto);
        return resService.handleSuccess(res, result);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to list greetings',
            e
        ));
    }
};

export const getGreeting = async (req: Request, res: Response) => {
    try {
        const greetingId = parseInt(req.params.id);
        const greeting = await adminService.getGreetingById(greetingId);
        if (!greeting) {
            return resService.handleError(res, new BadRequestError(
                'general.error.not_found',
                'Greeting not found'
            ));
        }
        return resService.handleSuccess(res, greeting);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to get greeting',
            e
        ));
    }
};

// ========== USERS ==========

export const listUsers = async (req: Request, res: Response) => {
    try {
        const dto = plainToInstance(AdminListUsersDTO, req.query) as AdminListUsersDTO;
        const result = await adminService.listUsers(dto);
        return resService.handleSuccess(res, result);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to list users',
            e
        ));
    }
};

export const getUser = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await adminService.getUserById(userId);
        if (!user) {
            return resService.handleError(res, new BadRequestError(
                'general.error.not_found',
                'User not found'
            ));
        }
        return resService.handleSuccess(res, user);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to get user',
            e
        ));
    }
};

export const getUserFullDetails = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const userDetails = await adminService.getUserFullDetails(userId);
        if (!userDetails) {
            return resService.handleError(res, new BadRequestError(
                'general.error.not_found',
                'User not found'
            ));
        }
        return resService.handleSuccess(res, userDetails);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to get user details',
            e
        ));
    }
};

// ========== GROUPS ==========

export const listGroups = async (req: Request, res: Response) => {
    try {
        const dto = plainToInstance(AdminListGroupsDTO, req.query) as AdminListGroupsDTO;
        const result = await adminService.listGroups(dto);
        return resService.handleSuccess(res, result);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to list groups',
            e
        ));
    }
};

export const getGroup = async (req: Request, res: Response) => {
    try {
        const groupId = parseInt(req.params.id);
        const group = await adminService.getGroupById(groupId);
        if (!group) {
            return resService.handleError(res, new BadRequestError(
                'general.error.not_found',
                'Group not found'
            ));
        }
        return resService.handleSuccess(res, group);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to get group',
            e
        ));
    }
};

// ========== SEED ==========

export const seedAdmin = async (req: Request, res: Response) => {
    try {
        await adminAuthService.seedDefaultAdmin();
        return resService.handleSuccess(res, { message: 'Admin seeded successfully' });
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to seed admin',
            e
        ));
    }
};

