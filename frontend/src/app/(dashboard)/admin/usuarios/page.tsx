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
      fields={[
        { name: 'name', label: 'Nome', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true, createOnly: true },
        { name: 'password', label: 'Senha', type: 'password', required: true, createOnly: true },
        {
          name: 'role',
          label: 'Perfil',
          type: 'select',
          required: true,
          defaultValue: 'AGENT',
          options: [
            { label: 'Administrador', value: 'ADMIN' },
            { label: 'Supervisor', value: 'SUPERVISOR' },
            { label: 'Agente', value: 'AGENT' },
            { label: 'Operador telefonia', value: 'TELEPHONY_OPERATOR' },
            { label: 'Analista', value: 'ANALYST' },
            { label: 'Visualizador', value: 'VIEWER' },
          ],
        },
        { name: 'maxChats', label: 'Max. atendimentos', type: 'number', defaultValue: 5 },
        { name: 'isActive', label: 'Ativo', type: 'boolean', defaultValue: true },
      ]}
    />
  );
}
