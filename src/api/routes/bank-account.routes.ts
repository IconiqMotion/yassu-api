import {Router} from 'express';
import {validationMiddleware} from '../middlewares/validation.middleware';
import {isAuthenticatedGuard} from '../guards';
import {
    getAllBankAccounts,
    getBankAccount,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefaultBankAccount
} from '../controllers/bank-account.controller';
import {CreateBankAccountDTO, UpdateBankAccountDTO} from '../dto/bank-account.dto';

export const router = Router();

// GET /bank-account - Get all bank accounts for current user
router.get('/', isAuthenticatedGuard, getAllBankAccounts);

// GET /bank-account/:id - Get specific bank account
router.get('/:id', isAuthenticatedGuard, getBankAccount);

// POST /bank-account - Create new bank account
router.post('/', isAuthenticatedGuard, validationMiddleware(CreateBankAccountDTO), createBankAccount);

// PUT /bank-account/:id - Update bank account
router.put('/:id', isAuthenticatedGuard, validationMiddleware(UpdateBankAccountDTO), updateBankAccount);

// DELETE /bank-account/:id - Delete bank account
router.delete('/:id', isAuthenticatedGuard, deleteBankAccount);

// POST /bank-account/:id/set-default - Set as default bank account
router.post('/:id/set-default', isAuthenticatedGuard, setDefaultBankAccount);
