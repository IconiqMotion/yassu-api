import {plainToInstance} from 'class-transformer';
import {Request, Response} from 'express';
import {Container} from 'typedi';
import {ResHandlerService} from '../services/res-handler.service';
import {BadRequestError, NotFoundError} from '../errors';
import {BankAccountService} from '../services/bank-account.service';
import {CreateBankAccountDTO, UpdateBankAccountDTO} from '../dto/bank-account.dto';

const resService = Container.get(ResHandlerService);
const bankAccountService = Container.get(BankAccountService);

export const getAllBankAccounts = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) {
            return resService.handleError(res, new BadRequestError(
                'auth.error',
                'User not authenticated',
                null
            ));
        }

        const bankAccounts = await bankAccountService.getAllByUserId(userId);
        return resService.handleSuccess(res, bankAccounts);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to fetch bank accounts',
            e
        ));
    }
};

export const getBankAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) {
            return resService.handleError(res, new BadRequestError(
                'auth.error',
                'User not authenticated',
                null
            ));
        }

        const id = parseInt(req.params.id);
        const bankAccount = await bankAccountService.getById(id, userId);

        if (!bankAccount) {
            return resService.handleError(res, new NotFoundError(
                'bank_account.not_found',
                'Bank account not found',
                null
            ));
        }

        return resService.handleSuccess(res, bankAccount);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to fetch bank account',
            e
        ));
    }
};

export const createBankAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) {
            return resService.handleError(res, new BadRequestError(
                'auth.error',
                'User not authenticated',
                null
            ));
        }

        const dto = plainToInstance(CreateBankAccountDTO, req.body) as CreateBankAccountDTO;
        const bankAccount = await bankAccountService.create(userId, dto);
        return resService.handleSuccess(res, bankAccount);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to create bank account',
            e
        ));
    }
};

export const updateBankAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) {
            return resService.handleError(res, new BadRequestError(
                'auth.error',
                'User not authenticated',
                null
            ));
        }

        const id = parseInt(req.params.id);
        const dto = plainToInstance(UpdateBankAccountDTO, req.body) as UpdateBankAccountDTO;
        const bankAccount = await bankAccountService.update(id, userId, dto);

        if (!bankAccount) {
            return resService.handleError(res, new NotFoundError(
                'bank_account.not_found',
                'Bank account not found',
                null
            ));
        }

        return resService.handleSuccess(res, bankAccount);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to update bank account',
            e
        ));
    }
};

export const deleteBankAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) {
            return resService.handleError(res, new BadRequestError(
                'auth.error',
                'User not authenticated',
                null
            ));
        }

        const id = parseInt(req.params.id);
        const deleted = await bankAccountService.delete(id, userId);

        if (!deleted) {
            return resService.handleError(res, new NotFoundError(
                'bank_account.not_found',
                'Bank account not found',
                null
            ));
        }

        return resService.handleSuccess(res, {message: 'Bank account deleted successfully'});
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to delete bank account',
            e
        ));
    }
};

export const setDefaultBankAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) {
            return resService.handleError(res, new BadRequestError(
                'auth.error',
                'User not authenticated',
                null
            ));
        }

        const id = parseInt(req.params.id);
        const bankAccount = await bankAccountService.setDefault(id, userId);

        if (!bankAccount) {
            return resService.handleError(res, new NotFoundError(
                'bank_account.not_found',
                'Bank account not found',
                null
            ));
        }

        return resService.handleSuccess(res, bankAccount);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to set default bank account',
            e
        ));
    }
};
