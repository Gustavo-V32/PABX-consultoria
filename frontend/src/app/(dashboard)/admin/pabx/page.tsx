'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  GitBranch,
  Mic,
  Phone,
  PhoneForwarded,
  Plus,
  Radio,
  RefreshCw,
  Router,
  Save,
  ServerCog,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type ReadinessWarning = {
  severity: 'critical' | 'warning' | 'info';
  area: string;
  message: string;
};

type PbxReadiness = {
  status: 'READY' | 'ATTENTION' | 'ACTION_REQUIRED';
  summary: Record<string, number>;
  warnings: ReadinessWarning[];
};

type Field = {
  name: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'textarea' | 'json';
  required?: boolean;
  createOnly?: boolean;
  defaultValue?: any;
  placeholder?: string;
  options?: { label: string; value: string | number | boolean }[];
};

type Column = {
  label: string;
  value: (row: any) => ReactNode;
};

const DESTINATION_TYPES = [
  { label: 'Fila', value: 'QUEUE' },
  { label: 'Ramal', value: 'EXTENSION' },
  { label: 'URA', value: 'IVR' },
  { label: 'Grupo de toque', value: 'RING_GROUP' },
  { label: 'Numero externo', value: 'EXTERNAL_NUMBER' },
  { label: 'Desligar', value: 'HANGUP' },
];

const DEFAULT_IVR_OPTIONS: any[] = [];

function getValue(row: any, path: string) {
  return path.split('.').reduce((acc, key) => acc?.[key], row);
}

function setValue(target: Record<string, any>, path: string, value: any) {
  const keys = path.split('.');
  let current = target;
  keys.slice(0, -1).forEach((key) => {
    current[key] = current[key] || {};
    current = current[key];
  });
  current[keys[keys.length - 1]] = value;
}

