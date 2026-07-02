import { createConnection } from 'typeorm';
import Logger from './logger.config';
import ormConfig from './orm.config';

const bootstrapDb = async () => {
	let conn;
	try {
		conn = await createConnection({ ...ormConfig, type: 'postgres' });
	} catch (e) {
		conn = false;
		Logger.error(e.message);
	}

	if (conn) {
		try {
			await conn.query('ALTER TABLE "credit_card_request" ADD COLUMN IF NOT EXISTS "lowProfileId" varchar');
		} catch (e) {
			Logger.error(`Failed to ensure lowProfileId column: ${e.message}`);
		}
	}

	return conn;
};

export default bootstrapDb;
