import { Client } from '../../src/api/models/client.model';
import { User as UserModel } from '../../src/api/models/user.model';

declare global {
	
	namespace Express {
		export interface Request {
			user?: UserModel;
			clientData?: Client;
			moment?: any;
		}
	}
}
