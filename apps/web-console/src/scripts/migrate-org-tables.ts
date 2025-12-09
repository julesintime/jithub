import { sql } from 'drizzle-orm';
import { db } from '../lib/db';

async function migrateOrganizationTables() {
  console.log('Creating organization tables...');

  try {
    // Drop and recreate organization table with snake_case columns
    await db.execute(sql`DROP TABLE IF EXISTS invitation CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS member CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS organization CASCADE;`);

    await db.execute(sql`
      CREATE TABLE organization (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        logo TEXT,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✓ Created organization table');

    // Create member table
    await db.execute(sql`
      CREATE TABLE member (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✓ Created member table');

    // Create invitation table
    await db.execute(sql`
      CREATE TABLE invitation (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT,
        status TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        inviter_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✓ Created invitation table');

    console.log('✅ All organization tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

migrateOrganizationTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
