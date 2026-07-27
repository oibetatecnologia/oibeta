import { ElectoralService } from '../../../services/electoral/ElectoralService';
import type { AnalysisQueryParams, SavedAnalysis } from '../types';

interface SaveAnalysisParams {
  title: string;
  type: string;
  queryParams: AnalysisQueryParams;
  result: any;
}

/**
 * AnalysisCrudService
 *
 * Serviço operacional de análises eleitorais.
 */
export const AnalysisCrudService = {
  execute(type: string, queryParams: AnalysisQueryParams, user: any) {
    return ElectoralService.executeAnalysis(type, queryParams, user);
  },

  createDefaultTitle(type: string): string {
    return `Análise ${type.toUpperCase()} - ${new Date().toLocaleDateString('pt-BR')}`;
  },

  save(params: SaveAnalysisParams, user: any) {
    return ElectoralService.saveAnalysis({
      title: params.title,
      type: params.type.toUpperCase(),
      summary: `Execução de análise ${params.type} com parâmetros ${JSON.stringify(params.queryParams)}`,
      metadata: params.result,
    }, user);
  },

  downloadJSON(analysis: SavedAnalysis) {
    ElectoralService.downloadAnalysisJSON(analysis);
  },
};
