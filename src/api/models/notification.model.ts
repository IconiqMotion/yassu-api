import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { MainEntity } from "./main.abstract";
import { User } from "./user.model";

@Entity()
export class Notification extends MainEntity {

	@Column({ nullable: false })
	title: string;

	@Column({ nullable: false })
	message: string;

	@Column({ nullable: false })
	type: string;

	@Column({ default: false })
	isRead: boolean;

	@Column({ type: 'timestamptz', nullable: true })
	readAt: Date;

	@ManyToOne(() => User, { nullable: false })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@Column({ name: 'user_id' })
	userId: number;
}
