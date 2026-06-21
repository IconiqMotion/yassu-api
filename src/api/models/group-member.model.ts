import { Column, Entity, ManyToOne, JoinColumn, RelationId } from 'typeorm';
import { MainEntity } from './main.abstract';
import { User } from './user.model';
import { Group } from './group.model';

@Entity()
export class GroupMember extends MainEntity {
    @ManyToOne(() => Group, group => group.groupMembers, { onDelete: 'CASCADE' })
    @JoinColumn()
    group: Group;
    
    @RelationId((groupMember: GroupMember) => groupMember.group)
    groupId: number;
    
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;
    
    @RelationId((groupMember: GroupMember) => groupMember.user)
    userId: number;
    
    @Column({ default: false })
    accepted: boolean;
}
