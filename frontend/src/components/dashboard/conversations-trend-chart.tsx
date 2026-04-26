'use client';

import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  data: Array<{
    date: string;
    total: number;
    resolved: number;
    channel?: string;
  }>;
}

export function ConversationsTrendChart({ data }: Props) {
  // Aggregate by date if data has channel breakdown
  const aggregated = data.reduce((acc: any[], row) => {
    const existing = acc.find(a => a.date === row.date);
    if (existing) {
      existing.total += Number(row.total);
      existing.resolved += Number(row.resolved);
    } else {
      acc.push({ date: row.date, total: Number(row.total), resolved: Number(row.resolved) });
    }
    return acc;
  }, []);

  const formatted = aggregated.map(row => ({
    ...row,
    date: row.date ? format(typeof row.date === 'string' ? parseISO(row.date) : new Date(row.date), 'dd/MM', { locale: ptBR }) : '',
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: <span className="font-medium">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conversas por Dia</CardTitle>
        <CardDescription>Últimos 7 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="total"
              name="Total"
              stroke="#3b82f6"
              fill="url(#totalGrad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name="Resolvidos"
              stroke="#22c55e"
              fill="url(#resolvedGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
