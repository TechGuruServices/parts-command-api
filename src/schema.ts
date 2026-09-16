/**
 * PartsCommand CRM — Neon/Postgres schema (drizzle definitions).
 *
 * UPDATED 2026-09: these definitions now mirror the tables the deployed
 * worker actually creates (see ensureSchema() in src/index.ts). The API is
 * document-oriented: each row stores the PWA's record verbatim in a JSONB
 * `data` column keyed by the app's string id ('INV001', 'CUST003', ...).
 *
 * The previous column-per-field schema here never matched the live database
 * and would have generated destructive migrations via drizzle-kit.
 */
import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const inventory = pgTable('inventory', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const retailerPrices = pgTable('retailer_prices', {
  partNumber: text('part_number').primaryKey(),
  data: jsonb('data').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
