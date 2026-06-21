import {Column, Entity, ManyToOne, OneToOne} from 'typeorm';
import {MainEntity} from './main.abstract';
import {User} from "./user.model";
import {Event} from "./event.model";

@Entity()
export class InternalTransaction extends MainEntity {
	@ManyToOne(() => User, { onDelete: 'SET NULL' })
	receiverUser: User | User['id'];
	@Column()
	amount: number;
	@Column()
	fee: number;
	@Column()
	transactionDate: Date;
	@Column({ nullable: true })
	comment: string;
	@Column()
	isPaid: boolean;
	@OneToOne(() => Event, event => event.internalTransaction, { nullable: true })
	event?: Event;
	@Column({ nullable: true })
	withdrawType: string;
	@Column({ nullable: true })
	bitPhoneNumber: string;
	@Column({ nullable: true })
	bank: string;
	@Column({ nullable: true })
	branch: string;
	@Column({ nullable: true })
	accountNumber: string;
	@Column({ nullable: true })
	accountHolderName: string;
	@Column({ nullable: true })
	accountNationalId: string;
}