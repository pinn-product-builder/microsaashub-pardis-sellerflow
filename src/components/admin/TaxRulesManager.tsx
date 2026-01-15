import { useState } from 'react';
import { useTaxRules, TaxRule } from '@/hooks/useTaxRules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil, Save, X, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TaxRulesManager() {
  const { taxRules, isLoading, updateTaxRule } = useTaxRules();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<TaxRule>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [detailDialog, setDetailDialog] = useState<TaxRule | null>(null);

  const regions = [...new Set(taxRules.map(r => r.region))];

  const filteredRules = taxRules.filter(rule => {
    const matchesSearch = 
      rule.uf.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.uf_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = regionFilter === 'all' || rule.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  const startEditing = (rule: TaxRule) => {
    setEditingId(rule.id);
    setEditValues({
      icms: rule.icms,
      ipi: rule.ipi,
      pis: rule.pis,
      cofins: rule.cofins,
      fcp: rule.fcp,
      icms_st_margin: rule.icms_st_margin
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveChanges = async (id: string) => {
    await updateTaxRule.mutateAsync({ id, updates: editValues });
    setEditingId(null);
    setEditValues({});
  };

  const toggleActive = async (rule: TaxRule) => {
    await updateTaxRule.mutateAsync({ 
      id: rule.id, 
      updates: { is_active: !rule.is_active } 
    });
  };

  const calculateTotalRate = (rule: TaxRule) => {
    return Number(rule.icms) + Number(rule.ipi) + Number(rule.pis) + Number(rule.cofins) + Number(rule.fcp || 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Regras Fiscais por Estado
          </CardTitle>
          <CardDescription>
            Gerencie as alíquotas de impostos para cada UF brasileira
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por UF ou estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Região" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as regiões</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">UF</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">ICMS %</TableHead>
                  <TableHead className="text-center">IPI %</TableHead>
                  <TableHead className="text-center">PIS %</TableHead>
                  <TableHead className="text-center">COFINS %</TableHead>
                  <TableHead className="text-center">FCP %</TableHead>
                  <TableHead className="text-center">Total %</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id} className={!rule.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-mono font-bold">{rule.uf}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{rule.uf_name}</span>
                        <span className="text-xs text-muted-foreground">{rule.region}</span>
                      </div>
                    </TableCell>
                    
                    {editingId === rule.id ? (
                      <>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.icms ?? ''}
                            onChange={(e) => setEditValues({ ...editValues, icms: parseFloat(e.target.value) })}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.ipi ?? ''}
                            onChange={(e) => setEditValues({ ...editValues, ipi: parseFloat(e.target.value) })}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.pis ?? ''}
                            onChange={(e) => setEditValues({ ...editValues, pis: parseFloat(e.target.value) })}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.cofins ?? ''}
                            onChange={(e) => setEditValues({ ...editValues, cofins: parseFloat(e.target.value) })}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.fcp ?? ''}
                            onChange={(e) => setEditValues({ ...editValues, fcp: parseFloat(e.target.value) })}
                            className="w-20 text-center"
                          />
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-center font-mono">{Number(rule.icms).toFixed(2)}</TableCell>
                        <TableCell className="text-center font-mono">{Number(rule.ipi).toFixed(2)}</TableCell>
                        <TableCell className="text-center font-mono">{Number(rule.pis).toFixed(2)}</TableCell>
                        <TableCell className="text-center font-mono">{Number(rule.cofins).toFixed(2)}</TableCell>
                        <TableCell className="text-center font-mono">{Number(rule.fcp).toFixed(2)}</TableCell>
                      </>
                    )}
                    
                    <TableCell className="text-center">
                      <Badge variant={calculateTotalRate(rule) > 35 ? 'destructive' : 'secondary'}>
                        {calculateTotalRate(rule).toFixed(2)}%
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => toggleActive(rule)}
                      />
                    </TableCell>
                    
                    <TableCell className="text-right">
                      {editingId === rule.id ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveChanges(rule.id)}
                            disabled={updateTaxRule.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(rule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma regra fiscal encontrada com os filtros aplicados.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes (para expansão futura) */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Detalhes - {detailDialog?.uf_name} ({detailDialog?.uf})
            </DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Região</Label>
                  <p className="text-sm text-muted-foreground">{detailDialog.region}</p>
                </div>
                <div>
                  <Label>ICMS-ST Margem</Label>
                  <p className="text-sm text-muted-foreground">
                    {detailDialog.icms_st_margin ? `${detailDialog.icms_st_margin}%` : 'Não definida'}
                  </p>
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <p className="text-sm text-muted-foreground">
                  {detailDialog.notes || 'Nenhuma observação'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
