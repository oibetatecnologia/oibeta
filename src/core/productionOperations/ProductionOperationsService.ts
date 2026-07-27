import { DeploymentConfigurationService } from '../configuration/DeploymentConfigurationService';
import { DeploymentConnectivityService } from '../configuration/DeploymentConnectivityService';
import type { ProductionGateStatus, ProductionOperationsGate, ProductionOperationsSummary } from './ProductionOperationsTypes';

function gateStatus(score: number, blocked = false): ProductionGateStatus {
  if (blocked || score < 60) return 'critical';
  if (score < 85) return 'attention';
  return 'healthy';
}

export class ProductionOperationsService {
  static async get(): Promise<ProductionOperationsSummary> {
    const [configuration, connectivity] = await Promise.all([
      DeploymentConfigurationService.get(),
      DeploymentConnectivityService.load(),
    ]);

    const environmentScore = configuration.environment === 'production' ? 100 : 55;
    const databaseScore = configuration.databaseMode === 'supabase' ? 100 : 40;
    const domainScore = configuration.checks.some((item) => item.key === 'VITE_APP_URL' && item.status === 'configured') ? 100 : 45;
    const corsScore = configuration.checks.some((item) => item.key === 'ALLOWED_ORIGINS' && item.status === 'configured') ? 100 : 55;

    const gates: ProductionOperationsGate[] = [
      {
        id: 'environment',
        title: 'Ambiente de produção',
        description: 'Runtime publicado com NODE_ENV=production e variáveis exclusivas do ambiente online.',
        status: gateStatus(environmentScore),
        score: environmentScore,
        taskTitle: '[Produção] Configurar ambiente oficial de produção da Beta Platform',
      },
      {
        id: 'database',
        title: 'Supabase oficial',
        description: 'Persistência online obrigatória, sem uso de JSON local ou fallback silencioso.',
        status: gateStatus(databaseScore, configuration.databaseMode !== 'supabase'),
        score: databaseScore,
        taskTitle: '[Produção] Ativar Supabase como persistência oficial',
      },
      {
        id: 'domains',
        title: 'Domínios e HTTPS',
        description: 'www.oibeta.com.br para o site institucional e app.oibeta.com.br para o sistema autenticado.',
        status: gateStatus(domainScore),
        score: domainScore,
        taskTitle: '[Produção] Vincular domínios www e app com HTTPS',
      },
      {
        id: 'cors',
        title: 'CORS entre os domínios',
        description: 'Permitir somente origens oficiais e bloquear origens desconhecidas em produção.',
        status: gateStatus(corsScore),
        score: corsScore,
        taskTitle: '[Produção] Validar CORS entre www.oibeta.com.br e app.oibeta.com.br',
      },
      {
        id: 'connectivity',
        title: 'Conectividade externa',
        description: 'Validar aplicação, Supabase e serviços externos exigidos para o go-live.',
        status: gateStatus(connectivity.score, connectivity.productionBlocked),
        score: connectivity.score,
        taskTitle: '[Produção] Resolver falhas de conectividade do ambiente online',
      },
      {
        id: 'observability',
        title: 'Health checks e rollback',
        description: 'Disponibilizar sinais de vida, prontidão e procedimento documentado de reversão.',
        status: connectivity.critical > 0 ? 'critical' : connectivity.attention > 0 ? 'attention' : 'healthy',
        score: connectivity.critical > 0 ? 45 : connectivity.attention > 0 ? 75 : 95,
        taskTitle: '[Produção] Homologar health checks, logs e rollback',
      },
    ];

    const score = Math.round(gates.reduce((total, gate) => total + gate.score, 0) / gates.length);
    const productionBlocked = configuration.productionBlocked || connectivity.productionBlocked || gates.some((gate) => gate.status === 'critical');

    return {
      score,
      status: gateStatus(score, productionBlocked),
      productionBlocked,
      configuration,
      connectivity,
      domains: [
        {
          id: 'institutional',
          label: 'Página institucional',
          hostname: 'www.oibeta.com.br',
          url: 'https://www.oibeta.com.br',
          technology: 'Next.js',
          responsibility: 'Conteúdo público, apresentação dos produtos, contato comercial e entrada para o login.',
          status: 'attention',
          evidence: 'Domínio contratado; implementação da página institucional permanece como etapa posterior.',
        },
        {
          id: 'application',
          label: 'Aplicação autenticada',
          hostname: 'app.oibeta.com.br',
          url: 'https://app.oibeta.com.br',
          technology: 'Vite + React + Express',
          responsibility: 'Login, painel empresarial, administração, produtos e operação dos tenants.',
          status: domainScore >= 85 ? 'healthy' : 'attention',
          evidence: domainScore >= 85 ? 'URL oficial configurada no ambiente.' : 'URL oficial definida, aguardando publicação e DNS.',
        },
      ],
      gates,
      nextActions: gates.filter((gate) => gate.status !== 'healthy').map((gate) => gate.taskTitle).slice(0, 5),
      checkedAt: new Date().toISOString(),
    };
  }
}
