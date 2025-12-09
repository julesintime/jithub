import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function checkSchema() {
  console.log('Checking database schema...\n');

  // Get user table columns
  const userCols = await db.execute(sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'user'
    ORDER BY ordinal_position;
  `);
  console.log('=== USER TABLE COLUMNS ===');
  for (const row of userCols) {
    console.log(`- ${row.column_name}: ${row.data_type}`);
  }

  // Get organization table columns
  const orgCols = await db.execute(sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'organization'
    ORDER BY ordinal_position;
  `);
  console.log('\n=== ORGANIZATION TABLE COLUMNS ===');
  for (const row of orgCols) {
    console.log(`- ${row.column_name}: ${row.data_type}`);
  }

  // Get session table columns
  const sessionCols = await db.execute(sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'session'
    ORDER BY ordinal_position;
  `);
  console.log('\n=== SESSION TABLE COLUMNS ===');
  for (const row of sessionCols) {
    console.log(`- ${row.column_name}: ${row.data_type}`);
  }

  // Get member table columns
  const memberCols = await db.execute(sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'member'
    ORDER BY ordinal_position;
  `);
  console.log('\n=== MEMBER TABLE COLUMNS ===');
  for (const row of memberCols) {
    console.log(`- ${row.column_name}: ${row.data_type}`);
  }

  process.exit(0);
}

checkSchema();
