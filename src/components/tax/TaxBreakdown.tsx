
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TaxService } from '@/services/taxService';

export function TaxBreakdown() {
  const [selectedUF, setSelectedUF] = useState('SP');
  const [selectedCategory, setSelectedCategory] = useState('Eletrônicos');

  // Dados mock para análise
  const mockTaxData = {
    SP: {
      Eletrônicos: { icms: 18, ipi: 5, pis: 1.65, cofins: 7.6, total: 32.25 },
      Eletrodomésticos: { icms: 18, ipi: 10, pis: 1.65, cofins: 7.6, total: 37.25 },
      Ferramentas: { icms: 18, ipi: 15, pis: 1.65, cofins: 7.6, total: 42.25 }
    },
    RJ: {
      Eletrônicos: { icms: 20, ipi: 5, pis: 1.65, cofins: 7.6, total: 34.25 },
      Eletrodomésticos: { icms: 20, ipi: 10, pis: 1.65, cofins: 7.6, total: 39.25 },
      Ferramentas: { icms: 20, ipi: 15, pis: 1.65, cofins: 7.6, total: 44.25 }
    },
    MG: {
      Eletrônicos: { icms: 18, ipi: 5, pis: 1.65, cofins: 7.6, total: 32.25 },
      Eletrodomésticos: { icms: 18, ipi: 10, pis: 1.65, cofins: 7.6, total: 37.25 },
      Ferramentas: { icms: 18, ipi: 15, pis: 1.65, cofins: 7.6, total: 42.25 }
    }
  };

  const ufs = ['SP', 'RJ', 'MG', 'RS', 'SC', 'PR', 'BA', 'PE', 'GO', 'DF'];
  const categories = ['Eletrônicos', 'Eletrodomésticos', 'Ferramentas'];

  // Dados para o gráfico de pizza
  const pieData = useMemo(() => {
    const taxes = mockTaxData[selectedUF as keyof typeof mockTaxData]?.[selectedCategory as keyof typeof mockTaxData.SP];
    if (!taxes) return [];

    return [
      { name: 'ICMS', value: taxes.icms, color: 'hsl(var(--chart-1))' },
      { name: 'IPI', value: taxes.ipi, color: 'hsl(var(--chart-2))' },
      { name: 'PIS', value: taxes.pis, color: 'hsl(var(--chart-3))' },
      { name: 'COFINS', value: taxes.cofins, color: 'hsl(var(--chart-4))' }
    ];
  }, [selectedUF, selectedCategory]);

  // Dados para comparação entre UFs
  const comparisonData = useMemo(() => {
    return ufs.slice(0, 5).map(uf => {
      const taxes = mockTaxData[uf as keyof typeof mockTaxData]?.[selectedCategory as keyof typeof mockTaxData.SP];
      return {
        uf,
        icms: taxes?.icms || 0,
        ipi: taxes?.ipi || 0,
        pis: taxes?.pis || 0,
        cofins: taxes?.cofins || 0,
        total: taxes?.total || 0
      };
    });
  }, [selectedCategory]);

  // Dados históricos simulados
  const historicalData = [
    { month: 'Jan', rate: 32.1 },
    { month: 'Fev', rate: 32.5 },
    { month: 'Mar', rate: 32.8 },
    { month: 'Abr', rate: 32.2 },
    { month: 'Mai', rate: 33.1 },
    { month: 'Jun', rate: 32.9 },
    { month: 'Jul', rate: 32.5 }
  ];

  const formatCurrency = (value: number) => `${value.toFixed(2)}%`;

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">UF</label>
          <Select value={selectedUF} onValueChange={setSelectedUF}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ufs.map(uf => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Categoria</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Pizza - Composição dos Impostos */}
        <Card>
          <CardHeader>
            <CardTitle>Composição dos Impostos</CardTitle>
            <div className="text-sm text-muted-foreground">
              {selectedCategory} - {selectedUF}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Alíquota']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm">{item.name}: {item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comparação entre UFs */}
        <Card>
          <CardHeader>
            <CardTitle>Comparação entre UFs</CardTitle>
            <div className="text-sm text-muted-foreground">
              Categoria: {selectedCategory}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="uf" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, 'Alíquota']} />
                  <Legend />
                  <Bar dataKey="icms" stackId="a" fill="hsl(var(--chart-1))" name="ICMS" />
                  <Bar dataKey="ipi" stackId="a" fill="hsl(var(--chart-2))" name="IPI" />
                  <Bar dataKey="pis" stackId="a" fill="hsl(var(--chart-3))" name="PIS" />
                  <Bar dataKey="cofins" stackId="a" fill="hsl(var(--chart-4))" name="COFINS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas detalhadas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ICMS Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18.5%</div>
            <div className="text-xs text-muted-foreground">Variação: 17% - 20%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">IPI Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.3%</div>
            <div className="text-xs text-muted-foreground">Variação: 5% - 15%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PIS/COFINS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9.25%</div>
            <div className="text-xs text-muted-foreground">Fixo para Lucro Real</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Carga Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">36.05%</div>
            <div className="text-xs text-green-600">-2.1% vs mês anterior</div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Estados */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Carga Tributária por UF</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparisonData
              .sort((a, b) => b.total - a.total)
              .map((item, index) => (
                <div key={item.uf} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={index < 3 ? "destructive" : "secondary"}>
                      #{index + 1}
                    </Badge>
                    <span className="font-medium">{item.uf}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(item.total)}</div>
                    <div className="text-xs text-muted-foreground">
                      ICMS: {formatCurrency(item.icms)} | IPI: {formatCurrency(item.ipi)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
