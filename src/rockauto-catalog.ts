/**
 * RockAuto Catalog — TypeScript port of the Python rockauto-api client.
 * Fetches live vehicle/part data from rockauto.com via HTTP + regex parsing.
 * Used by the Cloudflare Worker when PYTHON_SERVICE_URL is not set.
 */

const CATALOG_BASE = 'https://www.rockauto.com/en/catalog';
const API_ENDPOINT = 'https://www.rockauto.com/catalog/catalogapi.php';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';

async function raFetch(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'max-age=0',
    },
  });
  if (!res.ok) throw new Error(`RockAuto HTTP ${res.status}`);
  return res.text();
}

function extractHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const re = /<a[^>]+href="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) hrefs.push(m[1]);
  return hrefs;
}

export async function getMakes(): Promise<{ makes: string[]; count: number }> {
  const html = await raFetch(`${CATALOG_BASE}/`);
  const makes = new Set<string>();
  for (const href of extractHrefs(html)) {
    // Make links: /en/catalog/{make} — no commas, no query params, no extra segments
    const m = href.match(/^\/en\/catalog\/([a-z0-9\-]+)\/?$/i);
    if (m) {
      const make = m[1];
      if (make.length > 1 && !make.includes('?') && !make.includes(',')) {
        makes.add(make.toUpperCase());
      }
    }
  }
  const sorted = [...makes].sort();
  return { makes: sorted, count: sorted.length };
}

export async function getYears(make: string): Promise<{ make: string; years: number[]; count: number }> {
  const mk = make.toLowerCase();
  const html = await raFetch(`${CATALOG_BASE}/${mk}`);
  const years = new Set<number>();
  for (const href of extractHrefs(html)) {
    if (href.includes(`/${mk},`)) {
      const parts = href.split(',');
      if (parts.length >= 2) {
        const y = parseInt(parts[1], 10);
        if (!isNaN(y) && y >= 1950 && y <= 2030) years.add(y);
      }
    }
  }
  const sorted = [...years].sort((a, b) => b - a);
  return { make: make.toUpperCase(), years: sorted, count: sorted.length };
}

export async function getModels(make: string, year: number): Promise<{ make: string; year: number; models: string[]; count: number }> {
  const mk = make.toLowerCase();
  const html = await raFetch(`${CATALOG_BASE}/${mk},${year}`);
  const models = new Set<string>();
  for (const href of extractHrefs(html)) {
    if (href.includes(`/${mk},${year},`)) {
      const parts = href.split(',');
      if (parts.length >= 3) {
        const model = parts[2].split('/')[0].split('?')[0];
        if (model && model.length > 1) models.add(model.toUpperCase());
      }
    }
  }
  const sorted = [...models].sort();
  return { make: make.toUpperCase(), year, models: sorted, count: sorted.length };
}

export async function getEngines(make: string, year: number, model: string): Promise<{ make: string; year: number; model: string; engines: { carcode: string; engine: string }[]; count: number }> {
  const mk = make.toLowerCase();
  const md = model.toLowerCase();
  const html = await raFetch(`${CATALOG_BASE}/${mk},${year},${md}`);
  const engines = new Map<string, string>();
  // Engine links: /en/catalog/{make},{year},{model},{engine-name},{carcode}
  // e.g. /en/catalog/ford,2020,f-150,2.7l+v6+turbocharged,3445533
  const re = new RegExp(`/en/catalog/${mk},${year},${md},([^",/]+),([0-9]+)`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const engineName = decodeURIComponent(m[1].replace(/\+/g, ' ')).toUpperCase();
    const carcode = m[2];
    if (!engines.has(carcode)) engines.set(carcode, engineName);
  }
  const list = [...engines.entries()].map(([carcode, engine]) => ({ carcode, engine }));
  return { make: make.toUpperCase(), year, model: model.toUpperCase(), engines: list, count: list.length };
}

export async function getCategories(make: string, year: number, model: string, carcode: string): Promise<{ make: string; year: number; model: string; carcode: string; categories: string[]; count: number }> {
  const mk = make.toLowerCase();
  const md = model.toLowerCase();
  const modelHtml = await raFetch(`${CATALOG_BASE}/${mk},${year},${md}`);
  const engineRe = new RegExp(`/en/catalog/${mk},${year},${md},([^",/]+),${carcode}`, 'i');
  const engineMatch = engineRe.exec(modelHtml);
  const engineSlug = engineMatch ? engineMatch[1] : '';
  if (!engineSlug) return { make: make.toUpperCase(), year, model: model.toUpperCase(), carcode, categories: [], count: 0 };
  const html = await raFetch(`${CATALOG_BASE}/${mk},${year},${md},${engineSlug},${carcode}`);
  const categories = new Set<string>();
  const catRe = new RegExp(`/en/catalog/${mk},${year},${md},[^",/]+,${carcode},([^"?,/]+)`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = catRe.exec(html)) !== null) {
    const cat = decodeURIComponent(m[1].replace(/\+/g, ' ')).replace(/&amp;/g, '&').trim();
    if (cat && cat.length > 2 && !cat.includes('mobilemenu') && !cat.includes('language')) {
      categories.add(cat.toUpperCase());
    }
  }
  const sorted = [...categories].sort();
  return { make: make.toUpperCase(), year, model: model.toUpperCase(), carcode, categories: sorted, count: sorted.length };
}

export async function searchParts(query: string): Promise<{ query: string; results: { partNumber: string; brand: string; description: string }[]; note: string }> {
  return {
    query,
    results: [],
    note: 'Part search requires JavaScript rendering. Use /prices?partNumber=XXX for specific part lookups, or browse the catalog hierarchy.'
  };
}
