
import { Quote } from '@/types/seller-flow';
import { mockCustomers, mockProducts } from './mockData';
import { PricingService } from '@/services/pricingService';

// Função auxiliar para criar cotações mock
const createMockQuote = (
  id: string,
  number: string,
  customerIndex: number,
  productIds: string[],
  quantities: number[],
  status: Quote['status'],
  daysAgo: number
): Quote => {
  const customer = mockCustomers[customerIndex];
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const validUntil = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  const items = productIds.map((productId, index) => {
    const product = mockProducts.find(p => p.id === productId)!;
    const quantity = quantities[index];
    return PricingService.calculateQuoteItem(product, quantity, customer.uf);
  });

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalTaxes = items.reduce((sum, item) => sum + (item.taxes.total * item.quantity), 0);
  const totalFreight = items.reduce((sum, item) => sum + item.freight, 0);
  const discount = 0;
  const total = subtotal + totalTaxes + totalFreight;

  return {
    id,
    number,
    customer,
    destinationUF: customer.uf,
    items,
    subtotal,
    totalTaxes,
    totalFreight,
    discount,
    total,
    status,
    paymentConditions: customer.paymentTerms[0],
    validUntil,
    createdAt,
    updatedAt: createdAt,
    createdBy: 'sistema',
    notes: `Cotação ${status === 'draft' ? 'em desenvolvimento' : 'finalizada'} para ${customer.companyName}`
  };
};

export const mockQuotes: Quote[] = [
  createMockQuote(
    'quote-1',
    'COT-20241220-001',
    0, // TechCorp Soluções
    ['1', '2'], // Samsung Galaxy + Dell Notebook
    [5, 2],
    'calculated',
    1
  ),
  createMockQuote(
    'quote-2',
    'COT-20241219-002',
    1, // Distribuidora Sul
    ['3', '4'], // Micro-ondas + Aspirador
    [10, 8],
    'approved',
    2
  ),
  createMockQuote(
    'quote-3',
    'COT-20241218-003',
    2, // Nordeste Comercial
    ['5'], // Furadeira
    [25],
    'sent',
    3
  ),
  createMockQuote(
    'quote-4',
    'COT-20241217-004',
    3, // Centro-Oeste Distribuidora
    ['1', '3', '5'], // Galaxy + Micro-ondas + Furadeira
    [3, 5, 15],
    'draft',
    4
  ),
  createMockQuote(
    'quote-5',
    'COT-20241215-005',
    0, // TechCorp Soluções
    ['2'], // Dell Notebook
    [10],
    'calculated',
    6
  ),
  createMockQuote(
    'quote-6',
    'COT-20241210-006',
    1, // Distribuidora Sul
    ['1', '2', '3'], // Samsung + Dell + Micro-ondas
    [20, 5, 15],
    'expired',
    11
  ),
  createMockQuote(
    'quote-7',
    'COT-20241205-007',
    2, // Nordeste Comercial
    ['4', '5'], // Aspirador + Furadeira
    [12, 30],
    'sent',
    16
  ),
  createMockQuote(
    'quote-8',
    'COT-20241201-008',
    3, // Centro-Oeste Distribuidora
    ['1'], // Samsung Galaxy
    [50],
    'approved',
    20
  ),
  createMockQuote(
    'quote-9',
    'COT-20241125-009',
    0, // TechCorp Soluções
    ['3', '4'], // Micro-ondas + Aspirador
    [8, 6],
    'calculated',
    26
  ),
  createMockQuote(
    'quote-10',
    'COT-20241120-010',
    1, // Distribuidora Sul
    ['2', '5'], // Dell + Furadeira
    [3, 20],
    'draft',
    31
  )
];
