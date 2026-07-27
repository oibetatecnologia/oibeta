import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export class GovernmentRiskEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async evaluateRisks(
    contracts: any[],
    indicators: any[],
    programs: any[],
    documents: any[],
    organizationId: string,
  ): Promise<any> {
    const risks: any[] = [];
    const now = new Date();

    let riskDataStatus: "NO_DATA" | "PARTIAL_DATA" | "READY" = "NO_DATA";
    if (contracts.length > 0 || indicators.length > 0 || programs.length > 0 || documents.length > 0) {
      if (contracts.length > 0 && programs.length > 0 && indicators.length > 0) {
        riskDataStatus = "READY";
      } else {
        riskDataStatus = "PARTIAL_DATA";
      }
    }

    // If there is absolutely no data in the system, do not invent or suggest risks
    if (riskDataStatus === "NO_DATA") {
      return {
        items: [],
        score: 0,
        level: "LOW",
        riskDataStatus: "NO_DATA",
        summary: "Sem dados suficientes para avaliar riscos institucionais.",
      };
    }

    // 1. Contract Validity & Expiring Audits
    contracts.forEach((c) => {
      // Missing values
      if (!c.value) {
        risks.push({
          id: `risk_ctt_value_${c.id}`,
          description: `Contrato ${c.number || "(Sem número)"} possui valor estimativo ausente ou zerado.`,
          level: "MEDIUM",
        });
      }

      // Expiring in less than 30 days or expired
      if (c.validity) {
        const expiryDate = this.parseDate(c.validity);
        if (expiryDate) {
          const diffTime = expiryDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            risks.push({
              id: `risk_ctt_expired_${c.id}`,
              description: `Contrato expirado: ${c.number || "(Sem número)"} venceu em ${c.validity}.`,
              level: "CRITICAL",
            });
          } else if (diffDays <= 30) {
            risks.push({
              id: `risk_ctt_expiring_${c.id}`,
              description: `Contrato ${c.number || "(Sem número)"} está próximo do vencimento (${diffDays} dias restantes).`,
              level: "HIGH",
            });
          }
        }
      }
    });

    // 2. Indicators Audits
    indicators.forEach((i) => {
      if (i.status === "CRITICAL") {
        risks.push({
          id: `risk_ind_critical_${i.id}`,
          description: `Indicador '${i.name}' está em estágio de alerta crítico.`,
          level: "HIGH",
        });
      } else if (i.status === "WARNING") {
        risks.push({
          id: `risk_ind_warning_${i.id}`,
          description: `Indicador '${i.name}' demanda acompanhamento por desvio de metas.`,
          level: "MEDIUM",
        });
      }

      // Indicator missing updates (e.g. metadata flag or age)
      if (i.metadata?.stale || i.status === "PENDING") {
        risks.push({
          id: `risk_ind_stale_${i.id}`,
          description: `Indicador '${i.name}' está desatualizado ou sem medição recente.`,
          level: "MEDIUM",
        });
      }
    });

    // 3. Program Audits
    programs.forEach((p) => {
      if (p.metadata?.stale || p.metadata?.status === "PARADO") {
        risks.push({
          id: `risk_prog_halted_${p.id}`,
          description: `Programa de governo '${p.name}' reportado como estagnado.`,
          level: "HIGH",
        });
      }
    });

    // 4. Missing Mandatory Documents (PPA, LDO, LOA)
    // We only check for missing budget pieces if we have at least 1 document processed (which establishes context)
    if (documents.length > 0) {
      const docClasses = documents.map((d) => d.classification).filter(Boolean);

      const hasPPA = docClasses.includes("PPA") || documents.some(d => d.filename.toLowerCase().includes("ppa"));
      const hasLDO = docClasses.includes("LDO") || documents.some(d => d.filename.toLowerCase().includes("ldo"));
      const hasLOA = docClasses.includes("LOA") || documents.some(d => d.filename.toLowerCase().includes("loa"));

      if (!hasPPA) {
        risks.push({
          id: "risk_missing_ppa",
          description: "Ausência documental: Plano Plurianual (PPA) não integrado ou pendente de envio.",
          level: "MEDIUM",
        });
      }
      if (!hasLDO) {
        risks.push({
          id: "risk_missing_ldo",
          description: "Ausência documental: Lei de Diretrizes Orçamentárias (LDO) não mapeada.",
          level: "MEDIUM",
        });
      }
      if (!hasLOA) {
        risks.push({
          id: "risk_missing_loa",
          description: "Ausência documental: Lei Orçamentária Anual (LOA) não encontrada para o período vigente.",
          level: "HIGH",
        });
      }
    }

    // Calculating dynamic scores
    let score = 0;
    let critical = 0;
    let high = 0;

    risks.forEach((r) => {
      if (r.level === "CRITICAL") {
        score += 35;
        critical++;
      } else if (r.level === "HIGH") {
        score += 20;
        high++;
      } else if (r.level === "MEDIUM") {
        score += 10;
      } else {
        score += 5;
      }
    });

    if (score > 100) score = 100;

    let level = "LOW";
    if (score >= 25) level = "MEDIUM";
    if (score >= 50) level = "HIGH";
    if (score >= 75) level = "CRITICAL";

    return {
      items: risks,
      score,
      level,
      riskDataStatus,
      summary: risks.length > 0
        ? `Risco governamental avaliado como ${level} (${score}/100) com ${risks.length} desconformidades detectadas.`
        : "Com os dados atualmente carregados, nenhum risco foi identificado.",
    };
  }

  private parseDate(dateStr: string): Date | null {
    try {
      // formats like dd/mm/yyyy
      const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (parts) {
        return new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
      }
      
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) {
        return new Date(parsed);
      }
    } catch (e) {
      // ignore
    }
    return null;
  }
}
