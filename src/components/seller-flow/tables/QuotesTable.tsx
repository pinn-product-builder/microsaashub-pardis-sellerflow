
import { Edit, Copy, Send, MoreHorizontal, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Quote } from '@/types/seller-flow';
import { QuoteStatusBadge } from '@/components/seller-flow/display/QuoteStatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { QuoteService } from '@/services/quoteService';
import { useToast } from '@/hooks/use-toast';

interface QuotesTableProps {
  quotes: Quote[];
}

export function QuotesTable({ quotes }: QuotesTableProps) {
  const { toast } = useToast();

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

  const handleDuplicateQuote = async (quote: Quote) => {
    const duplicatedQuote = await QuoteService.createQuote({
      customer: quote.customer,
      destinationUF: quote.destinationUF,
      items: quote.items,
      subtotal: quote.subtotal,
      totalTaxes: quote.totalTaxes,
      totalFreight: quote.totalFreight,
      discount: quote.discount,
      total: quote.total,
      status: 'draft',
      paymentConditions: quote.paymentConditions,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: 'current-user',
      notes: quote.notes
    });

    toast({
      title: "Cotação Duplicada",
      description: `Nova cotação ${duplicatedQuote?.number || 'criada'} com sucesso!`
    });
  };

  const handleSendQuote = (quoteId: string) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "O envio por email será implementado em breve."
    });
  };

  if (quotes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma cotação encontrada
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>UF Destino</TableHead>
            <TableHead>Itens</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell className="font-medium">
                <Link 
                  to={`/seller-flow/cotacao/${quote.id}`}
                  className="text-primary hover:underline"
                >
                  {quote.number}
                </Link>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{quote.customer.companyName}</div>
                  <div className="text-sm text-muted-foreground">
                    {quote.customer.city}/{quote.customer.uf}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{quote.destinationUF}</Badge>
              </TableCell>
              <TableCell className="text-center">
                {quote.items.length}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(quote.total)}
              </TableCell>
              <TableCell>
                <QuoteStatusBadge status={quote.status} />
              </TableCell>
              <TableCell>
                {formatDate(quote.createdAt)}
              </TableCell>
              <TableCell>
                <span className={`text-sm ${
                  new Date(quote.validUntil) < new Date() 
                    ? 'text-red-600' 
                    : 'text-muted-foreground'
                }`}>
                  {formatDate(quote.validUntil)}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/seller-flow/cotacao/${quote.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </Link>
                    </DropdownMenuItem>
                    {quote.status === 'draft' && (
                      <DropdownMenuItem asChild>
                        <Link to={`/seller-flow/editar/${quote.id}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDuplicateQuote(quote)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                    {(quote.status === 'calculated' || quote.status === 'approved') && (
                      <DropdownMenuItem onClick={() => handleSendQuote(quote.id)}>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
