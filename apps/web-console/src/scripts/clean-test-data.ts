/**
 * Clean up test data from database
 */

import { db } from '../lib/db';
import { organization, member, invitation, user } from '../lib/db/schema';
import { sql } from 'drizzle-orm';

async function cleanTestData() {
  console.log('🧹 Cleaning test data...\n');

  try {
    // Delete test organizations
    const deletedOrgs = await db.execute(sql`
      DELETE FROM organization
      WHERE slug LIKE 'test-%'
      OR slug LIKE 'new-%'
      OR slug LIKE 'admin-%'
      OR name LIKE 'Test %'
      OR name LIKE 'New %'
    `);
    console.log(`✅ Deleted test organizations`);

    // Delete test invitations
    await db.execute(sql`
      DELETE FROM invitation
      WHERE email LIKE '%@example.com'
      OR email LIKE '%@external.com'
    `);
    console.log(`✅ Deleted test invitations`);

    // Delete test users
    await db.execute(sql`
      DELETE FROM "user"
      WHERE email LIKE '%@example.com'
      OR email LIKE 'test%'
    `);
    console.log(`✅ Deleted test users`);

    console.log('\n✨ Test data cleaned successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning test data:', error);
    process.exit(1);
  }
}

cleanTestData();