function normalizeRows(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function buildInitialValues(fields: Field[], row?: any) {
  return fields.reduce((acc, field) => {
    const raw = row ? getValue(row, field.name) : field.defaultValue;
    const value = field.type === 'json' ? JSON.stringify(raw ?? field.defaultValue ?? {}, null, 2) : raw;
    setValue(acc, field.name, value ?? '');
    return acc;
  }, {} as Record<string, any>);
}

function parseValues(fields: Field[], values: Record<string, any>, mode: 'create' | 'edit') {
  const payload: Record<string, any> = {};
  for (const field of fields) {
    if (mode === 'edit' && field.createOnly) continue;
    const raw = getValue(values, field.name);
    if (raw === '' || raw === undefined || raw === null) continue;
    let value: any = raw;
    if (field.type === 'number') value = Number(raw);
    if (field.type === 'boolean') value = raw === true || raw === 'true';
    if (field.type === 'json') value = JSON.parse(raw);
    setValue(payload, field.name, value);
  }
  return payload;
}

function statusBadge(active?: boolean) {
  return <Badge variant={active ? 'default' : 'secondary'}>{active ? 'Ativo' : 'Inativo'}</Badge>;
}

function useRows(endpoint: string, key: string) {
  return useQuery({
    queryKey: ['pbx-admin', key],
    queryFn: () => api.get(endpoint).then((response) => normalizeRows(response.data.data)),
    refetchInterval: 30000,
  });
}

function PbxCrudPanel({
  title,
  description,
  icon,
  endpoint,
  queryKey,
  createLabel,
  empty,
  columns,
  fields,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  endpoint: string;
  queryKey: string;
  createLabel?: string;
  empty: string;
  columns: Column[];
  fields?: Field[];
}) {
  const [editing, setEditing] = useState<any | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { data = [], isLoading, isFetching, refetch } = useRows(endpoint, queryKey);

  const saveMutation = useMutation({
    mutationFn: () => {
      const mode = editing?.id ? 'edit' : 'create';
      const payload = parseValues(fields || [], values, mode);
      return mode === 'edit' ? api.patch(`${endpoint}/${editing.id}`, payload) : api.post(endpoint, payload);
    },
    onSuccess: async () => {
      setEditing(null);
      setValues({});
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['pbx-admin'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pbx-admin'] }),
  });

  const openCreate = () => {
    setEditing({});
    setValues(buildInitialValues(fields || []));
    setError('');
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setValues(buildInitialValues(fields || [], row));
    setError('');
  };

  const updateField = (path: string, value: any) => {
    setValues((current) => {
      const next = structuredClone(current);
      setValue(next, path, value);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Atualizar
            </Button>
            {fields?.length ? (
              <Button size="sm" className="gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {createLabel || 'Novo'}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{empty}</div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {columns.map((column) => (
                    <th key={column.label} className="px-4 py-3 text-left font-medium">
                      {column.label}
                    </th>
                  ))}
                  {fields?.length ? <th className="px-4 py-3 text-right font-medium">Acoes</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((row: any) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    {columns.map((column) => (
                      <td key={column.label} className="px-4 py-3">
                        {column.value(row)}
                      </td>
                    ))}
                    {fields?.length ? (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm('Deseja inativar este registro?')) deleteMutation.mutate(row.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {editing && fields?.length ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-md border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">{editing.id ? 'Editar' : createLabel || 'Novo'}</h2>
                <p className="text-xs text-muted-foreground">{title}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[72vh] overflow-y-auto p-5">
              {error ? (
                <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                {fields.filter((field) => !(editing.id && field.createOnly)).map((field) => {
                  const value = getValue(values, field.name);
                  return (
                    <label
                      key={field.name}
                      className={cn('space-y-1.5', ['textarea', 'json'].includes(field.type || '') && 'md:col-span-2')}
                    >
                      <span className="text-sm font-medium">
                        {field.label}
                        {field.required ? ' *' : ''}
                      </span>
                      {field.type === 'select' ? (
                        <select
                          value={value}
                          onChange={(event) => updateField(field.name, event.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Selecione</option>
                          {field.options?.map((option) => (
                            <option key={String(option.value)} value={String(option.value)}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'boolean' ? (
                        <select
                          value={String(value)}
                          onChange={(event) => updateField(field.name, event.target.value === 'true')}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="true">Sim</option>
                          <option value="false">Nao</option>
                        </select>
                      ) : field.type === 'textarea' || field.type === 'json' ? (
                        <textarea
                          value={value}
                          rows={field.type === 'json' ? 9 : 4}
                          placeholder={field.placeholder}
                          onChange={(event) => updateField(field.name, event.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      ) : (
                        <Input
                          value={value}
                          type={field.type || 'text'}
                          required={field.required}
                          placeholder={field.placeholder}
                          onChange={(event) => updateField(field.name, event.target.value)}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button className="gap-2" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export default function PabxAdminPage() {
  const queryClient = useQueryClient();
  const [applyResult, setApplyResult] = useState('');
  const { data: readiness } = useQuery<PbxReadiness>({
    queryKey: ['pbx-admin', 'readiness'],
    queryFn: () => api.get('/pbx/readiness').then((response) => response.data.data),
    refetchInterval: 30000,
  });

  const { data: queues = [] } = useRows('/queues', 'queues-options');
  const { data: extensions = [] } = useRows('/telephony/extensions', 'extensions-options');
  const { data: trunks = [] } = useRows('/telephony/trunks', 'trunks-options');
  const { data: ivrs = [] } = useRows('/pbx/ivrs', 'ivrs-options');
  const { data: ringGroups = [] } = useRows('/pbx/ring-groups', 'ring-groups-options');

  const destinationHelp = useMemo(() => ({
    queues: queues.map((item: any) => `${item.name}: ${item.id}`),
    extensions: extensions.map((item: any) => `${item.number} - ${item.name}: ${item.id}`),
    ivrs: ivrs.map((item: any) => `${item.name}: ${item.id}`),
    groups: ringGroups.map((item: any) => `${item.name}: ${item.id}`),
  }), [extensions, ivrs, queues, ringGroups]);

  const statusLabel = readiness?.status === 'READY'
    ? 'Pronto'
    : readiness?.status === 'ATTENTION'
      ? 'Atencao'
      : 'Acao necessaria';
  const criticalCount = readiness?.warnings.filter((warning) => warning.severity === 'critical').length || 0;

  const applyMutation = useMutation({
    mutationFn: () => api.post('/pbx/asterisk/apply').then((response) => response.data.data),
    onSuccess: async (data) => {
      setApplyResult(
        `Aplicado em ${new Date(data.appliedAt).toLocaleString('pt-BR')} - ${data.summary.extensions} ramais, ${data.summary.trunks} troncos, ${data.summary.routes} rotas.`,
      );
      await queryClient.invalidateQueries({ queryKey: ['pbx-admin'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.response?.data?.error || err.message;
      setApplyResult(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const extensionOptions = extensions.map((item: any) => ({
    label: `${item.number} - ${item.name}`,
    value: item.id,
  }));
  const trunkOptions = trunks.map((item: any) => ({ label: item.name, value: item.id }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">PABX Admin</h1>
          <p className="text-sm text-muted-foreground">
            Configure ramais, troncos SIP, URA, rotas, grupos de toque e operacao do Asterisk.
          </p>
          {applyResult ? <p className="mt-2 text-xs text-muted-foreground">{applyResult}</p> : null}
        </div>
        <Button className="gap-2" onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
          <ServerCog className="h-4 w-4" />
          Aplicar no Asterisk
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {readiness?.status === 'READY' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              Diagnostico operacional
            </CardTitle>
            <CardDescription>Status de PABX, URA, rotas e numeros SIP.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-muted-foreground">Status geral</span>
              <Badge variant={criticalCount ? 'destructive' : readiness?.warnings.length ? 'secondary' : 'default'}>
                {statusLabel}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Metric label="URAs" value={readiness?.summary.activeIvrs} />
              <Metric label="Rotas entrada" value={readiness?.summary.activeInboundRoutes} />
              <Metric label="Rotas saida" value={readiness?.summary.activeOutboundRoutes} />
              <Metric label="Numeros SIP" value={readiness?.summary.activeDigitalNumbers} />
              <Metric label="Filas" value={readiness?.summary.activeQueues} />
              <Metric label="Ramais" value={readiness?.summary.activeExtensions} />
              <Metric label="Troncos" value={readiness?.summary.activeTrunks} />
              <Metric label="Softphones" value={readiness?.summary.activeSoftphoneSessions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alertas de configuracao</CardTitle>
            <CardDescription>Itens que afetam atendimento receptivo, transbordo ou registro SIP.</CardDescription>
          </CardHeader>
          <CardContent>
            {!readiness ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Carregando diagnostico...</div>
            ) : readiness.warnings.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhum alerta operacional.</div>
            ) : (
              <div className="divide-y rounded-md border">
                {readiness.warnings.map((warning, index) => (
                  <div key={`${warning.area}-${index}`} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{warning.area}</p>
                      <p className="text-xs text-muted-foreground">{warning.message}</p>
                    </div>
                    <Badge variant={warning.severity === 'critical' ? 'destructive' : 'outline'}>
                      {warning.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="extensions">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
          <TabsTrigger value="extensions">Ramais</TabsTrigger>
          <TabsTrigger value="trunks">Troncos</TabsTrigger>
          <TabsTrigger value="numbers">Numeros</TabsTrigger>
          <TabsTrigger value="ivrs">URA</TabsTrigger>
          <TabsTrigger value="routes">Rotas</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="recordings">Gravacoes</TabsTrigger>
          <TabsTrigger value="sessions">Softphone</TabsTrigger>
          <TabsTrigger value="help">Destinos</TabsTrigger>
        </TabsList>

        <TabsContent value="extensions">
          <PbxCrudPanel
            title="Ramais SIP"
            description="Cadastre ramais internos para softphone, filas, grupos de toque e chamadas originadas."
            icon={<Phone className="h-4 w-4" />}
            endpoint="/telephony/extensions"
            queryKey="extensions"
            createLabel="Novo Ramal"
            empty="Nenhum ramal cadastrado."
            columns={[
              { label: 'Numero', value: (row) => row.number },
              { label: 'Nome', value: (row) => row.name },
              { label: 'Contexto', value: (row) => row.context },
              { label: 'Caller ID', value: (row) => row.callerId || '-' },
              { label: 'Status', value: (row) => statusBadge(row.isActive) },
            ]}
            fields={[
              { name: 'number', label: 'Numero do ramal', required: true, placeholder: '1001' },
              { name: 'name', label: 'Nome', required: true, placeholder: 'Atendimento 01' },
              { name: 'secret', label: 'Senha SIP', type: 'password', required: true, createOnly: true },
              { name: 'callerId', label: 'Caller ID', placeholder: 'Atendimento <1001>' },
              { name: 'context', label: 'Contexto', defaultValue: 'from-internal' },
              { name: 'maxContacts', label: 'Max contatos', type: 'number', defaultValue: 1 },
              { name: 'isActive', label: 'Ativo', type: 'boolean', defaultValue: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="trunks">
          <PbxCrudPanel
            title="Troncos SIP"
            description="Configure provedores SIP para entrada e saida de chamadas."
            icon={<Router className="h-4 w-4" />}
            endpoint="/telephony/trunks"
            queryKey="trunks"
            createLabel="Novo Tronco"
            empty="Nenhum tronco SIP cadastrado."
            columns={[
              { label: 'Nome', value: (row) => row.name },
              { label: 'Provedor', value: (row) => row.provider },
              { label: 'Host', value: (row) => `${row.host}:${row.port || 5060}` },
              { label: 'Usuario', value: (row) => row.username || '-' },
              { label: 'Status', value: (row) => statusBadge(row.isActive) },
            ]}
            fields={[
              { name: 'name', label: 'Nome', required: true, placeholder: 'Operadora Principal' },
              { name: 'provider', label: 'Provedor', required: true, placeholder: 'Vono, Khomp, operadora...' },
              { name: 'host', label: 'Host SIP', required: true, placeholder: 'sip.provedor.com.br' },
              { name: 'port', label: 'Porta', type: 'number', defaultValue: 5060 },
              { name: 'username', label: 'Usuario' },
              { name: 'secret', label: 'Senha', type: 'password', createOnly: true },
              { name: 'fromUser', label: 'From user' },
              { name: 'fromDomain', label: 'From domain' },
              { name: 'context', label: 'Contexto', defaultValue: 'from-trunk' },
              { name: 'isActive', label: 'Ativo', type: 'boolean', defaultValue: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="numbers">
          <PbxCrudPanel
            title="Numeros digitais"
            description="Controle numeros SIP, portas, codecs e status de registro."
            icon={<ServerCog className="h-4 w-4" />}
            endpoint="/digital-numbers"
            queryKey="digital-numbers"
            createLabel="Novo Numero"
            empty="Nenhum numero digital cadastrado."
            columns={[
              { label: 'Nome', value: (row) => row.name },
              { label: 'Operadora', value: (row) => row.operator || '-' },
              { label: 'Servidor', value: (row) => row.sipServer || row.domain || '-' },
              { label: 'Usuario', value: (row) => row.username || '-' },
              { label: 'Status', value: (row) => <Badge variant="outline">{row.status}</Badge> },
            ]}
            fields={[
              { name: 'name', label: 'Nome', required: true, placeholder: '0800 Comercial' },
              { name: 'operator', label: 'Operadora' },
              { name: 'sipServer', label: 'Servidor SIP' },
              { name: 'username', label: 'Usuario SIP' },
              { name: 'secret', label: 'Senha SIP', type: 'password', createOnly: true },
              { name: 'domain', label: 'Dominio' },
              { name: 'ip', label: 'IP permitido' },
              { name: 'context', label: 'Contexto', defaultValue: 'from-trunk' },
              { name: 'sipPort', label: 'Porta SIP', type: 'number', defaultValue: 5060 },
              { name: 'rtpPortStart', label: 'RTP inicio', type: 'number', defaultValue: 10000 },
              { name: 'rtpPortEnd', label: 'RTP fim', type: 'number', defaultValue: 10200 },
              { name: 'notes', label: 'Observacoes', type: 'textarea' },
              { name: 'isActive', label: 'Ativo', type: 'boolean', defaultValue: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="ivrs">
          <PbxCrudPanel
            title="URAs"
            description="Menus DTMF, mensagens, fallback e destinos por digito."
            icon={<Radio className="h-4 w-4" />}
            endpoint="/pbx/ivrs"
            queryKey="ivrs"
            createLabel="Nova URA"
            empty="Nenhuma URA configurada."
            columns={[
              { label: 'Nome', value: (row) => row.name },
              { label: 'Texto', value: (row) => row.ttsText || row.audioFile || '-' },
              { label: 'Opcoes', value: (row) => row.options?.length || 0 },
              { label: 'Status', value: (row) => statusBadge(row.isActive) },
            ]}
            fields={[
              { name: 'name', label: 'Nome', required: true, placeholder: 'URA Principal' },
              { name: 'description', label: 'Descricao' },
              { name: 'ttsText', label: 'Mensagem TTS', type: 'textarea', placeholder: 'Digite 1 para comercial, 2 para suporte...' },
              { name: 'audioFile', label: 'Arquivo de audio' },
              { name: 'afterHoursMessage', label: 'Mensagem fora do horario', type: 'textarea' },
              { name: 'entryPoint', label: 'Ponto inicial', placeholder: 'start' },
              {
                name: 'options',
                label: 'Opcoes DTMF em JSON',
                type: 'json',
                defaultValue: DEFAULT_IVR_OPTIONS,
                placeholder:
                  '[{"digit":"1","label":"Suporte","destinationType":"QUEUE","destinationValue":"ID_DA_FILA"}]',
              },
              { name: 'isActive', label: 'Ativa', type: 'boolean', defaultValue: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="routes">
          <PbxCrudPanel
            title="Rotas de chamadas"
            description="Defina entrada, saida, prioridade, tronco e destino final."
            icon={<GitBranch className="h-4 w-4" />}
            endpoint="/pbx/routes"
            queryKey="routes"
            createLabel="Nova Rota"
            empty="Nenhuma rota cadastrada."
            columns={[
              { label: 'Nome', value: (row) => row.name },
              { label: 'Direcao', value: (row) => <Badge variant="outline">{row.direction}</Badge> },
              { label: 'Padrao', value: (row) => row.pattern },
              { label: 'Destino', value: (row) => `${row.destinationType}${row.destinationValue ? `: ${row.destinationValue}` : ''}` },
              { label: 'Status', value: (row) => statusBadge(row.isActive) },
            ]}
            fields={[
              { name: 'name', label: 'Nome', required: true, placeholder: 'Entrada principal' },
              { name: 'direction', label: 'Direcao', type: 'select', required: true, options: [
                { label: 'Entrada', value: 'INBOUND' },
                { label: 'Saida', value: 'OUTBOUND' },
              ] },
              { name: 'pattern', label: 'Padrao', required: true, placeholder: '_X. ou DID completo' },
              { name: 'trunkId', label: 'Tronco', type: 'select', options: trunkOptions },
              { name: 'destinationType', label: 'Tipo de destino', type: 'select', required: true, options: DESTINATION_TYPES },
              { name: 'destinationValue', label: 'ID destino ou numero externo', placeholder: 'Use a aba Destinos para copiar o ID' },
              { name: 'priority', label: 'Prioridade', type: 'number', defaultValue: 1 },
              { name: 'schedule', label: 'Agenda JSON', type: 'json', defaultValue: {} },
              { name: 'isActive', label: 'Ativa', type: 'boolean', defaultValue: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="groups">
          <PbxCrudPanel
            title="Grupos de toque"
            description="Monte grupos com ramais para tocar em conjunto ou em sequencia."
            icon={<Users className="h-4 w-4" />}
            endpoint="/pbx/ring-groups"
            queryKey="ring-groups"
            createLabel="Novo Grupo"
            empty="Nenhum grupo de toque cadastrado."
            columns={[
              { label: 'Nome', value: (row) => row.name },
              { label: 'Estrategia', value: (row) => <Badge variant="outline">{row.strategy}</Badge> },
              { label: 'Timeout', value: (row) => `${row.timeout}s` },
              { label: 'Ramais', value: (row) => row.members?.map((member: any) => member.extension?.number).filter(Boolean).join(', ') || '-' },
              { label: 'Status', value: (row) => statusBadge(row.isActive) },
            ]}
            fields={[
              { name: 'name', label: 'Nome', required: true, placeholder: 'Grupo Suporte' },
              { name: 'description', label: 'Descricao' },
              { name: 'strategy', label: 'Estrategia', type: 'select', defaultValue: 'RING_ALL', options: [
                { label: 'Tocar todos', value: 'RING_ALL' },
                { label: 'Round robin', value: 'ROUND_ROBIN' },
                { label: 'Menor carga', value: 'LEAST_RECENT' },
                { label: 'Sequencial', value: 'LINEAR' },
              ] },
              { name: 'timeout', label: 'Timeout', type: 'number', defaultValue: 30 },
              { name: 'members', label: 'Membros JSON', type: 'json', defaultValue: extensionOptions.slice(0, 1).map((item) => ({ extensionId: item.value, order: 0, penalty: 0 })) },
              { name: 'isActive', label: 'Ativo', type: 'boolean', defaultValue: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="recordings">
          <PbxCrudPanel
            title="Gravacoes"
            description="Arquivos vinculados aos registros de chamada."
            icon={<Mic className="h-4 w-4" />}
            endpoint="/pbx/recordings"
            queryKey="recordings"
            empty="Nenhuma gravacao registrada."
            columns={[
              { label: 'Arquivo', value: (row) => row.storagePath },
              { label: 'Duracao', value: (row) => `${row.duration || 0}s` },
              { label: 'Tamanho', value: (row) => `${row.size || 0} bytes` },
              { label: 'Criada em', value: (row) => new Date(row.createdAt).toLocaleString('pt-BR') },
            ]}
          />
        </TabsContent>

        <TabsContent value="sessions">
          <PbxCrudPanel
            title="Sessoes softphone"
            description="Agentes registrados no softphone web interno."
            icon={<PhoneForwarded className="h-4 w-4" />}
            endpoint="/pbx/softphone/sessions"
            queryKey="softphone-sessions"
            empty="Nenhuma sessao ativa."
            columns={[
              { label: 'Usuario', value: (row) => row.user?.name || row.sessionId },
              { label: 'Ramal', value: (row) => row.extension?.number || '-' },
              { label: 'Status', value: (row) => <Badge variant="outline">{row.status}</Badge> },
              { label: 'Ultimo sinal', value: (row) => new Date(row.lastSeenAt).toLocaleString('pt-BR') },
            ]}
          />
        </TabsContent>

        <TabsContent value="help">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapa de destinos</CardTitle>
              <CardDescription>Use estes IDs em rotas e opcoes de URA.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <DestinationList title="Filas" items={destinationHelp.queues} />
              <DestinationList title="Ramais" items={destinationHelp.extensions} />
              <DestinationList title="URAs" items={destinationHelp.ivrs} />
              <DestinationList title="Grupos" items={destinationHelp.groups} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value ?? '-'}</p>
    </div>
  );
}

function DestinationList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm font-medium">{title}</p>
      {items.length ? (
        <div className="mt-2 space-y-1">
          {items.map((item) => (
            <p key={item} className="break-all text-xs text-muted-foreground">
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Nenhum registro disponivel.</p>
      )}
    </div>
  );
}
