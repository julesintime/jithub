import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  activeOrganizationId: text('activeOrganizationId'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  logo: text('logo'),
  metadata: text('metadata'),
  keycloakOrgId: text('keycloak_org_id').unique(), // Link to Keycloak organization UUID
  customDomain: text('custom_domain'), // Optional verified custom domain
  domainVerified: boolean('domain_verified').default(false).notNull(),
  createdBy: text('created_by').references(() => user.id), // User who created the organization
  subscriptionPlan: text('subscription_plan').default('free'), // free, pro, enterprise
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const member = pgTable('member', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const invitation = pgTable('invitation', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role'),
  status: text('status').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  inviterId: text('inviter_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  keycloakInvitationId: text('keycloak_invitation_id'), // Link to Keycloak invitation (optional)
  acceptedAt: timestamp('accepted_at'), // Timestamp when invitation was accepted
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

/**
 * Reserved slugs that cannot be used for organization names
 * Prevents users from claiming system routes like /admin, /api, etc.
 */
export const reservedSlugs = pgTable('reserved_slugs', {
  slug: text('slug').primaryKey(),
  reason: text('reason').notNull(), // Why this slug is reserved
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Sync state tracking between Keycloak and PostgreSQL
 * Helps track sync status, errors, and last sync time for entities
 */
export const keycloakSyncState = pgTable('keycloak_sync_state', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(), // 'organization', 'member', 'user'
  entityId: text('entity_id').notNull(), // Local PostgreSQL entity ID
  keycloakId: text('keycloak_id').notNull(), // Corresponding Keycloak ID
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
  syncStatus: text('sync_status').notNull().default('synced'), // 'synced', 'pending', 'error'
  syncError: text('sync_error'), // Error message if sync failed
});
