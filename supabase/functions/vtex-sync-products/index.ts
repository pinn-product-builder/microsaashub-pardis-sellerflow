/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

function requiredAny(names: string[]) {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v && v.trim()) return v.trim();
  }
  throw new Error(`Missing env var (any): ${names.join(" | ")}`);
}

function toBool(v: string | null, def = false) {
  if (v == null) return def;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y" || s === "on";
}

function toInt(v: string | null, def: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

function normalizeText(input: unknown): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return null;
  return s;
}

async function vtexFetchProductById(productId: number) {
  const account = requiredAny(["VTEX_ACCOUNT"]).trim();
  const env = (Deno.env.get("VTEX_ENV")?.trim() || "vtexcommercestable.com.br")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  const appKey = requiredAny(["VTEX_APP_KEY"]).trim();
  const appToken = requiredAny(["VTEX_APP_TOKEN"]).trim();

  // Endpoint padrão do Catalog System (coerente com seu SKU-by-id)
  const url =
    `https://${account}.${env}/api/catalog_system/pvt/products/ProductGet/${productId}`;

  const res = await fetch(url, {
    headers: {
      "X-VTEX-API-AppKey": appKey,
      "X-VTEX-API-AppToken": appToken,
      accept: "application/json",
    },
  });

  const text = await res.text();

  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      statusText: res.statusText,
      url,
      bodyPreview: text.slice(0, 800),
    };
  }

  try {
    return { ok: true as const, url, data: JSON.parse(text) };
  } catch {
    return {
      ok: false as const,
      status: 500,
      statusText: "JSON parse error",
      url,
      bodyPreview: text.slice(0, 800),
    };
  }
}

async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
) {
  const q = items.slice();
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (q.length) {
      const item = q.shift();
      if (item === undefined) return;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    // IMPORTANTE: no local o CLI ignora SUPABASE_*, então use SB_URL / SB_SERVICE_ROLE_KEY
    const SUPABASE_URL = requiredAny(["SUPABASE_URL", "SB_URL"]);
    const SUPABASE_SERVICE_ROLE_KEY = requiredAny(["SUPABASE_SERVICE_ROLE_KEY", "SB_SERVICE_ROLE_KEY"]);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);

    const page = toInt(url.searchParams.get("page"), 1);
    const pageSize = toInt(url.searchParams.get("pageSize"), 200);
    const missingOnly = toBool(url.searchParams.get("missingOnly"), false);
    const concurrency = Math.min(12, Math.max(1, toInt(url.searchParams.get("concurrency"), 4)));

    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    // Lê IDs já existentes na vtex_products (fonte “lista”)
    let q = supabase
      .from("vtex_products")
      .select("vtex_product_id", { count: "exact" })
      .not("vtex_product_id", "is", null)
      .order("vtex_product_id", { ascending: true });

    if (missingOnly) {
      q = q.or("raw.is.null,name.is.null,brand_id.is.null,category_id.is.null");
    }

    const { data: rows, count, error: listErr } = await q.range(fromIdx, toIdx);

    if (listErr) {
      return json({ ok: false, step: "list_products", error: listErr.message }, 500);
    }

    const productIds = (rows ?? [])
      .map((r: any) => Number(r.vtex_product_id))
      .filter((n) => Number.isFinite(n) && n > 0);

    const totalProductsInScope = count ?? productIds.length;

    let upserted = 0;
    const errors: Array<{ productId: number; error: string; status?: number }> = [];

    await mapLimit(productIds, concurrency, async (productId) => {
      const r = await vtexFetchProductById(productId);

      if (!r.ok) {
        errors.push({ productId, error: `${r.status} ${r.statusText}`, status: r.status });
        return;
      }

      const p = r.data ?? {};

      const name = normalizeText(p?.Name ?? p?.ProductName ?? p?.Title);
      const brand_id = p?.BrandId != null ? Number(p.BrandId) : null;
      const brand_name = normalizeText(p?.BrandName ?? p?.Brand);
      const category_id = p?.CategoryId != null ? Number(p.CategoryId) : null;
      const link_id = normalizeText(p?.LinkId ?? p?.Link);
      const is_active = (p?.IsActive ?? null) as boolean | null;

      // não sobrescreve com null (só seta quando tem valor)
      const row: Record<string, unknown> = {
        vtex_product_id: productId,
        raw: p,
      };

      if (name) row.name = name;
      if (brand_id != null && Number.isFinite(brand_id)) row.brand_id = brand_id;
      if (brand_name) row.brand_name = brand_name;
      if (category_id != null && Number.isFinite(category_id)) row.category_id = category_id;
      if (link_id) row.link_id = link_id;
      if (is_active !== null) row.is_active = is_active;

      const { error: upErr } = await supabase
        .from("vtex_products")
        .upsert(row, { onConflict: "vtex_product_id" });

      if (upErr) errors.push({ productId, error: upErr.message });
      else upserted++;
    });

    const next = (fromIdx + productIds.length) < totalProductsInScope
      ? { page: page + 1, pageSize }
      : null;

    // Se finalizou o escopo, atualiza MV de catálogo (necessário para o frontend enxergar produtos)
    if (!next) {
      const { error: refreshErr } = await supabase.rpc("refresh_mv_vtex_catalog" as any);
      if (refreshErr) {
        // não falha a sync por causa do refresh; apenas reporta
        errors.push({ productId: -1, error: `refresh_mv_vtex_catalog: ${refreshErr.message}` });
      }
    }

    return json({
      ok: true,
      page,
      pageSize,
      missingOnly,
      concurrency,
      totalProductsInScope,
      batchSize: productIds.length,
      upserted,
      errorsCount: errors.length,
      errors: errors.slice(0, 20),
      next,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
