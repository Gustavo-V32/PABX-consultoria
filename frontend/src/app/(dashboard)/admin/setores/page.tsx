import { ResourcePage } from '@/components/modules/resource-page';

export default function SetoresPage() {
  return (
    <ResourcePage
      title="Setores"
      description="Areas responsaveis por filas, agentes e atendimentos."
      endpoint="/sectors"
      createLabel="Novo Setor"
      emptyTitle="Nenhum setor ativo"
      emptyDescription="Crie setores para segmentar operacao e relatorios."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Descricao', path: 'description' },
        { label: 'Supervisores', path: 'supervisors', type: 'count' },
        { label: 'Ativo', path: 'isActive', type: 'boolean' },
      ]}
      fields={[
        { name: 'name', label: 'Nome', required: true },
        { name: 'description', label: 'Descricao', type: 'textarea' },
        { name: 'color', label: 'Cor', defaultValue: '#3b82f6' },
        { name: 'isActive', label: 'Ativo', type: 'boolean', defaultValue: true },
      ]}
    />
  );
}
