
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { salesData } from '@/data/dashboardData';

export default function SalesChart() {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Evolução de Vendas e Cotações</CardTitle>
        <CardDescription>
          Performance dos últimos 6 meses
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="vendas" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Vendas (R$)"
            />
            <Line 
              type="monotone" 
              dataKey="cotacoes" 
              stroke="hsl(var(--secondary))" 
              strokeWidth={2}
              name="Cotações"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
