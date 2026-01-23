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

function toInt(v: string | null, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
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

async function fetchTextSafe(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    return { ok: res.ok, status: res.status, statusText: res.statusText, url, text };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      statusText: "FETCH_ERROR",
      url,
      text: e instanceof Error ? e.message : String(e),
    };
  }
}

async function fetchJsonWithRetry(url: string, headers: Record<string, string>, maxRetries = 6) {
  let attempt = 0;
  while (true) {
    attempt++;
    const r = await fetchTextSafe(url, headers);
    if (r.ok) {
      try {
        return { ok: true as const, url: r.url, data: JSON.parse(r.text) };
      } catch {
        return { ok: false as const, status: 500, statusText: "JSON_PARSE", url: r.url, body: r.text.slice(0, 800) };
      }
    }

    const retryable = r.status === 0 || r.status === 429 || (r.status >= 500 && r.status <= 599);
    if (!retryable || attempt >= maxRetries) {
      return { ok: false as const, status: r.status || 502, statusText: r.statusText, url: r.url, body: r.text.slice(0, 800) };
    }
    await sleep(500 * attempt);
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

function normalizeBalance(skuId: number, payload: any): UpsertRow[] {
  // VTEX costuma devolver algo como:
  // { balance: [{warehouseId, warehouseName?, totalQuantity, reservedQuantity, availableQuantity, ...}, ...] }
  // ou diretamente um array.
  const rows: UpsertRow[] = [];

  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.balance)
      ? payload.balance
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

  for (const b of list) {
    const warehouseId = String(b?.warehouseId ?? b?.warehouse_id ?? "").trim();
    if (!warehouseId) continue;

    const total = Number(b?.totalQuantity ?? b?.total ?? b?.quantity ?? 0);
    const reserved = Number(b?.reservedQuantity ?? b?.reserved ?? 0);
    const available = Number(b?.availableQuantity ?? b?.available ?? (Number.isFinite(total) ? total - (Number.isFinite(reserved) ? reserved : 0) : 0));

    rows.push({
      vtex_sku_id: skuId,
      warehouse_id: warehouseId,
      warehouse_name: b?.warehouseName ?? b?.warehouse_name ?? null,
      total_quantity: Number.isFinite(total) ? total : null,
      reserved_quantity: Number.isFinite(reserved) ? reserved : null,
      available_quantity: Number.isFinite(available) ? available : null,
      updated_at: new Date().toISOString(),
      raw: b ?? {},
    });
  }

  // Se não tiver lista, ainda persistimos um "raw" por sku para diagnosticar
  if (!rows.length) {
    rows.push({
      vtex_sku_id: skuId,
      warehouse_id: "unknown",
      warehouse_name: null,
      total_quantity: null,
      reserved_quantity: null,
      available_quantity: null,
      updated_at: new Date().toISOString(),
      raw: payload ?? {},
    });
  }

  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const SUPABASE_URL = requiredAny(["SUPABASE_URL", "SB_URL"]);
    const SUPABASE_SERVICE_ROLE_KEY = requiredAny(["SUPABASE_SERVICE_ROLE_KEY", "SB_SERVICE_ROLE_KEY"]);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
    const pageSize = Math.min(500, Math.max(1, toInt(url.searchParams.get("pageSize"), 200)));
    const concurrency = Math.min(12, Math.max(1, toInt(url.searchParams.get("concurrency"), 4)));

    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

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
    const errors: Array<{ skuId: number; status?: number; step: string; error: string }> = [];

    await mapLimit(skuIds, concurrency, async (skuId) => {
      // Endpoint padrão (logistics inventory)
      const invUrl = `${base}/api/logistics/pvt/inventory/skus/${skuId}`;
      const r = await fetchJsonWithRetry(invUrl, headers, 6);
      if (!r.ok) {
        errors.push({ skuId, status: r.status, step: "fetch_inventory", error: `${r.statusText}: ${r.body}`.slice(0, 800) });
        return;
      }

      const rows = normalizeBalance(skuId, r.data);
      const { error } = await supabase
        .from("vtex_sku_inventory")
        .upsert(rows, { onConflict: "vtex_sku_id,warehouse_id" });
      if (error) {
        errors.push({ skuId, step: "upsert", error: error.message });
        return;
      }
      upserted += rows.length;
    });

    const done = skuIds.length < pageSize;
    const next = done ? null : { page: page + 1, pageSize, concurrency };

    return json({
      ok: true,
      page,
      pageSize,
      batchSize: skuIds.length,
      upserted,
      errorsCount: errors.length,
      sampleErrors: errors.slice(0, 10),
      next,
      done,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

