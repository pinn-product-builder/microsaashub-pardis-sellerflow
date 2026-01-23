
import { Badge } from '@/components/ui/badge';

interface QuoteStatusBadgeProps {
  // no backend vtex_quotes usamos: draft, calculated, pending_approval, approved, rejected, sent, expired, converted
  // mas historicamente existiam outros valores, então aceitamos string para não quebrar UI.
  status?: string | null;
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
    pending_approval: {
      label: 'Pend. Aprovação',
      variant: 'default' as const,
      className: 'bg-amber-100 text-amber-800 hover:bg-amber-100'
    },
    approved: {
      label: 'Aprovada',
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 hover:bg-green-100'
    },
    rejected: {
      label: 'Rejeitada',
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 hover:bg-red-100'
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
    // compat
    pending: {
      label: 'Pendente',
      variant: 'default' as const,
      className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
    },
    processing: {
      label: 'Processando',
      variant: 'default' as const,
      className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100'
    },
    converted: {
      label: 'Convertida',
      variant: 'default' as const,
      className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
    },
  };

  const normalized = (status ?? 'draft') as keyof typeof statusConfig;
  const config =
    statusConfig[normalized] ??
    ({
      label: String(status ?? 'Desconhecido'),
      variant: 'secondary' as const,
      className: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
    } as const);

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
