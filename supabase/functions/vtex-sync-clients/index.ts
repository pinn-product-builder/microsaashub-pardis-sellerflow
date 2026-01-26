/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function requireSyncAuth(req: Request) {
  const secret = (Deno.env.get("VTEX_SYNC_SECRET") ?? "").trim();
  const gotSecret = (req.headers.get("x-vtex-sync-secret") ?? "").trim();
  if (secret && gotSecret && gotSecret === secret) return;

  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized: missing Authorization header");

  const SUPABASE_URL = requiredAny(["SUPABASE_URL", "SB_URL"]);
  const SUPABASE_ANON_KEY = requiredAny([
    "SUPABASE_ANON_KEY",
    "SB_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SB_PUBLISHABLE_KEY",
  ]);
  const SUPABASE_SERVICE_ROLE_KEY = requiredAny(["SUPABASE_SERVICE_ROLE_KEY", "SB_SERVICE_ROLE_KEY"]);

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
  if (userError || !userData?.user) throw new Error("Unauthorized: invalid session");

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: roles, error: rolesError } = await (supabaseAdmin as any)
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  if (rolesError) throw new Error(`Forbidden: cannot read user roles (${rolesError.message})`);

  const isAdmin = Array.isArray(roles) && roles.some((r: any) => String(r.role) === "admin");
  if (!isAdmin) throw new Error("Forbidden: admin required");
}

