import { Column, Entity, BeforeInsert } from 'typeorm';
import { MainEntity } from './main.abstract';
import { hashSync } from 'bcrypt-nodejs';

@Entity()
export class Admin extends MainEntity {
    @Column({ unique: true })
    username: string;

    @Column()
    password: string;

    @Column({ nullable: true })
    fullName: string;

    @Column({ nullable: true })
    email: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    lastLoginAt: Date;

    @BeforeInsert()
    hashPassword() {
        if (this.password) {
            this.password = hashSync(this.password);
        }
    }

    /**
     * Validates password against stored hash
     */
    validatePassword(password: string): boolean {
        const bcrypt = require('bcrypt-nodejs');
        return bcrypt.compareSync(password, this.password);
    }
}

