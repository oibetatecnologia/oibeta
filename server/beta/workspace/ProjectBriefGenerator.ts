export class ProjectBriefGenerator {
  public generateBriefJSON(
    state: string,
    objectivesObj: any[],
    decisionsObj: any,
    actionsObj: any,
    documents: any[],
  ): any {
    return {
      currentState: state,
      objectives: objectivesObj,
      decisions: decisionsObj,
      actions: actionsObj,
      documents: documents.map((d) => ({
        id: d.id,
        filename: d.filename,
        type: d.fileType,
      })),
    };
  }

  public generateBriefText(
    state: string,
    objectivesObj: any[],
    decisionsObj: any,
    actionsObj: any,
  ): string {
    let brief = `Resumo Operacional do Projeto\n`;
    brief += `Estado Atual: ${state}\n\n`;

    brief += `Objetivos Ativos:\n`;
    if (objectivesObj.length === 0) brief += `- Nenhum objetivo ativo.\n`;
    objectivesObj.forEach((o: any) => {
      brief += `- ${o.title} (${o.intelligence?.progress}% concluído)\n`;
    });

    brief += `\nDecisões Críticas:\n`;
    if (decisionsObj.pending.length > 0) {
      brief += `- ${decisionsObj.pending.length} decisões pendentes.\n`;
    }
    if (decisionsObj.accepted.length > 0) {
      brief += `- ${decisionsObj.accepted.length} decisões tomadas.\n`;
    }

    brief += `\nPróximos Passos Recomendados:\n`;
    if (actionsObj.nextRecommendedActions.length === 0)
      brief += `- Nenhum passo sugerido.\n`;
    actionsObj.nextRecommendedActions.forEach((a: string) => {
      brief += `- ${a}\n`;
    });

    return brief;
  }
}
