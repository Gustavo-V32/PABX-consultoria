import { ResourcePage } from '@/components/modules/resource-page';

export default function EtiquetasPage() {
  return (
    <ResourcePage
      title="Etiquetas"
      description="Classificação de contatos e conversas."
      endpoint="/tags"
      createLabel="Nova Etiqueta"
      emptyTitle="Nenhuma etiqueta criada"
      emptyDescription="Crie etiquetas para segmentação operacional e relatórios."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Cor', path: 'color' },
        { label: 'Contatos', path: '_count.contacts' },
        { label: 'Conversas', path: '_count.conversations' },
      ]}
    />
  );
}
