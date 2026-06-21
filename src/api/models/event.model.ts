import {AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, RelationId} from 'typeorm';
import { MainEntity } from './main.abstract';
import {User} from "./user.model";
import {EEventType, EMoneyRequestedStatus, ETransactionType} from "./enums";
import {Greeting} from "./greeting.model";
import {Transaction} from "./transaction.model";
import {InternalTransaction} from "./internal-transaction.model";

@Entity()
export class Event extends MainEntity {
	@Column()
	day: number;
	@Column()
	month: number;
	@Column({nullable: true})
	year: number;
	@Column({default: false})
	finishedProcessing: boolean;
	@Column({ nullable: true })
	name: string;
	@Column({ nullable: true })
	image: string;
	@Column({ nullable: true, default: false })
	notified: boolean;
	@Column()
	receiverPhoneNumber: string;
	@Column({type: "enum", enum: EMoneyRequestedStatus, default: EMoneyRequestedStatus.INITIAL})
	moneyRequestedStatus: EMoneyRequestedStatus;
	@ManyToOne(() => User, { onDelete: 'SET NULL' })
	receiverUser: User | User['id'];
	@RelationId(({ receiverUser }: Transaction) => receiverUser)
	receiverUserId: User['id'];
	@OneToMany(() => Greeting, greeting => greeting.event, { cascade: true })
	greetings: Greeting[];
	@OneToOne(() => InternalTransaction, internalTransaction => internalTransaction.event, { nullable: true })
	@JoinColumn()
	internalTransaction: InternalTransaction;

	@AfterLoad()
	afterLoad() {
		this.image = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1469&q=80';
	}
}

