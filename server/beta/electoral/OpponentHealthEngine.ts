import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export class OpponentHealthEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async evaluateOpponentHealth(organizationId: string, opponentId: string): Promise<{
    opponentId: string;
    score: number;
    status: 'NO_DATA' | 'PARTIAL_DATA' | 'READY';
    checks: {
      hasParty: boolean;
      hasPosition: boolean;
      hasNotes: boolean;
      hasRelationships: boolean;
    };
    diagnostics: string;
  }> {
    const opponentRecord = await this.dbAdapter.getElectoralOpponentById(organizationId, opponentId);
    if (!opponentRecord) {
      return {
        opponentId,
        score: 0,
        status: "NO_DATA",
        checks: {
          hasParty: false,
          hasPosition: false,
          hasNotes: false,
          hasRelationships: false
        },
        diagnostics: "Adversário não localizado de forma pontual no banco de dados."
      };
    }

    // Get relationships associated with this opponent
    const allRels = await this.dbAdapter.getElectoralRelationships(organizationId);
    const opponentRels = allRels.filter((r: any) => r.sourceId === opponentId || r.targetId === opponentId);

    const hasParty = !!opponentRecord.party;
    const hasPosition = !!opponentRecord.position;
    const hasNotes = !!opponentRecord.notes && opponentRecord.notes.trim().length > 0;
    const hasRelationships = opponentRels.length > 0;

    let score = 20; // 20 points default since name is verified
    if (hasParty) score += 20;
    if (hasPosition) score += 20;
    if (hasNotes) score += 20;
    if (hasRelationships) score += 20;

    let status: 'NO_DATA' | 'PARTIAL_DATA' | 'READY';
    if (score <= 40) {
      status = "NO_DATA";
    } else if (score < 80) {
      status = "PARTIAL_DATA";
    } else {
      status = "READY";
    }

    let diagnostics = "";
    if (status === "READY") {
      diagnostics = "Ficha cadastral avaliada como completa. Contém dados de posicionamento, partido e conexões políticas mapeadas.";
    } else if (status === "PARTIAL_DATA") {
      const missing = [];
      if (!hasParty) missing.push("partido político");
      if (!hasPosition) missing.push("cargo disputado ou nível de atuação");
      if (!hasNotes) missing.push("caracterização/notas");
      if (!hasRelationships) missing.push("vínculos estruturais com lideranças ou grupos");

      diagnostics = `A análise indica preenchimento parcial da ficha. Para otimizar, recomenda-se adicionar dados sobre: ${missing.join(", ")}.`;
    } else {
      diagnostics = "Ficha técnica com dados mínimos. Sugere-se iniciar mapeamento básico deste adversário político.";
    }

    return {
      opponentId,
      score,
      status,
      checks: {
        hasParty,
        hasPosition,
        hasNotes,
        hasRelationships
      },
      diagnostics
    };
  }
}
