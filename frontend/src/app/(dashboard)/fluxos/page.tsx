'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bot,
  GitBranch,
  HelpCircle,
  MessageSquare,
  MousePointer2,
  Pause,
  Plus,
  Radio,
  Send,
  Webhook,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const nodeTypes = [
  { type: 'START', label: 'Início', icon: MousePointer2 },
  { type: 'MESSAGE', label: 'Mensagem', icon: MessageSquare },
  { type: 'QUESTION', label: 'Pergunta', icon: HelpCircle },
  { type: 'CONDITION', label: 'Condição', icon: GitBranch },
  { type: 'NUMERIC_MENU', label: 'Menu numérico', icon: Radio },
  { type: 'WAIT', label: 'Pausa', icon: Pause },
  { type: 'WEBHOOK', label: 'Webhook HTTP', icon: Webhook },
  { type: 'SEND_TEMPLATE', label: 'Template WhatsApp', icon: Send },
  { type: 'TRANSFER_QUEUE', label: 'Transferir fila', icon: ArrowRight },
  { type: 'END', label: 'Encerrar', icon: Bot },
];

export default function FluxosPage() {
  const { data: flows = [], isLoading } = useQuery({
    queryKey: ['flows'],
    queryFn: () => api.get('/flows').then((response) => response.data.data || []),
    refetchInterval: 30000,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fluxos de Comunicação</h1>
          <p className="text-sm text-muted-foreground">
            Construtor visual para mensagens, condições, menus, webhooks e transferências.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Fluxo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Fluxos cadastrados</CardTitle>
            <CardDescription>Versões ativas, rascunhos e quantidade de blocos.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : flows.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-medium">Nenhum fluxo cadastrado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crie fluxos para automatizar triagem, captura de dados e transferências.
                </p>
              </div>
            ) : (
              <div className="divide-y rounded-md border">
                {flows.map((flow: any) => (
                  <div key={flow.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{flow.name}</p>
                      <p className="text-xs text-muted-foreground">
                        v{flow.version} · {flow._count?.nodes || 0} blocos · {flow._count?.connections || 0} conexões
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={flow.status === 'ACTIVE' ? 'default' : 'secondary'}>{flow.status}</Badge>
                      <Button variant="outline" size="sm">Editar</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blocos disponíveis</CardTitle>
            <CardDescription>Base para o editor visual de arrastar e soltar.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {nodeTypes.map((node) => (
                <button
                  key={node.type}
                  className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border bg-background p-3 text-center text-xs transition-colors hover:bg-muted"
                >
                  <node.icon className="h-4 w-4 text-primary" />
                  <span>{node.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
