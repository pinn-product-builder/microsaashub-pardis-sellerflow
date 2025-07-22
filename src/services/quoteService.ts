import { Quote, QuoteItem } from '@/types/cpq';
import { mockQuotes } from '@/data/mockQuotes';

const STORAGE_KEY = 'cpq_quotes';

export class QuoteService {
  private static getQuotes(): Quote[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Se não há dados no localStorage, inicializa com dados mock
    this.saveQuotes(mockQuotes);
    return mockQuotes;
  }

  private static saveQuotes(quotes: Quote[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  }

  static generateQuoteNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getTime()).slice(-4);
    
    return `COT-${year}${month}${day}-${time}`;
  }

  static createQuote(quote: Omit<Quote, 'id' | 'number' | 'createdAt' | 'updatedAt'>): Quote {
    const quotes = this.getQuotes();
    
    const newQuote: Quote = {
      ...quote,
      id: crypto.randomUUID(),
      number: this.generateQuoteNumber(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    quotes.push(newQuote);
    this.saveQuotes(quotes);
    
    return newQuote;
  }

  static updateQuote(id: string, updates: Partial<Quote>): Quote | null {
    const quotes = this.getQuotes();
    const index = quotes.findIndex(q => q.id === id);
    
    if (index === -1) return null;
    
    quotes[index] = {
      ...quotes[index],
      ...updates,
      updatedAt: new Date()
    };
    
    this.saveQuotes(quotes);
    return quotes[index];
  }

  static getQuote(id: string): Quote | null {
    const quotes = this.getQuotes();
    return quotes.find(q => q.id === id) || null;
  }

  static getAllQuotes(): Quote[] {
    return this.getQuotes().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static deleteQuote(id: string): boolean {
    const quotes = this.getQuotes();
    const filtered = quotes.filter(q => q.id !== id);
    
    if (filtered.length === quotes.length) return false;
    
    this.saveQuotes(filtered);
    return true;
  }

  static calculateQuoteTotals(items: QuoteItem[], discount: number = 0) {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalTaxes = items.reduce((sum, item) => sum + (item.taxes.total * item.quantity), 0);
    const totalFreight = items.reduce((sum, item) => sum + item.freight, 0);
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal + totalTaxes + totalFreight - discountAmount;

    return {
      subtotal,
      totalTaxes,
      totalFreight,
      discount: discountAmount,
      total
    };
  }
}
