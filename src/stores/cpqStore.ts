
import { create } from 'zustand';
import { Quote, QuoteItem, Customer, Product } from '@/types/cpq';

interface CPQStore {
  // Estado da cotação atual
  currentQuote: Partial<Quote> | null;
  selectedCustomer: Customer | null;
  destinationUF: string;
  items: QuoteItem[];
  discount: number;
  paymentConditions: string;
  notes: string;

  // Ações
  setCurrentQuote: (quote: Partial<Quote> | null) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setDestinationUF: (uf: string) => void;
  addItem: (item: QuoteItem) => void;
  updateItem: (id: string, updates: Partial<QuoteItem>) => void;
  removeItem: (id: string) => void;
  setDiscount: (discount: number) => void;
  setPaymentConditions: (conditions: string) => void;
  setNotes: (notes: string) => void;
  clearQuote: () => void;

  // Estado da UI
  isCalculating: boolean;
  setIsCalculating: (calculating: boolean) => void;

  // Estado das integrações
  integrations: {
    vtex: {
      enabled: boolean;
      configured: boolean;
    };
    datasul: {
      enabled: boolean;
      configured: boolean;
    };
  };
  setIntegrationStatus: (integration: 'vtex' | 'datasul', status: { enabled: boolean; configured: boolean }) => void;
}

export const useCPQStore = create<CPQStore>((set, get) => ({
  // Estado inicial
  currentQuote: null,
  selectedCustomer: null,
  destinationUF: '',
  items: [],
  discount: 0,
  paymentConditions: 'À vista',
  notes: '',
  isCalculating: false,

  // Estado inicial das integrações
  integrations: {
    vtex: {
      enabled: false,
      configured: false
    },
    datasul: {
      enabled: false,
      configured: false
    }
  },

  // Ações
  setCurrentQuote: (quote) => set({ currentQuote: quote }),
  
  setSelectedCustomer: (customer) => set({ 
    selectedCustomer: customer,
    destinationUF: customer?.uf || ''
  }),
  
  setDestinationUF: (uf) => set({ destinationUF: uf }),
  
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  
  updateItem: (id, updates) => set((state) => ({
    items: state.items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    )
  })),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  })),
  
  setDiscount: (discount) => set({ discount }),
  setPaymentConditions: (conditions) => set({ paymentConditions: conditions }),
  setNotes: (notes) => set({ notes }),
  
  clearQuote: () => set({
    currentQuote: null,
    selectedCustomer: null,
    destinationUF: '',
    items: [],
    discount: 0,
    paymentConditions: 'À vista',
    notes: ''
  }),

  setIsCalculating: (calculating) => set({ isCalculating: calculating }),

  setIntegrationStatus: (integration, status) => set((state) => ({
    integrations: {
      ...state.integrations,
      [integration]: status
    }
  }))
}));
