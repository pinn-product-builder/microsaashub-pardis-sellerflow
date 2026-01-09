import { cn } from '@/lib/utils';
import { FlaskConical } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface L2LBadgeProps {
  isLabToLab: boolean;
  discountPercent?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function L2LBadge({
  isLabToLab,
  discountPercent = 1,
  showLabel = true,
  size = 'md',
  className,
}: L2LBadgeProps) {
  if (!isLabToLab) return null;

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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-full font-medium',
              'bg-purple-100 text-purple-800 border border-purple-200',
              sizeClasses[size],
              className
            )}
          >
            <FlaskConical className={iconSize[size]} />
            {showLabel && <span>L2L</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">Cliente Lab-to-Lab</p>
            <p className="text-muted-foreground">
              Desconto automático de {discountPercent}% aplicado
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
