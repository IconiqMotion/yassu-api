import {AfterLoad, Column, Entity, ManyToOne, RelationId} from 'typeorm';
import { MainEntity } from './main.abstract';
import {Event} from "./event.model";
import {User} from "./user.model";

@Entity()
export class CreditCard extends MainEntity {
	@Column()
	token: string;
	@Column({nullable: true})
	cardYear: string;
	@Column({nullable: true})
	cardMonth: string;
	@Column({nullable: true})
	cardOwnerName: string;
	@Column({nullable: true})
	cardOwnerEmail: string;
	@Column({nullable: true})
	cardOwnerPhone: string;
	@Column({nullable: true})
	last4CardDigits: string;
	@Column({nullable: true})
	brand: string;
	@Column({nullable: true})
	expiration: Date;
	@Column({nullable: true})
	cardOwnerIdentityNumber: string;
	@Column({nullable: true})
	cardExpirationMMYY: string;
	@ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
	user?: User | User['id'];
	@RelationId(({ user }: CreditCard) => user)
	userId: User['id'];

}
