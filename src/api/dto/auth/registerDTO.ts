import {IsNumberString, IsPhoneNumber, IsString, Length} from 'class-validator';

export class RegisterDTO {
	@IsString()
	phone: string;
}
