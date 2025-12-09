/**
 * Phase 1 Database Migration
 *
 * Adds new tables and columns for user-chosen organization names workflow:
 * - reserved_slugs table
 * - keycloak_sync_state table
 * - Additional organization columns (keycloak_org_id, custom_domain, etc.)
 * - Additional invitation columns (keycloak_invitation_id, accepted_at)
 */

import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { RESERVED_SLUGS } from '../lib/utils/slug';

async function migrate() {
  console.log('🚀 Starting Phase 1 database migration...\n');

  try {
    // Step 1: Add new columns to organization table
    console.log('📝 Adding columns to organization table...');

    await db.execute(sql`
      ALTER TABLE organization
      ADD COLUMN IF NOT EXISTS keycloak_org_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS custom_domain TEXT,
      ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT FALSE NOT NULL,
      ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES "user"(id),
      ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free'
    `);

    console.log('✅ Organization table updated\n');

    // Step 2: Add new columns to invitation table
    console.log('📝 Adding columns to invitation table...');

    await db.execute(sql`
      ALTER TABLE invitation
      ADD COLUMN IF NOT EXISTS keycloak_invitation_id TEXT,
      ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP
    `);

    console.log('✅ Invitation table updated\n');

    // Step 3: Create reserved_slugs table
    console.log('📝 Creating reserved_slugs table...');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reserved_slugs (
        slug TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log('✅ Reserved slugs table created\n');

    // Step 4: Create keycloak_sync_state table
    console.log('📝 Creating keycloak_sync_state table...');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS keycloak_sync_state (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        keycloak_id TEXT NOT NULL,
        last_synced_at TIMESTAMP DEFAULT NOW() NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'synced',
        sync_error TEXT,
        UNIQUE(entity_type, entity_id)
      )
    `);

    console.log('✅ Keycloak sync state table created\n');

    // Step 5: Insert reserved slugs
    console.log('📝 Inserting reserved slugs...');

    const values = RESERVED_SLUGS.map((slug) => `('${slug}', 'System reserved')`).join(', ');

    await db.execute(sql.raw(`
      INSERT INTO reserved_slugs (slug, reason)
      VALUES ${values}
      ON CONFLICT (slug) DO NOTHING
    `));

    console.log(`✅ Inserted ${RESERVED_SLUGS.length} reserved slugs\n`);

    console.log('🎉 Phase 1 migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
