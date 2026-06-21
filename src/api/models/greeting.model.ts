import {AfterLoad, Column, Entity, ManyToOne, RelationId} from 'typeorm';
import { MainEntity } from './main.abstract';
import {User} from "./user.model";
import {Event} from "./event.model";
import {Group} from "./group.model";

@Entity()
export class Greeting extends MainEntity {
	@ManyToOne(() => User, { onDelete: 'SET NULL' })
	senderUser: User | User['id'];
	@RelationId(({ senderUser }: Greeting) => senderUser)
	senderUserId: User['id'];
	@ManyToOne(() => User, { onDelete: 'SET NULL' })
	receiverUser: User | User['id'];
	@RelationId(({ receiverUser }: Greeting) => receiverUser)
	receiverUserId: User['id'];
	@Column({ nullable: true })
	imageURL: string;
	@Column({ nullable: true })
	videoURL: string;
	@Column({ nullable: true })
	greetingText: string;
	@Column({ nullable: true })
	amountOfMoney: number;
	@Column({default: false})
	finishedProcessing: boolean;
	@Column({ nullable: true })
	reference: string;
	@ManyToOne(() => Event, { nullable: true, onDelete: 'CASCADE' })
	event?: Event | Event['id'];
	@RelationId(({ event }: Greeting) => event)
	eventId: Event['id'];
	@ManyToOne(() => Group, { nullable: true, onDelete: 'CASCADE' })
	group?: Group | Group['id'];
	@RelationId(({ group }: Greeting) => group)
	groupId: Group['id'];

	@AfterLoad()
	afterLoad() {
		this.greetingText = this.greetingText || 'מזל טוב :)';
	}
}
