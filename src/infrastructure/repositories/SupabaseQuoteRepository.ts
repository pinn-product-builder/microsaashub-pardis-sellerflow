import { supabase } from '@/integrations/supabase/client';
import { Quote } from '@/domain/quote/entities/Quote';
import { QuoteItem } from '@/domain/quote/entities/QuoteItem';
import { IQuoteRepository, QuoteFilters } from '@/domain/quote/repositories/IQuoteRepository';
import { Database } from '@/integrations/supabase/types';

type QuoteStatusDB = Database['public']['Enums']['quote_status'];

export class SupabaseQuoteRepository implements IQuoteRepository {
  async findById(id: string): Promise<Quote | null> {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        payment_condition:payment_conditions(*),
        items:quote_items(*, product:products(*))
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByNumber(quoteNumber: string): Promise<Quote | null> {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        items:quote_items(*, product:products(*))
      `)
      .eq('quote_number', quoteNumber)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findAll(filters?: QuoteFilters): Promise<Quote[]> {
    let query = supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        payment_condition:payment_conditions(*),
        items:quote_items(*, product:products(*))
      `)
      .order('created_at', { ascending: false });

    if (filters?.status?.length) {
      query = query.in('status', filters.status as QuoteStatusDB[]);
    }
    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters?.marginMin !== undefined) {
      query = query.gte('total_margin_percent', filters.marginMin);
    }
    if (filters?.marginMax !== undefined) {
      query = query.lte('total_margin_percent', filters.marginMax);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(item => this.toDomain(item));
  }

  async save(quote: Quote): Promise<void> {
    const quoteData = this.toPersistence(quote);
    
    // Upsert quote
    const { error: quoteError } = await supabase
      .from('quotes')
      .upsert({
        id: quote.id,
        quote_number: quote.quoteNumber,
        customer_id: quote.customerId,
        created_by: quote.createdBy,
        status: quote.status.value,
        payment_condition_id: quote.paymentConditionId,
        valid_until: quote.validUntil.toISOString(),
        notes: quote.notes,
        subtotal: quoteData.subtotal,
        total_offered: quoteData.totalOffered,
        total_discount: quoteData.totalDiscount,
        total_margin_value: quoteData.totalMarginValue,
        total_margin_percent: quoteData.totalMarginPercent,
        coupon_value: quoteData.couponValue,
        is_authorized: quoteData.isAuthorized,
        requires_approval: quoteData.requiresApproval
      });

    if (quoteError) throw quoteError;

    // Delete existing items and insert new ones
    await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', quote.id);

    if (quote.items.length > 0) {
      const itemsToInsert = quote.items.map(item => ({
        id: item.id,
        quote_id: quote.id,
        product_id: item.productId,
        quantity: item.quantity,
        list_price: item.listPrice.amount,
        offered_price: item.offeredPrice.amount,
        minimum_price: item.minimumPrice?.amount,
        total_list: item.totalList.amount,
        total_offered: item.totalOffered.amount,
        margin_value: item.margin.value,
        margin_percent: item.margin.percent,
        is_authorized: item.isAuthorized,
        stock_available: item.stockAvailable,
        campaign_discount: item.campaignDiscount
      }));

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }
  }

  async delete(id: string): Promise<void> {
    // Delete items first (cascade)
    await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', id);

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async exists(id: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('id', id);

    if (error) return false;
    return (count || 0) > 0;
  }

  async count(filters?: QuoteFilters): Promise<number> {
    let query = supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true });

    if (filters?.status?.length) {
      query = query.in('status', filters.status as QuoteStatusDB[]);
    }
    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  }

  private toDomain(raw: any): Quote {
    const items = (raw.items || []).map((item: any) => 
      QuoteItem.create({
        id: item.id,
        productId: item.product_id,
        productName: item.product?.name || '',
        productSku: item.product?.sku || '',
        quantity: item.quantity,
        listPrice: item.list_price,
        offeredPrice: item.offered_price,
        minimumPrice: item.minimum_price,
        clusterPrice: item.cluster_price,
        baseCost: item.product?.base_cost || item.offered_price * 0.7,
        stockAvailable: item.stock_available,
        stockMinExpiry: item.stock_min_expiry ? new Date(item.stock_min_expiry) : undefined,
        campaignName: item.campaign_name,
        campaignDiscount: item.campaign_discount
      })
    );

    const quote = Quote.reconstitute(raw.id, {
      quoteNumber: raw.quote_number,
      customerId: raw.customer_id,
      customerName: raw.customer?.company_name,
      createdBy: raw.created_by,
      status: raw.status,
      items,
      paymentConditionId: raw.payment_condition_id,
      validUntil: new Date(raw.valid_until),
      notes: raw.notes,
      couponValue: raw.coupon_value || 0,
      createdAt: new Date(raw.created_at),
      updatedAt: new Date(raw.updated_at)
    });

    return quote;
  }

  private toPersistence(quote: Quote) {
    const totals = quote.calculateTotals();
    return {
      subtotal: totals.subtotal.amount,
      totalOffered: totals.totalOffered.amount,
      totalDiscount: totals.totalDiscount.amount,
      totalMarginValue: totals.totalMarginValue,
      totalMarginPercent: totals.totalMarginPercent,
      couponValue: totals.couponValue.amount,
      isAuthorized: quote.isAuthorized(),
      requiresApproval: quote.requiresApproval()
    };
  }
}
