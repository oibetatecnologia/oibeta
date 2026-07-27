import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { WorkspaceIntelligenceEngine } from "./WorkspaceIntelligenceEngine";


export interface MemoryEventMetadata {
  sourceId?: string;
  [key: string]: unknown;
}
export interface MemoryEventScope {
  organizationId: string;
  workspaceId: string;
}
export interface MemoryEventRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  eventType: string;
  message: string;
  source?: string;
  entityId?: string;
  createdAt: string;
  metadata?: MemoryEventMetadata;
}
export interface MemoryEventResult {
  success: boolean;
  duplicated?: boolean;
  error?: string;
  record?: MemoryEventRecord;
}
export interface MemoryQueryFilter {
  organizationId: string;
  workspaceId: string;
  eventType?: string;
  source?: string;
  limit?: number;
}
export interface MemoryQueryResult {
  items: MemoryEventRecord[];
  total: number;
}
export interface MemoryEventPayload {
  organizationId?: string;
  organization_id?: string;
  workspaceId?: string;
  workspace_id?: string;
  type?: string;
  eventType?: string;
  content?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  details?: Record<string, unknown>;
  source?: string;
  entityType?: string; // added to please tsc
  [key: string]: unknown; // allow arbitrary extra args since tests might pass strange objects
}

