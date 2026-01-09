import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProductData {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  base_cost: number;
  stock_quantity?: number | null;
  stock_min_expiry?: string | null;
  status?: string | null;
  campaign_name?: string | null;
  campaign_discount?: number | null;
  ncm?: string | null;
  is_active?: boolean | null;
  price_minimum?: number | null;
  price_mg?: number | null;
  price_br?: number | null;
}

export function exportProductsToExcel(products: ProductData[], filename?: string): void {
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getExpiryStatus = (dateStr: string | null) => {
    if (!dateStr) return 'Sem validade';
    const days = differenceInDays(new Date(dateStr), new Date());
    if (days < 0) return 'Vencido';
    if (days <= 7) return `Vence em ${days} dias`;
    if (days <= 30) return `Vence em ${days} dias`;
    if (days <= 90) return `Vence em ${days} dias`;
    return 'OK';
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'discontinued': return 'Descontinuado';
      default: return '-';
    }
  };

  // Header row
  const headers = [
    'SKU',
    'Produto',
    'Categoria',
    'NCM',
    'Preço Base',
    'Preço Mínimo',
    'Preço MG',
    'Preço BR',
    'Estoque',
    'Validade',
    'Status Validade',
    'Status',
    'Ativo',
    'Campanha',
    'Desconto Campanha (%)'
  ];

  // Data rows
  const rows = products.map(product => [
    product.sku,
    product.name,
    product.category || '-',
    product.ncm || '-',
    formatCurrency(product.base_cost),
    formatCurrency(product.price_minimum),
    formatCurrency(product.price_mg),
    formatCurrency(product.price_br),
    product.stock_quantity?.toString() || '0',
    formatDate(product.stock_min_expiry),
    getExpiryStatus(product.stock_min_expiry),
    getStatusLabel(product.status),
    product.is_active ? 'Sim' : 'Não',
    product.campaign_name || '-',
    product.campaign_discount?.toString() || '-'
  ]);

  // Convert to CSV
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  // Download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const exportFilename = filename || `produtos_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', exportFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
