import {AfterLoad, Column, Entity, JoinTable, ManyToMany, OneToMany} from 'typeorm';
import {MainEntity} from "./main.abstract";
import {Transaction} from "./transaction.model";
import {CreditCard} from "./credit-card.model";
import {BankAccount} from "./bank-account.model";
import {EEventType, EGender} from "./enums";
import {Event} from "./event.model";
import {IsDate, IsString} from "class-validator";
import {Type} from "class-transformer";

@Entity()
export class User extends MainEntity {

	@Column({ nullable: false })
	phone: string;

	@Column({ nullable: true })
	profileImage: string;

	@Column({ nullable: true })
	fullName: string;

	@Column({ nullable: true })
	firstName: string;

	@Column({ nullable: true })
	lastName: string;

	@Column({ nullable: true })
	email: string;

	@Column({ nullable: true })
	city: string;

	@Column({ nullable: true })
	idNumber: number;

	@Column({ nullable: true, default: true })
	isActive: boolean;

	@Column({ nullable: true })
	isNew: boolean;

	@Column({ type: 'date', nullable: true })
	birthDate: Date;

	@Column({ nullable: true })
	fcmToken: string;

	@Column({type: "enum", enum: EGender, nullable: true, default: null})
	gender: EGender | null;

	@OneToMany(() => CreditCard, card => card.user, { cascade: true })
	savedCards: CreditCard[];

	@OneToMany(() => BankAccount, bankAccount => bankAccount.user, { cascade: true })
	bankAccounts: BankAccount[];

	@AfterLoad()
	async afterLoad() {
		if (this.firstName || this.lastName) {
			this.fullName = `${this.firstName ?? ""} ${this.lastName ?? ""}`.trim();
		}
	}

}
