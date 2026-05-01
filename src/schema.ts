import { pgTable, serial, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  partNumber: varchar('part_number', { length: 100 }).notNull(),
  barcode: varchar('barcode', { length: 100 }),
  category: varchar('category', { length: 100 }),
  supplier: varchar('supplier', { length: 100 }),
  brand: varchar('brand', { length: 100 }),
  location: varchar('location', { length: 100 }),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  make: varchar('make', { length: 100 }),
  model: varchar('model', { length: 100 }),
  year: integer('year'),
  vin: varchar('vin', { length: 17 }),
  customerId: integer('customer_id').references(() => customers.id),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id),
  status: varchar('status', { length: 50 }),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  margin: decimal('margin', { precision: 10, scale: 2 }),
  date: timestamp('date').defaultNow().notNull()
});
