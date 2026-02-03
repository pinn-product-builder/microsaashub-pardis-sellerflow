import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Info } from 'lucide-react';
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
  discountReason: string;
  onDiscountReasonChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  customerPaymentTerms: string[];
}

/**
 * COMPONENTE: Condições de Pagamento e Governança de Desconto Global
 * Gerencia a forma de pagamento, descontos aplicados à cotação inteira e justificativas.
 */
export function PaymentConditions({
  paymentConditions,
  onPaymentChange,
  discount,
  onDiscountChange,
  discountReason,
  onDiscountReasonChange,
  notes,
  onNotesChange,
  customerPaymentTerms
}: PaymentConditionsProps) {
  const defaultPaymentTerms = ['À vista', '30 dias', '60 dias', '90 dias'];
  const availableTerms = [...new Set([...defaultPaymentTerms, ...customerPaymentTerms])];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* IDENTIFICAÇÃO: SEÇÃO DE PAGAMENTO E DESCONTO RÁPIDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <Label htmlFor="payment" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            Condição Comercial
            <Info className="h-3 w-3" />
          </Label>
          <Select value={paymentConditions} onValueChange={onPaymentChange}>
            <SelectTrigger className="h-12 border-muted-foreground/20 shadow-sm focus:ring-primary/20">
              <SelectValue placeholder="Selecione as condições" />
            </SelectTrigger>
            <SelectContent>
              {availableTerms.map((term) => (
                <SelectItem key={term} value={term} className="font-medium">
                  {term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="discount" className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
            Desconto Global (%)
            <CheckCircle2 className="h-3 w-3" />
          </Label>
          <div className="relative">
            <Input
              id="discount"
              type="number"
              min="0"
              max="100" // Limite estendido para flexibilidade, governança cuida da alçada
              step="0.1"
              value={discount}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              className="h-12 font-black text-primary border-primary/20 shadow-sm focus-visible:ring-primary/20 pr-10"
              placeholder="0.0"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-primary opacity-50">%</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
            O desconto global é aplicado sobre o total líquido da cotação.
          </p>
        </div>
      </div>

      {/* IDENTIFICAÇÃO: JUSTIFICATIVA OBRIGATÓRIA (GOVERNANÇA) */}
      {discount > 0 && (
        <div className="space-y-3 p-6 bg-primary/5 rounded-2xl border border-primary/10 border-dashed animate-in zoom-in-95 duration-300">
          <Label htmlFor="discountReason" className="text-xs font-black uppercase tracking-widest text-primary">
            Justificativa do Desconto <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="discountReason"
            placeholder="Descreva o motivo comercial deste desconto para fins de auditoria e aprovação..."
            value={discountReason}
            onChange={(e) => onDiscountReasonChange(e.target.value)}
            className="min-h-[100px] bg-white border-primary/20 focus-visible:ring-primary/20 shadow-inner"
          />
          <div className="flex items-start gap-2 text-[10px] text-primary/70 font-bold uppercase">
            <Info className="h-3.5 w-3.5 mt-0.5" />
            <span>Este campo é obrigatório para que a cotação possa ser salva ou finalizada.</span>
          </div>
        </div>
      )}

      {/* IDENTIFICAÇÃO: OBSERVAÇÕES ADICIONAIS */}
      <div className="space-y-3">
        <Label htmlFor="notes" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Notas da Cotação
        </Label>
        <Textarea
          id="notes"
          placeholder="Ex: 'Entregar apenas no período da tarde', 'Atenção ao lote de validade'..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="min-h-[120px] border-muted-foreground/20 shadow-sm focus-visible:ring-primary/10"
        />
      </div>
    </div>
  );
}
