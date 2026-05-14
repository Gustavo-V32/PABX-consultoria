import { ResourcePage } from '@/components/modules/resource-page';

export default function FilasPage() {
  return (
    <ResourcePage
      title="Filas"
      description="Distribuicao de conversas, agentes e estrategias de atendimento."
      endpoint="/queues"
      createLabel="Nova Fila"
      emptyTitle="Nenhuma fila ativa"
      emptyDescription="Crie filas para organizar atendimento por setor ou prioridade."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Setor', path: 'sector.name' },
        { label: 'Estrategia', path: 'strategy', type: 'badge' },
        { label: 'Agentes', path: 'members', type: 'count' },
        { label: 'Ativa', path: 'isActive', type: 'boolean' },
      ]}
      fields={[
        { name: 'name', label: 'Nome', required: true },
        { name: 'description', label: 'Descricao', type: 'textarea' },
        {
          name: 'strategy',
          label: 'Estrategia',
          type: 'select',
          defaultValue: 'ROUND_ROBIN',
          options: [
            { label: 'Round robin', value: 'ROUND_ROBIN' },
            { label: 'Tocar todos', value: 'RING_ALL' },
            { label: 'Menos chamadas', value: 'FEWEST_CALLS' },
            { label: 'Menos recente', value: 'LEAST_RECENT' },
            { label: 'Aleatorio', value: 'RANDOM' },
            { label: 'Linear', value: 'LINEAR' },
          ],
        },
        { name: 'maxWaitTime', label: 'Espera maxima (s)', type: 'number', defaultValue: 300 },
        { name: 'maxQueueSize', label: 'Tamanho maximo', type: 'number', defaultValue: 50 },
        { name: 'wrapUpTime', label: 'Pausa pos-atendimento (s)', type: 'number', defaultValue: 5 },
        { name: 'greetingMessage', label: 'Mensagem inicial', type: 'textarea' },
        { name: 'waitMessage', label: 'Mensagem de espera', type: 'textarea' },
        { name: 'autoAssign', label: 'Auto atribuir', type: 'boolean', defaultValue: true },
        { name: 'isActive', label: 'Ativa', type: 'boolean', defaultValue: true },
      ]}
    />
  );
}
