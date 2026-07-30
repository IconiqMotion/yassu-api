import {IsString, Matches} from 'class-validator';
import {ISRAEL_MOBILE_REGEX} from '../../services/utils.service';

export class RegisterDTO {
	@IsString()
	// without this any string reaches sms4free as a recipient, and the caller still gets a 200
	@Matches(ISRAEL_MOBILE_REGEX, { message: 'phone must be a valid israeli mobile number' })
	phone: string;
}
