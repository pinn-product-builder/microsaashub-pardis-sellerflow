
import { Quote } from '@/types/seller-flow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export class EmailTemplate {
  static getDefaultMessage(quote: Quote): string {
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

    return `Prezado(a) cliente,

Segue em anexo a cotação ${quote.number} solicitada.

RESUMO DA COTAÇÃO:
• Número: ${quote.number}
• Data: ${formatDate(quote.createdAt)}
• Validade: ${formatDate(quote.validUntil)}
• Quantidade de itens: ${quote.items.length}
• Valor total: ${formatCurrency(quote.total)}
• Condições de pagamento: ${quote.paymentConditions}

Esta cotação é válida até ${formatDate(quote.validUntil)}.

Para aprovação ou esclarecimentos, entre em contato conosco.

Atenciosamente,
Equipe Comercial
Pardis Seller Flow`;
  }

  static getCustomMessage(quote: Quote, customText: string): string {
    const formatDate = (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
    };

    return `${customText}

Cotação: ${quote.number}
Validade: ${formatDate(quote.validUntil)}

Atenciosamente,
Equipe Comercial`;
  }
}
