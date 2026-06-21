import {IsArray, IsDate, IsNumber, IsOptional, IsPhoneNumber, IsString, Max} from 'class-validator';

export class CreateGroupDTO {

	@IsString()
	name: string;

	@IsString()
	@IsOptional()
	comment: string;

	@IsDate()
	dueDate: Date;

	// array of phone numbers
	@IsPhoneNumber(null, { each: true })
	membersPhoneNumbers: string[];

	@IsPhoneNumber()
	receiverPhoneNumber: string;
}
export class InviteMembersDTO {

	// array of phone numbers
	@IsPhoneNumber(null, { each: true })
	membersPhoneNumbers: string[];
}
