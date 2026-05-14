import { ResourcePage } from '@/components/modules/resource-page';

export default function TemplatesPage() {
  return (
    <ResourcePage
      title="Templates"
      description="Modelos de mensagem sincronizados ou criados para WhatsApp."
      endpoint="/templates"
      createLabel="Novo Template"
      emptyTitle="Nenhum template cadastrado"
      emptyDescription="Sincronize templates aprovados pela Meta ou cadastre modelos locais."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Idioma', path: 'language' },
        { label: 'Categoria', path: 'category', type: 'badge' },
        { label: 'Status', path: 'status', type: 'badge' },
      ]}
      fields={[
        { name: 'name', label: 'Nome', required: true },
        { name: 'language', label: 'Idioma', defaultValue: 'pt_BR' },
        {
          name: 'category',
          label: 'Categoria',
          type: 'select',
          required: true,
          defaultValue: 'UTILITY',
          options: [
            { label: 'Utilidade', value: 'UTILITY' },
            { label: 'Marketing', value: 'MARKETING' },
            { label: 'Autenticacao', value: 'AUTHENTICATION' },
          ],
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          defaultValue: 'PENDING',
          options: [
            { label: 'Pendente', value: 'PENDING' },
            { label: 'Aprovado', value: 'APPROVED' },
            { label: 'Rejeitado', value: 'REJECTED' },
            { label: 'Pausado', value: 'PAUSED' },
          ],
        },
        { name: 'components', label: 'Componentes JSON', type: 'json', required: true, defaultValue: [] },
        { name: 'variables', label: 'Variaveis JSON', type: 'json', defaultValue: [] },
      ]}
    />
  );
}
