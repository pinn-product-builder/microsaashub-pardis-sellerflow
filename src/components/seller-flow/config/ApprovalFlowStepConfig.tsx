import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AppRole } from '@/types/pardis';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ApprovalStep {
    id?: string;
    rule_id: string;
    approver_role: AppRole;
    step_order: number;
    sla_hours: number;
}

interface ApprovalFlowStepConfigProps {
    ruleId: string;
}

const ROLE_LABELS: Record<AppRole, string> = {
    vendedor: 'Vendedor',
    coordenador: 'Coordenador',
    gerente: 'Gerente',
    diretor: 'Diretor',
    admin: 'Admin',
};

export function ApprovalFlowStepConfig({ ruleId }: ApprovalFlowStepConfigProps) {
    const [steps, setSteps] = useState<ApprovalStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSteps();
    }, [ruleId]);

    const fetchSteps = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('approval_rule_steps' as any)
                .select('*')
                .eq('rule_id', ruleId)
                .order('step_order', { ascending: true });

            if (error) throw error;
            setSteps(data || []);
        } catch (error: any) {
            toast.error('Erro ao carregar passos: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const addStep = () => {
        const nextOrder = steps.length > 0 ? Math.max(...steps.map(s => s.step_order)) + 1 : 1;
        const newStep: ApprovalStep = {
            rule_id: ruleId,
            approver_role: 'coordenador',
            step_order: nextOrder,
            sla_hours: 24,
        };
        setSteps([...steps, newStep]);
    };

    const removeStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index);
        // Reordenar os steps restantes
        const reordered = newSteps.map((s, i) => ({ ...s, step_order: i + 1 }));
        setSteps(reordered);
    };

    const updateStep = (index: number, field: keyof ApprovalStep, value: any) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSteps(newSteps);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Remover steps antigos
            const { error: deleteError } = await supabase
                .from('approval_rule_steps' as any)
                .delete()
                .eq('rule_id', ruleId);

            if (deleteError) throw deleteError;

            // 2. Inserir novos steps (se houver)
            if (steps.length > 0) {
                const stepsToInsert = steps.map(({ id, ...s }) => s);
                const { error: insertError } = await supabase
                    .from('approval_rule_steps' as any)
                    .insert(stepsToInsert);

                if (insertError) throw insertError;
            }

            toast.success('Fluxo de aprovação atualizado!');
            fetchSteps();
        } catch (error: any) {
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;
    }

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Fluxo de Alçadas (Níveis Sequenciais)</Label>
                <Button variant="outline" size="sm" onClick={addStep}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Nível
                </Button>
            </div>

            <div className="space-y-2">
                {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3 bg-background p-3 rounded-md border shadow-sm">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {step.step_order}
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold px-1">Papel</p>
                                <Select
                                    value={step.approver_role}
                                    onValueChange={(val: AppRole) => updateStep(index, 'approver_role', val)}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="coordenador">Coordenador</SelectItem>
                                        <SelectItem value="gerente">Gerente</SelectItem>
                                        <SelectItem value="diretor">Diretor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold px-1">SLA (h)</p>
                                <Input
                                    type="number"
                                    className="h-8"
                                    value={step.sla_hours}
                                    onChange={(e) => updateStep(index, 'sla_hours', parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 mt-4"
                            onClick={() => removeStep(index)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}

                {steps.length === 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground italic border border-dashed rounded-md bg-background/50">
                        Nenhum nível configurado. A regra usará o aprovador padrão.
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-2 border-t border-dashed">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar Fluxo
                </Button>
            </div>
        </div>
    );
}
