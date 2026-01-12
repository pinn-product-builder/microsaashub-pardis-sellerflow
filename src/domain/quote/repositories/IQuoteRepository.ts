import { Quote } from '../entities/Quote';

export interface QuoteFilters {
  status?: string[];
  customerId?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
  marginMin?: number;
  marginMax?: number;
  search?: string;
}

export interface IQuoteRepository {
  findById(id: string): Promise<Quote | null>;
  findByNumber(quoteNumber: string): Promise<Quote | null>;
  findAll(filters?: QuoteFilters): Promise<Quote[]>;
  save(quote: Quote): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  count(filters?: QuoteFilters): Promise<number>;
}
