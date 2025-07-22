
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QuoteFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  dateFilter: string;
  onDateChange: (value: string) => void;
}

export function QuoteFilters({
  statusFilter,
  onStatusChange,
  dateFilter,
  onDateChange
}: QuoteFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="calculated">Calculada</SelectItem>
            <SelectItem value="approved">Aprovada</SelectItem>
            <SelectItem value="sent">Enviada</SelectItem>
            <SelectItem value="expired">Expirada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Período</Label>
        <Select value={dateFilter} onValueChange={onDateChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Valor Mínimo</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Em breve" />
          </SelectTrigger>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Valor Máximo</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Em breve" />
          </SelectTrigger>
        </Select>
      </div>
    </div>
  );
}
