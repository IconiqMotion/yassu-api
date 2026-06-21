import {Service} from 'typedi';
import {Repository, getRepository} from 'typeorm';
import {BankAccount, EWithdrawType} from '../models/bank-account.model';
import {User} from '../models/user.model';
import {CreateBankAccountDTO, UpdateBankAccountDTO} from '../dto/bank-account.dto';

@Service()
export class BankAccountService {
    private repo: Repository<BankAccount>;

    getRepository() {
        if (!this.repo) {
            this.repo = getRepository(BankAccount);
        }
        return this.repo;
    }

    async getAllByUserId(userId: number): Promise<BankAccount[]> {
        return await this.getRepository().find({
            where: {user: userId},
            order: {isDefault: 'DESC', _createdAt: 'DESC'}
        });
    }

    async getById(id: number, userId: number): Promise<BankAccount | undefined> {
        return await this.getRepository().findOne({
            where: {id, user: userId}
        });
    }

    async create(userId: number, dto: CreateBankAccountDTO): Promise<BankAccount> {
        // If this is set as default, unset other defaults
        if (dto.isDefault) {
            await this.unsetAllDefaults(userId);
        }

        // If this is the first account, make it default
        const existingCount = await this.getRepository().count({where: {user: userId}});
        const isDefault = existingCount === 0 ? true : (dto.isDefault ?? false);

        const bankAccount = this.getRepository().create({
            user: userId,
            withdrawType: dto.withdrawType,
            bitPhoneNumber: dto.bitPhoneNumber,
            bank: dto.bank,
            branch: dto.branch,
            accountNumber: dto.accountNumber,
            accountHolderName: dto.accountHolderName,
            accountNationalId: dto.accountNationalId,
            isDefault
        });

        return await this.getRepository().save(bankAccount);
    }

    async update(id: number, userId: number, dto: UpdateBankAccountDTO): Promise<BankAccount | null> {
        const bankAccount = await this.getById(id, userId);
        if (!bankAccount) {
            return null;
        }

        // If setting as default, unset other defaults
        if (dto.isDefault && !bankAccount.isDefault) {
            await this.unsetAllDefaults(userId);
        }

        Object.assign(bankAccount, dto);
        return await this.getRepository().save(bankAccount);
    }

    async delete(id: number, userId: number): Promise<boolean> {
        const bankAccount = await this.getById(id, userId);
        if (!bankAccount) {
            return false;
        }

        const wasDefault = bankAccount.isDefault;
        await this.getRepository().remove(bankAccount);

        // If deleted account was default, set another as default
        if (wasDefault) {
            const remaining = await this.getAllByUserId(userId);
            if (remaining.length > 0) {
                remaining[0].isDefault = true;
                await this.getRepository().save(remaining[0]);
            }
        }

        return true;
    }

    async setDefault(id: number, userId: number): Promise<BankAccount | null> {
        const bankAccount = await this.getById(id, userId);
        if (!bankAccount) {
            return null;
        }

        await this.unsetAllDefaults(userId);
        bankAccount.isDefault = true;
        return await this.getRepository().save(bankAccount);
    }

    private async unsetAllDefaults(userId: number): Promise<void> {
        await this.getRepository()
            .createQueryBuilder()
            .update(BankAccount)
            .set({isDefault: false})
            .where('userId = :userId', {userId})
            .execute();
    }

    async getDefault(userId: number): Promise<BankAccount | undefined> {
        return await this.getRepository().findOne({
            where: {user: userId, isDefault: true}
        });
    }
}
