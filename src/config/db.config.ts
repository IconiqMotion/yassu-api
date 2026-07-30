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
		// Additive, idempotent column guards. synchronize is off in production, so new nullable
		// columns are ensured here instead.
		const columnGuards = [
			'ALTER TABLE "credit_card_request" ADD COLUMN IF NOT EXISTS "lowProfileId" varchar',
			// Lets the app navigate to whatever a notification is about when it is tapped.
			'ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "entityType" varchar',
			'ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "entityId" integer',
		];

		for (const statement of columnGuards) {
			try {
				await conn.query(statement);
			} catch (e) {
				Logger.error(`Failed to ensure column: ${statement} - ${e.message}`);
			}
		}
	}

	return conn;
};

export default bootstrapDb;
