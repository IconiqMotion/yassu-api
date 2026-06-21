import {Column, Entity, ManyToOne, RelationId} from 'typeorm';
import {MainEntity} from './main.abstract';
import {User} from "./user.model";

export enum EWithdrawType {
    BANK = 'BANK',
    BIT = 'BIT'
}

@Entity()
export class BankAccount extends MainEntity {
    @ManyToOne(() => User, user => user.bankAccounts, {nullable: false, onDelete: 'CASCADE'})
    user?: User | User['id'];

    @RelationId(({user}: BankAccount) => user)
    userId: User['id'];

    @Column({type: 'enum', enum: EWithdrawType})
    withdrawType: EWithdrawType;

    // For BIT
    @Column({nullable: true})
    bitPhoneNumber: string;

    // For BANK
    @Column({nullable: true})
    bank: string;

    @Column({nullable: true})
    branch: string;

    @Column({nullable: true})
    accountNumber: string;

    @Column({nullable: true})
    accountHolderName: string;

    @Column({nullable: true})
    accountNationalId: string;

    @Column({default: false})
    isDefault: boolean;
}
