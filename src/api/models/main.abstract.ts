import {
	BaseEntity,
	CreateDateColumn,
	DeleteDateColumn,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
	VersionColumn
} from 'typeorm';

export abstract class MainEntity extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
	_createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
	_updatedAt: Date;

	@DeleteDateColumn()
	_deletedAt?: Date;

	@VersionColumn()
	_version: number;

	_type = this.constructor.name;
}
