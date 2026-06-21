import { Router } from 'express';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { validateAdminJwt } from '../guards/validate-admin.guard';
import { AdminLoginDTO } from '../dto/admin/admin-login.dto';
import { AdminUpdateEventDTO } from '../dto/admin/admin-update-event.dto';
import {
    login,
    me,
    getDashboard,
    listEvents,
    getEvent,
    listPendingEvents,
    markEventAsPaid,
    listInternalTransactions,
    getInternalTransaction,
    markInternalTransactionAsPaid,
    listTransactions,
    getTransaction,
    listGreetings,
    getGreeting,
    listUsers,
    getUser,
    getUserFullDetails,
    listGroups,
    getGroup,
    seedAdmin
} from '../controllers/admin.controller';

export const router = Router();

// ========== PUBLIC ROUTES (No auth required) ==========

// Login
router.post('/login', validationMiddleware(AdminLoginDTO), login);

// Seed default admin — disabled unless ADMIN_SEED_TOKEN is set AND request carries it
router.post('/seed', (req, res, next) => {
    const expected = process.env.ADMIN_SEED_TOKEN;
    if (!expected) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.headers['x-seed-token'] !== expected) return res.status(403).json({ success: false, message: 'Forbidden' });
    return next();
}, seedAdmin);

// ========== PROTECTED ROUTES (Admin auth required) ==========

// Auth
router.get('/me', validateAdminJwt, me);

// Dashboard
router.get('/dashboard', validateAdminJwt, getDashboard);

// Events
router.get('/events', validateAdminJwt, listEvents);
router.get('/events/pending', validateAdminJwt, listPendingEvents);
router.get('/events/:id', validateAdminJwt, getEvent);
router.post('/events/:id/mark-paid', validateAdminJwt, validationMiddleware(AdminUpdateEventDTO), markEventAsPaid);

// Internal Transactions (Withdraw Requests)
router.get('/internal-transactions', validateAdminJwt, listInternalTransactions);
router.get('/internal-transactions/:id', validateAdminJwt, getInternalTransaction);
router.post('/internal-transactions/:id/mark-paid', validateAdminJwt, validationMiddleware(AdminUpdateEventDTO), markInternalTransactionAsPaid);

// Transactions
router.get('/transactions', validateAdminJwt, listTransactions);
router.get('/transactions/:id', validateAdminJwt, getTransaction);

// Greetings
router.get('/greetings', validateAdminJwt, listGreetings);
router.get('/greetings/:id', validateAdminJwt, getGreeting);

// Users
router.get('/users', validateAdminJwt, listUsers);
router.get('/users/:id', validateAdminJwt, getUser);
router.get('/users/:id/details', validateAdminJwt, getUserFullDetails);

// Groups
router.get('/groups', validateAdminJwt, listGroups);
router.get('/groups/:id', validateAdminJwt, getGroup);

