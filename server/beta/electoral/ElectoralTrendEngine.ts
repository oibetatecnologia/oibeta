import { CandidateHistoryEngine } from "./CandidateHistoryEngine";

export class ElectoralTrendEngine {
  constructor(private candidateEngine: CandidateHistoryEngine) {}

  /**
   * Analyzes historical trends of a candidate, stating whether they grew, remained stable or declined based purely on real results.
   */
  public async analyzeCandidateTrend(organizationId: string, candidateName: string): Promise<{
    trend: 'CRESCIMENTO' | 'QUEDA' | 'ESTABILIDADE' | 'INSUFICIENTE';
    description: string;
  }> {
    const history = await this.candidateEngine.getCandidateHistory(organizationId, candidateName);
    
    if (!history || history.elections.length < 2) {
      return { trend: 'INSUFICIENTE', description: "Não há dados de eleições múltiplas suficientes para definir uma tendência." };
    }

    const sortedElections = [...history.elections].sort((a, b) => a.year - b.year);
    const votes = sortedElections.map(e => e.totalVotes);

    let increments = 0;
    let decrements = 0;

    for (let i = 1; i < votes.length; i++) {
        if (votes[i] > votes[i-1]) increments++;
        else if (votes[i] < votes[i-1]) decrements++;
    }

    if (increments > decrements) {
        return { trend: 'CRESCIMENTO', description: `O candidato obteve crescimento na maioria dos ${votes.length} ciclos eleitorais disputados.` };
    } else if (decrements > increments) {
        return { trend: 'QUEDA', description: `O candidato apresentou queda na maioria dos ${votes.length} ciclos eleitorais disputados.` };
    } else {
        return { trend: 'ESTABILIDADE', description: `O candidato manteve desempenho estável ao longo de ${votes.length} ciclos eleitorais.` };
    }
  }
}
