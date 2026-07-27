import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ProcurementRiskEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async evaluateRisks(
    organizationId: string,
    bids: any[],
    notices: any[],
    suppliers: any[],
    lots: any[],
    proposals: any[],
    homologations: any[],
    priceRegistries: any[],
    documents: any[],
    workspaceId?: string,
  ): Promise<any> {
    const risks: any[] = [];
    let score = 0;

    // Fetch contracts for linking verification
    const allNodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    const contracts = allNodes.filter(n => n.nodeType === "CONTRACT");

    let riskDataStatus: "NO_DATA" | "PARTIAL_DATA" | "READY" = "NO_DATA";
    if (bids.length > 0 || suppliers.length > 0 || documents.length > 0) {
      if (bids.length > 0 && suppliers.length > 0 && documents.length > 0 && proposals.length > 0) {
        riskDataStatus = "READY";
      } else {
        riskDataStatus = "PARTIAL_DATA";
      }
    }

    if (riskDataStatus === "NO_DATA") {
      return {
        items: [],
        score: 0,
        level: "LOW",
        riskDataStatus: "NO_DATA",
        summary: "Sem dados suficientes para avaliar riscos de contratações públicas.",
        message: "Ainda não há dados suficientes para realizar auditoria de riscos.",
      };
    }

    // 1. FORNECEDOR excessivamente dominante (> 40% of standard proposals/victories)
    if (proposals.length > 0 && suppliers.length > 0) {
      const counts: { [name: string]: number } = {};
      proposals.forEach(p => {
        const name = p.supplierName || p.metadata?.supplierName;
        if (name) {
          counts[name] = (counts[name] || 0) + 1;
        }
      });
      const totalProps = proposals.length;
      for (const name of Object.keys(counts)) {
        const ratio = (counts[name] / totalProps) * 100;
        if (ratio >= 40 && counts[name] >= 2) {
          risks.push({
            id: `risk_dominant_supplier_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
            type: "MARKET_DOMINANCE",
            description: `Risco de Domínio do Mercado: Fornecedor "${name}" possui mais de 40% das propostas totais (${counts[name]}/${totalProps}).`,
            impact: "Diminuição das ofertas concorrentes reais e vulnerabilidade em preços.",
            severity: "CRITICAL",
          });
          score += 30;
        }
      }
    }

    // 2. AUSÊNCIA DE CONCORRÊNCIA / PROPOSTA ÚNICA
    bids.forEach(b => {
      const bNum = b.metadata?.number || b.number || b.id;
      const bProps = proposals.filter(p => {
        const pNum = p.metadata?.bidNumber || p.metadata?.number || "";
        return pNum === bNum || (p.metadata?.sourceDoc && b.metadata?.sourceDoc && p.metadata.sourceDoc === b.metadata.sourceDoc);
      });

      if (bProps.length === 1) {
        risks.push({
          id: `risk_single_proposal_${b.id}`,
          type: "COMPETITIVENESS",
          description: `Licitação nº ${bNum} possui apenas uma proposta comercial participante.`,
          impact: "Ausência de disputa real de lances e risco de sobrepreço do lance único.",
          severity: "HIGH",
        });
        score += 20;
      }
    });

    // 3. PROCESSO INCOMPLETO (Ausência de propostas ou fases iniciais/finais sem registro)
    bids.forEach(b => {
      const bNum = b.metadata?.number || b.number || b.id;
      const hasProps = proposals.some(p => {
        const pNum = p.metadata?.bidNumber || p.metadata?.number || "";
        return pNum === bNum;
      });
      if (!hasProps) {
        risks.push({
          id: `risk_incomplete_process_${b.id}`,
          type: "COMPLIANCE",
          description: `Certame licitatório nº ${bNum} foi registrado, mas não possui propostas indexadas.`,
          impact: "Falta de propostas ou dados incompletos impossibilitando fechamento.",
          severity: "MEDIUM",
        });
        score += 15;
      }
    });

    // 4. HOMOLOGAÇÃO AUSENTE
    bids.forEach((b) => {
      const isHomologated = homologations.some((h) => h.bidId === b.id || (h.metadata && h.metadata.bidId === b.id) || h.metadata?.number === b.metadata?.number);
      if (!isHomologated) {
        risks.push({
          id: `risk_proc_nohomolog_${b.id}`,
          type: "COMPLIANCE",
          description: `Licitação nº ${b.metadata?.number || b.id} não possui termo de homologação identificado ou publicado.`,
          impact: "Processo inconcluso ou pendente de encerramento jurídico.",
          severity: "MEDIUM",
        });
        score += 15;
      }
    });

    // 5. CONTRATO SEM ORIGEM (CONTRACT nodes with no linked bids/notices)
    contracts.forEach(c => {
      const cMeta = c.metadata || {};
      const cBidNum = cMeta.bidNumber || cMeta.biddingNumber || "";
      const matchedBid = bids.find(b => {
        const bNum = (b.metadata?.number || b.metadata?.bidNum || b.title || "").toLowerCase();
        return bNum.includes(cBidNum.toLowerCase()) || cBidNum.toLowerCase().includes(bNum);
      });
      if (!cBidNum || !matchedBid) {
        risks.push({
          id: `risk_orphan_contract_${c.id}`,
          type: "COMPLIANCE",
          description: `Contrato nº ${cMeta.number || c.id} não pôde ser correlacionado a nenhuma licitação ou compra pública de origem.`,
          impact: "Contratação direta sem justificativa ou vício de origem no certame.",
          severity: "HIGH",
        });
        score += 25;
      }
    });

    // 6. ATA SEM CONTRATO (Price Registry with no linked contracts)
    priceRegistries.forEach((pr) => {
      const arpMeta = pr.metadata || {};
      const arpNumber = arpMeta.number || pr.id;
      const hasContract = contracts.some(c => {
        const cMeta = c.metadata || {};
        const cBidNum = cMeta.bidNumber || cMeta.biddingNumber || "";
        const arpBidNum = arpMeta.bidNumber || arpMeta.biddingNumber || "";
        return cBidNum && arpBidNum && cBidNum === arpBidNum;
      });
      if (!hasContract) {
        risks.push({
          id: `risk_arp_no_contract_${pr.id}`,
          type: "COMPLIANCE",
          description: `Ata de Registro de Preços nº ${arpNumber} está vigente, mas não possui contratos derivados vinculados.`,
          impact: "Subutilização da Ata de Registro de Preços ou atraso nas contratações.",
          severity: "MEDIUM",
        });
        score += 15;
      }
    });

    // 7. LOTE SEM VENCEDOR
    lots.forEach(lot => {
      if (!lot.metadata?.winnerSupplierId) {
        risks.push({
          id: `risk_lot_no_winner_${lot.id}`,
          type: "COMPLIANCE",
          description: `Lote nº ${lot.metadata?.lotNumber || lot.id} não possui um fornecedor arrematante homologado.`,
          impact: "Possível lote fracassado, deserto ou pendência de adjudicação.",
          severity: "HIGH",
        });
        score += 20;
      }
    });

    // Expired Registry Risk Check
    priceRegistries.forEach((pr) => {
      const validity = pr.validity || pr.metadata?.validity;
      if (validity) {
        const parts = validity.split("/");
        if (parts.length === 3) {
          const date = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          if (date < new Date()) {
            risks.push({
              id: `risk_proc_expired_arp_${pr.id}`,
              type: "EXPIRED",
              description: `Ata de Registro de Preços nº ${pr.metadata?.number || pr.id} com vigência sob risco de expiração ou vencida.`,
              impact: "Impossibilidade de novas adesões ou contratações subsequentes da ata.",
              severity: "CRITICAL",
            });
            score += 35;
          }
        }
      }
    });

    score = Math.min(100, score);
    let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (score >= 70) level = "CRITICAL";
    else if (score >= 45) level = "HIGH";
    else if (score >= 20) level = "MEDIUM";

    return {
      items: risks,
      score,
      level,
      riskDataStatus,
      summary: risks.length > 0
        ? `Auditoria de riscos em licitações classificada como ${level} (Score: ${score}/100) com ${risks.length} alertas identificados.`
        : "Com os dados atualmente carregados, nenhum risco foi identificado.",
    };
  }
}