function toInt(v: string | null, def: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

function toBool(v: string | null, def = false) {
  if (v == null) return def;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y" || s === "on";
}

function normStr(x: unknown): string | null {
  if (x == null) return null;
  const s = String(x).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return null;
  return s;
}

function digitsOnly(x: unknown): string | null {
  const s = normStr(x);
  if (!s) return null;
  const d = s.replace(/\D+/g, "");
  return d.length ? d : null;
}

function extractBestAddress(arr: any[]): { city: string | null; uf: string | null; raw: any | null } {
  const list = Array.isArray(arr) ? arr : [];
  if (!list.length) return { city: null, uf: null, raw: null };

  // Prioriza registros completos (cidade+UF), depois UF, depois cidade.
  const scored = list
    .map((x) => ({
      x,
      city: normStr(x?.city),
      uf: normStr(x?.state),
      score: (normStr(x?.city) ? 2 : 0) + (normStr(x?.state) ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  return { city: best?.city ?? null, uf: best?.uf ?? null, raw: best?.x ?? null };
}

async function vtexFetchAddressByUserId(userId: string) {
  const { base, headers } = vtexBase();
  const fields = ["userId", "city", "state", "addressType", "addressName"].join(",");
  const url =
    `${base}/api/dataentities/AD/search` +
    `?_fields=${encodeURIComponent(fields)}` +
    `&_where=${encodeURIComponent(`userId=${userId}`)}` +
    `&_page=1&_pageSize=5`;

  const maxRetries = 6;
  let attempt = 0;
  while (true) {
    attempt++;
    const res = await fetch(url, { headers });
    const text = await res.text();
    if (res.ok) {
      try {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : [];
        const best = extractBestAddress(arr);
        return {
          ok: true as const,
          city: best.city,
          uf: best.uf,
          raw: best.raw,
        };
      } catch {
        return { ok: false as const, status: 500, statusText: "JSON parse error", url, bodyPreview: text.slice(0, 800) };
      }
    }

    const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
    if (!retryable || attempt >= maxRetries) {
      return { ok: false as const, status: res.status, statusText: res.statusText, url, bodyPreview: text.slice(0, 800) };
    }
    await sleep(500 * attempt);
  }
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

function toNumberLike(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim().replace(",", ".");
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function extractCreditFromPayload(payload: any): number | null {
  const candidates = [
    payload?.availableCredit,
    payload?.available,
    payload?.creditAvailable,
    payload?.balance,
    payload?.creditLimit,
    payload?.limit,
    payload?.credit,
    payload?.value,
  ];
  for (const c of candidates) {
    const n = toNumberLike(c);
    if (n != null) return n;
  }

  if (Array.isArray(payload) && payload.length) return extractCreditFromPayload(payload[0]);

  const nested = payload?.data ?? payload?.account ?? payload?.result ?? null;
  if (nested) return extractCreditFromPayload(nested);

  return null;
}

function vtexCreditBases(): Array<{ base: string; headers: Record<string, string> }> {
  const account = requiredAny(["VTEX_ACCOUNT"]).trim();
  const envPrimary = (Deno.env.get("VTEX_ENV")?.trim() || "vtexcommercestable.com.br")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  const envCredit = (Deno.env.get("VTEX_CUSTOMER_CREDIT_ENV")?.trim() || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  const appKey = requiredAny(["VTEX_APP_KEY"]).trim();
  const appToken = requiredAny(["VTEX_APP_TOKEN"]).trim();

  const headers = {
    "X-VTEX-API-AppKey": appKey,
    "X-VTEX-API-AppToken": appToken,
    accept: "application/json",
  };

  const bases = [
    envCredit ? `https://${account}.${envCredit}` : null,
    `https://${account}.myvtex.com`,
    `https://${account}.${envPrimary}`,
  ].filter(Boolean) as string[];

  const uniq = Array.from(new Set(bases));
  return uniq.map((base) => ({ base, headers }));
}

async function vtexFetchCustomerCredit(opts: { document?: string | null; email?: string | null; userId?: string | null }) {
  const document = digitsOnly(opts.document);
  const email = normStr(opts.email);
  const userId = normStr(opts.userId);

  if (!document && !email && !userId) {
    return { ok: true as const, credit: null as number | null, raw: null as any, tried: [] as string[] };
  }

  const bases = vtexCreditBases();

  const paths: string[] = [];
  if (document) {
    paths.push(
      `/api/customer-credit/accounts?document=${encodeURIComponent(document)}`,
      `/api/customer-credit/account?document=${encodeURIComponent(document)}`,
      `/api/customer-credit/accounts/${encodeURIComponent(document)}`,
      `/api/creditcontrol/accounts?document=${encodeURIComponent(document)}`,
      `/api/creditcontrol/accounts/${encodeURIComponent(document)}`,
      `/_v/customer-credit/accounts?document=${encodeURIComponent(document)}`,
    );
  }
  if (email) {
    paths.push(
      `/api/customer-credit/accounts?email=${encodeURIComponent(email)}`,
      `/api/customer-credit/account?email=${encodeURIComponent(email)}`,
      `/api/creditcontrol/accounts?email=${encodeURIComponent(email)}`,
    );
  }
  if (userId) {
    paths.push(
      `/api/customer-credit/accounts?userId=${encodeURIComponent(userId)}`,
      `/api/creditcontrol/accounts?userId=${encodeURIComponent(userId)}`,
    );
  }

  const tried: string[] = [];
  const maxRetries = 4;

  for (const b of bases) {
    for (const path of paths) {
      const url = `${b.base}${path}`;
      tried.push(url);
      let attempt = 0;

      while (true) {
        attempt++;
        const res = await fetch(url, { headers: b.headers });
        const text = await res.text();

        // endpoints inexistentes/invalid: tenta próximo
        if (res.status === 404 || res.status === 400) break;

        if (res.ok) {
          try {
            const payload = JSON.parse(text);
            const credit = extractCreditFromPayload(payload);
            return { ok: true as const, credit, raw: payload, tried };
          } catch {
            return { ok: false as const, status: 500, statusText: "JSON parse error", url, bodyPreview: text.slice(0, 800) };
          }
        }

        const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
        if (!retryable || attempt >= maxRetries) break;
        await sleep(400 * attempt);
      }
    }
  }

  return { ok: true as const, credit: null as number | null, raw: null as any, tried };
}

async function vtexFetchClientsPage(opts: {
  page: number;
  pageSize: number;
}) {
  const { base, headers: baseHeaders } = vtexBase();

  // Master Data (v1) Search: /api/dataentities/CL/search
  // Exemplos de uso de _fields/_where aparecem na doc/community. :contentReference[oaicite:2]{index=2}
  const fields = [
    "id",
    "email",
    "userId",
    "firstName",
    "lastName",
    "document",
    "phone",
    "isCorporate",
    "corporateName",
    "tradeName",
    "stateRegistration",
    "createdIn",
    "updatedIn",
  ].join(",");

  // Paginação mais estável via header REST-Range.
  // Alguns accounts ignoram _size/_pageSize na querystring e aplicam um default (ex.: 15),
  // o que quebra a paginação e pode "cortar" em ~10k.
  const from = (Math.max(1, opts.page) - 1) * Math.max(1, opts.pageSize);
  const to = from + Math.max(1, opts.pageSize) - 1;

  const url =
    `${base}/api/dataentities/CL/search` +
    `?_fields=${encodeURIComponent(fields)}`;

  const headers = {
    ...baseHeaders,
    "REST-Range": `resources=${from}-${to}`,
  };

  const maxRetries = 6;
  let attempt = 0;
  let lastText = "";
  let lastStatus = 0;
  let lastStatusText = "";

  while (true) {
    attempt++;
    const res = await fetch(url, { headers });
    const text = await res.text();

    lastText = text;
    lastStatus = res.status;
    lastStatusText = res.statusText;

    if (res.ok) {
      // Header típico: "resources 0-49/1234"
      const contentRange = res.headers.get("rest-content-range") ??
        res.headers.get("REST-Content-Range");

      let total: number | null = null;
      let rangeEnd: number | null = null;

      if (contentRange) {
        const m = contentRange.match(/(\d+)\s*-\s*(\d+)\s*\/\s*(\d+)/);
        if (m?.[2] && m?.[3]) {
          const b = Number(m[2]);
          const t = Number(m[3]);
          if (Number.isFinite(b) && b >= 0) rangeEnd = b;
          if (Number.isFinite(t) && t >= 0) total = t;
        } else {
          const mt = contentRange.match(/\/\s*(\d+)\s*$/);
          if (mt?.[1]) {
            const t = Number(mt[1]);
            if (Number.isFinite(t) && t >= 0) total = t;
          }
        }
      }

      try {
        const data = JSON.parse(text);
        return { ok: true as const, url, data, total, rangeEnd };
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

    const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
    if (!retryable || attempt >= maxRetries) {
      return {
        ok: false as const,
        status: res.status,
        statusText: res.statusText,
        url,
        bodyPreview: text.slice(0, 800),
      };
    }

    const waitMs = 500 * attempt;
    await sleep(waitMs);
  }

  // unreachable (mantém TS feliz)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return {
    ok: false as const,
    status: lastStatus || 500,
    statusText: lastStatusText || "unknown",
    url,
    bodyPreview: (lastText || "").slice(0, 800),
  };
}

async function vtexScrollClientsPage(opts: {
  pageSize: number;
  token?: string | null;
}) {
  const { base, headers } = vtexBase();
  const fields = [
    "id",
    "email",
    "userId",
    "firstName",
    "lastName",
    "document",
    "phone",
    "isCorporate",
    "corporateName",
    "tradeName",
    "stateRegistration",
    "createdIn",
    "updatedIn",
  ].join(",");

  const u = new URL(`${base}/api/dataentities/CL/scroll`);
  u.searchParams.set("_fields", fields);
  u.searchParams.set("_size", String(Math.min(1000, Math.max(1, opts.pageSize))));
  // Continuação: alguns ambientes aceitam o token só via header (mais estável).
  // Evitamos colocar no querystring para não ficar preso no mesmo cursor.
  // if (opts.token) u.searchParams.set("_token", opts.token);

  const maxRetries = 8;
  let attempt = 0;
  let lastStatus = 0;
  let lastStatusText = "";
  let lastText = "";
  let lastHeaders: Headers | null = null;

  while (true) {
    attempt++;

    let res: Response;
    try {
      const h = { ...headers } as Record<string, string>;
      // Alguns ambientes usam o token via header (além do querystring).
      if (opts.token) {
        h["X-VTEX-MD-TOKEN"] = opts.token;
        h["x-vtex-md-token"] = opts.token;
      }
      res = await fetch(u.toString(), { headers: h });
    } catch (e) {
      // DNS/timeouts/etc
      const retryable = true;
      if (!retryable || attempt >= maxRetries) {
        return {
          ok: false as const,
          status: 0,
          statusText: "FETCH_ERROR",
          url: u.toString(),
          bodyPreview: (e instanceof Error ? e.message : String(e)).slice(0, 800),
        };
      }
      await sleep(500 * attempt);
      continue;
    }

    const text = await res.text();
    lastStatus = res.status;
    lastStatusText = res.statusText;
    lastText = text;

    if (res.ok) {
      lastHeaders = res.headers;
      break;
    }

    const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
    if (!retryable || attempt >= maxRetries) {
      return {
        ok: false as const,
        status: res.status,
        statusText: res.statusText,
        url: u.toString(),
        bodyPreview: text.slice(0, 800),
      };
    }

    await sleep(500 * attempt);
  }

  // Deno fetch Headers é case-insensitive, então get('x-vtex-md-token') deve funcionar.
  // Ainda assim, tentamos variações por segurança.
  const tokenFromHeader = (h: Headers) =>
    h.get("x-vtex-md-token") ?? h.get("x-vtex-md-token".toUpperCase()) ??
      h.get("X-VTEX-MD-TOKEN") ?? null;

  // No último fetch bem-sucedido, guardamos headers para extrair o token.
  // (Atribuímos aqui porque saímos do loop com res.ok)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (lastHeaders === null) {
    // não deve acontecer, mas mantém robusto
    lastHeaders = new Headers();
  }

  try {
    const data = JSON.parse(lastText);
    const nextToken = tokenFromHeader(lastHeaders);
    return { ok: true as const, url: u.toString(), data, nextToken };
  } catch {
    return {
      ok: false as const,
      status: 500,
      statusText: "JSON parse error",
      url: u.toString(),
      bodyPreview: (lastText ?? "").slice(0, 800),
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    await requireSyncAuth(req);

    // IMPORTANTE no seu setup local:
    // o CLI reclamou de SUPABASE_* e aceitou SB_*.
    const SUPABASE_URL = requiredAny(["SUPABASE_URL", "SB_URL"]);
    const SUPABASE_SERVICE_ROLE_KEY = requiredAny(["SUPABASE_SERVICE_ROLE_KEY", "SB_SERVICE_ROLE_KEY"]);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const u = new URL(req.url);
    const page = toInt(u.searchParams.get("page"), 1);
    const pageSize = Math.min(1000, toInt(u.searchParams.get("pageSize"), 200)); // Master Data costuma aceitar até 1000
    const missingOnly = toBool(u.searchParams.get("missingOnly"), false);
    const all = toBool(u.searchParams.get("all"), false);
    const withAddress = toBool(u.searchParams.get("withAddress"), true);
    const withCredit = toBool(u.searchParams.get("withCredit"), false);
    const overwriteCredit = toBool(u.searchParams.get("overwriteCredit"), false);
    const concurrency = Math.min(12, Math.max(1, toInt(u.searchParams.get("concurrency"), 4)));

    // Modo ALL: usa /scroll para pegar acima de 10k (search bloqueia).
    // IMPORTANTE: aqui fazemos APENAS 1 lote por chamada (com token),
    // para não estourar timeout do gateway.
    if (all) {
      // Edge runtime tem limite de CPU por request; lote menor evita 502 sem body.
      const scrollSize = Math.min(100, Math.max(10, pageSize));
      const token = normStr(u.searchParams.get("token"));
      const r = await vtexScrollClientsPage({ pageSize: scrollSize, token });
      if (!r.ok) return json({ step: "vtex_scroll", ...r }, 502);

      const arr = Array.isArray(r.data) ? r.data : [];
      const rows = arr
        .map((c: any) => {
          const md_id = normStr(c?.id) ?? normStr(c?.userId) ?? normStr(c?.email);
          if (!md_id) return null;

          const first = normStr(c?.firstName);
          const last = normStr(c?.lastName);
          const full = normStr(`${first ?? ""} ${last ?? ""}`.trim()) ??
            normStr(c?.corporateName) ??
            normStr(c?.tradeName);

          const document = digitsOnly(c?.document);
          const phone = digitsOnly(c?.phone);

          const row: Record<string, unknown> = { md_id, raw: c };
          const email = normStr(c?.email);
          const user_id = normStr(c?.userId);
          const vtex_user_id = user_id;

          if (email) row.email = email;
          if (user_id) row.user_id = user_id;
          if (first) row.first_name = first;
          if (last) row.last_name = last;
          if (full) row.full_name = full;
          if (vtex_user_id) row.vtex_user_id = vtex_user_id;
          // company_name: prioriza corporateName/tradeName/full/email
          row.company_name = normStr(c?.corporateName) ?? normStr(c?.tradeName) ?? full ?? email ?? md_id;
          if (document) row.document = document;
          if (phone) row.phone = phone;

          if (typeof c?.isCorporate === "boolean") row.is_corporate = c.isCorporate;
          if (normStr(c?.corporateName)) row.corporate_name = normStr(c.corporateName);
          if (normStr(c?.tradeName)) row.trade_name = normStr(c.tradeName);
          if (normStr(c?.stateRegistration)) row.state_registration = normStr(c.stateRegistration);

          if (normStr(c?.createdIn)) row.created_in = c.createdIn;
          if (normStr(c?.updatedIn)) row.updated_in = c.updatedIn;

          // enriquecidos/defaults (UI)
          if (c?.isCorporate === true && document) row.cnpj = document;
          row.last_sync_at = new Date().toISOString();

          return row;
        })
        .filter(Boolean) as Record<string, unknown>[];

      if (withAddress) {
        await mapLimit(rows, concurrency, async (row) => {
          const userId =
            normStr((row as any).vtex_user_id) ??
            normStr((row as any).user_id) ??
            normStr((row as any).email);
          if (!userId) return;
          const ad = await vtexFetchAddressByUserId(userId);
          if (!ad.ok) return;
          if (ad.city) (row as any).city = ad.city;
          if (ad.uf) {
            (row as any).uf = ad.uf;
            (row as any).price_table_type = ad.uf.toUpperCase() === "MG" ? "MG" : "BR";
          }
          // guarda raw do AD junto no raw já existente
          const raw = (row as any).raw ?? {};
          (row as any).raw = { cl: raw, ad: ad.raw };
        });
      }

      let existingCreditById: Map<string, number> | null = null;
      if (withCredit && !overwriteCredit && rows.length) {
        const ids = rows.map((r) => String((r as any).md_id)).filter(Boolean);
        const { data: existing, error: exErr } = await supabase
          .from("vtex_clients")
          .select("md_id, credit_limit")
          .in("md_id", ids);
        if (!exErr && Array.isArray(existing)) {
          existingCreditById = new Map(existing.map((x: any) => [String(x.md_id), Number(x.credit_limit ?? 0)]));
        }
      }

      if (withCredit) {
        await mapLimit(rows, Math.min(concurrency, 6), async (row) => {
          const mdId = String((row as any).md_id ?? "");
          const current = existingCreditById ? Number(existingCreditById.get(mdId) ?? 0) : 0;
          if (!overwriteCredit && current > 0) return;

          const doc = normStr((row as any).cnpj) ?? normStr((row as any).document);
          const email = normStr((row as any).email);
          const userId = normStr((row as any).vtex_user_id) ?? normStr((row as any).user_id);

          const r = await vtexFetchCustomerCredit({ document: doc, email, userId });
          if (!r.ok) return;
          if (r.credit == null) return;

          (row as any).credit_limit = r.credit;

          const raw = (row as any).raw ?? {};
          const prev = (raw && typeof raw === "object" && (raw as any).cl) ? raw : { cl: raw };
          (row as any).raw = { ...prev, credit: r.raw, credit_tried: (r as any).tried?.slice(0, 5) };
        });
      }

      if (missingOnly) {
        // compat: mantém param, mas não filtra no modo all
      }

      if (rows.length) {
        const { error: upErr } = await supabase
          .from("vtex_clients")
          .upsert(rows, { onConflict: "md_id" });
        if (upErr) return json({ ok: false, step: "supabase_upsert", error: upErr.message }, 500);
      }

      const done = !r.nextToken || rows.length === 0;

      return json({
        ok: true,
        mode: "scroll_batch",
        pageSize: scrollSize,
        withAddress,
        withCredit,
        overwriteCredit,
        batchSize: rows.length,
        upserted: rows.length,
        nextToken: r.nextToken,
        done,
      });
    }

    // modo paginado (search/range) — útil pra pequenos volumes (<10k)
    const r = await vtexFetchClientsPage({ page, pageSize });
    if (!r.ok) {
      // evita duplicar "ok" (r já tem ok=false)
      return json({ step: "vtex_fetch", ...r }, 502);
    }

    const arr = Array.isArray(r.data) ? r.data : [];
    // Normalização -> staging
    const rows = arr
      .map((c: any) => {
        const md_id = normStr(c?.id) ?? normStr(c?.userId) ?? normStr(c?.email);
        if (!md_id) return null;

        const first = normStr(c?.firstName);
        const last = normStr(c?.lastName);
        const full = normStr(`${first ?? ""} ${last ?? ""}`.trim()) ??
          normStr(c?.corporateName) ??
          normStr(c?.tradeName);

        const document = digitsOnly(c?.document);
        const phone = digitsOnly(c?.phone);

        const row: Record<string, unknown> = {
          md_id,
          raw: c,
        };

        const email = normStr(c?.email);
        const user_id = normStr(c?.userId);
        const vtex_user_id = user_id;

        if (email) row.email = email;
        if (user_id) row.user_id = user_id;
        if (first) row.first_name = first;
        if (last) row.last_name = last;
        if (full) row.full_name = full;
        if (vtex_user_id) row.vtex_user_id = vtex_user_id;
        row.company_name = normStr(c?.corporateName) ?? normStr(c?.tradeName) ?? full ?? email ?? md_id;
        if (document) row.document = document;
        if (phone) row.phone = phone;

        if (typeof c?.isCorporate === "boolean") row.is_corporate = c.isCorporate;
        if (normStr(c?.corporateName)) row.corporate_name = normStr(c.corporateName);
        if (normStr(c?.tradeName)) row.trade_name = normStr(c.tradeName);
        if (normStr(c?.stateRegistration)) row.state_registration = normStr(c.stateRegistration);

        if (normStr(c?.createdIn)) row.created_in = c.createdIn;
        if (normStr(c?.updatedIn)) row.updated_in = c.updatedIn;

        if (c?.isCorporate === true && document) row.cnpj = document;
        row.last_sync_at = new Date().toISOString();

        return row;
      })
      .filter(Boolean) as Record<string, unknown>[];

    if (withAddress) {
      await mapLimit(rows, concurrency, async (row) => {
        const userId =
          normStr((row as any).vtex_user_id) ??
          normStr((row as any).user_id) ??
          normStr((row as any).email);
        if (!userId) return;
        const ad = await vtexFetchAddressByUserId(userId);
        if (!ad.ok) return;
        if (ad.city) (row as any).city = ad.city;
        if (ad.uf) {
          (row as any).uf = ad.uf;
          (row as any).price_table_type = ad.uf.toUpperCase() === "MG" ? "MG" : "BR";
        }
        const raw = (row as any).raw ?? {};
        (row as any).raw = { cl: raw, ad: ad.raw };
      });
    }

    let existingCreditById: Map<string, number> | null = null;
    if (withCredit && !overwriteCredit && rows.length) {
      const ids = rows.map((r) => String((r as any).md_id)).filter(Boolean);
      const { data: existing, error: exErr } = await supabase
        .from("vtex_clients")
        .select("md_id, credit_limit")
        .in("md_id", ids);
      if (!exErr && Array.isArray(existing)) {
        existingCreditById = new Map(existing.map((x: any) => [String(x.md_id), Number(x.credit_limit ?? 0)]));
      }
    }

    if (withCredit) {
      await mapLimit(rows, Math.min(concurrency, 6), async (row) => {
        const mdId = String((row as any).md_id ?? "");
        const current = existingCreditById ? Number(existingCreditById.get(mdId) ?? 0) : 0;
        if (!overwriteCredit && current > 0) return;

        const doc = normStr((row as any).cnpj) ?? normStr((row as any).document);
        const email = normStr((row as any).email);
        const userId = normStr((row as any).vtex_user_id) ?? normStr((row as any).user_id);

        const r = await vtexFetchCustomerCredit({ document: doc, email, userId });
        if (!r.ok) return;
        if (r.credit == null) return;

        (row as any).credit_limit = r.credit;

        const raw = (row as any).raw ?? {};
        const prev = (raw && typeof raw === "object" && (raw as any).cl) ? raw : { cl: raw };
        (row as any).raw = { ...prev, credit: r.raw, credit_tried: (r as any).tried?.slice(0, 5) };
      });
    }

    // missingOnly (opcional): só sobe se ainda estiver “incompleto” no staging
    // Para simplicidade do rebuild: pode ignorar e sempre fazer upsert.
    if (missingOnly) {
      // Mantém o parâmetro por compatibilidade; se quiser de fato filtrar,
      // dá para consultar no Supabase antes — mas no rebuild normalmente não vale o custo.
    }

    const { error: upErr } = await supabase
      .from("vtex_clients")
      .upsert(rows, { onConflict: "md_id" });

    if (upErr) {
      return json({ ok: false, step: "supabase_upsert", error: upErr.message }, 500);
    }

    // Próxima página:
    // - se total/rangeEnd vierem, é mais confiável
    // - senão, fallback pelo tamanho do lote
    let next: { page: number; pageSize: number } | null = null;
    if (typeof r.total === "number" && typeof r.rangeEnd === "number") {
      if (r.rangeEnd + 1 < r.total) next = { page: page + 1, pageSize };
    } else {
      if (rows.length === pageSize) next = { page: page + 1, pageSize };
    }

    return json({
      ok: true,
      source: "vtex",
      page,
      pageSize,
      missingOnly,
      withAddress,
      withCredit,
      overwriteCredit,
      batchSize: rows.length,
      upserted: rows.length,
      next,
      total: r.total ?? null,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

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
