'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Column = {
  label: string;
  path: string;
  type?: 'text' | 'badge' | 'boolean' | 'count' | 'connection-status';
};

type ResourceField = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'boolean' | 'select' | 'textarea' | 'json';
  required?: boolean;
  options?: { label: string; value: string | number | boolean }[];
  defaultValue?: any;
  placeholder?: string;
  createOnly?: boolean;
};

type ResourcePageProps = {
  title: string;
  description: string;
  endpoint: string;
  columns: Column[];
  fields?: ResourceField[];
  createLabel?: string;
  emptyTitle: string;
  emptyDescription: string;
};

function getValue(row: any, path: string) {
  return path.split('.').reduce((acc, key) => acc?.[key], row);
}

function normalizeRows(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function formatValue(row: any, column: Column) {
  const value = getValue(row, column.path);

  if (column.type === 'connection-status') {
    return getConnectionStatus(value).label;
  }

  if (column.type === 'count') {
    return Array.isArray(value) ? value.length : value ?? 0;
  }

  if (column.type === 'boolean') {
    return value ? 'Ativo' : 'Inativo';
  }

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return String(value);
}

function getConnectionStatus(status: unknown) {
  const normalized = String(status || '').toUpperCase();

  if (normalized === 'REGISTERED') {
    return {
      label: 'Online',
      className: 'text-emerald-500',
      dotClassName: 'bg-emerald-500',
    };
  }

  if (['UNREGISTERED', 'UNREACHABLE'].includes(normalized)) {
    return {
      label: 'Offline',
      className: 'text-red-500',
      dotClassName: 'bg-red-500',
    };
  }

  if (normalized === 'DISABLED') {
    return {
      label: 'Desabilitado',
      className: 'text-muted-foreground',
      dotClassName: 'bg-muted-foreground',
    };
  }

  return {
    label: 'Desconhecido',
    className: 'text-muted-foreground',
    dotClassName: 'bg-muted-foreground',
  };
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

function buildInitialValues(fields: ResourceField[], row?: any) {
  return fields.reduce((acc, field) => {
    const value = row ? getValue(row, field.name) : field.defaultValue;
    setValue(acc, field.name, field.type === 'json'
      ? JSON.stringify(value ?? field.defaultValue ?? {}, null, 2)
      : value ?? '');
    return acc;
  }, {} as Record<string, any>);
}

function parseValues(fields: ResourceField[], values: Record<string, any>, mode: 'create' | 'edit') {
  const payload: Record<string, any> = {};
  for (const field of fields) {
    if (mode === 'edit' && field.createOnly) continue;
    const raw = getValue(values, field.name);
    if (raw === '' || raw === undefined) continue;

    let value: any = raw;
    if (field.type === 'number') value = Number(raw);
    if (field.type === 'boolean') value = Boolean(raw);
    if (field.type === 'json') value = JSON.parse(raw);
    setValue(payload, field.name, value);
  }
  return payload;
}

export function ResourcePage({
  title,
  description,
  endpoint,
  columns,
  fields = [],
  createLabel,
  emptyTitle,
  emptyDescription,
}: ResourcePageProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState('');
  const queryClient = useQueryClient();
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['resource', endpoint],
    queryFn: () => api.get(endpoint).then((response) => normalizeRows(response.data.data)),
    refetchInterval: 30000,
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row: any) =>
      columns.some((column) => formatValue(row, column).toLowerCase().includes(term)),
    );
  }, [columns, data, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const mode = editing?.id ? 'edit' : 'create';
      const payload = parseValues(fields, formValues, mode);
      if (mode === 'edit') return api.patch(`${endpoint}/${editing.id}`, payload);
      return api.post(endpoint, payload);
    },
    onSuccess: async () => {
      setEditing(null);
      setFormValues({});
      setFormError('');
      await queryClient.invalidateQueries({ queryKey: ['resource', endpoint] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.response?.data?.error || error.message;
      setFormError(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource', endpoint] }),
  });

  const openCreate = () => {
    setEditing({});
    setFormValues(buildInitialValues(fields));
    setFormError('');
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setFormValues(buildInitialValues(fields, row));
    setFormError('');
  };

  const updateField = (path: string, value: any) => {
    setFormValues((current) => {
      const next = structuredClone(current);
      setValue(next, path, value);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            Atualizar
          </Button>
          {createLabel && (
            <Button size="sm" className="gap-2" onClick={openCreate} disabled={!fields.length}>
              <Plus className="h-4 w-4" />
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle className="text-base">Registros</CardTitle>
            <CardDescription>{rows.length} itens encontrados</CardDescription>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-medium">{emptyTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {columns.map((column) => (
                      <th key={column.path} className="px-4 py-3 text-left font-medium">
                        {column.label}
                      </th>
                    ))}
                    {fields.length > 0 && <th className="px-4 py-3 text-right font-medium">Acoes</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      {columns.map((column) => {
                        const value = formatValue(row, column);
                        return (
                          <td key={column.path} className="px-4 py-3">
                            {column.type === 'connection-status' ? (
                              <ConnectionStatus value={getValue(row, column.path)} />
                            ) : column.type === 'badge' || column.type === 'boolean' ? (
                              <Badge variant={value === 'Inativo' ? 'secondary' : 'outline'}>{value}</Badge>
                            ) : (
                              <span className="text-foreground">{value}</span>
                            )}
                          </td>
                        );
                      })}
                      {fields.length > 0 && (
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm('Deseja excluir ou inativar este registro?')) {
                                deleteMutation.mutate(row.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing && fields.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-md border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">{editing.id ? 'Editar registro' : createLabel}</h2>
                <p className="text-xs text-muted-foreground">{title}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              {formError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {fields.filter((field) => !(editing.id && field.createOnly)).map((field) => {
                  const value = getValue(formValues, field.name);
                  return (
                    <label key={field.name} className={cn('space-y-1.5', ['textarea', 'json'].includes(field.type || '') && 'md:col-span-2')}>
                      <span className="text-sm font-medium">
                        {field.label}{field.required ? ' *' : ''}
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
                          onChange={(event) => updateField(field.name, event.target.value)}
                          placeholder={field.placeholder}
                          rows={field.type === 'json' ? 8 : 4}
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
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionStatus({ value }: { value: unknown }) {
  const status = getConnectionStatus(value);

  return (
    <span className={cn('inline-flex items-center gap-2 font-medium', status.className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status.dotClassName)} />
      {status.label}
    </span>
  );
}
