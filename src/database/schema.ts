import {
  char,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const guestSessions = pgTable('isabella_guest_sessions', {
  tokenHash: char('token_hash', { length: 64 }).primaryKey(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  lastSeenAt: timestamptz('last_seen_at').notNull().defaultNow(),
  expiresAt: timestamptz('expires_at').notNull(),
});

export const chatSessions = pgTable(
  'isabella_chat_sessions',
  {
    ownerKeyHash: char('owner_key_hash', { length: 64 }).notNull(),
    id: uuid('id').notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.ownerKeyHash, table.id] })]
);

export const chatMessages = pgTable(
  'isabella_chat_messages',
  {
    ownerKeyHash: char('owner_key_hash', { length: 64 }).notNull(),
    sessionId: uuid('session_id').notNull(),
    messageId: uuid('message_id').notNull(),
    position: integer('position').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    context: text('context'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerKeyHash, table.sessionId, table.messageId] }),
    unique('isabella_chat_messages_owner_session_position_key').on(
      table.ownerKeyHash,
      table.sessionId,
      table.position
    ),
  ]
);

export const atlasHcuNodes = pgTable(
  'atlas_hcu_nodes',
  {
    ownerKeyHash: char('owner_key_hash', { length: 64 }).notNull(),
    id: uuid('id').notNull(),
    name: varchar('name', { length: 140 }).notNull(),
    domain: varchar('domain', { length: 80 }).notNull(),
    influence: numeric('influence', { precision: 6, scale: 3 }).notNull(),
    risk: numeric('risk', { precision: 6, scale: 3 }).notNull(),
    evidence: numeric('evidence', { precision: 6, scale: 3 }).notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.ownerKeyHash, table.id] })]
);

export const atlasHcuEdges = pgTable(
  'atlas_hcu_edges',
  {
    ownerKeyHash: char('owner_key_hash', { length: 64 }).notNull(),
    id: uuid('id').notNull(),
    sourceNodeId: uuid('source_node_id').notNull(),
    targetNodeId: uuid('target_node_id').notNull(),
    effectSign: smallint('effect_sign').notNull(),
    strength: numeric('strength', { precision: 6, scale: 3 }).notNull(),
    lagYears: integer('lag_years').notNull(),
    evidenceSource: varchar('evidence_source', { length: 600 }).notNull().default(''),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.ownerKeyHash, table.id] })]
);
