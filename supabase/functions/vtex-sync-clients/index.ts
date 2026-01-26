/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

// Bump this when deploying changes you need to verify in Cloud responses.
const CODE_VERSION = "2026-01-26.windowed-and-lowercase.v2";

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
  // Always include code version for debugging cloud deploy drift.
  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? { codeVersion: CODE_VERSION, ...(data as any) }
      : { codeVersion: CODE_VERSION, data };
  return new Response(JSON.stringify(payload), {
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

function isVtexMasterDataOver10kError(text: string) {
  return /acima\s+de\s+dez\s+mil\s+documentos\s+utilize\s+a\s+rota\s+\/scroll/i.test(text);
}

async function vtexFetchClientsPage(opts: {
  page: number;
  pageSize: number;
  where?: string | null;
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
    `?_fields=${encodeURIComponent(fields)}` +
    (opts.where ? `&_where=${encodeURIComponent(opts.where)}` : "");

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
  // Continuação: em alguns ambientes o token funciona via header, em outros via querystring.
  // Para evitar abrir "scroll novo" a cada chamada (e estourar limite), enviamos nos dois.
  if (opts.token) u.searchParams.set("_token", opts.token);

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

    // VTEX pode responder 400 quando há muitas sessões simultâneas de scroll; isso é temporário.
    const tooManyScrolls =
      res.status === 400 &&
      /maximum\s+simultaneous\s+scrolls\s+rate\s+exceeded/i.test(text);

    const retryable = res.status === 429 || tooManyScrolls || (res.status >= 500 && res.status <= 599);
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

type Window = { start: string; end: string };
type WindowedState = {
  queue: Window[];
  current: (Window & { page: number; pageSize: number; total?: number | null }) | null;
  whereStyle?: string | null;
};

function clampDateMs(x: number) {
  return Math.max(0, Math.min(x, 8640000000000000)); // Date range guard
}

function midIso(startIso: string, endIso: string) {
  const a = Date.parse(startIso);
  const b = Date.parse(endIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const m = Math.floor((a + b) / 2);
  return new Date(clampDateMs(m)).toISOString();
}

function windowWhere(w: Window, style: string) {
  const s = w.start;
  const e = w.end;
  switch (style) {
    case "between_quoted_lc":
      return `createdIn between '${s}' and '${e}'`;
    case "between_lc":
    default:
      // Sintaxe tolerante para o Master Data v1 (_where é "SQL-like")
      // Preferimos `between ... AND ...`.
      return `createdIn between ${s} and ${e}`;
  }
}

async function readWindowedState(supabase: any, key: string, nowIso: string): Promise<WindowedState> {
  const { data: st } = await supabase
    .from("vtex_sync_state")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  const v = (st?.value ?? null) as any;
  if (v && typeof v === "object" && Array.isArray(v.queue)) {
    return {
      queue: v.queue as Window[],
      current: v.current ?? null,
      whereStyle: v.whereStyle ?? null,
    };
  }

  // Inicializa com um range grande; se estourar 10k, nós dividimos adaptativamente.
  return {
    queue: [{ start: "2000-01-01T00:00:00.000Z", end: nowIso }],
    current: null,
    whereStyle: null,
  };
}

async function saveWindowedState(supabase: any, key: string, state: WindowedState) {
  await supabase
    .from("vtex_sync_state")
    .upsert({ key, value: state, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

function splitWindow(w: Window): [Window, Window] | null {
  const mid = midIso(w.start, w.end);
  if (!mid) return null;
  // evita loops com janelas muito pequenas
  if (Date.parse(mid) <= Date.parse(w.start) + 3600_000) return null;
  return [
    { start: w.start, end: mid },
    { start: mid, end: w.end },
  ];
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
    const useStateToken = toBool(u.searchParams.get("useStateToken"), true);
    // Estratégia default:
    // - all=true: preferimos windowed (evita /scroll e também evita o hard-limit de 10k do /search)
    // - all=false: mantém fluxo normal (range/search)
    const strategy = (normStr(u.searchParams.get("strategy")) ?? (all ? "windowed" : "scroll")).toLowerCase(); // scroll | windowed

    // Modo ALL: usa /scroll para pegar acima de 10k (search bloqueia).
    // IMPORTANTE: aqui fazemos APENAS 1 lote por chamada (com token),
    // para não estourar timeout do gateway.
    if (all) {
      // Estratégia windowed: usa /search com filtros de createdIn (janelas <=10k),
      // persistindo estado em vtex_sync_state. Evita o limite do /scroll e o limite de 10k do search (por janela).
      if (strategy === "windowed") {
        const stateKey = "clients_windowed_state";
        const nowIso = new Date().toISOString();
        const state = await readWindowedState(supabase, stateKey, nowIso);

        // Importante: nesta conta VTEX o token 'AND' é rejeitado no _where.
        // Então evitamos estilos com operadores (>= ... AND < ...) e usamos apenas "between ... and ...".
        const whereStyles = ["between_lc", "between_quoted_lc"] as const;
        const pickWhereStyles = (preferred: string | null) => {
          if (preferred && whereStyles.includes(preferred as any)) {
            return [preferred, ...whereStyles.filter((s) => s !== preferred)];
          }
          return [...whereStyles];
        };

        // garante um current válido (divide janelas que estouram 10k)
        let safety = 0;
        while (!state.current && state.queue.length && safety < 20) {
          safety++;
          const w = state.queue.shift()!;

          let probe: any = null;
          let usedStyle: string | null = null;
          for (const st of pickWhereStyles(state.whereStyle ?? null)) {
            const where = windowWhere(w, st);
            const r = await vtexFetchClientsPage({ page: 1, pageSize: 1, where });
            // Se der 400 por sintaxe, tenta a próxima variação.
            if (!r.ok && r.status === 400 && !isVtexMasterDataOver10kError(r.bodyPreview || "")) {
              probe = r;
              continue;
            }
            probe = r;
            usedStyle = st;
            break;
          }

          if (usedStyle) state.whereStyle = usedStyle;

          if (!probe.ok && probe.status === 400 && isVtexMasterDataOver10kError(probe.bodyPreview || "")) {
            const split = splitWindow(w);
            if (!split) {
              // não conseguimos dividir mais: devolve erro claro
              await saveWindowedState(supabase, stateKey, state);
            return json({ ok: false, step: "windowed_split", strategy, all, error: "Janela ainda >10k e não foi possível dividir mais.", window: w }, 502);
            }
            // push em LIFO para priorizar a primeira metade
            state.queue.unshift(split[1], split[0]);
            continue;
          }

          if (!probe.ok) {
            await saveWindowedState(supabase, stateKey, state);
            return json({ ok: false, step: "windowed_probe", strategy, all, ...probe }, 502);
          }

          state.current = { ...w, page: 1, pageSize: Math.min(500, Math.max(10, pageSize)), total: probe.total ?? null };
        }

        if (!state.current) {
          // nada a fazer
          await saveWindowedState(supabase, stateKey, state);
          return json({ ok: true, mode: "windowed_done", strategy, all, done: true, queueLen: state.queue.length });
        }

        // fetch da janela atual — usa whereStyle já detectado (ou tenta variações se ainda não tiver)
        let r: any = null;
        let usedFetchStyle: string | null = null;
        for (const st of pickWhereStyles(state.whereStyle ?? null)) {
          const where = windowWhere({ start: state.current.start, end: state.current.end }, st);
          const rr = await vtexFetchClientsPage({ page: state.current.page, pageSize: state.current.pageSize, where });
          if (!rr.ok && rr.status === 400 && !isVtexMasterDataOver10kError(rr.bodyPreview || "")) {
            r = rr;
            continue;
          }
          r = rr;
          usedFetchStyle = st;
          break;
        }
        if (usedFetchStyle) state.whereStyle = usedFetchStyle;
        if (!r.ok) {
          // se ainda estourou 10k (improvável), divide e reprocessa na próxima chamada
          if (r.status === 400 && isVtexMasterDataOver10kError(r.bodyPreview || "")) {
            const w: Window = { start: state.current.start, end: state.current.end };
            const split = splitWindow(w);
            if (!split) {
              await saveWindowedState(supabase, stateKey, state);
              return json({ ok: false, step: "windowed_fetch", ...r }, 502);
            }
            state.current = null;
            state.queue.unshift(split[1], split[0]);
            await saveWindowedState(supabase, stateKey, state);
          return json({ ok: true, mode: "windowed_split_deferred", strategy, all, done: false, queueLen: state.queue.length });
          }
        await saveWindowedState(supabase, stateKey, state);
        return json({ ok: false, step: "windowed_fetch", strategy, all, ...r }, 502);
        }

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
          const ids = rows.map((rr) => String((rr as any).md_id)).filter(Boolean);
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

            const rr = await vtexFetchCustomerCredit({ document: doc, email, userId });
            if (!rr.ok) return;
            if (rr.credit == null) return;

            (row as any).credit_limit = rr.credit;
            const raw = (row as any).raw ?? {};
            const prev = (raw && typeof raw === "object" && (raw as any).cl) ? raw : { cl: raw };
            (row as any).raw = { ...prev, credit: rr.raw, credit_tried: (rr as any).tried?.slice(0, 5) };
          });
        }

        if (rows.length) {
          const { error: upErr } = await supabase
            .from("vtex_clients")
            .upsert(rows, { onConflict: "md_id" });
          if (upErr) return json({ ok: false, step: "supabase_upsert", error: upErr.message }, 500);
        }

        // avança pagina dentro da janela
        let next: { page: number; pageSize: number } | null = null;
        if (typeof r.total === "number" && typeof r.rangeEnd === "number") {
          if (r.rangeEnd + 1 < r.total) next = { page: state.current.page + 1, pageSize: state.current.pageSize };
        } else {
          if (rows.length === state.current.pageSize) next = { page: state.current.page + 1, pageSize: state.current.pageSize };
        }

        if (next) {
          state.current.page = next.page;
        } else {
          state.current = null;
        }

        const done = !state.current && state.queue.length === 0;
        await saveWindowedState(supabase, stateKey, state);

        return json({
          ok: true,
          mode: "windowed_batch",
          strategy: "windowed",
          window: state.current ? { start: state.current.start, end: state.current.end } : null,
          queueLen: state.queue.length,
          pageInWindow: state.current ? state.current.page : null,
          batchSize: rows.length,
          upserted: rows.length,
          done,
        });
      }

      // Edge runtime tem limite de CPU por request; lote menor evita 502 sem body.
      const scrollSize = Math.min(100, Math.max(10, pageSize));
      const stateKey = "clients_scroll_token";
      let token = normStr(u.searchParams.get("token"));
      let reusedStateToken = false;

      // Se não veio token na URL, tenta reutilizar token global salvo no Supabase,
      // evitando abrir múltiplas sessões simultâneas de /scroll na VTEX.
      if (!token && useStateToken) {
        const { data: st } = await supabase
          .from("vtex_sync_state")
          .select("value")
          .eq("key", stateKey)
          .maybeSingle();
        const t = (st?.value as any)?.token ? String((st!.value as any).token) : null;
        if (t) {
          token = t;
          reusedStateToken = true;
        }
      }

      const r = await vtexScrollClientsPage({ pageSize: scrollSize, token });
      if (!r.ok) return json({ step: "vtex_scroll", strategy, all, ...r }, 502);

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

      // Atualiza token global (para que chamadas concorrentes continuem o mesmo scroll)
      if (useStateToken) {
        if (done || !r.nextToken) {
          await supabase
            .from("vtex_sync_state")
            .upsert({ key: stateKey, value: { token: null }, updated_at: new Date().toISOString() }, { onConflict: "key" });
        } else {
          await supabase
            .from("vtex_sync_state")
            .upsert({ key: stateKey, value: { token: r.nextToken }, updated_at: new Date().toISOString() }, { onConflict: "key" });
        }
      }

      return json({
        ok: true,
        mode: "scroll_batch",
        pageSize: scrollSize,
        withAddress,
        withCredit,
        overwriteCredit,
        useStateToken,
        reusedStateToken,
        batchSize: rows.length,
        upserted: rows.length,
        nextToken: r.nextToken,
        done,
      });
    }

    // modo paginado (search/range) — útil pra pequenos volumes (<10k)
    const r = await vtexFetchClientsPage({ page, pageSize, where: null });
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
