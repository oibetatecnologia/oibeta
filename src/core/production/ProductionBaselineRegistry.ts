export interface ProductionBaselineDefinition {
  id: string;
  label: string;
  officialEnvironment: string;
  lintApproved: boolean;
  buildApproved: boolean;
  productionEnvironmentReady: boolean;
  notes: string[];
}

export const CURRENT_PRODUCTION_BASELINE: ProductionBaselineDefinition = {
  id: 'beta-platform-60',
  label: 'Beta Platform — baseline após Super Lote E aprovado',
  officialEnvironment: 'Windows local oficial',
  lintApproved: true,
  buildApproved: true,
  productionEnvironmentReady: false,
  notes: [
    'Lint e build aprovados pelo usuário no ambiente Windows oficial.',
    'Produção online ainda não foi publicada.',
    'Persistência definitiva, integrações reais e permissões backend continuam pendentes.',
  ],
};
