import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  quoteId: string;
  tradePolicyId?: string; // sc
  seller?: string; // default "1"
};

function requiredEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function vtexBaseUrl() {
  const account = requiredEnv("VTEX_ACCOUNT");
  const env = requiredEnv("VTEX_ENV");
  return `https://${account}.${env}`;
}

function vtexHeaders() {
  return {
    "Content-Type": "application/json",
    "X-VTEX-API-AppKey": requiredEnv("VTEX_APP_KEY"),
    "X-VTEX-API-AppToken": requiredEnv("VTEX_APP_TOKEN"),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Token de autenticação necessário" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json();
    if (!body?.quoteId) {
      return new Response(JSON.stringify({ error: "Parâmetro obrigatório: quoteId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tradePolicyId = String(body.tradePolicyId ?? "1");
    const seller = String(body.seller ?? "1");

    // Carrega quote + itens
    const { data: quote, error: quoteErr } = await supabaseAdmin
      .from("vtex_quotes")
      .select("id, status, trade_policy_id, created_by")
      .eq("id", body.quoteId)
      .single();

    if (quoteErr || !quote) {
      return new Response(JSON.stringify({ error: "Cotação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Somente dono pode enviar (por enquanto)
    if (quote.created_by !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Permissão negada (não é o criador da cotação)" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("vtex_quote_items")
      .select("vtex_sku_id, quantity")
      .eq("quote_id", body.quoteId);

    if (itemsErr || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: "Cotação sem itens" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) cria orderForm
    const base = vtexBaseUrl();
    const ofResp = await fetch(`${base}/api/checkout/pub/orderForm`, {
      method: "POST",
      headers: vtexHeaders(),
      body: JSON.stringify({}),
    });

    const ofJson = await ofResp.json().catch(() => ({}));
    if (!ofResp.ok) {
      await supabaseAdmin.from("vtex_quote_events").insert({
        quote_id: body.quoteId,
        event_type: "vtex_send",
        message: "Falha ao criar orderForm na VTEX",
        payload: { status: ofResp.status, response: ofJson },
        created_by: userData.user.id,
      });

      return new Response(JSON.stringify({ error: "Falha ao criar orderForm", details: ofJson }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderFormId = ofJson?.orderFormId;
    if (!orderFormId) {
      return new Response(JSON.stringify({ error: "Resposta VTEX inválida (sem orderFormId)", details: ofJson }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) adiciona itens
    const addItemsResp = await fetch(`${base}/api/checkout/pub/orderForm/${orderFormId}/items?sc=${encodeURIComponent(tradePolicyId)}`, {
      method: "POST",
      headers: vtexHeaders(),
      body: JSON.stringify({
        orderItems: items.map((it) => ({
          id: Number(it.vtex_sku_id),
          quantity: Number(it.quantity),
          seller,
        })),
      }),
    });

    const addItemsJson = await addItemsResp.json().catch(() => ({}));
    if (!addItemsResp.ok) {
      await supabaseAdmin.from("vtex_quote_events").insert({
        quote_id: body.quoteId,
        event_type: "vtex_send",
        message: "Falha ao adicionar itens no orderForm",
        payload: { status: addItemsResp.status, response: addItemsJson, orderFormId },
        created_by: userData.user.id,
      });
      return new Response(JSON.stringify({ error: "Falha ao adicionar itens", details: addItemsJson, orderFormId }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualiza quote
    await supabaseAdmin
      .from("vtex_quotes")
      .update({
        vtex_order_form_id: orderFormId,
        trade_policy_id: tradePolicyId,
        status: "sent",
        updated_by: userData.user.id,
      })
      .eq("id", body.quoteId);

    await supabaseAdmin.from("vtex_quote_events").insert({
      quote_id: body.quoteId,
      event_type: "vtex_send",
      from_status: quote.status,
      to_status: "sent",
      message: `OrderForm criado na VTEX: ${orderFormId}`,
      payload: { orderFormId, tradePolicyId, seller },
      created_by: userData.user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        orderFormId,
        orderForm: addItemsJson,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in vtex-create-orderform:", error);
    return new Response(JSON.stringify({ error: "Erro interno no servidor", details: error?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

