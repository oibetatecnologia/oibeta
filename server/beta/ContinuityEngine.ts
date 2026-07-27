import { DatabaseAdapter } from "../../server/database/DatabaseAdapter";

export class ContinuityEngine {
  private dbAdapter: DatabaseAdapter;
  private aiRouter?: any;

  constructor(dbAdapter: DatabaseAdapter, aiRouter?: any) {
    this.dbAdapter = dbAdapter;
    this.aiRouter = aiRouter;
  }

  /**
   * Executa o processo de regeneração de snapshot de continuidade.
   * Pode utilizar Heurística Local inteligente sustentada por dados reais de forma prioritária,
   * garantindo que a base esteja sempre consistente.
   */
  public async rebuild(projectId: string, organizationId: string, workspaceId?: string): Promise<any> {
    try {
      // 1. Coleta dados reais da base
      const project = await this.dbAdapter.getProjectById(projectId, "", organizationId, workspaceId || "default-workspace");
      if (!project) return null;

      const tasks = await this.dbAdapter.getTasks(projectId, workspaceId || "default-workspace");
      const objectives = await this.dbAdapter.getObjectives(projectId, workspaceId || "default-workspace");
      const decisions = await this.dbAdapter.getDecisions(projectId, workspaceId || "default-workspace");
      const memories = await this.dbAdapter.getMemories(projectId, workspaceId || "default-workspace");

      // 2. Extrai pendências e dados objetivos
      const pendingTasks = tasks.filter((t: any) => t.status !== "completed" && t.status !== "concluido");
      const completedTasks = tasks.filter((t: any) => t.status === "completed" || t.status === "concluido");
      const activeObjectives = objectives.filter((o: any) => !o.status || o.status === "pending" || o.status === "active");

      // Identifica "último ponto de parada"
      let lastStop = project.lastStopPoint || "";
      if (completedTasks.length > 0) {
        const sortedCompleted = [...completedTasks].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        lastStop = `Conclusão da tarefa: "${sortedCompleted[0].title}" (${new Date(sortedCompleted[0].updatedAt).toLocaleDateString("pt-BR")})`;
      } else if (decisions.length > 0) {
        const sortedDecisions = [...decisions].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        lastStop = `Tomada de decisão: "${sortedDecisions[0].title}"`;
      } else {
        lastStop = "Projeto iniciado e mapa cognitivo estabelecido.";
      }

      // Identifica riscos
      const risks: string[] = [];
      if (pendingTasks.length > 3) {
        risks.push("Acúmulo de frentes ativas pendentes de resolução.");
      }
      if (objectives.length === 0) {
        risks.push("Ausência de metas de governança de curto-prazo estruturadas.");
      }
      pendingTasks.forEach((t: any) => {
        if (t.priority === "alta" || t.priority === "high") {
          risks.push(`Tarefa de Alta Prioridade pendente: "${t.title}"`);
        }
      });

      // Próxima ação recomendada
      let recommendedAction = "Definir próximos passos e planejar metas de curto prazo.";
      if (pendingTasks.length > 0) {
        const sortedPending = [...pendingTasks].sort((a, b) => {
          const priorityWeight = (p: string) => p === "alta" || p === "high" ? 3 : p === "média" || p === "medium" ? 2 : 1;
          return priorityWeight(b.priority) - priorityWeight(a.priority);
        });
        recommendedAction = `Atuar na prioridade imediata: "${sortedPending[0].title}" (${sortedPending[0].description || "Sem descrição"})`;
      } else if (activeObjectives.length > 0) {
        recommendedAction = `Estabelecer tarefas operacionais vinculadas ao objetivo: "${activeObjectives[0].title}"`;
      }

      // Heurística de Estágio Corrente
      let stage = "Estruturação Básica";
      if (tasks.length > 0) {
        const completionRate = completedTasks.length / tasks.length;
        if (completionRate === 1) {
          stage = "Entrega Total";
        } else if (completionRate >= 0.7) {
          stage = "Validação Finais";
        } else if (completionRate >= 0.3) {
          stage = "Fase Executiva de Ação";
        } else {
          stage = "Arranque e Integração";
        }
      }

      // Descrição sumária baseada em fatos
      let summary = `Projeto em fase de ${stage}. Atualmente conta com ${tasks.length} tarefas (${completedTasks.length} concluídas), ${objectives.length} objetivos cadastrados e ${decisions.length} decisões documentadas de governança corporativa.`;

      const nextSnapshot = {
        organizationId,
        projectId,
        summary,
        currentObjective: activeObjectives[0]?.title || "Acelerar entregas da Sprint corrente",
        currentStage: stage,
        lastStopPoint: lastStop,
        pendingItems: pendingTasks.map((t: any) => t.title),
        risks: risks.length > 0 ? risks : ["Nenhum risco crítico de governança detectado."],
        recommendedNextAction: recommendedAction,
        confidenceScore: 1.0
      };

      // Tenta melhorar via IA se disponível, com tolerância a falhas
      if (this.aiRouter) {
        try {
          const systemMsg = `Você é o Continuity Engine no núcleo cognitivo da AI Beta. Seu papel é receber os dados estruturados de um projeto e gerar um snapshot analítico e executivo profissional de continuidade de progresso em formato JSON strictly compliant.
Retorne APENAS um objeto JSON válido, sem markdown blocks (\`\`\`), com os seguintes campos exatos:
{
  "summary": "resumo profissional em até duas frases do estado do projeto",
  "current_stage": "fase atual do projeto curta (ex: Arranque de Integração, Fase Executiva de Ação, Entrega e Homologação)",
  "recommended_next_action": "descrição curta e acionável do próximo passo indispensável baseado em tarefas ativas",
  "risks": ["array com formato similar de 1 a 3 riscos técnicos identificados baseados em volumetria ou metas para este projeto"]
}`;
          const inputData = `Dados do Projeto:
- Nome: ${project.name}
- Descrição: ${project.description}
- Tarefas Pendentes: ${JSON.stringify(pendingTasks.map(t => ({ title: t.title, priority: t.priority })))}
- Tarefas Concluídas: ${JSON.stringify(completedTasks.map(t => t.title))}
- Objetivos Ativos: ${JSON.stringify(activeObjectives.map(o => o.title))}
- Decisões Recentes: ${JSON.stringify(decisions.slice(0, 5).map(d => d.title))}
- Memórias de Contexto: ${JSON.stringify(memories.slice(0, 3).map(m => m.title))}
- Último ponto de parada registrado: ${lastStop}`;

          const response = await this.aiRouter.generate(
            organizationId,
            `${systemMsg}\n\nEntrada do projeto:\n${inputData}`,
            "Você é o Continuity Engine."
          );

          const rawText = response?.response || "";
          // Parse dynamic output safemode
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiJson = JSON.parse(jsonMatch[0].trim());
            nextSnapshot.summary = aiJson.summary || nextSnapshot.summary;
            nextSnapshot.currentStage = aiJson.current_stage || nextSnapshot.currentStage;
            nextSnapshot.recommendedNextAction = aiJson.recommended_next_action || nextSnapshot.recommendedNextAction;
            if (Array.isArray(aiJson.risks)) nextSnapshot.risks = aiJson.risks;
          }
        } catch (e) {
          console.warn("Continuity Rebuild failed, utilizing heuristics backup model:", e);
        }
      }

      // Salva snapshot atual no banco de dados
      return await this.dbAdapter.saveContinuitySnapshot(nextSnapshot);
    } catch (e) {
      console.error("Critical error in ContinuityEngine.rebuild:", e);
      return null;
    }
  }

  /**
   * Responde dúvidas clássicas de andamento ("De onde paramos?") de maneira extremamente polida,
   * profissional e veloz sem requisições adicionais externas de IA.
   */
  public async getContinuityResponse(projectId: string, organizationId: string, questionType: 'parada' | 'pendencias' | 'geral', workspaceId?: string): Promise<string> {
    try {
      const snap = await this.dbAdapter.getContinuitySnapshot(projectId, workspaceId || "default-workspace");
      const project = await this.dbAdapter.getProjectById(projectId, "", organizationId, workspaceId || "default-workspace");
      
      // Se não houver snapshot ainda, força um rebuild síncrono rápido
      const finalSnap = snap || await this.rebuild(projectId, organizationId, workspaceId);
      
      if (!finalSnap) {
        return "Prezado Douglas, não encontrei frentes de continuidade ou marcos operacionais ativos cadastrados neste projeto. Aguardo o direcionamento de tarefas, objetivos ou decisões para estruturar nossa base cognitiva.";
      }

      const tasks = await this.dbAdapter.getTasks(projectId, workspaceId || "default-workspace");
      const pendingTasks = tasks.filter((t: any) => t.status !== "completed" && t.status !== "concluido");

      let responseText = "";

      if (questionType === 'parada') {
        responseText = `### 📍 RESUMO EXECUTIVO DE CONTINUIDADE (OI BETA)

Prezado Douglas, de acordo com o **Continuity Engine**, aqui está a nossa situação técnica:

* **Estágio do Projeto:** \`${finalSnap.currentStage}\`
* **Último Ponto de Parada Crítico:** ${finalSnap.lastStopPoint || "Arranque do projeto e modelagem semântica inicial."}
* **Meta Corrente:** *"${finalSnap.currentObjective || "Impulsionar marcos operacionais cadastrados."}"*
* **Próxima Ação Recomendada:** ${finalSnap.recommendedNextAction}

*Heurísticas locais de sincronia ativa em tempo real.*`;
      } else if (questionType === 'pendencias') {
        const itemLines = pendingTasks.length > 0 
          ? pendingTasks.map((t: any) => `- **${t.title}** (Prioridade: \`${t.priority || "média"}\`)`).join("\n")
          : "- *Nenhuma tarefa operacional pendente no momento.*";

        const riskLines = Array.isArray(finalSnap.risks) && finalSnap.risks.length > 0
          ? finalSnap.risks.map((r: any) => `- **Atenção:** ${r}`).join("\n")
          : "- *Nenhum risco de governança detectado.*";

        responseText = `### 📋 PENDÊNCIAS E MAPEAMENTO DE RISCOS (OI BETA)

Prezado Douglas, mapeei as seguintes frentes pendentes na governança do projeto:

**Atividades Operacionais Pendentes:**
${itemLines}

**Análise de Riscos Ativos:**
${riskLines}

**Ação de Prevenção Recomendada:** ${finalSnap.recommendedNextAction}

*Status extraído diretamente do banco de dados analítico local.*`;
      } else {
        // Geral / Onde estamos
        responseText = `### 📊 DIAGNÓSTICO DE GOVERNANÇA E PROGRESSO (OI BETA)

Prezado Douglas, eis o diagnóstico e situação do projeto:

* **Alinhamento do Projeto:** ${finalSnap.summary || "Projeto estruturado com mapeamento do Knowledge Graph ativo."}
* **Última Atualização de Parada:** ${finalSnap.lastStopPoint || "Não registrada."}
* **Etapa Corrente:** \`${finalSnap.currentStage}\`
* **Próxima Ação Recomendada:** ${finalSnap.recommendedNextAction}

**Pendências de Alta Visibilidade:**
${pendingTasks.slice(0, 3).map((t: any) => `- [ ] **${t.title}** (Prioridade: \`${t.priority || "média"}\`)`).join("\n") || "- *Sem tarefas pendentes no radar.*"}

*Módulo Continuity Engine operando offline com integridade e estabilidade cognitiva.*`;
      }

      return responseText;
    } catch (e) {
      console.error("Error in getContinuityResponse of ContinuityEngine:", e);
      return "Prezado Douglas, encontrei uma oscilação ao acessar o mapa local de continuidade de frentes. Por favor, verifique se existem tarefas vinculadas a este projeto.";
    }
  }
}
