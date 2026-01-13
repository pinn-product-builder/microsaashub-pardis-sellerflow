
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaymentConditionsProps {
  paymentConditions: string;
  onPaymentChange: (value: string) => void;
  discount: number;
  onDiscountChange: (value: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  customerPaymentTerms: string[];
}

export function PaymentConditions({
  paymentConditions,
  onPaymentChange,
  discount,
  onDiscountChange,
  notes,
  onNotesChange,
  customerPaymentTerms
}: PaymentConditionsProps) {
  const defaultPaymentTerms = ['À vista', '30 dias', '60 dias', '90 dias'];
  const availableTerms = [...new Set([...defaultPaymentTerms, ...customerPaymentTerms])];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="payment">Condições de Pagamento</Label>
          <Select value={paymentConditions} onValueChange={onPaymentChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione as condições" />
            </SelectTrigger>
            <SelectContent>
              {availableTerms.map((term) => (
                <SelectItem key={term} value={term}>
                  {term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount">Desconto (%)</Label>
          <Input
            id="discount"
            type="number"
            min="0"
            max="20"
            step="0.1"
            value={discount}
            onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
            placeholder="0.0"
          />
          <p className="text-xs text-muted-foreground">
            Desconto máximo permitido: 20%
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          placeholder="Observações adicionais sobre a cotação..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
        />
      </div>
    </div>
  );
}
