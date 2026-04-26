import { ResourcePage } from '@/components/modules/resource-page';

export default function AutomacoesPage() {
  return (
    <ResourcePage
      title="Automações"
      description="Fluxos, regras e ações automáticas por evento."
      endpoint="/automations"
      createLabel="Nova Automação"
      emptyTitle="Nenhuma automação ativa"
      emptyDescription="Crie fluxos para mensagens, filas, webhooks e variáveis."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Gatilho', path: 'trigger', type: 'badge' },
        { label: 'Execuções', path: 'runCount' },
        { label: 'Ativa', path: 'isActive', type: 'boolean' },
      ]}
    />
  );
}
