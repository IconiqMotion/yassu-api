import {Column, Entity, ManyToOne, RelationId} from 'typeorm';
import { MainEntity } from './main.abstract';
import {Event} from "./event.model";
import {User} from "./user.model";

@Entity()
export class CreditCardRequest extends MainEntity {
	@ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
	user?: User | User['id'];
	@RelationId(({ user }: CreditCardRequest) => user)
	userId: User['id'];
	@Column({nullable: true, default: false})
	used: boolean;
}
