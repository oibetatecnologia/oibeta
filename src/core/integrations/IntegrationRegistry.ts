import type { IntegrationProviderDefinition } from './IntegrationTypes';

export const INTEGRATION_PROVIDERS: IntegrationProviderDefinition[] = [
  {
    id: 'pncp',
    name: 'PNCP',
    description: 'Fonte pública nacional para oportunidades, contratações e atas.',
    status: 'pending',
    targetModule: 'Radar Comercial',
    baseUrlEnv: 'VITE_PNCP_BASE_URL',
    endpoints: [
      {
        id: 'pncp-opportunities',
        label: 'Consulta de oportunidades',
        path: '/v1/contratacoes/publicacao',
        method: 'GET',
        required: true,
      },
      {
        id: 'pncp-documents',
        label: 'Documentos de contratação',
        path: '/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos',
        method: 'GET',
        required: false,
      },
    ],
  },
  {
    id: 'compras_gov',
    name: 'Compras.gov.br',
    description: 'Fonte complementar para pregões, dispensas, UASGs e itens.',
    status: 'pending',
    targetModule: 'Radar Comercial',
    baseUrlEnv: 'VITE_COMPRAS_GOV_BASE_URL',
    endpoints: [
      {
        id: 'compras-opportunities',
        label: 'Consulta de compras públicas',
        path: '/api/consulta',
        method: 'GET',
        required: true,
      },
    ],
  },
  {
    id: 'ai_gateway',
    name: 'Gateway de IA',
    description: 'Camada de orquestração para análise, recomendações e geração de tarefas pela Beta.',
    status: 'attention',
    targetModule: 'Beta IA',
    baseUrlEnv: 'VITE_AI_GATEWAY_URL',
    apiKeyEnv: 'AI_GATEWAY_KEY',
    endpoints: [
      {
        id: 'ai-analyze',
        label: 'Análise operacional',
        path: '/analyze',
        method: 'POST',
        required: true,
      },
      {
        id: 'ai-recommendations',
        label: 'Recomendações',
        path: '/recommendations',
        method: 'POST',
        required: true,
      },
    ],
  },
  {
    id: 'cloudflare_r2',
    name: 'Cloudflare R2',
    description: 'Storage para documentos, propostas, contratos, evidências e anexos operacionais.',
    status: 'pending',
    targetModule: 'Ambientes',
    baseUrlEnv: 'VITE_R2_PUBLIC_BASE_URL',
    apiKeyEnv: 'R2_ACCESS_KEY_ID',
    endpoints: [
      {
        id: 'r2-upload',
        label: 'Upload de documentos',
        path: '/objects',
        method: 'POST',
        required: true,
      },
    ],
  },
];