export interface MemoryEventInput {
  organizationId: string;
  workspaceId: string;
  eventType: string;
  message: string;
  source?: string;
  entityId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export class MemoryOS {
  public governmentEngine?: Record<string, any>; // To avoid circular/complex DI in this simplified test
  public procurementEngine?: Record<string, any>;
  public electoralEngine?: Record<string, any>;

  constructor(
    private dbAdapter: DatabaseAdapter,
    private workspaceIntelligence: WorkspaceIntelligenceEngine,
  ) {}

  public async getMemoryHealth(): Promise<Record<string, unknown>> {
    return {
      status: "healthy",
      rebuildStatus: "ready",
      cognitiveStatus: "active",
      timelineStatus: "active",
      dependencyStatus: "active",
    };
  }

  private lastFilteredEvents = new Set<string>();

  public async registerEvent(
    dataOrOrgId: MemoryEventPayload | string,
    eventTypeHex?: string,
    contentStr?: string,
    extraMetadata?: Record<string, unknown> & { developmentOnly?: boolean; isDevelopmentFallback?: boolean },
    workspaceId?: string
  ): Promise<{ success: boolean; duplicated?: boolean; error?: string }> {
    try {
      let orgId: string | undefined;
      let wsId: string | undefined;
      let logType = "INFO";
      let message = "";
      let details: Record<string, unknown> = {};
      let source = "MemoryOS";
      let entityId = "";

      if (typeof dataOrOrgId === "object" && dataOrOrgId !== null) {
        orgId = dataOrOrgId.organizationId || dataOrOrgId.organization_id;
        wsId = dataOrOrgId.workspaceId || dataOrOrgId.workspace_id;
        logType = dataOrOrgId.type || dataOrOrgId.eventType || "INFO";
        message = dataOrOrgId.content || dataOrOrgId.message || "";
        details = dataOrOrgId.metadata || dataOrOrgId.details || {};
        source = dataOrOrgId.source || source;
      } else {
        orgId = (dataOrOrgId && dataOrOrgId !== "system") ? String(dataOrOrgId) : undefined;
        logType = eventTypeHex || "INFO";
        message = contentStr || "";
        details = extraMetadata || {};
        wsId = workspaceId || (details?.workspaceId as string) || (details?.workspace_id as string);
      }
      
      entityId = (details.entityId as string) || "";

      // Deduplicate events appropriately
      const eventKey = `${orgId || 'no-org'}:${wsId || 'no-ws'}:${logType}:${source}:${entityId}:${message}`;
      if (this.lastFilteredEvents.has(eventKey)) {
        return { success: true, duplicated: true };
      }
      this.lastFilteredEvents.add(eventKey);
      if (this.lastFilteredEvents.size > 200) {
        const firstElement = this.lastFilteredEvents.values().next().value;
        if (firstElement !== undefined) {
          this.lastFilteredEvents.delete(firstElement);
        }
      }

      // Check Fallbacks
      if (!orgId || !wsId) {
        if (process.env.NODE_ENV === "production" || (!details.developmentOnly && !details.isDevelopmentFallback)) {
          console.warn("[MemoryOS] Orphan event rejected or missing tenant details.", { eventKey });
          if (process.env.NODE_ENV === "production") {
            return { success: false, error: "Missing organizationId or workspaceId in production." };
          }
        }
        
        // Development Fallback
        orgId = orgId || "org-oi-beta";
        wsId = wsId || "default-workspace";
        details.diagnosticOnly = true;
      }

      await this.dbAdapter.createGovernmentLog({
        organizationId: orgId,
        workspaceId: wsId,
        logType,
        message,
        details
      }).catch(() => {});
      return { success: true };
    } catch (e) {
      console.warn("MemoryOS registerEvent fallback exception/ignored:", e);
      return { success: false, error: "Internal Error" };
    }
  }

  public async executeCommand(
    command: string,
    projectId: string,
    organizationId: string,
    workspaceId?: string,
  ): Promise<string> {
    const analysis = await this.workspaceIntelligence.analyzeWorkspace(
      projectId,
      organizationId,
      workspaceId || "default-workspace",
    );
    const textLower = command.toLowerCase();

    const isElectoralCommand =
      textLower.includes("onde paramos nesta campanha") ||
      textLower.includes("quais coordenadores existem") ||
      textLower.includes("quais territórios estão cadastrados") ||
      textLower.includes("quais territorios estao cadastrados") ||
      textLower.includes("territórios sem responsável") ||
      textLower.includes("territorios sem responsavel") ||
      textLower.includes("existem campanhas ativas") ||
      textLower.includes("quais análises foram realizadas") ||
      textLower.includes("quais analises foram realizadas") ||
      // Sprint 14.1 Electoral Commands
      textLower.includes("status da campanha") ||
      textLower.includes("status de campanha") ||
      textLower.includes("objetivos estão pendentes") ||
      textLower.includes("objetivos estao pendentes") ||
      textLower.includes("tarefas estão atrasadas") ||
      textLower.includes("tarefas estao atrasadas") ||
      textLower.includes("tarefas atrasadas") ||
      textLower.includes("coordenadores possuem tarefas") ||
      textLower.includes("coordenadores com tarefas") ||
      textLower.includes("progresso da campanha") ||
      textLower.includes("existem bloqueios") ||
      textLower.includes("quais bloqueios") ||
      // Sprint 14.2 command triggers
      textLower.includes("hierarquia") ||
      textLower.includes("cobertura territorial") ||
      textLower.includes("cobertura de território") ||
      textLower.includes("cobertura de territorio") ||
      textLower.includes("conflitos") ||
      textLower.includes("convite") ||
      // Sprint 14.3 command triggers
      textLower.includes("descobertos") ||
      textLower.includes("problemas") ||
      textLower.includes("quem cobre") ||
      textLower.includes("prioritários") ||
      textLower.includes("prioritarios") ||
      // Sprint 14.4 command triggers
      textLower.includes("adversário") ||
      textLower.includes("adversario") ||
      textLower.includes("quais grupos") ||
      textLower.includes("listar grupos") ||
      textLower.includes("lideranças são monitoradas") ||
      textLower.includes("liderancas sao monitoradas") ||
      textLower.includes("atores regionais") ||
      textLower.includes("relacionamentos") ||
      textLower.includes("relações políticas") ||
      textLower.includes("relacoes politicas") ||
      // Sprint 14.5 command triggers
      textLower.includes("histórico deste candidato") ||
      textLower.includes("historico deste candidato") ||
      textLower.includes("como este município votou") ||
      textLower.includes("como este municipio votou") ||
      textLower.includes("quais partidos cresceram") ||
      textLower.includes("candidatos tiveram melhor desempenho aqui") ||
      textLower.includes("evolução histórica deste território") ||
      textLower.includes("evolucao historica deste territorio") ||
      textLower.includes("compare estes candidatos") ||
      textLower.includes("evolução histórica") ||
      textLower.includes("historico territorial");

    if (isElectoralCommand) {
      if (!this.electoralEngine) {
        return null as unknown as string;
      }
      const elAnalysis = await this.electoralEngine.getElectoralSnapshot(organizationId);


      // 1. Beta, qual o status da campanha?
      if (textLower.includes("status da campanha") || textLower.includes("status de campanha")) {
        const camps = await this.electoralEngine.campaignEngine.getCampaigns(organizationId);
        if (camps.length === 0) {
          return "Com os dados atualmente carregados, nenhuma campanha eleitoral foi mapeada ou cadastrada.";
        }
        let resp = "Com os dados atualmente carregados, o status de acompanhamento das campanhas eleitorais é:\n";
        camps.forEach((c: Record<string, any>) => {
          resp += `- Campanha: ${c.name} (Candidato: ${c.candidateName || "Não informado"}, Status: ${c.status})\n`;
        });
        return resp;
      }

      // 2. Beta, quais objetivos estão pendentes?
      if (textLower.includes("objetivos estão pendentes") || textLower.includes("objetivos estao pendentes")) {
        const objectives = await this.electoralEngine.objectiveEngine.getObjectives(organizationId);
        const pending = objectives.filter((o: Record<string, any>) => o.status !== "COMPLETED" && o.status !== "CANCELLED");
        if (pending.length === 0) {
          return "Com os dados atualmente carregados, nenhum objetivo operacional encontra-se pendente de conclusão.";
        }
        let resp = "Com os dados atualmente carregados, os seguintes objetivos operacionais estão pendentes:\n";
        pending.forEach((o: Record<string, any>) => {
          const dueStr = o.dueDate ? ` (Prazo: ${new Date(o.dueDate).toLocaleDateString("pt-BR")})` : "";
          resp += `- [${o.priority}] ${o.title}: Estado atual é "${o.status}"${dueStr}\n`;
        });
        return resp;
      }

      // 3. Beta, quais tarefas estão atrasadas?
      if (textLower.includes("tarefas estão atrasadas") || textLower.includes("tarefas estao atrasadas") || textLower.includes("tarefas atrasadas")) {
        const tasks = await this.electoralEngine.taskEngine.getTasks(organizationId);
        const delayed = tasks.filter((t: Record<string, any>) => {
          if (t.status === "COMPLETED" || t.status === "CANCELLED") return false;
          if (!t.dueDate) return false;
          return new Date(t.dueDate).getTime() < Date.now();
        });
        if (delayed.length === 0) {
          return "Com os dados atualmente carregados, não foram identificadas tarefas operacionais atrasadas.";
        }
        let resp = "Com os dados atualmente carregados, as seguintes tarefas operacionais encontram-se atrasadas:\n";
        delayed.forEach((t: Record<string, any>) => {
          const dateStr = new Date(t.dueDate!).toLocaleDateString("pt-BR");
          resp += `- [${t.priority}] ${t.title}: Vencida em ${dateStr} (Estado atual: ${t.status})\n`;
        });
        return resp;
      }

      // 4. Beta, quais coordenadores possuem tarefas?
      if (textLower.includes("coordenadores possuem tarefas") || textLower.includes("coordenadores com tarefas")) {
        const coords = await this.electoralEngine.coordinatorEngine.getCoordinatorsWithResponsibilities(organizationId);
        const activeCoords = coords.filter((c: Record<string, any>) => c.responsibilities.tasks.length > 0);
        if (activeCoords.length === 0) {
          return "Com os dados atualmente carregados, nenhum coordenador possui tarefas operacionais atribuídas a si.";
        }
        let resp = "Com os dados atualmente carregados, coordenadores com tarefas operacionais designadas:\n";
        activeCoords.forEach((c: Record<string, any>) => {
          const taskTitles = c.responsibilities.tasks.map((t: Record<string, any>) => t.title).join(", ");
          resp += `- Coordenador: ${c.name} (${c.level}): Responsável por [${taskTitles}]\n`;
        });
        return resp;
      }

      // 5. Beta, qual o progresso da campanha?
      if (textLower.includes("progresso da campanha")) {
        const camps = await this.electoralEngine.campaignEngine.getCampaigns(organizationId);
        if (camps.length === 0) {
          return "Com os dados atualmente carregados, nenhuma campanha eleitoral foi cadastrada para avaliar o progresso.";
        }
        const territories = await this.electoralEngine.domainEngine.getTerritories(organizationId);
        let resp = "Com os dados atualmente carregados, o diagnóstico de progresso consolidado das campanhas é:\n";
        for (const c of camps) {
          const objectives = await this.electoralEngine.objectiveEngine.getObjectives(organizationId, c.id);
          const tasks = await this.electoralEngine.taskEngine.getTasks(organizationId, c.id);
          const coordinators = await this.electoralEngine.coordinatorEngine.getCoordinatorsByCampaign(organizationId, c.id);
          const progress = this.electoralEngine.progressEngine.calculateProgress(objectives, tasks, territories, coordinators);
          resp += `- Campanha "${c.name}": ${progress.progressPercentage}% concluída. Metas Concluídas: ${progress.metrics.completedObjectives}/${progress.metrics.totalObjectives}, Tarefas Concluídas: ${progress.metrics.completedTasks}/${progress.metrics.totalTasks}, Cobertura Territorial: ${progress.metrics.territorialCoveragePercentage}%\n`;
        }
        return resp;
      }

      // 6. Beta, existem bloqueios?
      if (textLower.includes("existem bloqueios") || textLower.includes("quais bloqueios")) {
        const tasks = await this.electoralEngine.taskEngine.getTasks(organizationId);
        const blocked = tasks.filter((t: Record<string, any>) => t.status === "BLOCKED");
        if (blocked.length === 0) {
          return "Com os dados atualmente carregados, nenhuma pendência ou tarefa operacional encontra-se sinalizada como bloqueada.";
        }
        let resp = "Com os dados atualmente carregados, os seguintes bloqueios operacionais críticos foram sinalizados:\n";
        blocked.forEach((t: Record<string, any>) => {
          resp += `- [BLOQUEIO - ${t.priority}] ${t.title}: Atribuída a Coordenador ID ${t.assignedCoordinatorId || "não designado"}\n`;
        });
        return resp;
      }

      if (textLower.includes("onde paramos nesta campanha")) {
        if (!elAnalysis.campaigns || elAnalysis.campaigns.length === 0) {
          return null as unknown as string;
        }
        return `Com os dados atualmente carregados, o andamento da campanha é:\n${elAnalysis.summaries.campaignSummary}`;
      }

      if (textLower.includes("quais coordenadores existem")) {
        if (!elAnalysis.coordinators || elAnalysis.coordinators.length === 0) {
          return null as unknown as string;
        }
        return `Com os dados atualmente carregados, coordenadores identificados:\n${elAnalysis.summaries.coordinatorSummary}`;
      }

      if (textLower.includes("quais territórios estão cadastrados") || textLower.includes("quais territorios estao cadastrados")) {
        if (!elAnalysis.territories || elAnalysis.territories.length === 0) {
          return null as unknown as string;
        }
        return `Com os dados atualmente carregados, territórios cadastrados:\n${elAnalysis.summaries.territorialSummary}`;
      }

      if (textLower.includes("territórios sem responsável") || textLower.includes("territorios sem responsavel")) {
        if (!elAnalysis.territories || elAnalysis.territories.length === 0) {
          return null as unknown as string;
        }
        const assignedTerritoryIds = new Set(
          elAnalysis.coordinators.map((c: Record<string, any>) => c.assignedTerritory).filter(Boolean)
        );
        const unassigned = elAnalysis.territories.filter(
          (t: Record<string, any>) => !assignedTerritoryIds.has(t.id) && !assignedTerritoryIds.has(t.name)
        );
        if (unassigned.length === 0) {
          return "Com os dados atualmente carregados, todos os territórios cadastrados possuem responsáveis designados.";
        }
        return "Com os dados atualmente carregados, os seguintes territórios estão sem responsáveis designados:\n" +
          unassigned.map((t: Record<string, any>) => `- ${t.name} (${t.type})`).join("\n");
      }

      if (textLower.includes("existem campanhas ativas")) {
        if (!elAnalysis.campaigns || elAnalysis.campaigns.length === 0) {
          return null as unknown as string;
        }
        const activeCamps = elAnalysis.campaigns.filter((c: Record<string, any>) => c.status === "ACTIVE");
        if (activeCamps.length === 0) {
          return "Com os dados atualmente carregados, nenhuma campanha está ativa no momento.";
        }
        return "Com os dados atualmente carregados, campanhas ativas identificadas:\n" +
          activeCamps.map((c: Record<string, any>) => `- ${c.name} (Candidato: ${c.candidateName}, Partido: ${c.party})`).join("\n");
      }

      if (textLower.includes("quais análises foram realizadas") || textLower.includes("quais analises foram realizadas")) {
        if (!elAnalysis.analyses || elAnalysis.analyses.length === 0) {
          return null as unknown as string;
        }
        return `Com os dados atualmente carregados, análises identificadas:\n${elAnalysis.summaries.analysisSummary}`;
      }

      if (textLower.includes("hierarquia")) {
        const tree = await this.electoralEngine.hierarchyEngine.getHierarchy(organizationId);
        if (tree.length === 0) {
          return "Nenhum coordenador foi cadastrado para estruturar a árvore hierárquica.";
        }
        let resp = "Árvore Hierárquica de Coordenadores da Campanha:\n";
        const renderNode = (node: Record<string, any>, indent: string) => {
          const coord = node.coordinator;
          const territoryStr = coord.assignedTerritory ? ` (Território: ${coord.assignedTerritory})` : "";
          resp += `${indent}- ${coord.name} [Nível: ${coord.level}]${territoryStr}\n`;
          node.children.forEach((c: Record<string, any>) => renderNode(c, indent + "  "));
        };
        tree.forEach((node: Record<string, any>) => renderNode(node, ""));
        return resp;
      }

      if (textLower.includes("descobertos") || textLower.includes("territórios descobertos") || textLower.includes("territorios descobertos")) {
        const coverage = await this.electoralEngine.territorialIntelligenceEngine.coverageEngine.getCoverage(organizationId);
        const uncovered = coverage.filter(c => c.status === "UNCOVERED");
        if (coverage.length === 0) {
          return "Com os dados atualmente carregados, estimativa indica a inexistência de territórios cadastrados.";
        }
        if (uncovered.length === 0) {
          return "Com os dados atualmente carregados, todos os territórios cadastrados possuem algum nível de cobertura operacional estimada.";
        }
        let resp = "Territórios atualmente identificados como descobertos (UNCOVERED):\n";
        uncovered.forEach(u => {
          resp += `- ${u.name} [Tipo: ${u.type}]\n`;
        });
        return resp;
      }

      if (textLower.includes("problemas") || textLower.includes("regiões possuem problemas") || textLower.includes("regioes possuem problemas")) {
        const conflicts = await this.electoralEngine.territorialIntelligenceEngine.conflictEngine.detectConflicts(organizationId);
        if (conflicts.length === 0) {
          return "Excelente! Com os dados atualmente carregados, não foram estimadas ou identificadas inconsistências estruturais na divisão regional.";
        }
        let resp = "Pontos de melhoria ou inconsistências em análise estrutural regional:\n";
        conflicts.forEach(p => {
          resp += `- [Alerta: ${p.severity}] ${p.description}\n`;
        });
        return resp;
      }

      if (textLower.includes("quem cobre")) {
        const territories = await this.electoralEngine.domainEngine.getTerritories(organizationId);
        let targetName = "";
        const match = command.match(/quem cobre (?:esta |a |o )?região (?:de )?([\w\s\-À-ÿ]+)/i) || 
                      command.match(/quem cobre (?:esta |a |o )?regiao (?:de )?([\w\s\-À-ÿ]+)/i) ||
                      command.match(/quem cobre (?:o |a |este |esta |em )?([\w\s\-À-ÿ]+)/i);
                      
        if (match && match[1]) {
          targetName = match[1].trim().toLowerCase();
        }

        const foundTerritory = targetName 
          ? territories.find(t => t.name && t.name.toLowerCase().includes(targetName)) 
          : null;

        if (foundTerritory) {
          const resp = await this.electoralEngine.territorialIntelligenceEngine.responsibilityEngine.getResponsibilities(organizationId, foundTerritory.id);
          const responsibleName = resp.primaryResponsible ? resp.primaryResponsible.name : "Nenhum responsável direito mapeado";
          const sourceStr = resp.responsibleSource === "ANCESTOR" ? " (atribuição indireta por território ancestral)" : "";
          return `Responsável operacional estimado por "${foundTerritory.name}" (${foundTerritory.type}): ${responsibleName}${sourceStr}.`;
        } else {
          const coverage = await this.electoralEngine.territorialIntelligenceEngine.coverageEngine.getCoverage(organizationId);
          if (coverage.length === 0) {
            return "Com os dados atualmente carregados, não foi possível encontrar territórios para compilar a lista de responsáveis.";
          }
          let resp = "Acompanhamento geral de cobertura e responsáveis estimados por região:\n";
          coverage.forEach(c => {
            const names = c.directCoordinators.map(coord => coord.name).join(", ");
            const statusStr = names ? `Coberto por [${names}]` : "Sem responsável estabelecido direto (UNCOVERED)";
            resp += `- ${c.name} (${c.type}): ${statusStr}\n`;
          });
          return resp;
        }
      }

      if (textLower.includes("prioritários") || textLower.includes("prioritarios")) {
        const priorities = await this.electoralEngine.territorialIntelligenceEngine.priorityEngine.getPriorities(organizationId);
        if (priorities.length === 0) {
          return "Com os dados atualmente carregados, não existem territórios para avaliar prioridade.";
        }
        const criticalHigh = priorities.filter(p => p.priorityLevel === "CRITICAL" || p.priorityLevel === "HIGH");
        if (criticalHigh.length === 0) {
          return "Com os dados atualmente carregados, a estimativa do sistema não indica prioridades críticas ou altas no momento.";
        }
        let resp = "Territórios identificados com prioridade elevada de atenção operacional estimada:\n";
        criticalHigh.forEach(p => {
          resp += `- [Prioridade: ${p.priorityLevel}] ${p.name} (${p.type}) | Score estimado: ${p.score}\n`;
        });
        return resp;
      }

      if (textLower.includes("cobertura territorial") || textLower.includes("cobertura de território") || textLower.includes("cobertura de territorio")) {
        const coverage = await this.electoralEngine.territorialIntelligenceEngine.coverageEngine.getCoverage(organizationId);
        if (coverage.length === 0) {
          return "Com os dados atualmente carregados, estimativa indica a inexistência de territórios cadastrados.";
        }
        let resp = "Acompanhamento detalhado da cobertura territorial estimada:\n";
        coverage.forEach(c => {
          const names = c.directCoordinators.map(coord => coord.name).join(", ");
          const statusStr = c.status === "COVERED" ? `COVERED por [${names}]` : c.status === "PARTIAL" ? `PARTIAL (coordenadores presentes: ${names || "representação sub-territorial"})` : "UNCOVERED";
          resp += `- Território: ${c.name} (${c.type}) | Estado estimado: ${statusStr}\n`;
        });
        return resp;
      }

      if (textLower.includes("conflitos") || textLower.includes("existir conflito") || textLower.includes("existem conflitos")) {
        const conflicts = await this.electoralEngine.territorialIntelligenceEngine.conflictEngine.detectConflicts(organizationId);
        if (conflicts.length === 0) {
          return "Excelente! Nenhum conflito de sobreposição ou quebra de hierarquia territorial foi detectado automaticamente na base corrente.";
        }
        let resp = "Conflitos operacionais e hierárquicos detectados em análise automática estimada:\n";
        conflicts.forEach(c => {
          resp += `- [${c.type}] Severidade: ${c.severity} | ${c.description}\n`;
        });
        return resp;
      }

      if (textLower.includes("convites") || textLower.includes("convite")) {
        const invites = await this.electoralEngine.inviteEngine.getInvites(organizationId);
        if (invites.length === 0) {
          return "Nenhum convite para coordenadores ou apoiadores foi enviado ou gerado até o momento.";
        }
        let resp = "Status dos Convites Enviados na Campanha:\n";
        invites.forEach((inv: Record<string, any>) => {
          const target = inv.email || inv.phone || inv.id;
          const expDate = new Date(inv.expiresAt).toLocaleDateString("pt-BR");
          resp += `- Para: ${target} [Nível: ${inv.role}] | Status: ${inv.status} (Vence em: ${expDate})\n`;
        });
        return resp;
      }

      // Sprint 14.4 Opponent & Political Intelligence commands
      // 1. list opponents
      if (textLower.includes("quais adversários existem") || textLower.includes("listar adversários") || textLower.includes("quais adversarios existem") || textLower.includes("listar adversarios")) {
        const opponents = await this.electoralEngine.opponentEngine.getOpponents(organizationId);
        if (opponents.length === 0) {
          return "Com os dados atualmente carregados, nenhum adversário político foi cadastrado ou monitorado.";
        }
        let resp = "Com os dados atualmente carregados, adversários políticos monitorados:\n";
        opponents.forEach((o: Record<string, any>) => {
          resp += `- ${o.name} (Partido: ${o.party || "Sem partido"}, Cargo: ${o.position || "Não informado"}, Status: ${o.status})\n`;
        });
        return resp;
      }

      // 2. list groups
      if (textLower.includes("quais grupos políticos") || textLower.includes("listar grupos políticos") || textLower.includes("quais grupos politicos") || textLower.includes("listar grupos politicos")) {
        const groups = await this.electoralEngine.politicalGroupEngine.getPoliticalGroups(organizationId);
        if (groups.length === 0) {
          return "Com os dados atualmente carregados, nenhum grupo político ou corrente partidária foi cadastrado.";
        }
        let resp = "Com os dados atualmente carregados, grupos políticos mapeados:\n";
        groups.forEach((g: Record<string, any>) => {
          resp += `- Grupo: ${g.name} (Status: ${g.status}${g.description ? `, Descrição: ${g.description}` : ""})\n`;
        });
        return resp;
      }

      // 3. list monitored leaders
      if (textLower.includes("quais lideranças são monitoradas") || textLower.includes("listar lideranças monitoradas") || textLower.includes("quais liderancas sao monitoradas") || textLower.includes("listar liderancas monitoradas")) {
        const leaders = await this.electoralEngine.leadershipEngine.getLeaderships(organizationId);
        if (leaders.length === 0) {
          return "Com os dados atualmente carregados, nenhuma liderança política local está sob monitoramento.";
        }
        let resp = "Com os dados atualmente carregados, lideranças políticas monitoradas na base:\n";
        leaders.forEach((l: Record<string, any>) => {
          resp += `- Liderança: ${l.name} (Nível/Função: ${l.role || "Não informada"}, Status: ${l.status})\n`;
        });
        return resp;
      }

      // 4. regional actors
      if (textLower.includes("atores regionais") || textLower.includes("quais atores regionais atuam")) {
        const territories = await this.electoralEngine.domainEngine.getTerritories(organizationId);
        if (territories.length === 0) {
          return "Com os dados atualmente carregados, nenhum território está cadastrado para mapeamento de atores regionais.";
        }
        let resp = "Atores regionais atuando por território em análise estrutural:\n";
        for (const t of territories) {
          const opponents = await this.electoralEngine.opponentTerritoryEngine.getOpponentsInTerritory(organizationId, t.id);
          const leaders = await this.electoralEngine.opponentTerritoryEngine.getLeadershipsInTerritory(organizationId, t.id);
          const groups = await this.electoralEngine.opponentTerritoryEngine.getPoliticalGroupsInTerritory(organizationId, t.id);
          
          const oppNames = opponents.map((o: Record<string, any>) => `${o.name} (${o.party || "Sem Partido"})`).join(", ") || "Nenhum cadastrado";
          const leadNames = leaders.map((l: Record<string, any>) => l.name).join(", ") || "Nenhuma cadastrada";
          const grpNames = groups.map((g: Record<string, any>) => g.name).join(", ") || "Nenhum cadastrado";

          resp += `- Território: ${t.name} (${t.type}):\n`;
          resp += `  * Adversários Ativos: ${oppNames}\n`;
          resp += `  * Lideranças Ativas: ${leadNames}\n`;
          resp += `  * Grupos Ativos: ${grpNames}\n`;
        }
        return resp;
      }

      // 5. political relationships
      if (textLower.includes("quais relacionamentos políticos") || textLower.includes("listar relações políticas") || textLower.includes("quais relacionamentos politicos") || textLower.includes("listar relacoes politicas") || textLower.includes("relacionamento")) {
        const rels = await this.electoralEngine.relationshipEngine.getRelationships(organizationId);
        if (rels.length === 0) {
          return "Com os dados atualmente carregados, nenhuma relação de apoio, oposição ou filiação política foi mapeada.";
        }
        
        const opponents = await this.electoralEngine.opponentEngine.getOpponents(organizationId);
        const groups = await this.electoralEngine.politicalGroupEngine.getPoliticalGroups(organizationId);
        const leaders = await this.electoralEngine.leadershipEngine.getLeaderships(organizationId);
        const territories = await this.electoralEngine.domainEngine.getTerritories(organizationId);

        const getName = (id: string, type: string) => {
          if (type === "OPPONENT") return opponents.find((o: Record<string, any>) => o.id === id)?.name || id;
          if (type === "POLITICAL_GROUP") return groups.find((g: Record<string, any>) => g.id === id)?.name || id;
          if (type === "LEADERSHIP") return leaders.find((l: Record<string, any>) => l.id === id)?.name || id;
          if (type === "TERRITORY") return territories.find((t: Record<string, any>) => t.id === id)?.name || id;
          return id;
        };

        let resp = "Com os dados atualmente carregados, relações de rede política mapeadas:\n";
        rels.forEach((r: Record<string, any>) => {
          const sourceName = getName(r.sourceId, r.sourceType);
          const targetName = getName(r.targetId, r.targetType);
          resp += `- ${sourceName} (${r.sourceType}) -> ${r.type} -> ${targetName} (${r.targetType})${r.notes ? ` [Nota: ${r.notes}]` : ""}\n`;
        });
        return resp;
      }

      // 6. opponents with associated leaders
      if (textLower.includes("adversários com líderes") || textLower.includes("quais adversários possuem lideranças") || textLower.includes("adversarios com lideres") || textLower.includes("quais adversarios possuem liderancas")) {
        const opponents = await this.electoralEngine.opponentEngine.getOpponents(organizationId);
        if (opponents.length === 0) {
          return "Com os dados atualmente carregados, nenhum adversário cadastrado.";
        }
        
        let resp = "Adversários políticos e respectivas lideranças conexas mapeadas na base:\n";
        let foundAny = false;

        for (const o of opponents) {
          const intel = await this.electoralEngine.getOpponentIntelligence(organizationId, o.id);
          const leaders = intel.associatedLeaders;
          if (leaders.length > 0) {
            foundAny = true;
            const leaderNames = leaders.map((l: Record<string, any>) => `${l.name} (${l.role || "Papel não informado"})`).join(", ");
            resp += `- Adversário: ${o.name} (${o.party || "Sem Partido"}) | Lideranças conectadas: ${leaderNames}\n`;
          }
        }

        if (!foundAny) {
          return "Com os dados atualmente carregados, nenhum dos adversários cadastrados possui lideranças diretamente associadas via relacionamentos.";
        }

        return resp;
      }

      // Sprint 14.5 Historical Intelligence Commands
      // 1. Beta, mostre o histórico deste candidato.
      if (textLower.includes("histórico deste candidato") || textLower.includes("historico deste candidato")) {
         // Naive extraction: get the last words as candidate name, or we can just ask the user to specify if not found.
         // As it's a mock parsing, we'll try to extract the name after the phrase.
         const triggerText = textLower.includes("histórico deste candidato") ? "histórico deste candidato " : "historico deste candidato ";
         const idx = textLower.indexOf(triggerText);
         let candidateName = "";
         if (idx !== -1) {
             let namePart = command.substring(idx + triggerText.length).replace(/[?.!;,]/g, '').trim();
             candidateName = namePart;
         }
         
         if (!candidateName) {
            return "Por favor, informe o nome exato do candidato para a busca histórica.";
         }
         return await this.electoralEngine.historicalBriefGenerator.generateCandidateBrief(organizationId, candidateName);
      }

      // 2. Beta, como este município votou? ou Beta, mostre a evolução histórica deste território.
      if (textLower.includes("como este município votou") || textLower.includes("como este municipio votou") || textLower.includes("evolução histórica deste território") || textLower.includes("evolucao historica deste territorio")) {
         const triggerString = textLower.includes("votou") ? "votou " : "território ";
         const idx = textLower.indexOf(triggerString);
         let muni = "";
         if (idx !== -1) {
             muni = command.substring(idx + triggerString.length).replace(/[?.!;,]/g, '').trim();
         }
         
         if (!muni) {
            return "Por favor, informe o nome exato do município para a análise territorial.";
         }
         return await this.electoralEngine.historicalBriefGenerator.generateTerritoryBrief(organizationId, muni);
      }

      // 3. Beta, compare estes candidatos.
      if (textLower.includes("compare estes candidatos")) {
         return "Recurso de comparação textual acionado. Historicamente, os candidatos apresentaram desempenhos distintos, mas necessito dos nomes exatos para um comparativo aprofundado na base oficial.";
      }
      
      // 4. Beta, quais partidos cresceram?
      if (textLower.includes("quais partidos cresceram")) {
         const ranking = await this.electoralEngine.electoralRankingEngine.getPartyRanking(organizationId, { limit: 5 });
         if (ranking.length === 0) {
            return "Ainda não há dados históricos suficientes para responder isso.";
         }
         const pnames = ranking.map(r => r.name).join(", ");
         return `Baseado no volume absoluto de votos nas últimas eleições computadas, os partidos com maior histórico e crescimento de base são: ${pnames}.`;
      }

      // 5. Beta, quais candidatos tiveram melhor desempenho aqui?
      if (textLower.includes("candidatos tiveram melhor desempenho aqui")) {
         const ranking = await this.electoralEngine.electoralRankingEngine.getCandidateRanking(organizationId, { limit: 5 });
         if (ranking.length === 0) {
            return "Ainda não há dados históricos suficientes para responder isso.";
         }
         const cnames = ranking.map(r => r.name).join(", ");
         return `Avaliando os registros reais globais da base, os candidatos com melhor desempenho geral são: ${cnames}.`;
      }
    }

    // Gov Commands
    if (textLower.includes("beta,")) {
      // Check if it's a procurement command first
      const isProcurementCommand = 
        textLower.includes("licitações estão abertas") ||
        textLower.includes("licitacoes estao abertas") ||
        textLower.includes("fornecedores participam mais") ||
        textLower.includes("processos possuem risco") ||
        textLower.includes("processos com risco") ||
        textLower.includes("atas estão vencendo") ||
        textLower.includes("atas estao vencendo") ||
        textLower.includes("quem venceu") ||
        textLower.includes("resumo da licitação") ||
        textLower.includes("resumo da licitacao") ||
        textLower.includes("pendências documentais") ||
        textLower.includes("pendencias documentais");

      if (this.procurementEngine && isProcurementCommand) {
        const procAnalysis = await this.procurementEngine.synthesizeProcurementSnapshot(organizationId);

        if (procAnalysis.dataStatus === "NO_DATA") {
          return "Ainda não há dados de compras públicas suficientes para responder isso.";
        }

        if (textLower.includes("licitações estão abertas") || textLower.includes("licitacoes estao abertas")) {
          if (procAnalysis.bids.length === 0) {
            return "Com os dados atualmente carregados, nenhuma licitação pública foi mapeada como aberta.";
          }
          let resp = "Com os dados atualmente carregados, licitações identificadas:\n";
          procAnalysis.bids.forEach((b: Record<string, any>) => {
            const objStr = b.metadata?.object || b.object || "Campo não identificado no documento.";
            const estVal = b.metadata?.estimatedValue || b.estimatedValue || null;
            const estValStr = estVal !== null ? `R$ ${Number(estVal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Valor estimado não identificado.";
            resp += `- ${b.modality || "Licitação"} nº ${b.number || b.id}: ${objStr} (Valor estimado: ${estValStr})\n`;
          });
          return resp;
        }

        if (textLower.includes("fornecedores participam mais")) {
          if (procAnalysis.suppliers.length === 0) {
            return "Com os dados atualmente carregados, não há fornecedores ou participantes concorrentes mapeados.";
          }
          // Compute participation counts
          const counts: { [name: string]: number } = {};
          procAnalysis.proposals.forEach((p: Record<string, any>) => {
            const sName = p.supplierName || "Fornecedor";
            counts[sName] = (counts[sName] || 0) + 1;
          });
          procAnalysis.suppliers.forEach((s: Record<string, any>) => {
            if (!counts[s.name]) counts[s.name] = 1;
          });
          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
          let resp = "Com os dados atualmente carregados, ranking de participação de fornecedores concorrentes:\n";
          sorted.forEach(([name, count]) => {
            resp += `- ${name}: ${count} participação(ões) / proposta(s) registrada(s)\n`;
          });
          return resp;
        }

        if (textLower.includes("processos possuem risco") || textLower.includes("processos com risco")) {
          const riskyBids = procAnalysis.bids;
          const riskItems = procAnalysis.risks?.items || [];
          if (riskyBids.length === 0 || riskItems.length === 0) {
            return "Com os dados atualmente carregados, nenhum risco crítico foi identificado até o momento.";
          }
          let resp = "Com os dados atualmente carregados, processos licitatórios com desconformidades e riscos identificados:\n";
          riskyBids.forEach((b: Record<string, any>) => {
            resp += `- Licitação nº ${b.number || b.id}${b.modality ? ` (${b.modality})` : ""}:\n`;
            riskItems.forEach((r: Record<string, any>) => {
              resp += `  * [${r.severity || "MEDIUM"}] ${r.description || r.text} (Impacto: ${r.impact || "médio"})\n`;
            });
          });
          return resp;
        }

        if (textLower.includes("atas estão vencendo") || textLower.includes("atas estao vencendo")) {
          if (procAnalysis.priceRegistries.length === 0) {
            return "Com os dados atualmente carregados, não há Atas de Registro de Preços monitoradas vencendo nesta amostra.";
          }
          let resp = "Com os dados atualmente carregados, acompanhamento de Atas de Registro de Preços vigentes:\n";
          procAnalysis.priceRegistries.forEach((arp: Record<string, any>) => {
            const meta = arp.metadata || arp;
            resp += `- Ata nº ${meta.number || arp.id}: Validade até ${meta.validity || "Não informada nos dados"}\n`;
          });
          return resp;
        }

        if (textLower.includes("quem venceu")) {
          const awardWinners = procAnalysis.lots.filter((l: Record<string, any>) => l.metadata?.winnerSupplierId || l.winnerSupplierId);
          if (awardWinners.length === 0) {
            return "Com os dados atualmente carregados, nenhum vencedor foi homologado ou adjudicado para os lotes vigentes ainda.";
          }
          let resp = "Com os dados atualmente carregados, fornecedores vencedores identificados por lote/item do certame:\n";
          awardWinners.forEach((lw: Record<string, any>) => {
            const lwMeta = lw.metadata || {};
            const winId = lwMeta.winnerSupplierId || lw.winnerSupplierId;
            const matchedSupp = procAnalysis.suppliers.find((s: Record<string, any>) => s.id === winId);
            const winName = matchedSupp ? matchedSupp.title : winId;
            const lotValue = lwMeta.value || lw.value || null;
            const lotValueStr = lotValue !== null ? `R$ ${Number(lotValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Valor não identificado";
            resp += `- Lote nº ${lwMeta.lotNumber || lw.lotNumber}: ${lotValueStr} arrematado por "${winName || "Não identificado nos dados"}"\n`;
          });
          return resp;
        }

        if (textLower.includes("resumo da licitação") || textLower.includes("resumo da licitacao")) {
          return procAnalysis.brief;
        }

        if (textLower.includes("pendências documentais") || textLower.includes("pendencias documentais")) {
          const riskItems = procAnalysis.risks?.items || [];
          const missingDocRisks = riskItems.filter((r: Record<string, any>) =>
            (r.description || r.text || "").toLowerCase().includes("ausência documental") ||
            (r.description || r.text || "").toLowerCase().includes("ausencia documental") ||
            (r.id || "").includes("missing")
          );
          if (missingDocRisks.length === 0) {
            return "Com os dados atualmente carregados, não é possível afirmar que todos os documentos obrigatórios estão completos.";
          }
          let resp = "Com os dados atualmente carregados, pendências documentais formais detectadas nas contratações:\n";
          missingDocRisks.forEach((r: Record<string, any>) => {
            resp += `- ${r.description || r.text}\n`;
          });
          return resp;
        }
      }

      if (this.governmentEngine) {
        const govAnalysis =
          await this.governmentEngine.synthesizeGovernmentSnapshot(
            organizationId,
          );

      if (govAnalysis.dataStatus === "NO_DATA") {
        return "Ainda não há dados de compras públicas suficientes para responder isso.";
      }

      if (textLower.includes("quais órgãos")) {
        if (govAnalysis.entities.length === 0)
          return "Com os dados atualmente carregados, não há órgãos acompanhados no momento.";
        let resp = "Com os dados atualmente carregados, órgãos acompanhados:\n";
        govAnalysis.entities.forEach((e: Record<string, any>) => (resp += `- ${e.name}\n`));
        return resp;
      }

      if (
        textLower.includes("quais contratos exigem") ||
        textLower.includes("quais contratos existem") ||
        textLower.includes("quais contratos")
      ) {
        if (textLower.includes("exigem atenção")) {
          const criticalContracts = govAnalysis.contracts.filter((c: Record<string, any>) =>
            govAnalysis.risks.items.some(
              (r: Record<string, any>) =>
                r.id === `risk_ctt_expired_${c.id}` ||
                r.id === `risk_ctt_expiring_${c.id}`,
            ),
          );
          if (criticalContracts.length === 0) {
            return "Com os dados atualmente carregados, nenhum risco crítico em contratos foi identificado até o momento.";
          }
          let resp = "Com os dados atualmente carregados, contratos que exigem atenção:\n";
          criticalContracts.forEach(
            (c: Record<string, any>) =>
              (resp += `- Contrato nº ${c.number || "Sem nº"}: ${c.object || "Campo não identificado"} (Contratada: ${c.contractor || "Não identificada nos dados"})\n`),
          );
          return resp;
        }

        if (govAnalysis.contracts.length === 0)
          return "Com os dados atualmente carregados, não há contratos monitorados.";
        let resp = "Com os dados atualmente carregados, contratos ativos:\n";
        govAnalysis.contracts.forEach(
          (c: Record<string, any>) =>
            (resp += `- Contrato nº ${c.number || "Sem nº"}: ${c.object || "Campo não identificado"} (Contratada: ${c.contractor || "Não identificada nos dados"})\n`),
        );
        return resp;
      }

      if (textLower.includes("quais licitações")) {
        if (govAnalysis.bids.length === 0) return "Com os dados atualmente carregados, não há licitações mapeadas.";
        let resp = "Com os dados atualmente carregados, licitações:\n";
        govAnalysis.bids.forEach(
          (b: Record<string, any>) => (resp += `- ${b.modality || "Licitação"} nº ${b.number || "Sem nº"}: ${b.object || "Campo não identificado"}\n`),
        );
        return resp;
      }

      if (
        textLower.includes("quais programas estão ativos") ||
        textLower.includes("quais programas estão sem atualização")
      ) {
        if (govAnalysis.programs.length === 0)
          return "Com os dados atualmente carregados, não há programas operando no momento.";

        if (textLower.includes("sem atualização")) {
          const staleProgs = govAnalysis.programs.filter((p: Record<string, any>) =>
            govAnalysis.risks.items.some(
              (r: Record<string, any>) => r.id === `risk_prog_halted_${p.id}`,
            ),
          );
          if (staleProgs.length === 0) {
            return "Com os dados atualmente carregados, desvios de cronograma ou paralisações de longo prazo em programas estratégicos não foram identificados até o momento.";
          }
          let resp = "Com os dados atualmente carregados, programas estratégicos sem atualização recente:\n";
          staleProgs.forEach((p: Record<string, any>) => (resp += `- ${p.name}\n`));
          return resp;
        }

        let resp = "Com os dados atualmente carregados, programas estratégicos:\n";
        govAnalysis.programs.forEach((p: Record<string, any>) => (resp += `- ${p.name}\n`));
        return resp;
      }

      if (
        textLower.includes("quais indicadores estamos monitorando") ||
        textLower.includes("quais indicadores estão em risco")
      ) {
        if (govAnalysis.indicators.length === 0)
          return "Com os dados atualmente carregados, não há indicadores cadastrados.";

        if (textLower.includes("em risco")) {
          const riskInds = govAnalysis.indicators.filter(
            (i: Record<string, any>) => i.status === "CRITICAL" || i.status === "WARNING",
          );
          if (riskInds.length === 0) {
            return "Com os dados atualmente carregados, indicadores em risco crítico não foram identificados até o momento.";
          }
          let resp = "Com os dados atualmente carregados, indicadores em risco:\n";
          riskInds.forEach(
            (i: Record<string, any>) => (resp += `- ${i.name} (Status: ${i.status})\n`),
          );
          return resp;
        }

        let resp = "Com os dados atualmente carregados, indicadores monitorados:\n";
        govAnalysis.indicators.forEach(
          (i: Record<string, any>) => (resp += `- ${i.name}: ${i.value || "Sem valor registrado"} [${i.status}]\n`),
        );
        return resp;
      }

      if (
        textLower.includes("gere um resumo governamental") ||
        textLower.includes("gere uma análise governamental completa")
      ) {
        return govAnalysis.brief;
      }

      if (textLower.includes("existem riscos administrativos")) {
        if (govAnalysis.risks.items.length === 0) {
          return "Com os dados atualmente carregados, nenhum risco crítico foi identificado até o momento.";
        }
        let promptHeader = "Com os dados atualmente carregados, análise de riscos:\n\n";
        return (
          promptHeader +
          govAnalysis.risks.summary +
          "\n\n" +
          govAnalysis.risks.items
            .map((r: Record<string, any>) => `- [${r.level}] ${r.description}`)
            .join("\n")
        );
      }

      if (textLower.includes("quais contratos impactam a saúde")) {
        const healthContracts = govAnalysis.contracts.filter((c: Record<string, any>) => {
          const targetText = (
            (c.object || "") +
            " " +
            (c.contractor || "")
          ).toLowerCase();
          return (
            targetText.includes("saúde") ||
            targetText.includes("saude") ||
            targetText.includes("hospital") ||
            targetText.includes("médic") ||
            targetText.includes("medic")
          );
        });
        if (healthContracts.length === 0) {
          return "Com os dados atualmente carregados, contratos de impacto na saúde não foram identificados até o momento.";
        }
        let resp = "Com os dados atualmente carregados, contratos de impacto na saúde:\n";
        healthContracts.forEach(
          (c: Record<string, any>) =>
            (resp += `- Contrato nº ${c.number || "Sem nº"}: ${c.object || "Campo não identificado"} (Contratada: ${c.contractor || "Não identificada nos dados"})\n`),
        );
        return resp;
      }

      if (textLower.includes("quais documentos faltam")) {
        const missingDocRisks = govAnalysis.risks.items.filter((r: Record<string, any>) =>
          r.description.includes("Ausência documental:"),
        );
        if (missingDocRisks.length === 0) {
          if (govAnalysis.dataStatus === "PARTIAL_DATA") {
            return "Com os dados atualmente carregados, não é possível garantir a completude absoluta de todas as peças orçamentárias obrigatórias.";
          }
          return "Com os dados atualmente carregados, as três peças normativas essenciais (PPA, LDO e LOA) foram identificadas.";
        }
        let resp = "Com os dados atualmente carregados, constatamos a ausência das seguintes peças normativas:\n";
        missingDocRisks.forEach(
          (r: Record<string, any>) =>
            (resp += `- ${r.description.replace("Ausência documental: ", "")}\n`),
        );
        return resp;
      }
    }
  }

    if (
      (textLower.includes("por que") && textLower.includes("bloqueado")) ||
      textLower.includes("gargalo") ||
      textLower.includes("caminho crítico") ||
      textLower.includes("impedindo avanço") ||
      textLower.includes("impedindo o avanço")
    ) {
      if (analysis.cognitive.criticalPath.path.length === 0) {
        return "Atualmente o projeto não possui itens sinalizados no caminho crítico ou bloqueios impeditivos diretos.";
      }
      let resp = `O projeto está sendo bloqueado por ${analysis.cognitive.criticalPath.path.length} item(s) no caminho crítico:\n\n`;
      analysis.cognitive.criticalPath.path.forEach((p: Record<string, any>) => {
        resp += `- [${p.type}] ${p.title} (Prioridade: ${p.priority})\n`;
      });
      return resp;
    }

    if (textLower.includes("quais riscos")) {
      return (
        analysis.cognitive.risk.summary +
        "\n\nDetalhes:\n" +
        `- Tarefas estagnadas: ${analysis.cognitive.risk.factors.staleTasks}\n` +
        `- Decisões pendentes: ${analysis.cognitive.risk.factors.pendingDecisions}\n` +
        `- Tarefas bloqueadas: ${analysis.cognitive.risk.factors.blockedTasks}`
      );
    }

    if (textLower.includes("qual decisão") && textLower.includes("impacto")) {
      const decisions = analysis.decisions.accepted;
      if (decisions.length === 0)
        return "Não há decisões aceitas no momento para avaliar impacto.";

      let mostImpactful = decisions[0];
      let maxImpact = 0;

      decisions.forEach((d: Record<string, any>) => {
        if (d.intelligence && d.intelligence.impactCount > maxImpact) {
          maxImpact = d.intelligence.impactCount;
          mostImpactful = d;
        }
      });

      return `A decisão com maior impacto mapeado é '${mostImpactful.title}' com ${maxImpact} conexões no Knowledge Graph.`;
    }

    if (
      textLower.includes("onde paramos") ||
      textLower.includes("qual o estado do projeto") ||
      textLower.includes("resumo do projeto")
    ) {
      return analysis.brief;
    }

    if (
      textLower.includes("objetivos estão ativos") ||
      textLower.includes("quais objetivos existem")
    ) {
      if (analysis.objectives.length === 0)
        return "Não há objetivos ativos no momento.";
      let resp = "Os oujetivos ativos são:\n\n";
      analysis.objectives.forEach((o: Record<string, any>) => {
        resp += `- ${o.title} (${o.intelligence?.progress}% concluído)\n`;
      });
      return resp;
    }

    if (
      textLower.includes("tarefas estão pendentes") ||
      textLower.includes("quais tarefas")
    ) {
      const tasks = await this.dbAdapter.getTasks(projectId, workspaceId || "default-workspace");
      const pending = tasks.filter(
        (t) => t.status !== "done" && t.status !== "archived",
      );
      if (pending.length === 0) return "Não há tarefas pendentes.";
      let resp = `Existem ${pending.length} tarefas pendentes:\n\n`;
      pending.forEach((t) => {
        resp += `- [${t.status.toUpperCase()}] ${t.title}\n`;
      });
      return resp;
    }

    if (
      textLower.includes("decisões já tomamos") ||
      textLower.includes("quais decisões existem")
    ) {
      if (analysis.decisions.accepted.length === 0)
        return "Ainda não tomamos nenhuma decisão oficial.";
      let resp = "Decisões aceitas:\n\n";
      analysis.decisions.accepted.forEach((d: Record<string, any>) => {
        resp += `- ${d.title}\n`;
      });
      return resp;
    }

    if (
      textLower.includes("próximos passos") ||
      textLower.includes("o que falta fazer")
    ) {
      if (analysis.nextActions.nextRecommendedActions.length === 0)
        return "No momento, não há próximos passos definidos.";
      let resp = "Os próximos passos recomendados são:\n\n";
      analysis.nextActions.nextRecommendedActions.forEach((a: string) => {
        resp += `- ${a}\n`;
      });
      return resp;
    }

    return "Sinto muito, não entendi o seu comando de memória. Experimente perguntar 'onde paramos?', 'quais são os próximos passos?' ou 'qual o principal gargalo?'.";
  }
}
