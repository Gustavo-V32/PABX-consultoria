'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, Mic, PhoneForwarded, Radio, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function ListPanel({
  endpoint,
  queryKey,
  empty,
  render,
}: {
  endpoint: string;
  queryKey: string;
  empty: string;
  render: (item: any) => ReactNode;
}) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['pbx', queryKey],
    queryFn: () => api.get(endpoint).then((response) => response.data.data || []),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!data.length) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{empty}</div>;
  }

  return <div className="divide-y rounded-md border">{data.map(render)}</div>;
}

export default function PabxAdminPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PABX Admin</h1>
        <p className="text-sm text-muted-foreground">
          Administração de URA, rotas, grupos de toque, gravações e sessões softphone.
        </p>
      </div>

      <Tabs defaultValue="ivrs">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ivrs">URA</TabsTrigger>
          <TabsTrigger value="routes">Rotas</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="recordings">Gravações</TabsTrigger>
          <TabsTrigger value="sessions">Softphone</TabsTrigger>
        </TabsList>

        <TabsContent value="ivrs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="h-4 w-4" /> URAs
              </CardTitle>
              <CardDescription>Menus DTMF, mensagens iniciais, fallback e opções por dígito.</CardDescription>
            </CardHeader>
            <CardContent>
              <ListPanel
                endpoint="/pbx/ivrs"
                queryKey="ivrs"
                empty="Nenhuma URA configurada."
                render={(ivr) => (
                  <div key={ivr.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{ivr.name}</p>
                      <p className="text-xs text-muted-foreground">{ivr.options?.length || 0} opções</p>
                    </div>
                    <Badge variant={ivr.isActive ? 'default' : 'secondary'}>{ivr.isActive ? 'Ativa' : 'Inativa'}</Badge>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4" /> Rotas de chamadas
              </CardTitle>
              <CardDescription>Entrada, saída, prioridades, troncos e destinos.</CardDescription>
            </CardHeader>
            <CardContent>
              <ListPanel
                endpoint="/pbx/routes"
                queryKey="routes"
                empty="Nenhuma rota cadastrada."
                render={(route) => (
                  <div key={route.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{route.name}</p>
                      <p className="text-xs text-muted-foreground">{route.pattern} · {route.destinationType}</p>
                    </div>
                    <Badge variant="outline">{route.direction}</Badge>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Grupos de toque
              </CardTitle>
              <CardDescription>Distribuição ringall, linear e estratégias compatíveis com Asterisk.</CardDescription>
            </CardHeader>
            <CardContent>
              <ListPanel
                endpoint="/pbx/ring-groups"
                queryKey="ring-groups"
                empty="Nenhum grupo de toque cadastrado."
                render={(group) => (
                  <div key={group.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.members?.length || 0} ramais</p>
                    </div>
                    <Badge variant="outline">{group.strategy}</Badge>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mic className="h-4 w-4" /> Gravações
              </CardTitle>
              <CardDescription>Arquivos vinculados aos registros de chamada.</CardDescription>
            </CardHeader>
            <CardContent>
              <ListPanel
                endpoint="/pbx/recordings"
                queryKey="recordings"
                empty="Nenhuma gravação registrada."
                render={(recording) => (
                  <div key={recording.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{recording.storagePath}</p>
                      <p className="text-xs text-muted-foreground">{recording.duration || 0}s</p>
                    </div>
                    <Badge variant="outline">{recording.size || 0} bytes</Badge>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PhoneForwarded className="h-4 w-4" /> Sessões softphone
              </CardTitle>
              <CardDescription>Agentes registrados no softphone web interno.</CardDescription>
            </CardHeader>
            <CardContent>
              <ListPanel
                endpoint="/pbx/softphone/sessions"
                queryKey="softphone-sessions"
                empty="Nenhuma sessão ativa."
                render={(session) => (
                  <div key={session.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{session.user?.name || session.sessionId}</p>
                      <p className="text-xs text-muted-foreground">{session.extension?.number || 'sem ramal'}</p>
                    </div>
                    <Badge variant="outline">{session.status}</Badge>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
