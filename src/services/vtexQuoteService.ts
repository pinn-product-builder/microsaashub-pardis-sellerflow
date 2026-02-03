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
  private static async logEvent(input: {
    quoteId: string;
    eventType: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    message?: string;
    payload?: Record<string, unknown>;
    createdBy?: string;
  }) {
    try {
      await (supabase as any).from("vtex_quote_events").insert({
        quote_id: input.quoteId,
        event_type: input.eventType,
        from_status: input.fromStatus ?? null,
        to_status: input.toStatus ?? null,
        message: input.message ?? null,
        payload: input.payload ?? {},
        created_by: input.createdBy ?? null,
      });
    } catch (error) {
      console.warn("Falha ao registrar evento de auditoria:", error);
    }
  }

  static async createOrUpdateQuote(params: {
    quoteId?: string;
    duplicatedFromQuoteId?: string;
    customer: Customer;
    destinationUF: string;
    tradePolicyId: string; // legado (mantido no header da quote)
    items: QuoteItem[];
    status: VtexQuoteStatus;
    subtotal: number;
    discount: number;
    discountReason?: string;
    total: number;
    totalMarginPercent?: number | null;
    requiresApproval?: boolean;
    isAuthorized?: boolean;
    discountMode?: 'percentage' | 'manual';
    notes?: string;
  }): Promise<{ id: string; number: string }> {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Usuário não autenticado");

    let previousStatus: string | null = null;
    if (params.quoteId) {
      const { data: existing } = await (supabase as any)
        .from("vtex_quotes")
        .select("status")
        .eq("id", params.quoteId)
        .maybeSingle();
      previousStatus = (existing?.status ?? null) as string | null;
    }

    const quoteUpsert: any = {
      id: params.quoteId,
      vtex_client_id: params.customer.id,
      destination_uf: params.destinationUF,
      trade_policy_id: String(params.tradePolicyId ?? "1"),
      status: params.status,
      subtotal: params.subtotal,
      total_discount: params.discount,
      discount_reason: params.discountReason ?? null,
      total: params.total,
      total_margin_percent: params.totalMarginPercent ?? null,
      discount_mode: params.discountMode ?? 'percentage',
      requires_approval: !!params.requiresApproval,
      is_authorized: !!params.isAuthorized,
      notes: params.notes ?? null,
      duplicated_from_quote_id: params.duplicatedFromQuoteId ?? null,
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
        const manualDiscount = it.discounts?.find(d => d.type === 'MANUAL');
        const isManual = !!manualDiscount && manualDiscount.percentage > 0;
        return {
          quote_id: quoteId,
          vtex_sku_id: skuId,
          quantity: it.quantity,
          trade_policy_id: (it as any).vtexTradePolicyId ?? null,
          unit_price: it.unitPrice,
          price_source: isManual ? "manual" : "effective",
          line_total: it.totalPrice,
          snapshot: {
            product_name: it.product?.name,
            sku: it.product?.sku,
            base_cost: it.product?.baseCost,
            original_unit_price: (it as any).originalUnitPrice ?? it.unitPrice,
            manual_unit_price: isManual,
            manual_discount_percent: manualDiscount?.percentage ?? 0,
          },
        };
      });

      const { error: itemsErr } = await (supabase as any).from("vtex_quote_items").insert(rows);
      if (itemsErr) throw itemsErr;
    }

    await this.logEvent({
      quoteId,
      eventType: params.quoteId ? "edited" : "created",
      fromStatus: previousStatus,
      toStatus: params.status,
      message: params.quoteId ? "Cotação editada" : "Cotação criada",
      payload: {
        tradePolicyId: params.tradePolicyId,
        items: params.items.length,
        discount: params.discount,
        discountMode: params.discountMode,
        discountReason: params.discountReason ?? null,
        duplicatedFrom: params.duplicatedFromQuoteId ?? null,
      },
      createdBy: user.id,
    });

    if (!params.quoteId && params.duplicatedFromQuoteId) {
      await this.logEvent({
        quoteId,
        eventType: "duplicated",
        message: "Cotação duplicada",
        payload: { fromQuoteId: params.duplicatedFromQuoteId },
        createdBy: user.id,
      });
    }

    if (params.discount > 0 && params.discountReason?.trim()) {
      await this.logEvent({
        quoteId,
        eventType: "discount",
        fromStatus: previousStatus,
        toStatus: params.status,
        message: "Desconto concedido",
        payload: {
          discount: params.discount,
          reason: params.discountReason.trim(),
        },
        createdBy: user.id,
      });
    }

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
      discountMode: (q.discount_mode as any) ?? 'percentage',
      discountReason: q.discount_reason ?? undefined,
      tradePolicyId: String(q.trade_policy_id ?? "1"),
      duplicatedFromQuoteId: q.duplicated_from_quote_id ?? undefined,
      duplicatedFromQuoteNumber: q.duplicated_from?.quote_number != null ? String(q.duplicated_from.quote_number) : undefined,
    };

    return quote;
  }

  static async validateCart(
    tradePolicyId: string | null | undefined,
    items: QuoteItem[],
    quoteId?: string,
  ) {
    const sku_ids = items.map(parseSkuId);
    const quantities = items.map((it) => {
      const embalagemQty = Number((it as any).vtexEmbalagemQty || 1);
      return Math.max(1, Number(it.quantity) * embalagemQty);
    });
    const rpcName = tradePolicyId ? "vtex_validate_cart" : "vtex_validate_cart_any_policy";
    const args: any = { sku_ids, quantities };
    if (tradePolicyId) args.trade_policy_id = String(tradePolicyId);
    const { data, error } = await (supabase as any).rpc(rpcName, args);
    if (error) {
      if (quoteId) {
        await this.logEvent({
          quoteId,
          eventType: "failed",
          message: "Falha na validação do carrinho",
          payload: { error: error.message ?? String(error) },
        });
      }
      throw error;
    }

    const results = (data ?? []) as Array<{
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

    if (quoteId) {
      const failures = results.filter((r) => !r.ok);
      if (failures.length) {
        await this.logEvent({
          quoteId,
          eventType: "failed",
          message: `Validação falhou (${failures.length} item(ns))`,
          payload: { failures: failures.slice(0, 10) },
        });
      } else {
        await this.logEvent({
          quoteId,
          eventType: "validated",
          message: "Carrinho validado com sucesso",
          payload: { items: results.length },
        });
      }
    }

    return results;
  }
}

