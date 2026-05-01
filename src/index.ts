import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

export interface Env {
  DATABASE_URL: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (!env.DATABASE_URL) {
        return new Response(JSON.stringify({ error: "Missing DATABASE_URL secret. Run 'npx wrangler secret put DATABASE_URL'." }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const sql = neon(env.DATABASE_URL);
      const db = drizzle(sql, { schema });
      const url = new URL(request.url);
      const path = url.pathname;

      // GET /api/sync -> Returns the full database state
      if ((path === '/api/sync' || path === '/sync') && request.method === 'GET') {
        const inventory = await db.select().from(schema.inventory);
        const customers = await db.select().from(schema.customers);
        const vehicles = await db.select().from(schema.vehicles);
        const sales = await db.select().from(schema.sales);
        
        return new Response(JSON.stringify({
          inventory,
          customers,
          vehicles,
          sales,
          retailerPrices: [], // Keep defaults or implement later
          auditLogs: [] // Keep defaults or implement later
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // POST /api/sync -> Saves the full database state (Basic implementation)
      if ((path === '/api/sync' || path === '/sync') && request.method === 'POST') {
        const data: any = await request.json();
        
        // Very basic sync: just clearing and re-inserting for this architecture.
        // In a real app, you would upsert individual records.
        if (data.inventory && data.inventory.length > 0) {
          await sql`TRUNCATE TABLE inventory CASCADE;`;
          // Map local fields to DB fields
          const mappedInventory = data.inventory.map((item: any) => ({
            name: item.name,
            partNumber: item.partNumber,
            barcode: item.barcode,
            category: item.category,
            supplier: item.supplier,
            brand: item.brand,
            location: item.location,
            cost: item.cost ? item.cost.toString() : "0",
            price: item.price ? item.price.toString() : "0",
            stock: item.stock,
            minStock: item.minStock
          }));
          await db.insert(schema.inventory).values(mappedInventory);
        }

        if (data.customers && data.customers.length > 0) {
          await sql`TRUNCATE TABLE customers CASCADE;`;
          const mappedCustomers = data.customers.map((c: any) => ({
            name: c.name,
            phone: c.phone,
            email: c.email
          }));
          await db.insert(schema.customers).values(mappedCustomers);
        }

        return new Response(JSON.stringify({ success: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response('API is running. Use /api/sync.', { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  },
} satisfies ExportedHandler<Env>;
