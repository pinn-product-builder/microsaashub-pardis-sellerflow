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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    // local: CLI às vezes ignora SUPABASE_*, então aceitamos SB_*
    const SUPABASE_URL = requiredAny(["SUPABASE_URL", "SB_URL"]);
    const SUPABASE_SERVICE_ROLE_KEY = requiredAny(["SUPABASE_SERVICE_ROLE_KEY", "SB_SERVICE_ROLE_KEY"]);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const pageSize = Math.min(200, Math.max(10, toInt(url.searchParams.get("pageSize"), 100)));
    const withAddress = (url.searchParams.get("withAddress") ?? "1") !== "0";
    const withCredit = (url.searchParams.get("withCredit") ?? "0") === "1";
    const overwriteCredit = (url.searchParams.get("overwriteCredit") ?? "0") === "1";

    // Estado de paginação (evita /scroll e seu limite de sessões simultâneas)
    const stateKey = "clients_page";
    const { data: st } = await supabase
      .from("vtex_sync_state")
      .select("value")
      .eq("key", stateKey)
      .maybeSingle();

    const page = Math.max(1, toInt((st?.value as any)?.page ? String((st!.value as any).page) : null, 1));

    // Chama a própria function vtex-sync-clients (1 lote por execução)
    // remove apenas uma barra final (se existir)
    const fnUrl = new URL(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/vtex-sync-clients`);
    fnUrl.searchParams.set("page", String(page));
    fnUrl.searchParams.set("pageSize", String(pageSize));
    fnUrl.searchParams.set("withAddress", withAddress ? "true" : "false");
    fnUrl.searchParams.set("withCredit", withCredit ? "true" : "false");
    fnUrl.searchParams.set("overwriteCredit", overwriteCredit ? "true" : "false");
    fnUrl.searchParams.set("concurrency", "4");

    const res = await fetch(fnUrl.toString(), { method: "GET" });
    const text = await res.text();
    if (!res.ok) {
      return json({ ok: false, step: "call_vtex_sync_clients", status: res.status, body: text.slice(0, 800) }, 502);
    }

    const payload = JSON.parse(text);
    const nextPage = payload?.next?.page ? Math.max(1, toInt(String(payload.next.page), 1)) : null;
    const done = !nextPage;

    // Atualiza paginação
    if (done) {
      await supabase
        .from("vtex_sync_state")
        .upsert({ key: stateKey, value: { page: 1 }, updated_at: new Date().toISOString() }, { onConflict: "key" });
    } else {
      await supabase
        .from("vtex_sync_state")
        .upsert({ key: stateKey, value: { page: nextPage }, updated_at: new Date().toISOString() }, { onConflict: "key" });
    }

    return json({
      ok: true,
      mode: "scheduled_range_page",
      page,
      nextPage: nextPage ?? null,
      pageSize,
      withAddress,
      withCredit,
      overwriteCredit,
      done,
      upstream: {
        batchSize: payload?.batchSize ?? null,
        upserted: payload?.upserted ?? null,
        errorsCount: payload?.errorsCount ?? null,
      },
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

