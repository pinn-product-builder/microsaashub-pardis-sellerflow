
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Activity
} from 'lucide-react';
import { ConversionTimeline as TimelineType, ConversionStep } from '@/types/vtex';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversionTimelineProps {
  timeline: TimelineType;
}

export function ConversionTimeline({ timeline }: ConversionTimelineProps) {
  const getStatusIcon = (status: ConversionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'skipped':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: ConversionStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">Pendente</Badge>;
      case 'skipped':
        return <Badge className="bg-yellow-100 text-yellow-800">Ignorado</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Timeline de Conversão
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cotação: {timeline.quoteId}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeline.steps.map((step, index) => (
            <div key={step.id} className="flex items-start space-x-4">
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(step.status)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium">{step.name}</h4>
                  {getStatusBadge(step.status)}
                </div>

                {step.timestamp && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {formatDate(step.timestamp)}
                    {step.duration && ` • ${step.duration}ms`}
                  </p>
                )}

                {step.details && (
                  <p className="text-sm text-muted-foreground">{step.details}</p>
                )}

                {step.error && (
                  <p className="text-sm text-red-600 mt-1">{step.error}</p>
                )}
              </div>

              {/* Connector Line */}
              {index < timeline.steps.length - 1 && (
                <div className="absolute left-6 mt-8 w-px h-8 bg-border" />
              )}
            </div>
          ))}
        </div>

        {timeline.steps.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum passo registrado ainda</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
