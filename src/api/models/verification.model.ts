import { Column, Entity } from 'typeorm';
import { MainEntity } from './main.abstract';

@Entity()
export class Verification extends MainEntity {
	@Column()
	verificationCode: number;

	@Column()
	phone: string;

}
