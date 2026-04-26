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
    />
  );
}
