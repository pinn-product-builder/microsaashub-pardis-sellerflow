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

function digitsOnly(input: unknown): string | null {
  if (input == null) return null;
  const s = String(input).replace(/\D+/g, "");
  return s.length ? s : null;
}

function isEanCandidate(d: string | null): boolean {
  if (!d) return false;
  return [8, 12, 13, 14].includes(d.length);
}

// preferência: 13 > 14 > 12 > 8
function pickBestEan(values: unknown): string | null {
  if (!Array.isArray(values)) return null;

  const candidates = values
    .map((v) => digitsOnly(v))
    .filter((d): d is string => !!d && isEanCandidate(d));

  if (!candidates.length) return null;

  const byPref = (d: string) =>
    d.length === 13 ? 0 : d.length === 14 ? 1 : d.length === 12 ? 2 : 3;

  candidates.sort((a, b) => byPref(a) - byPref(b));
  return candidates[0] ?? null;
}

function normalizeRef(input: unknown): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return null;
  return s;
}

function pickRefFromAlternate(values: unknown, eanDigits: string | null): string | null {
  if (!Array.isArray(values)) return null;

  // 1) prefere algo com dígitos que NÃO pareça EAN
  for (const v of values) {
    const d = digitsOnly(v);
    if (d && !isEanCandidate(d) && (!eanDigits || d !== eanDigits)) return d;
  }

  // 2) fallback: primeiro não vazio (pode ser alfanumérico)
  for (const v of values) {
    const s = normalizeRef(v);
    if (s) {
      const d = digitsOnly(s);
      if (!eanDigits || !d || d !== eanDigits) return s;
    }
  }
  return null;
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
    // Ex: "name resolution failed" (DNS), timeouts, etc.
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
  retryBaseMs = 350,
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

    const waitMs = retryBaseMs * attempt;
    await sleep(waitMs);
  }
}

async function vtexFetchSkuIds(page: number, pageSize: number) {
  const { base, headers } = vtexBase();
  // VTEX tem variações/bugs de paginação em algumas contas; tentamos algumas combinações.
  // Prioridade:
  // - page/pageSize (camel)
  // - page/pagesize (lower)
  // - page-1 (0-based) com ambos os nomes de pageSize
  const pageCandidates = [page, Math.max(0, page - 1)];
  const sizeParams = ["pageSize", "pagesize"];

  let lastOk: { url: string; ids: number[] } | null = null;

  for (const p of pageCandidates) {
    for (const sizeParam of sizeParams) {
      const url = `${base}/api/catalog_system/pvt/sku/stockkeepingunitids?page=${p}&${sizeParam}=${pageSize}`;
      const r = await fetchJsonWithRetry(url, headers, 6, 350);
      if (!r.ok) {
        // se foi erro, tenta próxima variante; no final retornamos o último erro
        continue;
      }
      const data: unknown = r.data;
      const ids = Array.isArray(data)
        ? data.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
        : [];
      // Se vier vazio e page>1, tenta as outras variantes (0-based/camel) antes de aceitar "fim".
      if (ids.length === 0 && page > 1) {
        lastOk = { url, ids };
        continue;
      }
      return { ok: true as const, url, ids };
    }
  }

  if (lastOk) return { ok: true as const, url: lastOk.url, ids: lastOk.ids };

  // fallback: usa a variante original (para retornar erro descritivo)
  const url = `${base}/api/catalog_system/pvt/sku/stockkeepingunitids?page=${page}&pagesize=${pageSize}`;
  const r = await fetchJsonWithRetry(url, headers, 6, 350);
  if (!r.ok) {
    return { ok: false as const, status: r.status, statusText: r.statusText, url: r.url, bodyPreview: r.bodyPreview };
  }
  const data: unknown = r.data;
  const ids = Array.isArray(data)
    ? data.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  return { ok: true as const, url, ids };
}

