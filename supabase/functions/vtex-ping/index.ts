/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

function redact(value: string | null) {
  if (!value) return null;
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function vtexCheck() {
  const account = Deno.env.get("VTEX_ACCOUNT")?.trim() || "";
  const env = (Deno.env.get("VTEX_ENV")?.trim() || "vtexcommercestable.com.br").replace(/^https?:\/\//, "");
  const appKey = Deno.env.get("VTEX_APP_KEY")?.trim() || "";
  const appToken = Deno.env.get("VTEX_APP_TOKEN")?.trim() || "";

  if (!account || !appKey || !appToken) {
    return {
      ok: false,
      error: "Missing VTEX env vars (VTEX_ACCOUNT, VTEX_APP_KEY, VTEX_APP_TOKEN).",
      hint: "Configure as variáveis no supabase/.env (local) ou via supabase secrets set (cloud).",
    };
  }

  // Endpoint “seguro” e comum pra validar credencial (pode variar por permissão da sua conta).
  const url = `https://${account}.${env}/api/catalog_system/pvt/category/tree/1`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-VTEX-API-AppKey": appKey,
      "X-VTEX-API-AppToken": appToken,
      "accept": "application/json",
    },
  });

  const text = await res.text();

  // Não retornamos o body completo (pode ser grande). Só um trecho inicial.
  const preview = text.slice(0, 800);

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    endpoint: url,
    responsePreview: preview,
  };
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET: /vtex-ping?check=1
  // POST: body { "check": true }
  const checkQuery = url.searchParams.get("check");
  const body = await readBody(req);
  const checkBody = body?.check === true;

  const doCheck = checkQuery === "1" || checkQuery === "true" || checkBody;

  const envInfo = {
    VTEX_ACCOUNT: redact(Deno.env.get("VTEX_ACCOUNT") ?? null),
    VTEX_ENV: Deno.env.get("VTEX_ENV")?.trim() || "vtexcommercestable.com.br",
    VTEX_APP_KEY: redact(Deno.env.get("VTEX_APP_KEY") ?? null),
    VTEX_APP_TOKEN: redact(Deno.env.get("VTEX_APP_TOKEN") ?? null),
  };

  if (!doCheck) {
    return json({
      ok: true,
      mode: "ping",
      message: "Function is running. Use ?check=1 or POST {check:true} to validate VTEX credentials.",
      env: envInfo,
      now: new Date().toISOString(),
    });
  }

  try {
    const result = await vtexCheck();
    return json({
      ok: true,
      mode: "check",
      env: envInfo,
      vtex: result,
      now: new Date().toISOString(),
    });
  } catch (e) {
    return json(
      {
        ok: false,
        mode: "check",
        env: envInfo,
        error: (e instanceof Error ? e.message : String(e)),
      },
      500,
    );
  }
});
