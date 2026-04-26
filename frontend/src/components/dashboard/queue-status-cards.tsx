'use client';

import { Users, Clock, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Queue {
  id: string;
  name: string;
  strategy: string;
  waiting: number;
  inProgress: number;
  agentsOnline: number;
  agentsTotal: number;
}

export function QueueStatusCards({ queues }: { queues: Queue[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Status das Filas</CardTitle>
        <CardDescription>Tempo real</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {queues.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma fila configurada
          </div>
        ) : (
          queues.map((queue) => (
            <div
              key={queue.id}
              className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{queue.name}</span>
                <Badge
                  variant={queue.waiting > 0 ? 'destructive' : 'secondary'}
                  className="text-xs shrink-0"
                >
                  {queue.waiting} aguard.
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Activity className="w-3 h-3" />
                  <span>{queue.inProgress} ativo</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{queue.agentsOnline}/{queue.agentsTotal}</span>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1',
                    queue.agentsOnline === 0 ? 'text-red-500' : 'text-green-500',
                  )}
                >
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      queue.agentsOnline === 0 ? 'bg-red-500' : 'bg-green-500',
                    )}
                  />
                  <span>{queue.agentsOnline === 0 ? 'Offline' : 'Online'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
