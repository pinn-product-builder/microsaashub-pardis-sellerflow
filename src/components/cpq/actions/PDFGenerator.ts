
import { Quote } from '@/types/cpq';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export class PDFGenerator {
  static async generateQuotePDF(quote: Quote): Promise<void> {
    // Simulação de geração de PDF
    // Em produção, usaria uma biblioteca como jsPDF ou Puppeteer
    
    const content = this.generateHTMLContent(quote);
    
    // Criar um blob com o conteúdo HTML
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Abrir em nova janela para impressão/salvamento
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          URL.revokeObjectURL(url);
        }, 250);
      };
    }
  }

  private static generateHTMLContent(quote: Quote): string {
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

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Cotação ${quote.number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #ccc;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-info, .customer-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            .customer-info div {
              flex: 1;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
            }
            .totals {
              margin-top: 20px;
              text-align: right;
            }
            .totals table {
              margin-left: auto;
              width: 300px;
            }
            .total-row {
              font-weight: bold;
              font-size: 1.1em;
            }
            .notes {
              margin-top: 30px;
              padding: 15px;
              background-color: #f9f9f9;
              border-left: 4px solid #007bff;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>COTAÇÃO</h1>
            <h2>${quote.number}</h2>
            <p>Data: ${formatDate(quote.createdAt)} | Validade: ${formatDate(quote.validUntil)}</p>
          </div>

          <div class="customer-info">
            <div>
              <h3>Cliente:</h3>
              <p><strong>${quote.customer.companyName}</strong></p>
              <p>CNPJ: ${quote.customer.cnpj}</p>
              <p>${quote.customer.city}/${quote.customer.uf}</p>
            </div>
            <div>
              <h3>Entrega:</h3>
              <p>UF Destino: ${quote.destinationUF}</p>
              <p>Condições: ${quote.paymentConditions}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Qtd</th>
                <th>Preço Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${quote.items.map(item => `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.product.sku}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.totalPrice)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td>${formatCurrency(quote.subtotal)}</td>
              </tr>
              <tr>
                <td>Impostos:</td>
                <td>${formatCurrency(quote.totalTaxes)}</td>
              </tr>
              <tr>
                <td>Frete:</td>
                <td>${formatCurrency(quote.totalFreight)}</td>
              </tr>
              ${quote.discount > 0 ? `
                <tr>
                  <td>Desconto:</td>
                  <td>-${formatCurrency(quote.discount)}</td>
                </tr>
              ` : ''}
              <tr class="total-row">
                <td><strong>Total:</strong></td>
                <td><strong>${formatCurrency(quote.total)}</strong></td>
              </tr>
            </table>
          </div>

          ${quote.notes ? `
            <div class="notes">
              <h4>Observações:</h4>
              <p>${quote.notes.replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}

          <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
            <p>Esta é uma cotação válida até ${formatDate(quote.validUntil)}</p>
            <p>Sistema Pardis - Cotações</p>
          </div>
        </body>
      </html>
    `;
  }
}
