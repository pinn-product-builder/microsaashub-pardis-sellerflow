import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StockIndicatorProps {
  quantity: number;
  minExpiry?: string;
  requestedQuantity?: number;
  className?: string;
}

export function StockIndicator({
  quantity,
  minExpiry,
  requestedQuantity,
  className,
}: StockIndicatorProps) {
  const isOutOfStock = quantity <= 0;
  const isLowStock = quantity > 0 && quantity < 10;
  const isInsufficientStock = requestedQuantity !== undefined && quantity < requestedQuantity;
  
  // Calcular dias até vencimento
  const daysUntilExpiry = minExpiry 
    ? differenceInDays(new Date(minExpiry), new Date())
    : null;
  
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  const getStockStatus = () => {
    if (isOutOfStock) return { icon: XCircle, color: 'text-red-500', label: 'Sem estoque' };
    if (isInsufficientStock) return { icon: AlertTriangle, color: 'text-orange-500', label: 'Estoque insuficiente' };
    if (isLowStock) return { icon: AlertTriangle, color: 'text-yellow-500', label: 'Estoque baixo' };
    return { icon: CheckCircle, color: 'text-green-500', label: 'Em estoque' };
  };

  const status = getStockStatus();
  const Icon = status.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            <div className="flex items-center gap-1">
              <Icon className={cn('w-4 h-4', status.color)} />
              <span className={cn('font-medium', status.color)}>
                {quantity}
              </span>
            </div>
            
            {minExpiry && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                isExpired && 'text-red-500',
                isExpiringSoon && !isExpired && 'text-orange-500',
                !isExpiringSoon && !isExpired && 'text-muted-foreground'
              )}>
                <Clock className="w-3 h-3" />
                <span>
                  {format(new Date(minExpiry), 'dd/MM/yy', { locale: ptBR })}
                </span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p><strong>Estoque:</strong> {quantity} unidades</p>
            {minExpiry && (
              <p>
                <strong>Menor validade:</strong>{' '}
                {format(new Date(minExpiry), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {daysUntilExpiry !== null && (
                  <span className={cn(
                    'ml-1',
                    isExpired ? 'text-red-500' : isExpiringSoon ? 'text-orange-500' : ''
                  )}>
                    ({isExpired ? 'Vencido' : `${daysUntilExpiry} dias`})
                  </span>
                )}
              </p>
            )}
            {isInsufficientStock && (
              <p className="text-orange-500 mt-1">
                Quantidade solicitada ({requestedQuantity}) maior que disponível
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
