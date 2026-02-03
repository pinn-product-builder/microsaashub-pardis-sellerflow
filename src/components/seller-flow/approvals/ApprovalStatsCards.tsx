import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Check, X, TrendingUp } from 'lucide-react';

interface ApprovalStatsCardsProps {
    stats: {
        pending: number;
        approved: number;
        rejected: number;
        avgTimeHours?: number;
    } | null;
}

/**
 * IDENTIFICAÇÃO: Painel de Indicadores de Aprovação
 * Exibe contadores globais de pendências, aprovações, rejeições e SLA.
 */
export function ApprovalStatsCards({ stats }: ApprovalStatsCardsProps) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="border-l-4 border-l-amber-500 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-amber-500" />
                        Pendentes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-amber-600 tracking-tighter">
                        {stats?.pending || 0}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center">
                        <Check className="h-4 w-4 mr-2 text-green-500" />
                        Aprovadas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-green-600 tracking-tighter">
                        {stats?.approved || 0}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center">
                        <X className="h-4 w-4 mr-2 text-red-500" />
                        Rejeitadas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-red-600 tracking-tighter">
                        {stats?.rejected || 0}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                        SLA Médio
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black tracking-tighter">
                        {stats?.avgTimeHours?.toFixed(1) || '0'}h
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
