
import { Quote } from '@/types/cpq';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export class ExcelExport {
  static exportQuoteToExcel(quote: Quote): void {
    // Simulação de exportação para Excel
    // Em produção, usaria uma biblioteca como SheetJS ou ExcelJS
    
    const data = this.prepareExcelData(quote);
    const csv = this.convertToCSV(data);
    this.downloadCSV(csv, `cotacao-${quote.number}.csv`);
  }

  private static prepareExcelData(quote: Quote) {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const formatDate = (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
    };

    const header = [
      ['COTAÇÃO', quote.number],
      ['Data', formatDate(quote.createdAt)],
      ['Validade', formatDate(quote.validUntil)],
      ['Cliente', quote.customer.companyName],
      ['CNPJ', quote.customer.cnpj],
      ['UF Destino', quote.destinationUF],
      ['Condições', quote.paymentConditions],
      [], // linha vazia
      ['PRODUTOS'],
      ['Produto', 'SKU', 'Categoria', 'Quantidade', 'Preço Unitário', 'Total Produto', 'ICMS', 'IPI', 'PIS', 'COFINS', 'Frete', 'Total Item']
    ];

    const items = quote.items.map(item => [
      item.product.name,
      item.product.sku,
      item.product.category,
      item.quantity.toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.totalPrice),
      formatCurrency(item.taxes.icms),
      formatCurrency(item.taxes.ipi),
      formatCurrency(item.taxes.pis),
      formatCurrency(item.taxes.cofins),
      formatCurrency(item.freight),
      formatCurrency(item.totalPrice + item.taxes.total + item.freight)
    ]);

    const totals = [
      [], // linha vazia
      ['RESUMO'],
      ['Subtotal', formatCurrency(quote.subtotal)],
      ['Total Impostos', formatCurrency(quote.totalTaxes)],
      ['Total Frete', formatCurrency(quote.totalFreight)],
      ['Desconto', formatCurrency(quote.discount)],
      ['TOTAL GERAL', formatCurrency(quote.total)]
    ];

    const notes = quote.notes ? [
      [], // linha vazia
      ['OBSERVAÇÕES'],
      [quote.notes]
    ] : [];

    return [...header, ...items, ...totals, ...notes];
  }

  private static convertToCSV(data: string[][]): string {
    return data.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  private static downloadCSV(csv: string, filename: string): void {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}
