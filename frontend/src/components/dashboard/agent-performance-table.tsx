'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, { label: string; dot: string }> = {
  ONLINE: { label: 'Online', dot: 'bg-green-500' },
  OFFLINE: { label: 'Offline', dot: 'bg-gray-400' },
  BUSY: { label: 'Ocupado', dot: 'bg-yellow-500' },
  AWAY: { label: 'Ausente', dot: 'bg-orange-500' },
  IN_CALL: { label: 'Em chamada', dot: 'bg-red-500' },
};

interface Agent {
  id: string;
  name: string;
  avatar?: string;
  status: string;
  stats: {
    total: number;
    resolved: number;
    inProgress: number;
  };
}

export function AgentPerformanceTable({ agents }: { agents: Agent[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Performance dos Agentes</CardTitle>
        <CardDescription>Atendimentos hoje</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {agents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum agente disponível
            </div>
          ) : (
            agents.map((agent) => {
              const resolution = agent.stats.total > 0
                ? Math.round((agent.stats.resolved / agent.stats.total) * 100)
                : 0;
              const status = STATUS_STYLES[agent.status] || STATUS_STYLES.OFFLINE;

              return (
                <div key={agent.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={agent.avatar} />
                    <AvatarFallback className="text-xs">
                      {agent.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                        <span className="text-xs text-muted-foreground">{status.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={resolution} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0">{resolution}%</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-sm font-medium">{agent.stats.total}</p>
                    <p className="text-xs text-muted-foreground">{agent.stats.resolved} res.</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
