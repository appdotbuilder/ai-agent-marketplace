import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userTypeEnum = pgEnum('user_type', ['creator', 'buyer', 'both']);
export const transactionTypeEnum = pgEnum('transaction_type', ['purchase', 'sale_earning', 'withdrawal', 'refund']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  full_name: text('full_name').notNull(),
  credit_balance: numeric('credit_balance', { precision: 10, scale: 2 }).notNull().default('0'),
  total_earned: numeric('total_earned', { precision: 10, scale: 2 }).notNull().default('0'),
  user_type: userTypeEnum('user_type').notNull().default('buyer'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// AI Agents table
export const aiAgentsTable = pgTable('ai_agents', {
  id: serial('id').primaryKey(),
  creator_id: integer('creator_id').notNull().references(() => usersTable.id),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  key_features: json('key_features').$type<string[]>().notNull(),
  screenshots: json('screenshots').$type<string[]>().notNull().default([]),
  category_id: integer('category_id').notNull().references(() => categoriesTable.id),
  is_active: boolean('is_active').notNull().default(true),
  total_sales: integer('total_sales').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Purchases table
export const purchasesTable = pgTable('purchases', {
  id: serial('id').primaryKey(),
  buyer_id: integer('buyer_id').notNull().references(() => usersTable.id),
  agent_id: integer('agent_id').notNull().references(() => aiAgentsTable.id),
  creator_id: integer('creator_id').notNull().references(() => usersTable.id),
  price_paid: numeric('price_paid', { precision: 10, scale: 2 }).notNull(),
  purchase_date: timestamp('purchase_date').defaultNow().notNull(),
});

// Credit Transactions table
export const creditTransactionsTable = pgTable('credit_transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  transaction_type: transactionTypeEnum('transaction_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  reference_id: integer('reference_id'), // References purchase_id or other transaction
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdAgents: many(aiAgentsTable),
  purchases: many(purchasesTable, { relationName: 'buyer_purchases' }),
  sales: many(purchasesTable, { relationName: 'creator_sales' }),
  creditTransactions: many(creditTransactionsTable),
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  agents: many(aiAgentsTable),
}));

export const aiAgentsRelations = relations(aiAgentsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [aiAgentsTable.creator_id],
    references: [usersTable.id],
  }),
  category: one(categoriesTable, {
    fields: [aiAgentsTable.category_id],
    references: [categoriesTable.id],
  }),
  purchases: many(purchasesTable),
}));

export const purchasesRelations = relations(purchasesTable, ({ one }) => ({
  buyer: one(usersTable, {
    fields: [purchasesTable.buyer_id],
    references: [usersTable.id],
    relationName: 'buyer_purchases',
  }),
  creator: one(usersTable, {
    fields: [purchasesTable.creator_id],
    references: [usersTable.id],
    relationName: 'creator_sales',
  }),
  agent: one(aiAgentsTable, {
    fields: [purchasesTable.agent_id],
    references: [aiAgentsTable.id],
  }),
}));

export const creditTransactionsRelations = relations(creditTransactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [creditTransactionsTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type AIAgent = typeof aiAgentsTable.$inferSelect;
export type NewAIAgent = typeof aiAgentsTable.$inferInsert;

export type Purchase = typeof purchasesTable.$inferSelect;
export type NewPurchase = typeof purchasesTable.$inferInsert;

export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;
export type NewCreditTransaction = typeof creditTransactionsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  categories: categoriesTable,
  aiAgents: aiAgentsTable,
  purchases: purchasesTable,
  creditTransactions: creditTransactionsTable,
};