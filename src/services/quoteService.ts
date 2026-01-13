// Compatibility shim - delegates to Supabase via hooks
// This file maintains backward compatibility while we migrate components

import { supabase } from '@/integrations/supabase/client';
import { Quote, QuoteItem } from '@/types/seller-flow';

export class QuoteService {
  static generateQuoteNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getTime()).slice(-4);
    return `COT-${year}${month}${day}-${time}`;
  }

  static async createQuote(quote: Omit<Quote, 'id' | 'number' | 'createdAt' | 'updatedAt'>): Promise<Quote | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const validUntil = quote.validUntil instanceof Date 
      ? quote.validUntil.toISOString() 
      : quote.validUntil;

    const { data, error } = await supabase
      .from('quotes')
      .insert({
        customer_id: quote.customer.id,
        created_by: user.id,
        valid_until: validUntil,
        status: 'draft',
        notes: quote.notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quote:', error);
      return null;
    }

    return { ...quote, id: data.id, number: data.quote_number, createdAt: new Date(), updatedAt: new Date() } as Quote;
  }

  static async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | null> {
    const { error } = await supabase
      .from('quotes')
      .update({ 
        notes: updates.notes
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating quote:', error);
      return null;
    }

    return { id, ...updates } as Quote;
  }

  static async getQuote(id: string): Promise<Quote | null> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, customer:customers(*), items:quote_items(*, product:products(*))')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as unknown as Quote;
  }

  static async getAllQuotes(): Promise<Quote[]> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, customer:customers(*)')
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []) as unknown as Quote[];
  }

  static async deleteQuote(id: string): Promise<boolean> {
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    return !error;
  }

  static calculateQuoteTotals(items: QuoteItem[], discount: number = 0) {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalTaxes = items.reduce((sum, item) => sum + (item.taxes?.total || 0) * item.quantity, 0);
    const totalFreight = items.reduce((sum, item) => sum + (item.freight || 0), 0);
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal + totalTaxes + totalFreight - discountAmount;

    return { subtotal, totalTaxes, totalFreight, discount: discountAmount, total };
  }
}
