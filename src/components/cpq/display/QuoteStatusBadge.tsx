
import { Badge } from '@/components/ui/badge';

interface QuoteStatusBadgeProps {
  status: 'draft' | 'calculated' | 'approved' | 'sent' | 'expired' | 'pending' | 'processing';
}

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  const statusConfig = {
    draft: {
      label: 'Rascunho',
      variant: 'secondary' as const,
      className: 'bg-orange-100 text-orange-800 hover:bg-orange-100'
    },
    calculated: {
      label: 'Calculada',
      variant: 'default' as const,
      className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
    },
    approved: {
      label: 'Aprovada',
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 hover:bg-green-100'
    },
    sent: {
      label: 'Enviada',
      variant: 'default' as const,
      className: 'bg-purple-100 text-purple-800 hover:bg-purple-100'
    },
    expired: {
      label: 'Expirada',
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 hover:bg-red-100'
    },
    pending: {
      label: 'Pendente',
      variant: 'default' as const,
      className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
    },
    processing: {
      label: 'Processando',
      variant: 'default' as const,
      className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100'
    }
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
