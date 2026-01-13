import { cn } from '@/lib/utils';
import { PardisMarginEngine } from '@/services/pardisMarginEngine';

interface MarginIndicatorProps {
  marginPercent: number;
  marginValue?: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MarginIndicator({
  marginPercent,
  marginValue,
  showValue = true,
  size = 'md',
  className,
}: MarginIndicatorProps) {
  const color = PardisMarginEngine.getMarginColor(marginPercent);
  
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        colorClasses[color],
        sizeClasses[size],
        className
      )}
    >
      {/* Semáforo */}
      <span
        className={cn(
          'rounded-full',
          iconSize[size],
          color === 'green' && 'bg-green-500',
          color === 'yellow' && 'bg-yellow-500',
          color === 'red' && 'bg-red-500'
        )}
      />
      
      {/* Percentual */}
      <span>{PardisMarginEngine.formatMargin(marginPercent)}</span>
      
      {/* Valor em reais */}
      {showValue && marginValue !== undefined && (
        <span className="opacity-75">
          ({PardisMarginEngine.formatCurrency(marginValue)})
        </span>
      )}
    </div>
  );
}
