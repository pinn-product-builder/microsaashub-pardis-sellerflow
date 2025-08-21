import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, Calendar, Package, Warehouse } from 'lucide-react';
import { StockMovement } from '@/types/inventory';
import { useInventoryStore } from '@/stores/inventoryStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const movementSchema = z.object({
  type: z.enum(['in', 'out', 'transfer', 'adjustment', 'reservation', 'release']),
  sku: z.string().min(1, 'SKU é obrigatório'),
  quantity: z.number().min(0.01, 'Quantidade deve ser maior que zero'),
  warehouseFrom: z.string().optional(),
  warehouseTo: z.string().optional(),
  reason: z.string().min(1, 'Motivo é obrigatório'),
  unitCost: z.number().min(0).optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.type === 'in' && !data.warehouseTo) {
    return false;
  }
  if ((data.type === 'out' || data.type === 'adjustment') && !data.warehouseFrom) {
    return false;
  }
  if (data.type === 'transfer' && (!data.warehouseFrom || !data.warehouseTo)) {
    return false;
  }
  if (data.type === 'transfer' && data.warehouseFrom === data.warehouseTo) {
    return false;
  }
  return true;
}, {
  message: "Depósitos de origem e/ou destino são obrigatórios para este tipo de movimentação",
  path: ['warehouseFrom']
});

type MovementFormData = z.infer<typeof movementSchema>;

interface StockMovementFormProps {
  defaultType?: StockMovement['type'];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StockMovementForm({ 
  defaultType = 'in', 
  onSuccess, 
  onCancel 
}: StockMovementFormProps) {
  const { warehouses, items, addMovement, loadItems, loadWarehouses } = useInventoryStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: defaultType,
      quantity: 1,
      reason: '',
      notes: '',
    },
  });

  const selectedType = form.watch('type');
  const selectedSku = form.watch('sku');

  useEffect(() => {
    loadWarehouses();
    loadItems();
  }, [loadWarehouses, loadItems]);

  const selectedItem = items.find(item => item.sku === selectedSku);

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'in': return 'Entrada';
      case 'out': return 'Saída';
      case 'transfer': return 'Transferência';
      case 'adjustment': return 'Ajuste';
      default: return type;
    }
  };

  const getReasonSuggestions = (type: string) => {
    switch (type) {
      case 'in':
        return ['Compra', 'Devolução', 'Produção', 'Outros'];
      case 'out':
        return ['Venda', 'Devolução ao fornecedor', 'Perda', 'Outros'];
      case 'transfer':
        return ['Rebalanceamento', 'Solicitação', 'Outros'];
      case 'adjustment':
        return ['Inventário', 'Correção', 'Avaria', 'Outros'];
      default:
        return [];
    }
  };

  const onSubmit = async (data: MovementFormData) => {
    if (!selectedItem) {
      toast({
        title: 'Erro',
        description: 'Produto não encontrado',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const warehouseFrom = warehouses.find(w => w.id === data.warehouseFrom);
    const warehouseTo = warehouses.find(w => w.id === data.warehouseTo);

    const movement: Omit<StockMovement, 'id'> = {
      date: new Date(),
      type: data.type,
      productId: selectedItem.productId,
      sku: selectedItem.sku,
      productName: selectedItem.name,
      quantity: data.quantity,
      warehouseFrom: data.warehouseFrom,
      warehouseFromName: warehouseFrom?.name,
      warehouseTo: data.warehouseTo,
      warehouseToName: warehouseTo?.name,
      reason: data.reason,
      unitCost: data.unitCost,
      totalCost: data.unitCost ? data.unitCost * data.quantity : undefined,
      createdBy: 'Usuário Sistema', // In a real app, this would come from auth
      notes: data.notes,
    };

    try {
      await addMovement(movement);
      
      toast({
        title: 'Sucesso',
        description: `Movimentação de ${getMovementTypeLabel(data.type).toLowerCase()} registrada com sucesso`,
      });

      form.reset();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao registrar movimentação',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Nova Movimentação de Estoque
        </CardTitle>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Movimentação</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in">Entrada</SelectItem>
                        <SelectItem value="out">Saída</SelectItem>
                        <SelectItem value="transfer">Transferência</SelectItem>
                        <SelectItem value="adjustment">Ajuste</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto (SKU)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.sku}>
                            <div className="flex items-center justify-between w-full">
                              <span className="font-mono text-sm">{item.sku}</span>
                              <span className="text-muted-foreground ml-2">{item.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0.01"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    {selectedItem && (
                      <FormDescription>
                        Unidade: {selectedItem.uom}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo Unitário (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Deixe em branco para usar custo médio
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Warehouse selection based on movement type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(selectedType === 'out' || selectedType === 'transfer' || selectedType === 'adjustment') && (
                <FormField
                  control={form.control}
                  name="warehouseFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4" />
                        Depósito de Origem
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o depósito" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name} - {warehouse.city}/{warehouse.uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(selectedType === 'in' || selectedType === 'transfer') && (
                <FormField
                  control={form.control}
                  name="warehouseTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4" />
                        Depósito de Destino
                        {selectedType === 'transfer' && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o depósito" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name} - {warehouse.city}/{warehouse.uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getReasonSuggestions(selectedType).map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informações adicionais sobre a movimentação..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrar Movimentação'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}