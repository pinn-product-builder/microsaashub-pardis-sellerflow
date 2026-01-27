import { supabase } from "@/integrations/supabase/client";
import type { QuoteLegacy as Quote, QuoteItemLegacy as QuoteItem, CustomerLegacy as Customer } from "@/types/domain";

export type VtexQuoteStatus = "draft" | "calculated" | "pending_approval" | "approved" | "rejected" | "sent" | "expired" | "converted";

function parseSkuId(item: QuoteItem): number {
  const raw = item.product?.sku ?? "";
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`SKU inválido no item: "${raw}"`);
  }
  return n;
}

export class VtexQuoteService {
  static async createOrUpdateQuote(params: {
    quoteId?: string;
    customer: Customer;
    destinationUF: string;
    tradePolicyId: string; // legado (mantido no header da quote)
    items: QuoteItem[];
    status: VtexQuoteStatus;
    subtotal: number;
    discount: number;
    total: number;
    totalMarginPercent?: number | null;
    requiresApproval?: boolean;
    isAuthorized?: boolean;
    notes?: string;
  }): Promise<{ id: string; number: string }> {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Usuário não autenticado");

    const quoteUpsert: any = {
      id: params.quoteId,
      vtex_client_id: params.customer.id,
      destination_uf: params.destinationUF,
      trade_policy_id: String(params.tradePolicyId ?? "1"),
      status: params.status,
      subtotal: params.subtotal,
      total_discount: params.discount,
      total: params.total,
      total_margin_percent: params.totalMarginPercent ?? null,
      requires_approval: !!params.requiresApproval,
      is_authorized: !!params.isAuthorized,
      notes: params.notes ?? null,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data: quoteRow, error: quoteErr } = await (supabase as any)
      .from("vtex_quotes")
      .upsert(quoteUpsert)
      .select("id, quote_number")
      .single();

    if (quoteErr) throw quoteErr;

    const quoteId = quoteRow.id as string;

    // substitui itens (simples e previsível)
    await (supabase as any).from("vtex_quote_items").delete().eq("quote_id", quoteId);

    if (params.items.length > 0) {
      const rows = params.items.map((it) => {
        const skuId = parseSkuId(it);
        return {
          quote_id: quoteId,
          vtex_sku_id: skuId,
          quantity: it.quantity,
          trade_policy_id: (it as any).vtexTradePolicyId ?? null,
          unit_price: it.unitPrice,
          price_source: "effective",
          line_total: it.totalPrice,
          snapshot: {
            product_name: it.product?.name,
            sku: it.product?.sku,
            base_cost: it.product?.baseCost,
          },
        };
      });

      const { error: itemsErr } = await (supabase as any).from("vtex_quote_items").insert(rows);
      if (itemsErr) throw itemsErr;
    }

    await (supabase as any).from("vtex_quote_events").insert({
      quote_id: quoteId,
      event_type: params.quoteId ? "note" : "status_change",
      from_status: params.quoteId ? undefined : null,
      to_status: params.status,
      message: params.quoteId ? "Cotação atualizada" : "Cotação criada",
      payload: {
        tradePolicyId: params.tradePolicyId,
        items: params.items.length,
      },
      created_by: user.id,
    });

    return { id: quoteId, number: String(quoteRow.quote_number) };
  }

  static async getQuote(quoteId: string): Promise<(Quote & { tradePolicyId?: string }) | null> {
    const { data: q, error: qErr } = await (supabase as any)
      .from("vtex_quotes")
      .select(
        `
        *,
        client:vtex_clients(*),
        items:vtex_quote_items(*)
      `,
      )
      .eq("id", quoteId)
      .single();

    if (qErr || !q) return null;

    const customer: Customer = {
      // vtex_clients usa md_id como PK
      id: q.client?.md_id,
      companyName: q.client?.company_name ?? "Cliente",
      cnpj: q.client?.cnpj ?? "",
      uf: q.client?.uf ?? "",
      city: q.client?.city ?? "",
      creditLimit: q.client?.credit_limit ?? 0,
      paymentTerms: [],
    };

    const items: QuoteItem[] = (q.items ?? []).map((it: any) => ({
      id: it.id,
      product: {
        id: `vtex:${it.vtex_sku_id}`,
        sku: String(it.vtex_sku_id),
        name: it.snapshot?.product_name ?? `SKU ${it.vtex_sku_id}`,
        category: "VTEX",
        weight: 0.5,
        dimensions: { length: 10, width: 10, height: 10 },
        baseCost: it.snapshot?.base_cost ?? it.unit_price ?? 0,
      },
      quantity: it.quantity,
      unitPrice: Number(it.unit_price ?? 0),
      totalPrice: Number(it.line_total ?? 0),
      taxes: { icms: 0, ipi: 0, pis: 0, cofins: 0, total: 0, taxBasis: 0, effectiveRate: 0 },
      freight: 0,
      margin: 0,
      vtexTradePolicyId: it.trade_policy_id ?? undefined,
    }));

    const quote: Quote & { tradePolicyId?: string } = {
      id: q.id,
      number: String(q.quote_number),
      customer,
      destinationUF: q.destination_uf ?? customer.uf ?? "",
      items,
      subtotal: Number(q.subtotal ?? 0),
      totalTaxes: 0,
      totalFreight: 0,
      discount: Number(q.total_discount ?? 0),
      total: Number(q.total ?? 0),
      status: (q.status === "pending_approval" ? "pending" : q.status) as any,
      paymentConditions: "",
      validUntil: new Date(),
      createdAt: new Date(q.created_at),
      updatedAt: new Date(q.updated_at),
      createdBy: q.created_by,
      notes: q.notes ?? undefined,
      tradePolicyId: String(q.trade_policy_id ?? "1"),
    };

    return quote;
  }

  static async validateCart(tradePolicyId: string | null | undefined, items: QuoteItem[]) {
    const sku_ids = items.map(parseSkuId);
    const quantities = items.map((it) => {
      const embalagemQty = Number((it as any).vtexEmbalagemQty || 1);
      return Math.max(1, Number(it.quantity) * embalagemQty);
    });
    const rpcName = tradePolicyId ? "vtex_validate_cart" : "vtex_validate_cart_any_policy";
    const args: any = { sku_ids, quantities };
    if (tradePolicyId) args.trade_policy_id = String(tradePolicyId);
    const { data, error } = await (supabase as any).rpc(rpcName, args);
    if (error) throw error;
    return (data ?? []) as Array<{
      vtex_sku_id: number;
      quantity: number;
      trade_policy_id: string;
      effective_price: number | null;
      price_source: string | null;
      available_quantity: number;
      in_stock: boolean;
      ok: boolean;
      reason: string | null;
    }>;
  }
}

