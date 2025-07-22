
import { Eye, Edit, Copy, Send, MoreHorizontal } from 'lucide-react';
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
import { Quote } from '@/types/cpq';
import { QuoteStatusBadge } from '@/components/cpq/display/QuoteStatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface QuotesTableProps {
  quotes: Quote[];
}

export function QuotesTable({ quotes }: QuotesTableProps) {
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

  const handleViewQuote = (quoteId: string) => {
    console.log('Visualizar cotação:', quoteId);
    // TODO: Implementar navegação para visualização
  };

  const handleEditQuote = (quoteId: string) => {
    console.log('Editar cotação:', quoteId);
    // TODO: Implementar navegação para edição
  };

  const handleDuplicateQuote = (quoteId: string) => {
    console.log('Duplicar cotação:', quoteId);
    // TODO: Implementar duplicação
  };

  const handleSendQuote = (quoteId: string) => {
    console.log('Enviar cotação:', quoteId);
    // TODO: Implementar envio por email
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
                {quote.number}
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
                    <DropdownMenuItem onClick={() => handleViewQuote(quote.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </DropdownMenuItem>
                    {quote.status === 'draft' && (
                      <DropdownMenuItem onClick={() => handleEditQuote(quote.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDuplicateQuote(quote.id)}>
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
