import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { AppRole } from '@/types/pardis';

interface AuthorizationBadgeProps {
  isAuthorized: boolean;
  requiresApproval?: boolean;
  requiredRole?: AppRole;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const roleLabels: Record<AppRole, string> = {
  vendedor: 'Vendedor',
  coordenador: 'Coordenador',
  gerente: 'Gerente',
  diretor: 'Diretor',
  admin: 'Admin',
};

export function AuthorizationBadge({
  isAuthorized,
  requiresApproval = false,
  requiredRole,
  size = 'md',
  className,
}: AuthorizationBadgeProps) {
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

  if (isAuthorized) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium',
          'bg-green-100 text-green-800 border border-green-200',
          sizeClasses[size],
          className
        )}
      >
        <CheckCircle className={iconSize[size]} />
        <span>AUTORIZADO</span>
      </div>
    );
  }

  if (requiresApproval) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium',
          'bg-yellow-100 text-yellow-800 border border-yellow-200',
          sizeClasses[size],
          className
        )}
      >
        <Clock className={iconSize[size]} />
        <span>
          PENDENTE
          {requiredRole && ` (${roleLabels[requiredRole]})`}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        'bg-red-100 text-red-800 border border-red-200',
        sizeClasses[size],
        className
      )}
    >
      <XCircle className={iconSize[size]} />
      <span>
        NÃO AUTORIZADO
        {requiredRole && ` (Requer ${roleLabels[requiredRole]})`}
      </span>
    </div>
  );
}
