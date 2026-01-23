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
  return Number.isFinite(n) ? Math.floor(n) : def;
}

function toNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// VTEX Pricing API retorna valores monetários em centavos (inteiro). Normalizamos para reais.
function toMoney(v: unknown): number | null {
  const n = toNum(v);
  if (n == null) return null;
  return n / 100;
}

function vtexBase() {
  const account = requiredAny(["VTEX_ACCOUNT"]).trim();
  const env = (Deno.env.get("VTEX_ENV")?.trim() || "vtexcommercestable.com.br")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  const appKey = requiredAny(["VTEX_APP_KEY"]).trim();
  const appToken = requiredAny(["VTEX_APP_TOKEN"]).trim();

  const base = `https://${account}.${env}`;
  const headers = {
    "X-VTEX-API-AppKey": appKey,
    "X-VTEX-API-AppToken": appToken,
    accept: "application/json",
  };

  return { base, headers };
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchTextSafe(
  url: string,
  headers: Record<string, string>,
): Promise<
  | { ok: true; status: number; statusText: string; url: string; text: string }
  | { ok: false; status: number; statusText: string; url: string; error: string }
> {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, statusText: res.statusText, url, error: text.slice(0, 800) };
    }
    return { ok: true, status: res.status, statusText: res.statusText, url, text };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      statusText: "FETCH_ERROR",
      url,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function fetchJsonWithRetry(
  url: string,
  headers: Record<string, string>,
  maxRetries = 6,
) {
  let attempt = 0;
  while (true) {
    attempt++;
    const r = await fetchTextSafe(url, headers);
    if (r.ok) {
      try {
        return { ok: true as const, url: r.url, data: JSON.parse(r.text) };
      } catch {
        return {
          ok: false as const,
          status: 500,
          statusText: "JSON parse error",
          url: r.url,
          bodyPreview: r.text.slice(0, 800),
        };
      }
    }

    const retryable = r.status === 0 || r.status === 429 || (r.status >= 500 && r.status <= 599);
    if (!retryable || attempt >= maxRetries) {
      return {
        ok: false as const,
        status: r.status || 502,
        statusText: r.statusText || "UPSTREAM_ERROR",
        url: r.url,
        bodyPreview: (r.error ?? "").slice(0, 800),
      };
    }

    const waitMs = 500 * attempt;
    await sleep(waitMs);
  }
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
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

type UpsertRow = Record<string, unknown>;

async function vtexFetchComputedPrice(
  base: string,
  headers: Record<string, string>,
  skuId: number,
  sc: string,
) {
  // VTEX tem variações de endpoint para computed:
  // - /computed/{sc}
  // - /computed?sc={sc}
  // Tentamos ambos. Se 404, consideramos "sem computed" (não é falha fatal).
  const urlA = `${base}/api/pricing/prices/${skuId}/computed?sc=${encodeURIComponent(sc)}`;
  const rA = await fetchJsonWithRetry(urlA, headers, 6);
  if (rA.ok) return { ok: true as const, url: rA.url, data: rA.data };

  const urlB = `${base}/api/pricing/prices/${skuId}/computed/${encodeURIComponent(sc)}`;
  const rB = await fetchJsonWithRetry(urlB, headers, 6);
  if (rB.ok) return { ok: true as const, url: rB.url, data: rB.data };

  // Preferimos expor o erro mais útil (se um deles não for 404)
  const preferred =
    (rA.status !== 404 && !rA.ok) ? rA :
    (rB.status !== 404 && !rB.ok) ? rB :
    rA;

  return { ok: false as const, status: preferred.status, statusText: preferred.statusText, url: preferred.url, bodyPreview: preferred.bodyPreview };
}

function buildRowsFromBase(skuId: number, basePayload: any): UpsertRow[] {
  const rows: UpsertRow[] = [];

  // "base" (sem tradePolicy específico): guarda o payload todo
  rows.push({
    vtex_sku_id: skuId,
    trade_policy_id: "base",
    price_type: "base",
    min_quantity: 0,
    list_price: toMoney(basePayload?.listPrice),
    cost_price: toMoney(basePayload?.costPrice),
    base_price: toMoney(basePayload?.basePrice),
    markup: toNum(basePayload?.markup),
    raw: basePayload ?? {},
  });

  const fixed = Array.isArray(basePayload?.fixedPrices) ? basePayload.fixedPrices : [];
  for (const fp of fixed) {
    const tradePolicyId = String(fp?.tradePolicyId ?? "").trim();
    if (!tradePolicyId) continue;
    rows.push({
      vtex_sku_id: skuId,
      trade_policy_id: tradePolicyId,
      price_type: "fixed",
      min_quantity: toInt(fp?.minQuantity ?? 0, 0),
      fixed_value: toMoney(fp?.value),
      list_price: toMoney(fp?.listPrice),
      raw: fp ?? {},
    });
  }

  return rows;
}

function buildRowsFromComputed(skuId: number, computedPayload: any): UpsertRow[] {
  const list = Array.isArray(computedPayload) ? computedPayload : [computedPayload];
  const rows: UpsertRow[] = [];

  for (const c of list) {
    const tradePolicyId = String(c?.tradePolicyId ?? "").trim();
    if (!tradePolicyId) continue;
    rows.push({
      vtex_sku_id: skuId,
      trade_policy_id: tradePolicyId,
      price_type: "computed",
      min_quantity: 0,
      list_price: toMoney(c?.listPrice),
      cost_price: toMoney(c?.costPrice),
      selling_price: toMoney(c?.sellingPrice),
      price_valid_until: c?.priceValidUntil ?? null,
      raw: c ?? {},
    });
  }

  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    // local: CLI às vezes ignora SUPABASE_*, então aceitamos SB_*
    const SUPABASE_URL = requiredAny(["SUPABASE_URL", "SB_URL"]);
    const SUPABASE_SERVICE_ROLE_KEY = requiredAny(["SUPABASE_SERVICE_ROLE_KEY", "SB_SERVICE_ROLE_KEY"]);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
    const pageSize = Math.min(500, Math.max(1, toInt(url.searchParams.get("pageSize"), 200)));
    const concurrency = Math.min(12, Math.max(1, toInt(url.searchParams.get("concurrency"), 4)));
    const missingOnly = toBool(url.searchParams.get("missingOnly"), false);
    const sc = String(url.searchParams.get("sc") ?? "1").trim() || "1";

    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    // pega SKUs do banco (escopo controlado)
    const { data: skuRows, error: skuErr } = await supabase
      .from("vtex_skus")
      .select("vtex_sku_id")
      .not("vtex_sku_id", "is", null)
      .order("vtex_sku_id", { ascending: true })
      .range(fromIdx, toIdx);

    if (skuErr) return json({ ok: false, step: "list_skus", error: skuErr.message }, 500);

    const skuIds = (skuRows ?? [])
      .map((r: any) => Number(r.vtex_sku_id))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!skuIds.length) {
      return json({ ok: true, page, pageSize, batchSize: 0, upserted: 0, errorsCount: 0, done: true });
    }

    const { base, headers } = vtexBase();

    let upserted = 0;
    const errors: Array<{ skuId: number; step: string; error: string; status?: number; url?: string }> = [];
    let missingCount = 0;

    await mapLimit(skuIds, concurrency, async (skuId) => {
      try {
        // se missingOnly: pula se já existe computed para esse sku e sc (tradePolicyId=sc é o mais comum)
        if (missingOnly) {
          const { data: existing } = await supabase
            .from("vtex_sku_prices")
            .select("id")
            .eq("vtex_sku_id", skuId)
            .eq("price_type", "computed")
            .eq("trade_policy_id", sc)
            .limit(1);
          if (existing && existing.length > 0) return;
        }

        // 1) base + fixed
        const baseUrl = `${base}/api/pricing/prices/${skuId}`;
        const rBase = await fetchJsonWithRetry(baseUrl, headers, 6);
        const baseOk = rBase.ok;
        if (!baseOk && rBase.status !== 404) {
          // erro "real" (ex: 401/403/429/5xx). Mantemos tentativa de computed.
          errors.push({
            skuId,
            step: "pricing_base",
            status: rBase.status,
            error: `${rBase.status} ${rBase.statusText}`,
            url: rBase.url,
          });
        }

        // 2) computed (policy/sc). Se não existir (404), ainda salvamos base+fixed.
        const rComp = await vtexFetchComputedPrice(base, headers, skuId, sc);
        const computedOk = rComp.ok;
        if (!computedOk && rComp.status !== 404) {
          errors.push({ skuId, step: "pricing_computed", status: rComp.status, error: `${rComp.status} ${rComp.statusText}`, url: rComp.url });
        }

        const rows: UpsertRow[] = [
          ...(baseOk ? buildRowsFromBase(skuId, (rBase as any).data) : []),
          ...(computedOk ? buildRowsFromComputed(skuId, rComp.data) : []),
        ];

        if (!rows.length) {
          // Não há preço para esse SKU (404 no base e/ou computed). Não tratamos como erro.
          missingCount++;
          return;
        }

        // Evita erro do Postgres: "ON CONFLICT DO UPDATE command cannot affect row a second time"
        // (acontece quando enviamos linhas duplicadas para o mesmo conjunto de colunas do onConflict)
        const dedup = new Map<string, UpsertRow>();
        for (const row of rows) {
          const k = `${row.vtex_sku_id}|${row.trade_policy_id}|${row.price_type}|${row.min_quantity}`;
          dedup.set(k, row);
        }
        const uniqueRows = Array.from(dedup.values());

        const { error: upErr } = await supabase
          .from("vtex_sku_prices")
          .upsert(uniqueRows, { onConflict: "vtex_sku_id,trade_policy_id,price_type,min_quantity" });

        if (upErr) {
          errors.push({ skuId, step: "upsert", error: upErr.message });
        } else {
          upserted += uniqueRows.length;
        }
      } catch (e) {
        errors.push({ skuId, step: "unexpected", error: e instanceof Error ? e.message : String(e) });
      }
    });

    return json({
      ok: true,
      page,
      pageSize,
      concurrency,
      missingOnly,
      sc,
      batchSize: skuIds.length,
      upserted,
      errorsCount: errors.length,
      errors: errors.slice(0, 20),
      missingCount,
      done: skuIds.length < pageSize,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

