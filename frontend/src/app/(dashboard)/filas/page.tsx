import { ResourcePage } from '@/components/modules/resource-page';

export default function FilasPage() {
  return (
    <ResourcePage
      title="Filas"
      description="Distribuição de conversas, agentes e estratégias de atendimento."
      endpoint="/queues"
      createLabel="Nova Fila"
      emptyTitle="Nenhuma fila ativa"
      emptyDescription="Crie filas para organizar atendimento por setor ou prioridade."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Setor', path: 'sector.name' },
        { label: 'Estratégia', path: 'strategy', type: 'badge' },
        { label: 'Agentes', path: 'members', type: 'count' },
        { label: 'Ativa', path: 'isActive', type: 'boolean' },
      ]}
    />
  );
}
