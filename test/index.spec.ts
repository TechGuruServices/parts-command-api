import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

/**
 * UPDATED 2026-09: the previous suite tested a "Hello World" template worker
 * that no longer exists in src/index.ts. These tests exercise the real routes
 * that the PartsCommand CRM PWA depends on. Routes needing DATABASE_URL are
 * skipped when the secret isn't present in the test environment.
 */

function makeCtx() {
	return createExecutionContext();
}

async function call(path: string, init?: RequestInit) {
	const ctx = makeCtx();
	const request = new Request(`http://example.com${path}`, init);
	const response = await worker.fetch(request, env as any, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

describe('PartsCommand CRM API worker', () => {
	describe('status & health', () => {
		it('GET / returns API status JSON', async () => {
			const res = await call('/');
			expect(res.status).toBe(200);
			const body = (await res.json()) as any;
			expect(body.message).toBe('PartsCommand CRM API');
			expect(body.status).toBe('online');
		});

		it('GET /health returns ok', async () => {
			const res = await call('/health');
			expect(res.status).toBe(200);
			const body = (await res.json()) as any;
			expect(body.status).toBe('ok');
			expect(body.ts).toBeTruthy();
		});

		it('unknown path returns 404 JSON with path', async () => {
			const res = await call('/definitely-not-a-route');
			expect(res.status).toBe(404);
			const body = (await res.json()) as any;
			expect(body.error).toBe('Not found');
			expect(body.path).toBe('/definitely-not-a-route');
		});

		it('OPTIONS preflight returns 204 with CORS headers', async () => {
			const res = await call('/sync', { method: 'OPTIONS' });
			expect(res.status).toBe(204);
			expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
		});
	});

	describe('RockAuto offline catalog fallback (no PYTHON_SERVICE_URL)', () => {
		it('GET /v1/rockauto/makes returns the built-in catalog', async () => {
			const res = await call('/v1/rockauto/makes');
			expect(res.status).toBe(200);
			const body = (await res.json()) as any;
			expect(body.source).toBe('offline-catalog');
			expect(Array.isArray(body.makes)).toBe(true);
			expect(body.makes.length).toBeGreaterThan(50);
			expect(body.makes).toContain('Toyota');
			expect(body.notice).toBeTruthy();
		});

		it('GET /v1/rockauto/years/Toyota returns a descending year list', async () => {
			const res = await call('/v1/rockauto/years/Toyota');
			expect(res.status).toBe(200);
			const body = (await res.json()) as any;
			expect(body.make).toBe('Toyota');
			expect(body.years.length).toBeGreaterThan(30);
			expect(body.years[0]).toBeGreaterThan(body.years[1]);
		});

		it('GET /v1/rockauto/models/Toyota/2015 includes Camry', async () => {
			const res = await call('/v1/rockauto/models/Toyota/2015');
			expect(res.status).toBe(200);
			const body = (await res.json()) as any;
			expect(body.models).toContain('Camry');
		});

		it('GET /v1/rockauto/engines returns engines with numeric carcodes', async () => {
			const res = await call('/v1/rockauto/engines/Toyota/2015/Camry');
			expect(res.status).toBe(200);
			const body = (await res.json()) as any;
			expect(body.engines.length).toBeGreaterThan(0);
			expect(body.engines[0].carcode).toMatch(/^\d{7}$/);
		});

		it('GET /v1/rockauto/categories returns encoded group names', async () => {
			const res = await call('/v1/rockauto/categories/Toyota/2015/Camry/1234567');
			expect(res.status).toBe(200);
			const body = (await res.json()) as any;
			const brakes = body.categories.find((c: any) => c.name === 'Brakes & Wheel Hub');
			expect(brakes).toBeTruthy();
			expect(brakes.group_name).toBe('brakes+%26+wheel+hub');
		});

		it('GET /v1/rockauto/parts returns an honest empty set with notice (never fabricated prices)', async () => {
			const res = await call('/v1/rockauto/parts/Toyota/2015/Camry/1234567/brakes+%26+wheel+hub');
			expect(res.status).toBe(200);
			const body = (await res.json()) as any;
			expect(body.parts).toEqual([]);
			expect(body.count).toBe(0);
			expect(body.notice).toContain('offline catalog mode');
		});

		it('GET /v1/rockauto/search matches makes/models/categories', async () => {
			const res = await call('/v1/rockauto/search?q=camry');
			expect(res.status).toBe(200);
			const body = (await res.json()) as any;
			expect(body.results.some((r: any) => r.name === 'Toyota Camry')).toBe(true);
		});

		it('unknown /v1/rockauto route returns 404', async () => {
			const res = await call('/v1/rockauto/not-real');
			expect(res.status).toBe(404);
		});
	});

	describe('sync (DATABASE_URL-dependent)', () => {
		const hasDb = Boolean((env as any)?.DATABASE_URL);

		it('GET /sync without DATABASE_URL fails cleanly with 503 JSON', async ({ skip }) => {
			if (hasDb) skip('DATABASE_URL is configured');
			const res = await call('/sync');
			expect(res.status).toBe(503);
			const body = (await res.json()) as any;
			expect(body.error).toBe('Database unavailable');
		});

		it('POST /sync rejects malformed payloads with 400', async () => {
			const res = await call('/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ inventory: 'not-an-array' }),
			});
			expect(res.status).toBe(400);
		});

		it('GET /sync round-trips a record when DATABASE_URL is set', async ({ skip }) => {
			if (!hasDb) skip('DATABASE_URL secret not available in this environment');
			const id = `itest_${Date.now()}`;
			const post = await call('/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ inventory: [{ id, name: 'Integration Test Part', partNumber: id, cost: 1, price: 2, stock: 3, minStock: 1 }] }),
			});
			expect(post.status).toBe(200);
			const get = await call('/sync');
			const body = (await get.json()) as any;
			expect(body.inventory.some((i: any) => i.id === id)).toBe(true);
			// prune it again
			await call('/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ inventory: body.inventory.filter((i: any) => i.id !== id) }),
			});
		});
	});

	describe('integration style (SELF.fetch)', () => {
		it('responds on the workers.dev route', async () => {
			const res = await SELF.fetch('http://example.com/health');
			expect(res.status).toBe(200);
		});
	});
});
