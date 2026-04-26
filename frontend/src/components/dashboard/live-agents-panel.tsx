'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  ONLINE: { label: 'Disponível', dot: 'bg-green-500' },
  BUSY: { label: 'Ocupado', dot: 'bg-yellow-500' },
  AWAY: { label: 'Ausente', dot: 'bg-orange-500' },
  IN_CALL: { label: 'Em chamada', dot: 'bg-red-500 animate-pulse' },
  OFFLINE: { label: 'Offline', dot: 'bg-gray-400' },
};

interface Agent {
  id: string;
  name: string;
  avatar?: string;
  status: string;
  stats: { total: number; inProgress: number };
}

export function LiveAgentsPanel({ agents }: { agents: Agent[] }) {
  const onlineAgents = agents.filter(a => a.status !== 'OFFLINE');
  const offlineAgents = agents.filter(a => a.status === 'OFFLINE');
  const sorted = [...onlineAgents, ...offlineAgents];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Agentes ao Vivo</CardTitle>
            <CardDescription>
              {onlineAgents.length} online · {agents.length} total
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y max-h-[220px] overflow-y-auto scrollbar-thin">
          {sorted.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum agente cadastrado
            </div>
          ) : (
            sorted.map((agent) => {
              const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.OFFLINE;
              return (
                <div
                  key={agent.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5',
                    agent.status === 'OFFLINE' && 'opacity-50',
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={agent.avatar} />
                      <AvatarFallback className="text-xs">
                        {agent.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background',
                        sc.dot,
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{sc.label}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{agent.stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">chats</p>
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
