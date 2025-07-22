
import { Product, Customer, TaxRule, FreightRate, PricingRule } from '@/types/cpq';

export const mockProducts: Product[] = [
  {
    id: '1',
    sku: 'ELE001',
    name: 'Smartphone Samsung Galaxy A54',
    category: 'Eletrônicos',
    weight: 0.2,
    dimensions: { length: 15, width: 7, height: 0.8 },
    baseCost: 800,
    description: 'Smartphone Android com 128GB'
  },
  {
    id: '2',
    sku: 'ELE002',
    name: 'Notebook Dell Inspiron 15',
    category: 'Eletrônicos',
    weight: 2.1,
    dimensions: { length: 35, width: 25, height: 2 },
    baseCost: 2500,
    description: 'Notebook Intel i5, 8GB RAM, 256GB SSD'
  },
  {
    id: '3',
    sku: 'CASA001',
    name: 'Micro-ondas Electrolux 30L',
    category: 'Eletrodomésticos',
    weight: 15,
    dimensions: { length: 50, width: 40, height: 30 },
    baseCost: 450,
    description: 'Micro-ondas com função grill'
  },
  {
    id: '4',
    sku: 'CASA002',
    name: 'Aspirador de Pó Philips',
    category: 'Eletrodomésticos',
    weight: 3.5,
    dimensions: { length: 35, width: 25, height: 25 },
    baseCost: 280,
    description: 'Aspirador com filtro HEPA'
  },
  {
    id: '5',
    sku: 'JARD001',
    name: 'Furadeira Black & Decker',
    category: 'Ferramentas',
    weight: 1.2,
    dimensions: { length: 25, width: 20, height: 8 },
    baseCost: 120,
    description: 'Furadeira elétrica 500W'
  }
];

export const mockCustomers: Customer[] = [
  {
    id: '1',
    cnpj: '12.345.678/0001-90',
    companyName: 'TechCorp Soluções Ltda',
    uf: 'SP',
    city: 'São Paulo',
    creditLimit: 50000,
    paymentTerms: ['À vista', '30 dias', '60 dias']
  },
  {
    id: '2',
    cnpj: '98.765.432/0001-10',
    companyName: 'Distribuidora Sul S.A.',
    uf: 'RS',
    city: 'Porto Alegre',
    creditLimit: 75000,
    paymentTerms: ['À vista', '45 dias', '90 dias']
  },
  {
    id: '3',
    cnpj: '11.222.333/0001-44',
    companyName: 'Nordeste Comercial',
    uf: 'PE',
    city: 'Recife',
    creditLimit: 30000,
    paymentTerms: ['À vista', '30 dias']
  },
  {
    id: '4',
    cnpj: '55.666.777/0001-88',
    companyName: 'Centro-Oeste Distribuidora',
    uf: 'GO',
    city: 'Goiânia',
    creditLimit: 40000,
    paymentTerms: ['À vista', '30 dias', '60 dias', '90 dias']
  }
];

export const taxRules: TaxRule[] = [
  { uf: 'SP', icms: 18, ipi: 5, pis: 1.65, cofins: 7.6 },
  { uf: 'RJ', icms: 20, ipi: 5, pis: 1.65, cofins: 7.6 },
  { uf: 'MG', icms: 18, ipi: 5, pis: 1.65, cofins: 7.6 },
  { uf: 'RS', icms: 17, ipi: 5, pis: 1.65, cofins: 7.6 },
  { uf: 'SC', icms: 17, ipi: 5, pis: 1.65, cofins: 7.6 },
  { uf: 'PR', icms: 19, ipi: 5, pis: 1.65, cofins: 7.6 },
  { uf: 'BA', icms: 19, ipi: 5, pis: 1.65, cofins: 7.6 },
  { uf: 'PE', icms: 18, ipi: 5, pis: 1.65, cofins: 7.6 },
  { uf: 'GO', icms: 17, ipi: 5, pis: 1.65, cofins: 7.6 },
  { uf: 'DF', icms: 18, ipi: 5, pis: 1.65, cofins: 7.6 }
];

export const freightRates: FreightRate[] = [
  { originUF: 'SP', destinationUF: 'SP', weightMin: 0, weightMax: 5, ratePerKg: 8, minimumValue: 25 },
  { originUF: 'SP', destinationUF: 'RJ', weightMin: 0, weightMax: 5, ratePerKg: 12, minimumValue: 35 },
  { originUF: 'SP', destinationUF: 'MG', weightMin: 0, weightMax: 5, ratePerKg: 10, minimumValue: 30 },
  { originUF: 'SP', destinationUF: 'RS', weightMin: 0, weightMax: 5, ratePerKg: 15, minimumValue: 45 },
  { originUF: 'SP', destinationUF: 'SC', weightMin: 0, weightMax: 5, ratePerKg: 14, minimumValue: 40 },
  { originUF: 'SP', destinationUF: 'PR', weightMin: 0, weightMax: 5, ratePerKg: 11, minimumValue: 32 },
  { originUF: 'SP', destinationUF: 'BA', weightMin: 0, weightMax: 5, ratePerKg: 18, minimumValue: 50 },
  { originUF: 'SP', destinationUF: 'PE', weightMin: 0, weightMax: 5, ratePerKg: 20, minimumValue: 55 },
  { originUF: 'SP', destinationUF: 'GO', weightMin: 0, weightMax: 5, ratePerKg: 13, minimumValue: 38 },
  { originUF: 'SP', destinationUF: 'DF', weightMin: 0, weightMax: 5, ratePerKg: 16, minimumValue: 42 }
];

export const pricingRules: PricingRule[] = [
  { category: 'Eletrônicos', channel: 'B2B', minimumMargin: 15, standardMargin: 25, maxDiscount: 10 },
  { category: 'Eletrodomésticos', channel: 'B2B', minimumMargin: 20, standardMargin: 30, maxDiscount: 8 },
  { category: 'Ferramentas', channel: 'B2B', minimumMargin: 25, standardMargin: 35, maxDiscount: 12 }
];
