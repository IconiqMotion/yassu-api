import {Column, Entity, ManyToOne, RelationId} from 'typeorm';
import { MainEntity } from './main.abstract';
import {User} from "./user.model";
import {ETransactionType} from "./enums";
import {Event} from "./event.model";
import {Group} from "./group.model";

@Entity()
export class Transaction extends MainEntity {
	@ManyToOne(() => User, { onDelete: 'SET NULL' })
	senderUser: User | User['id'];
	@RelationId(({ senderUser }: Transaction) => senderUser)
	senderUserId: User['id'];
	@ManyToOne(() => User, { onDelete: 'SET NULL' })
	receiverUser: User | User['id'];
	@RelationId(({ receiverUser }: Transaction) => receiverUser)
	receiverUserId: User['id'];
	@Column()
	amount: number;
	@Column({default: false})
	finishedProcessing: boolean;
	@Column({ nullable: true })
	reference: string;
	@Column({type: "enum", enum: ETransactionType, default: ETransactionType.CREDIT})
	type: ETransactionType;
	@ManyToOne(() => Event, { nullable: true, onDelete: 'CASCADE' })
	event?: Event | Event['id'];
	@RelationId(({ event }: Transaction) => event)
	eventId: Event['id'];
	@ManyToOne(() => Event, { nullable: true, onDelete: 'CASCADE' })
	group?: Group | Group['id'];
	@RelationId(({ group }: Transaction) => group)
	groupId: Group['id'];

}

