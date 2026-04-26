'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, MessageSquare, Phone, Send, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';

export default function RelatoriosPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => api.get('/reports/summary').then((response) => response.data.data),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['reports', 'agents'],
    queryFn: () => api.get('/reports/agent-performance').then((response) => response.data.data || []),
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['reports', 'queues'],
    queryFn: () => api.get('/reports/queue-performance').then((response) => response.data.data || []),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Indicadores consolidados de atendimento, mensagens, agentes, filas e ligações.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Atendimentos"
          value={summary?.conversations?.total ?? '-'}
          icon={MessageSquare}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          title="Resolvidos"
          value={summary?.conversations?.resolved ?? '-'}
          icon={BarChart3}
          color="green"
          loading={isLoading}
        />
        <StatCard
          title="Mensagens"
          value={summary?.messages?.total ?? '-'}
          icon={Send}
          color="purple"
          loading={isLoading}
        />
        <StatCard
          title="Chamadas"
          value={summary?.calls?.total ?? '-'}
          icon={Phone}
          color="green"
          loading={isLoading}
        />
        <StatCard
          title="Agentes"
          value={summary?.agents?.active ?? '-'}
          icon={Users}
          color="blue"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtividade por agente</CardTitle>
            <CardDescription>Conversas, mensagens e chamadas no período.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-md border">
              {agents.map((agent: any) => (
                <div key={agent.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.email}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant="outline">{agent.conversations.resolved} resolvidas</Badge>
                    <Badge variant="outline">{agent.messages.sent} mensagens</Badge>
                    <Badge variant="outline">{agent.calls.completed} chamadas</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance por fila</CardTitle>
            <CardDescription>Volume operacional e chamadas por fila.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-md border">
              {queues.map((queue: any) => (
                <div key={queue.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{queue.name}</p>
                    <p className="text-xs text-muted-foreground">{queue.strategy}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant="outline">{queue.conversations.total} atendimentos</Badge>
                    <Badge variant="outline">{queue.calls.total} ligações</Badge>
                    <Badge variant={queue.isActive ? 'default' : 'secondary'}>
                      {queue.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
