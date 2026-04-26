'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Column = {
  label: string;
  path: string;
  type?: 'text' | 'badge' | 'boolean' | 'count';
};

type ResourcePageProps = {
  title: string;
  description: string;
  endpoint: string;
  columns: Column[];
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

export function ResourcePage({
  title,
  description,
  endpoint,
  columns,
  createLabel,
  emptyTitle,
  emptyDescription,
}: ResourcePageProps) {
  const [search, setSearch] = useState('');
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
            <Button size="sm" className="gap-2">
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      {columns.map((column) => {
                        const value = formatValue(row, column);
                        return (
                          <td key={column.path} className="px-4 py-3">
                            {column.type === 'badge' || column.type === 'boolean' ? (
                              <Badge variant={value === 'Inativo' ? 'secondary' : 'outline'}>{value}</Badge>
                            ) : (
                              <span className="text-foreground">{value}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
