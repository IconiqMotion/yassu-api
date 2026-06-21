import {
	AfterLoad,
	Column,
	Entity,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
	OneToMany,
	OneToOne,
	RelationId
} from 'typeorm';
import {MainEntity} from "./main.abstract";
import {Transaction} from "./transaction.model";
import {CreditCard} from "./credit-card.model";
import {EEventType, EGender, EMoneyRequestedStatus} from "./enums";
import {Event} from "./event.model";
import {IsDate, IsString} from "class-validator";
import {Type} from "class-transformer";
import {User} from "./user.model";
import {Greeting} from "./greeting.model";
import {InternalTransaction} from "./internal-transaction.model";
import {GroupMember} from "./group-member.model";

@Entity()
export class Group extends MainEntity {
	@Column()
	name: string;

	@Column({ nullable: true })
	comment: string;
	@ManyToOne(() => User, { onDelete: 'SET NULL' })
	adminUser: User | User['id'];
	@RelationId(({ adminUser }: Group) => adminUser)
	adminUserId: User['id'];
	@ManyToOne(() => User, { onDelete: 'SET NULL' })
	targetUser: User | User['id'];
	@RelationId(({ targetUser }: Group) => targetUser)
	targetUserId: User['id'];
	@OneToMany(() => GroupMember, groupMember => groupMember.group, { cascade: true })
	groupMembers: GroupMember[];
	
	@ManyToMany(() => User)
	@JoinTable()
	members: User[];
	@Column({ type: 'date' })
	dueDate: Date;
	@Column({ default: false })
	isOpened: boolean;
	@OneToOne(() => InternalTransaction, internalTransaction => internalTransaction.event, { nullable: true })
	@JoinColumn()
	internalTransaction: InternalTransaction;
	@Column({type: "enum", enum: EMoneyRequestedStatus, default: EMoneyRequestedStatus.INITIAL})
	moneyRequestedStatus: EMoneyRequestedStatus;
	@OneToMany(() => Greeting, (greeting) => greeting.group, { cascade: true })
	greetings: Greeting[];
}

