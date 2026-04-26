import { ResourcePage } from '@/components/modules/resource-page';

export default function SetoresPage() {
  return (
    <ResourcePage
      title="Setores"
      description="Áreas responsáveis por filas, agentes e atendimentos."
      endpoint="/sectors"
      createLabel="Novo Setor"
      emptyTitle="Nenhum setor ativo"
      emptyDescription="Crie setores para segmentar operação e relatórios."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Descrição', path: 'description' },
        { label: 'Supervisores', path: 'supervisors', type: 'count' },
        { label: 'Ativo', path: 'isActive', type: 'boolean' },
      ]}
    />
  );
}
