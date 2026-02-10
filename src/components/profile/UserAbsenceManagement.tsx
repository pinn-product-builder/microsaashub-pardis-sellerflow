import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Absence {
    id: string;
    start_date: string;
    end_date: string;
    reason: string;
    is_active: boolean;
}

export function UserAbsenceManagement() {
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [formData, setFormData] = useState({
        start_date: '',
        end_date: '',
        reason: ''
    });

    useEffect(() => {
        fetchAbsences();
    }, []);

    const fetchAbsences = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_absences')
                .select('*')
                .eq('user_id', user.id)
                .order('start_date', { ascending: false });

            if (error) throw error;
            setAbsences(data || []);
        } catch (error: any) {
            toast.error('Erro ao carregar ausências: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { error } = await supabase
                .from('user_absences')
                .insert({
                    user_id: user.id,
                    start_date: new Date(formData.start_date).toISOString(),
                    end_date: new Date(formData.end_date).toISOString(),
                    reason: formData.reason
                });

            if (error) throw error;
            toast.success('Ausência cadastrada com sucesso!');
            setFormData({ start_date: '', end_date: '', reason: '' });
            fetchAbsences();
        } catch (error: any) {
            toast.error('Erro ao cadastrar: ' + error.message);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente remover esta ausência?')) return;
        try {
            const { error } = await supabase
                .from('user_absences')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Ausência removida');
            fetchAbsences();
        } catch (error: any) {
            toast.error('Erro ao remover: ' + error.message);
        }
    };

    const isCurrent = (absence: Absence) => {
        const now = new Date();
        const start = new Date(absence.start_date);
        const end = new Date(absence.end_date);
        return now >= start && now <= end;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Minhas Ausências e Férias
                </CardTitle>
                <CardDescription>
                    Cadastre seus períodos de ausência para que as aprovações sejam redirecionadas automaticamente ao seu suplente.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                        <Label htmlFor="start_date">Início</Label>
                        <Input
                            id="start_date"
                            type="date"
                            required
                            value={formData.start_date}
                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="end_date">Término</Label>
                        <Input
                            id="end_date"
                            type="date"
                            required
                            value={formData.end_date}
                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reason">Motivo (Opcional)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="reason"
                                placeholder="Ex: Férias, Congresso..."
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            />
                            <Button type="submit" disabled={adding}>
                                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </form>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {absences.map(absence => (
                            <TableRow key={absence.id}>
                                <TableCell className="text-sm">
                                    {format(new Date(absence.start_date), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(absence.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                                </TableCell>
                                <TableCell className="text-sm">{absence.reason || '—'}</TableCell>
                                <TableCell>
                                    {isCurrent(absence) ? (
                                        <Badge>Ativa Agora</Badge>
                                    ) : new Date(absence.start_date) > new Date() ? (
                                        <Badge variant="outline">Agendada</Badge>
                                    ) : (
                                        <Badge variant="secondary">Encerrada</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(absence.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {absences.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground italic">
                                    Nenhuma ausência cadastrada.
                                </TableCell>
                            </TableRow>
                        )}
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
