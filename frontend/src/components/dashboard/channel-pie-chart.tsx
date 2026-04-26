'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  INTERNAL_CHAT: 'Chat Interno',
  VOICE: 'Telefone',
  EMAIL: 'Email',
  SMS: 'SMS',
  WEBCHAT: 'Web Chat',
};

const CHANNEL_COLORS: Record<string, string> = {
  WHATSAPP: '#25D366',
  INTERNAL_CHAT: '#3b82f6',
  VOICE: '#8b5cf6',
  EMAIL: '#f59e0b',
  SMS: '#ec4899',
  WEBCHAT: '#06b6d4',
};

interface Props {
  data: Array<{ channel: string; count: number }>;
  loading?: boolean;
}

export function ChannelPieChart({ data, loading }: Props) {
  const chartData = data.map(d => ({
    name: CHANNEL_LABELS[d.channel] || d.channel,
    value: d.count,
    channel: d.channel,
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Canais</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Skeleton className="w-40 h-40 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Canais de Atendimento</CardTitle>
        <CardDescription>Hoje</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            Sem dados disponíveis
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.channel}
                    fill={CHANNEL_COLORS[entry.channel] || '#6b7280'}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, name]}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
