import { ResourcePage } from '@/components/modules/resource-page';

export default function UsuariosPage() {
  return (
    <ResourcePage
      title="Usuários"
      description="Agentes, supervisores, operadores e perfis de acesso."
      endpoint="/users"
      createLabel="Novo Usuário"
      emptyTitle="Nenhum usuário encontrado"
      emptyDescription="Cadastre usuários para operar atendimento, gestão e telefonia."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Email', path: 'email' },
        { label: 'Perfil', path: 'role', type: 'badge' },
        { label: 'Status', path: 'status', type: 'badge' },
        { label: 'Ativo', path: 'isActive', type: 'boolean' },
      ]}
    />
  );
}
