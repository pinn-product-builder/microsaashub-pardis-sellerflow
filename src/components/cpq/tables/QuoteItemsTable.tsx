
import { Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { QuoteItem } from '@/types/cpq';
import { useCPQStore } from '@/stores/cpqStore';

interface QuoteItemsTableProps {
  items: QuoteItem[];
}

export function QuoteItemsTable({ items }: QuoteItemsTableProps) {
  const { removeItem, updateItem } = useCPQStore();

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const updatedItem = {
          ...item,
          quantity: newQuantity,
          totalPrice: item.unitPrice * newQuantity
        };
        updateItem(itemId, updatedItem);
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum produto adicionado à cotação
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="text-center">Qtd</TableHead>
            <TableHead className="text-right">Preço Unit.</TableHead>
            <TableHead className="text-right">Impostos</TableHead>
            <TableHead className="text-right">Frete</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-center">Margem</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{item.product.name}</div>
                  <div className="text-sm text-muted-foreground">
                    SKU: {item.product.sku}
                  </div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {item.product.category}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.unitPrice)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.taxes.total)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.freight)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.totalPrice)}
              </TableCell>
              <TableCell className="text-center">
                <Badge 
                  variant={item.margin >= 20 ? "default" : item.margin >= 10 ? "secondary" : "destructive"}
                >
                  {item.margin.toFixed(1)}%
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