async function vtexFetchSkuById(skuId: number) {
  const { base, headers } = vtexBase();
  const url = `${base}/api/catalog_system/pvt/sku/stockkeepingunitbyid/${skuId}`;
  const r = await fetchJsonWithRetry(url, headers, 4, 350);
  if (!r.ok) {
    return { ok: false as const, status: r.status, statusText: r.statusText, url: r.url, bodyPreview: r.bodyPreview };
  }
  return { ok: true as const, url: r.url, data: r.data };
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    // IMPORTANTE: use SB_* no env-file (porque o CLI pode ignorar SUPABASE_*)
    const SUPABASE_URL = requiredAny(["SUPABASE_URL", "SB_URL"]);
    const SUPABASE_SERVICE_ROLE_KEY = requiredAny(["SUPABASE_SERVICE_ROLE_KEY", "SB_SERVICE_ROLE_KEY"]);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);

    const page = toInt(url.searchParams.get("page"), 1);
    const pageSize = toInt(url.searchParams.get("pageSize"), 200);
    const missingOnly = toBool(url.searchParams.get("missingOnly"), false);
    const isCloud = /^https:\/\/.+\.supabase\.co/i.test(SUPABASE_URL);
    const concurrencyCap = isCloud ? 6 : 12;
    const concurrency = Math.min(concurrencyCap, Math.max(1, toInt(url.searchParams.get("concurrency"), 4)));

    // novo: permite forçar seed via VTEX
    const source = (url.searchParams.get("source") || "auto").toLowerCase(); // auto | db | vtex

    // 1) Descobre se o banco tem algum SKU ID
    const { count: dbCount, error: countErr } = await supabase
      .from("vtex_skus")
      .select("vtex_sku_id", { count: "exact", head: true });

    if (countErr) return json({ ok: false, step: "count_vtex_skus", error: countErr.message }, 500);

    const dbIsEmpty = (dbCount ?? 0) === 0;

    // 2) Decide de onde vem o escopo de IDs
    const useVtexIds = source === "vtex" || (source === "auto" && dbIsEmpty);

    let skuIds: number[] = [];
    let totalSkusInScope: number | null = null;

    if (useVtexIds) {
      const idsRes = await vtexFetchSkuIds(page, pageSize);
      if (!idsRes.ok) {
        return json({ ok: false, step: "vtex_list_ids", ...idsRes }, 500);
      }
      skuIds = idsRes.ids;
      // não temos total oficial aqui; retornamos null e usamos “next” por página cheia
      totalSkusInScope = null;

      // garante que os IDs existam no banco (seed)
      if (skuIds.length) {
        const seedRows = skuIds.map((id) => ({ vtex_sku_id: id }));
        const { error: seedErr } = await supabase
          .from("vtex_skus")
          .upsert(seedRows, { onConflict: "vtex_sku_id" });
        if (seedErr) {
          return json({ ok: false, step: "seed_ids_db", error: seedErr.message }, 500);
        }
      }
    } else {
      const fromIdx = (page - 1) * pageSize;
      const toIdx = fromIdx + pageSize - 1;

      let q = supabase
        .from("vtex_skus")
        .select("vtex_sku_id", { count: "exact" })
        .not("vtex_sku_id", "is", null)
        .order("vtex_sku_id", { ascending: true });

      if (missingOnly) q = q.or("raw.is.null,ean.is.null,ref_id.is.null,name.is.null");

      const { data: rows, count, error: listErr } = await q.range(fromIdx, toIdx);
      if (listErr) return json({ ok: false, step: "list_skus_db", error: listErr.message }, 500);

      skuIds = (rows ?? [])
        .map((r: any) => Number(r.vtex_sku_id))
        .filter((n) => Number.isFinite(n) && n > 0);

      totalSkusInScope = count ?? skuIds.length;
    }

    // 3) Hidrata detalhes por SKU ID
    let upserted = 0;
    const errors: Array<{ skuId: number; error: string; status?: number }> = [];

    await mapLimit(skuIds, concurrency, async (skuId) => {
      const r = await vtexFetchSkuById(skuId);
      if (!r.ok) {
        errors.push({ skuId, error: `${r.status} ${r.statusText}`, status: r.status });
        return;
      }

      const sku = r.data ?? {};

      const vtex_product_id = sku?.ProductId != null ? Number(sku.ProductId) : null;

      const nameRaw =
        (sku?.SkuName ?? sku?.NameComplete ?? sku?.ProductName ?? sku?.Name ?? null) as string | null;
      const name = normalizeRef(nameRaw);

      const is_active = (sku?.IsActive ?? null) as boolean | null;

      // EAN / REF
      const altValues = sku?.AlternateIdValues ?? null;

      let ean =
        digitsOnly(sku?.AlternateIds?.Ean) ??
        digitsOnly(sku?.AlternateIds?.ean) ??
        digitsOnly(sku?.Ean) ??
        digitsOnly(sku?.ean) ??
        null;

      if (!ean) ean = pickBestEan(altValues);

      let ref_id =
        normalizeRef(sku?.AlternateIds?.RefId) ??
        normalizeRef(sku?.AlternateIds?.refId) ??
        normalizeRef(sku?.ProductRefId) ??
        null;

      if (!ref_id) ref_id = pickRefFromAlternate(altValues, ean);

      if (ref_id && ean && digitsOnly(ref_id) === ean) {
        const other = pickRefFromAlternate(
          Array.isArray(altValues) ? altValues.filter((v: any) => digitsOnly(v) !== ean) : altValues,
          ean,
        );
        ref_id = other ?? ref_id;
      }

      const row: Record<string, unknown> = {
        vtex_sku_id: skuId,
        raw: sku,
      };

      if (vtex_product_id != null && Number.isFinite(vtex_product_id)) row.vtex_product_id = vtex_product_id;
      if (name) row.name = name;
      if (ean) row.ean = ean;
      if (ref_id) row.ref_id = ref_id;
      if (is_active !== null) row.is_active = is_active;

      const { error: upErr } = await supabase
        .from("vtex_skus")
        .upsert(row, { onConflict: "vtex_sku_id" });

      if (upErr) {
        errors.push({ skuId, error: upErr.message });
      } else {
        upserted++;
      }

      // seed simples de product_id (para o vtex-sync-products ter escopo)
      if (vtex_product_id != null && Number.isFinite(vtex_product_id)) {
        await supabase
          .from("vtex_products")
          .upsert([{ vtex_product_id }], { onConflict: "vtex_product_id" });
      }
    });

    const next =
      useVtexIds
        ? (skuIds.length === pageSize ? { page: page + 1, pageSize } : null)
        : (
          totalSkusInScope != null && ((page - 1) * pageSize + skuIds.length) < totalSkusInScope
            ? { page: page + 1, pageSize }
            : null
        );

    return json({
      ok: true,
      source: useVtexIds ? "vtex" : "db",
      page,
      pageSize,
      missingOnly,
      concurrency,
      totalSkusInScope,
      batchSize: skuIds.length,
      upserted,
      errorsCount: errors.length,
      errors: errors.slice(0, 20),
      next,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
