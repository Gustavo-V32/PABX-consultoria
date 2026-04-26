import { ResourcePage } from '@/components/modules/resource-page';

export default function ConfiguracoesPage() {
  return (
    <ResourcePage
      title="Configurações"
      description="Integrações externas e parâmetros operacionais."
      endpoint="/integrations"
      createLabel="Nova Integração"
      emptyTitle="Nenhuma integração configurada"
      emptyDescription="Configure Google Drive, HTTP APIs, Meta e outros conectores."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Tipo', path: 'type', type: 'badge' },
        { label: 'Ativa', path: 'isActive', type: 'boolean' },
        { label: 'Última sincronização', path: 'lastSyncAt' },
      ]}
    />
  );
}
