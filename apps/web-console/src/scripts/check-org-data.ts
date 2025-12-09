import { db } from '../lib/db';
import { organization, member, user } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkOrgData() {
  console.log('Checking organization data...\n');

  // Check all organizations
  const orgs = await db.select().from(organization);
  console.log('All organizations:', orgs.length);
  orgs.forEach(org => {
    console.log(`- ${org.name} (${org.slug}): ${org.id}`);
  });

  // Check specific organization
  const specificOrg = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, 'example-com'));
  console.log('\nOrganization with slug "example-com":', specificOrg.length);
  console.log(specificOrg);

  // Check all members
  const members = await db.select().from(member);
  console.log('\nAll members:', members.length);
  members.forEach(m => {
    console.log(`- User ${m.userId} in Org ${m.organizationId}: ${m.role}`);
  });

  // Check test user
  const testUser = await db
    .select()
    .from(user)
    .where(eq(user.email, 'testuser@example.com'));
  console.log('\nTest user:', testUser.length);
  if (testUser.length > 0) {
    console.log(`- ${testUser[0].email}: ${testUser[0].id}`);
  }

  process.exit(0);
}

checkOrgData();
