/**
 * One-off repair for group members lost to the inviteMembersToGroup orphaning bug.
 *
 * Background
 * ----------
 * inviteMembersToGroup used to finish with group.save() while the cascade-enabled
 * groupMembers relation was loaded without the rows it had just created. TypeORM treated the
 * missing rows as unbound and set group_member."groupId" to NULL, so every member added to an
 * existing group disappeared from the group and from their own invitations list — even though the
 * invite notification had already gone out.
 *
 * The legacy members many-to-many (group_members_user) was written successfully in the same
 * request, so the lost memberships can be rebuilt from it.
 *
 * What this does
 * --------------
 *   1. Recreates a group_member row (accepted = false) for every group_members_user pair that
 *      has no bound group_member row.
 *   2. Deletes group_member rows with a NULL groupId — unusable leftovers of the bug.
 *
 * Both steps are idempotent: running it twice changes nothing the second time.
 *
 * Usage
 * -----
 *   Dry run (default — reports what it would do, writes nothing):
 *     npx ts-node src/repair-group-members.ts --env=prod
 *   Apply:
 *     npx ts-node src/repair-group-members.ts --env=prod --apply
 *
 *   On Heroku:
 *     heroku run node dist/repair-group-members.js --env=prod --apply -a <app>
 */
import 'dotenv/config';
import 'reflect-metadata';
import bootstrapDb from './config/db.config';

const APPLY = process.argv.includes('--apply');

async function main() {
	const conn = await bootstrapDb();
	if (!conn) {
		console.error('Could not connect to the database');
		process.exit(1);
	}

	console.log(APPLY ? '=== REPAIR (applying changes) ===' : '=== REPAIR (dry run — no changes) ===');

	// 1) Memberships present in the m2m but missing a bound group_member row
	const missing = await conn.query(`
		SELECT gmu."groupId", gmu."userId", g.name AS group_name, u.phone, u."fullName"
		FROM group_members_user gmu
		JOIN "group" g ON g.id = gmu."groupId"
		LEFT JOIN "user" u ON u.id = gmu."userId"
		WHERE g."_deletedAt" IS NULL
		  AND NOT EXISTS (
			SELECT 1 FROM group_member gm
			WHERE gm."groupId" = gmu."groupId" AND gm."userId" = gmu."userId"
		  )
		ORDER BY gmu."groupId", gmu."userId"
	`);

	console.log(`\nMemberships to restore: ${missing.length}`);
	for (const row of missing) {
		console.log(`  group ${row.groupId} ("${row.group_name}") <- user ${row.userId} (${row.phone || 'no phone'} ${row.fullName || ''})`);
	}

	// 2) Rows the bug unbound from their group
	const orphanCount = await conn.query(`SELECT COUNT(*)::int AS count FROM group_member WHERE "groupId" IS NULL`);
	console.log(`\nOrphaned group_member rows to delete: ${orphanCount[0].count}`);

	if (!APPLY) {
		console.log('\nDry run complete. Re-run with --apply to make these changes.');
		await conn.close();
		return;
	}

	if (missing.length > 0) {
		const restored = await conn.query(`
			INSERT INTO group_member ("groupId", "userId", accepted, created_at, updated_at, "_version")
			SELECT gmu."groupId", gmu."userId", false, NOW(), NOW(), 1
			FROM group_members_user gmu
			JOIN "group" g ON g.id = gmu."groupId"
			WHERE g."_deletedAt" IS NULL
			  AND NOT EXISTS (
				SELECT 1 FROM group_member gm
				WHERE gm."groupId" = gmu."groupId" AND gm."userId" = gmu."userId"
			  )
			RETURNING id
		`);
		console.log(`\nRestored ${restored[0]?.length ?? restored.length} membership row(s).`);
	}

	if (orphanCount[0].count > 0) {
		await conn.query(`DELETE FROM group_member WHERE "groupId" IS NULL`);
		console.log(`Deleted ${orphanCount[0].count} orphaned row(s).`);
	}

	// Verify nothing is left behind
	const remaining = await conn.query(`
		SELECT COUNT(*)::int AS count
		FROM group_members_user gmu
		JOIN "group" g ON g.id = gmu."groupId"
		WHERE g."_deletedAt" IS NULL
		  AND NOT EXISTS (
			SELECT 1 FROM group_member gm
			WHERE gm."groupId" = gmu."groupId" AND gm."userId" = gmu."userId"
		  )
	`);
	const remainingOrphans = await conn.query(`SELECT COUNT(*)::int AS count FROM group_member WHERE "groupId" IS NULL`);
	console.log(`\nRemaining unrestored memberships: ${remaining[0].count}`);
	console.log(`Remaining orphaned rows: ${remainingOrphans[0].count}`);
	console.log('\nRepair complete.');

	await conn.close();
}

main().catch((e) => {
	console.error('Repair failed:', e);
	process.exit(1);
});
