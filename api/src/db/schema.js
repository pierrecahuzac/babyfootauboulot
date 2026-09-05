import { pgTable, serial, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  pseudo: text('pseudo').notNull().unique(),
  poste: text('poste').notNull().$type(), // 'Attaque' | 'Défense' | 'Attaque / Défense'
  niveau: text('niveau').notNull().$type(), // 'Débutant' | 'Intermédiaire' | 'Confirmé'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  pseudo: text('pseudo').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  poste: text('poste').notNull().$type(),
  niveau: text('niveau').notNull().$type(),
  role: text('role').notNull().default('user').$type(), // 'admin' | 'user'
  emailVerified: integer('email_verified').default(0),
  verificationToken: text('verification_token'),
  verificationExpires: timestamp('verification_expires', { withTimezone: true }),
  resetToken: text('reset_token'),
  resetExpires: timestamp('reset_expires', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  format: text('format').notNull().$type(), // '1v1' | '2v2'
  teamBleue: jsonb('team_bleue').notNull().$type(), // [{id, pseudo, poste}]
  teamRouge: jsonb('team_rouge').notNull().$type(),
  scoreBleue: integer('score_bleue').notNull(),
  scoreRouge: integer('score_rouge').notNull(),
  ligueId: integer('ligue_id').references(() => ligues.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const ligues = pgTable('ligues', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  ownerId: integer('owner_id').references(() => users.id),
  inviteCode: text('invite_code').notNull().unique(),
  isPrivate: integer('is_private').default(1), // 1 = privé par code
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const ligueMembers = pgTable('ligue_members', {
  id: serial('id').primaryKey(),
  ligueId: integer('ligue_id').notNull().references(() => ligues.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().$type(), // 'owner' | 'member'
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
});
