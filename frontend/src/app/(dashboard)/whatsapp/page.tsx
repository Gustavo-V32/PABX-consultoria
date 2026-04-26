'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wifi, Plus, RefreshCw, FileText, CheckCircle2,
  XCircle, AlertCircle, Trash2, Copy, ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';

const STATUS_BADGES: Record<string, { label: string; variant: any; icon: any }> = {
  ACTIVE: { label: 'Ativo', variant: 'default', icon: CheckCircle2 },
  INACTIVE: { label: 'Inativo', variant: 'secondary', icon: AlertCircle },
  BANNED: { label: 'Banido', variant: 'destructive', icon: XCircle },
  PENDING_REVIEW: { label: 'Em revisão', variant: 'outline', icon: AlertCircle },
};

const TEMPLATE_STATUS: Record<string, { label: string; color: string }> = {
  APPROVED: { label: 'Aprovado', color: 'text-green-500' },
  PENDING: { label: 'Pendente', color: 'text-yellow-500' },
  REJECTED: { label: 'Rejeitado', color: 'text-red-500' },
  PAUSED: { label: 'Pausado', color: 'text-gray-500' },
};

export default function WhatsAppPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: numbers = [], isLoading: numbersLoading } = useQuery({
    queryKey: ['whatsapp', 'numbers'],
    queryFn: () => api.get('/whatsapp/numbers').then(r => r.data.data || []),
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['whatsapp', 'templates'],
    queryFn: () => api.get('/whatsapp/templates').then(r => r.data.data || []),
  });

  const syncMutation = useMutation({
    mutationFn: (numberId: string) => api.post(`/whatsapp/numbers/${numberId}/sync-templates`),
    onSuccess: (data) => {
      toast({ title: `${data.data?.data?.synced || 0} templates sincronizados` });
      qc.invalidateQueries({ queryKey: ['whatsapp', 'templates'] });
    },
    onError: () => {
      toast({ title: 'Erro ao sincronizar', variant: 'destructive' });
    },
  });

  const approvedTemplates = templates.filter((t: any) => t.status === 'APPROVED');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wifi className="w-6 h-6 text-[#25D366]" />
            WhatsApp
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerenciamento de números e templates
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Número
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Números Ativos', value: numbers.filter((n: any) => n.status === 'ACTIVE').length, color: 'text-green-500' },
          { label: 'Total Números', value: numbers.length, color: 'text-blue-500' },
          { label: 'Templates Aprovados', value: approvedTemplates.length, color: 'text-green-500' },
          { label: 'Total Templates', value: templates.length, color: 'text-purple-500' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="numbers">
        <TabsList>
          <TabsTrigger value="numbers">Números ({numbers.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="numbers" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {numbersLoading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : numbers.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <Wifi className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">Nenhum número configurado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Adicione um número WhatsApp Business para começar
                  </p>
                  <Button className="mt-4 gap-2">
                    <Plus className="w-4 h-4" /> Adicionar Número
                  </Button>
                </CardContent>
              </Card>
            ) : (
              numbers.map((num: any) => {
                const st = STATUS_BADGES[num.status] || STATUS_BADGES.INACTIVE;
                return (
                  <Card key={num.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                            <Wifi className="w-5 h-5 text-[#25D366]" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">{num.name}</CardTitle>
                            <CardDescription className="text-xs">{num.phoneNumber}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={st.variant}>
                          <st.icon className="w-3 h-3 mr-1" />
                          {st.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {num.qualityRating && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Qualidade</span>
                          <Badge variant="outline" className={cn(
                            num.qualityRating === 'GREEN' ? 'text-green-500' :
                            num.qualityRating === 'YELLOW' ? 'text-yellow-500' : 'text-red-500'
                          )}>
                            {num.qualityRating}
                          </Badge>
                        </div>
                      )}
                      {num.lastConnectedAt && (
                        <p className="text-xs text-muted-foreground">
                          Conectado {formatRelativeTime(num.lastConnectedAt)}
                        </p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs gap-1"
                          onClick={() => syncMutation.mutate(num.id)}
                          disabled={syncMutation.isPending}
                        >
                          <RefreshCw className={cn('w-3 h-3', syncMutation.isPending && 'animate-spin')} />
                          Sync Templates
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {templates.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium">Nenhum template</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sincronize os templates da sua conta Meta
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {templates.map((tpl: any) => {
                      const st = TEMPLATE_STATUS[tpl.status] || TEMPLATE_STATUS.PENDING;
                      return (
                        <div key={tpl.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{tpl.name}</p>
                              <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                                {tpl.language}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                                {tpl.category}
                              </Badge>
                            </div>
                            <p className={cn('text-xs font-medium mt-0.5', st.color)}>{st.label}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
