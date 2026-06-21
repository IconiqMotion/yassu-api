import {Column, Entity, ManyToOne, RelationId} from 'typeorm';
import { MainEntity } from './main.abstract';
import {User} from "./user.model";
import {ETransactionType} from "./enums";
import {Event} from "./event.model";

@Entity()
export class Transfer extends MainEntity {
	@ManyToOne(() => User, { onDelete: 'SET NULL' })
	receiverUser: User | User['id'];
	@RelationId(({ receiverUser }: Transfer) => receiverUser)
	receiverUserId: User['id'];
	@Column()
	amount: number;
	@Column()
	date: Date;
	@Column({ nullable: true })
	comment: string;
	@Column()
	isDone: boolean;
}

