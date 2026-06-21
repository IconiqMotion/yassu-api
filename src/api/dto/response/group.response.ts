import { EGender } from "../../models/enums";

export interface GroupMemberResponse {
    id: number;
    fullName: string;
    phone: string;
    email?: string;
    profileImage?: string;
    gender: EGender;
    accepted: boolean; // Статус принятия приглашения
}

export interface GroupResponse {
    id: number;
    name: string;
    comment?: string;
    dueDate: Date;
    isOpened: boolean;
    adminUser: {
        id: number;
        fullName: string;
        phone: string;
    };
    targetUser: {
        id: number;
        fullName: string;
        phone: string;
    };
    members: GroupMemberResponse[]; // Участники с информацией о статусе
    greetings?: any[];
    moneyRequestedStatus: string;
}
