import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BusinessHour {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_open: boolean;
}

const DAYS_OF_WEEK = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
];

export function BusinessHoursTab() {
    const [hours, setHours] = useState<BusinessHour[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchHours();
    }, []);

    async function fetchHours() {
        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from('vtex_business_hours' as any)
                .select('*')
                .order('day_of_week', { ascending: true }) as any);

            if (error) throw error;
            setHours((data as any[]) || []);
        } catch (error: any) {
            toast.error(`Erro ao carregar horários: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            for (const hour of hours) {
                const { error } = await (supabase
                    .from('vtex_business_hours' as any)
                    .update({
                        start_time: hour.start_time,
                        end_time: hour.end_time,
                        is_open: hour.is_open,
                        updated_at: new Date().toISOString(),
                    } as any)
                    .eq('id', hour.id) as any);

                if (error) throw error;
            }
            toast.success('Horários comerciais atualizados com sucesso');
        } catch (error: any) {
            toast.error(`Erro ao salvar: ${error.message}`);
        } finally {
            setSaving(false);
        }
    }

    function updateHour(id: string, field: keyof BusinessHour, value: any) {
        setHours(prev =>
            prev.map(h => (h.id === id ? { ...h, [field]: value } : h))
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Horário Comercial (SLA)</CardTitle>
                    <CardDescription>
                        Configure os dias e horários em que o cronômetro do SLA deve correr.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchHours}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Recarregar
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar Alterações
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Dia da Semana</TableHead>
                            <TableHead className="text-center w-[120px]">Aberto?</TableHead>
                            <TableHead className="text-center w-[150px]">Início</TableHead>
                            <TableHead className="text-center w-[150px]">Fim</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {hours.map((hour) => (
                            <TableRow key={hour.id} className={!hour.is_open ? 'opacity-60 bg-muted/30' : ''}>
                                <TableCell className="font-medium">
                                    {DAYS_OF_WEEK[hour.day_of_week]}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Switch
                                        checked={hour.is_open}
                                        onCheckedChange={(checked) => updateHour(hour.id, 'is_open', checked)}
                                    />
                                </TableCell>
                                <TableCell className="text-center">
                                    <Input
                                        type="time"
                                        className="h-8 text-center"
                                        disabled={!hour.is_open}
                                        value={hour.start_time.substring(0, 5)}
                                        onChange={(e) => updateHour(hour.id, 'start_time', e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="text-center">
                                    <Input
                                        type="time"
                                        className="h-8 text-center"
                                        disabled={!hour.is_open}
                                        value={hour.end_time.substring(0, 5)}
                                        onChange={(e) => updateHour(hour.id, 'end_time', e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={`text-xs font-medium ${hour.is_open ? 'text-green-600' : 'text-muted-foreground'}`}>
                                        {hour.is_open ? 'Expediente' : 'Fechado'}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground border border-dashed">
                    <p>
                        <strong>💡 Dica:</strong> O SLA de aprovação (em horas) definido em cada regra será contabilizado
                        apenas durante os períodos marcados como "Expediente" acima.
                        Cotações enviadas fora deste horário só começarão a "correr" no próximo dia útil disponível.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
