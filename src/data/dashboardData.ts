
export const dashboardStats = {
  cotacaosMes: {
    value: 145,
    change: 12,
    trend: 'up' as const
  },
  vendasRealizadas: {
    value: 89,
    change: -5,
    trend: 'down' as const
  },
  margemMedia: {
    value: 23.5,
    change: 2.1,
    trend: 'up' as const
  },
  ticketMedio: {
    value: 8500,
    change: 8,
    trend: 'up' as const
  }
};

export const salesData = [
  { month: 'Jan', vendas: 45000, cotacoes: 120 },
  { month: 'Fev', vendas: 52000, cotacoes: 135 },
  { month: 'Mar', vendas: 48000, cotacoes: 128 },
  { month: 'Abr', vendas: 61000, cotacoes: 145 },
  { month: 'Mai', vendas: 55000, cotacoes: 132 },
  { month: 'Jun', vendas: 67000, cotacoes: 158 },
];

export const categoryData = [
  { name: 'Eletrônicos', value: 35, fill: 'hsl(var(--primary))' },
  { name: 'Casa & Jardim', value: 28, fill: 'hsl(var(--secondary))' },
  { name: 'Ferramentas', value: 22, fill: 'hsl(var(--accent))' },
  { name: 'Automotivo', value: 15, fill: 'hsl(var(--muted))' },
];

export const recentActivities = [
  {
    id: 1,
    type: 'quote',
    description: 'Nova cotação criada para TechCorp Ltda',
    time: '2 min atrás',
    value: 'R$ 12.500,00'
  },
  {
    id: 2,
    type: 'sale',
    description: 'Venda finalizada - Comercial Santos',
    time: '15 min atrás',
    value: 'R$ 8.900,00'
  },
  {
    id: 3,
    type: 'quote',
    description: 'Cotação aprovada - Indústria ABC',
    time: '1h atrás',
    value: 'R$ 25.800,00'
  },
  {
    id: 4,
    type: 'customer',
    description: 'Novo cliente cadastrado',
    time: '2h atrás',
    value: 'Prime Solutions'
  },
  {
    id: 5,
    type: 'quote',
    description: 'Cotação enviada para análise',
    time: '3h atrás',
    value: 'R$ 15.200,00'
  }
];
