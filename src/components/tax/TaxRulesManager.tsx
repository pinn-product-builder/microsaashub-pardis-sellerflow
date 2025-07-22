
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Plus, Download, Upload, Save } from 'lucide-react';
import { taxRules } from '@/data/mockData';
import { TaxService } from '@/services/taxService';

export function TaxRulesManager() {
  const [editingRule, setEditingRule] = useState<any>(null);
  const [rules, setRules] = useState(taxRules);

  const handleEdit = (rule: any) => {
    setEditingRule({ ...rule });
  };

  const handleSave = () => {
    if (editingRule) {
      const updatedRules = rules.map(rule => 
        rule.uf === editingRule.uf ? editingRule : rule
      );
      setRules(updatedRules);
      setEditingRule(null);
    }
  };

  const handleExport = () => {
    const data = TaxService.exportTaxRules();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'regras-fiscais.json';
    a.click();
  };

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Regras Fiscais por UF</h3>
          <p className="text-sm text-muted-foreground">
            Configure alíquotas de impostos por estado
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Regra
          </Button>
        </div>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Regras por UF</TabsTrigger>
          <TabsTrigger value="benefits">Benefícios Fiscais</TabsTrigger>
          <TabsTrigger value="substitution">Substituição Tributária</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Alíquotas por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              {editingRule ? (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium">Editando: {editingRule.uf}</h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>ICMS (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingRule.icms}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          icms: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IPI (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingRule.ipi}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          ipi: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>PIS (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingRule.pis}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          pis: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>COFINS (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingRule.cofins}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          cofins: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar
                    </Button>
                    <Button variant="outline" onClick={() => setEditingRule(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UF</TableHead>
                      <TableHead className="text-right">ICMS</TableHead>
                      <TableHead className="text-right">IPI</TableHead>
                      <TableHead className="text-right">PIS</TableHead>
                      <TableHead className="text-right">COFINS</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => {
                      const total = rule.icms + rule.ipi + rule.pis + rule.cofins;
                      return (
                        <TableRow key={rule.uf}>
                          <TableCell className="font-medium">{rule.uf}</TableCell>
                          <TableCell className="text-right">{formatPercentage(rule.icms)}</TableCell>
                          <TableCell className="text-right">{formatPercentage(rule.ipi)}</TableCell>
                          <TableCell className="text-right">{formatPercentage(rule.pis)}</TableCell>
                          <TableCell className="text-right">{formatPercentage(rule.cofins)}</TableCell>
                          <TableCell className="text-right font-medium">{formatPercentage(total)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(rule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits">
          <Card>
            <CardHeader>
              <CardTitle>Benefícios Fiscais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Zona Franca de Manaus</h4>
                    <Badge variant="default">Ativo</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Isenção de IPI para produtos industrializados na ZFM
                  </p>
                  <div className="grid gap-2 md:grid-cols-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Localização:</span>
                      <span className="ml-2">AM - Manaus</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Categoria:</span>
                      <span className="ml-2">Eletrônicos</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Redução:</span>
                      <span className="ml-2">100%</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">SUFRAMA</h4>
                    <Badge variant="default">Ativo</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Redução de 88% do IPI para empresas da SUFRAMA
                  </p>
                  <div className="grid gap-2 md:grid-cols-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Localização:</span>
                      <span className="ml-2">AM</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Categoria:</span>
                      <span className="ml-2">Todas</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Redução:</span>
                      <span className="ml-2">88%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="substitution">
          <Card>
            <CardHeader>
              <CardTitle>Substituição Tributária</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead className="text-right">Margem ST</TableHead>
                    <TableHead className="text-right">Alíq. Interna</TableHead>
                    <TableHead className="text-right">Alíq. Interestadual</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Eletrônicos</TableCell>
                    <TableCell>8517.12.00</TableCell>
                    <TableCell>SP</TableCell>
                    <TableCell className="text-right">40%</TableCell>
                    <TableCell className="text-right">18%</TableCell>
                    <TableCell className="text-right">12%</TableCell>
                    <TableCell>
                      <Badge variant="default">Ativo</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Eletrodomésticos</TableCell>
                    <TableCell>8516.60.00</TableCell>
                    <TableCell>RJ</TableCell>
                    <TableCell className="text-right">35%</TableCell>
                    <TableCell className="text-right">20%</TableCell>
                    <TableCell className="text-right">12%</TableCell>
                    <TableCell>
                      <Badge variant="default">Ativo</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
