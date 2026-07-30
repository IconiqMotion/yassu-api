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

	/**
	 * What the notification points at, so the app can navigate when it is tapped.
	 * e.g. entityType 'group' + entityId 42 -> /group/42
	 */
	@Column({ nullable: true })
	entityType: string;

	@Column({ nullable: true })
	entityId: number;

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
