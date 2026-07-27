import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { GovernmentDomainEngine } from "./GovernmentDomainEngine";
import { GovernmentMemoryEngine } from "./GovernmentMemoryEngine";
import { GovernmentContextEngine } from "./GovernmentContextEngine";
import { GovernmentDocumentClassifier } from "./GovernmentDocumentClassifier";
import { GovernmentIndicatorEngine } from "./GovernmentIndicatorEngine";
import { GovernmentRiskEngine } from "./GovernmentRiskEngine";
import { GovernmentHealthEngine } from "./GovernmentHealthEngine";
import { GovernmentBriefGenerator } from "./GovernmentBriefGenerator";
import { GovernmentEntityExtractor } from "./GovernmentEntityExtractor";
import { ContractIntelligenceEngine } from "./ContractIntelligenceEngine";
import { BidIntelligenceEngine } from "./BidIntelligenceEngine";
import { GovernmentProgramEngine } from "./GovernmentProgramEngine";
import { GovernmentTimelineEngine } from "./GovernmentTimelineEngine";
import { GovernmentNarrativeEngine } from "./GovernmentNarrativeEngine";
import { GovernmentKnowledgeQueryService } from "./GovernmentKnowledgeQueryService";

export class GovernmentIntelligenceEngine {
  private domainEngine: GovernmentDomainEngine;
  private memoryEngine: GovernmentMemoryEngine;
  private contextEngine: GovernmentContextEngine;
  private docClassifier: GovernmentDocumentClassifier;
  private indicatorEngine: GovernmentIndicatorEngine;
  private riskEngine: GovernmentRiskEngine;
  private healthEngine: GovernmentHealthEngine;
  private briefGenerator: GovernmentBriefGenerator;
  private entityExtractor: GovernmentEntityExtractor;
  private contractEngine: ContractIntelligenceEngine;
  private bidEngine: BidIntelligenceEngine;
  private programEngine: GovernmentProgramEngine;
  private timelineEngine: GovernmentTimelineEngine;
  private narrativeEngine: GovernmentNarrativeEngine;
  private queryService: GovernmentKnowledgeQueryService;

  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {
    this.domainEngine = new GovernmentDomainEngine(dbAdapter, kgEngine);
    this.memoryEngine = new GovernmentMemoryEngine(
      dbAdapter,
      kgEngine,
      this.domainEngine,
    );
    this.contextEngine = new GovernmentContextEngine(dbAdapter, kgEngine);
    this.docClassifier = new GovernmentDocumentClassifier();
    this.indicatorEngine = new GovernmentIndicatorEngine(dbAdapter, kgEngine);
    this.riskEngine = new GovernmentRiskEngine(dbAdapter);
    this.healthEngine = new GovernmentHealthEngine(dbAdapter, kgEngine, null as any);
    this.briefGenerator = new GovernmentBriefGenerator();
    this.entityExtractor = new GovernmentEntityExtractor(dbAdapter, kgEngine);
    this.contractEngine = new ContractIntelligenceEngine(dbAdapter, kgEngine);
    this.bidEngine = new BidIntelligenceEngine(dbAdapter, kgEngine);
    this.programEngine = new GovernmentProgramEngine(dbAdapter, kgEngine);
    this.timelineEngine = new GovernmentTimelineEngine(dbAdapter);
    this.narrativeEngine = new GovernmentNarrativeEngine();
    this.queryService = new GovernmentKnowledgeQueryService(dbAdapter);
  }

  public async processDocument(
    document: any,
    content: string,
    projectId: string,
    organizationId: string,
  ): Promise<any> {
    const docClass = this.docClassifier.classifyDocument(
      document.filename,
      content,
    );

    await this.dbAdapter.createDocumentAuditLog({
      organizationId,
      documentId: document.id,
      action: "GOV_CLASSIFICATION",
      details: { classification: docClass },
    });

    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "KNOWLEDGE",
      docClass,
      "Classificação Documental",
      docClass,
      {},
    );
    await this.kgEngine.createRelationship(
      organizationId,
      document.id,
      docClass,
      "RELATED_TO",
    );

    if (content) {
      // Extract Entities
      await this.entityExtractor.extractFromDocument(
        document,
        content,
        projectId,
        organizationId,
      );

      // Process Contracts
      if (docClass === "CONTRATO") {
        await this.contractEngine.processContract(
          document,
          content,
          projectId,
          organizationId,
        );
      }

      // Process Bids
      if (docClass === "EDITAL") {
        await this.bidEngine.processBid(
          document,
          content,
          projectId,
          organizationId,
        );
      }

      // Process Programs from governing policies
      if (
        docClass === "PLANO_GOVERNO" ||
        docClass === "PPA" ||
        docClass === "LOA"
      ) {
        const txt = content || "";
        const progRegex = /(?:programa|projeto)\s+([A-ZÀ-Ÿ][a-zà-ÿ0-9]{2,}\s+(?:de\s+|da\s+|do\s+|para\s+|parcerias\s+|e\s+)?[A-ZÀ-Ÿ][\w\s-]{1,35})/g;
        const matches = Array.from(txt.matchAll(progRegex))
          .map(m => m[1].replace(/\r?\n/g, " ").trim())
          .filter(name => {
             const lower = name.toLowerCase();
             return (
               lower.length > 4 &&
               !lower.includes("plurianual") &&
               !lower.includes("orçamento") &&
               !lower.includes("lei de") &&
               !lower.includes("plano") &&
               !lower.includes("diretriz") &&
               !lower.includes("governo")
             );
          });

        if (matches.length > 0) {
          const uniqueProgs = Array.from(new Set(matches)).slice(0, 3);
          for (const progName of uniqueProgs) {
            const progId = `prog_${Math.random().toString(36).substring(7)}`;
            await this.kgEngine.ensureNode(
              organizationId,
              projectId,
              "PROGRAM",
              progName,
              `Programa estratégico extraído a partir do documento ${document.filename}.`,
              progId,
              { sourceDoc: document.id },
            );
            await this.kgEngine.createRelationship(
              organizationId,
              progId,
              document.id,
              "GENERATED_FROM",
            );
          }
        }
      }
    }

    return { docClass };
  }

  public async synthesizeGovernmentSnapshot(
    organizationId: string,
    workspaceId?: string,
  ): Promise<any> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    // 1. Fetch real elements from Knowledge Graph
    const entities = await this.queryService.getEntities(organizationId, actualWorkspaceId);
    const contracts = await this.queryService.getContracts(organizationId, actualWorkspaceId);
    const bids = await this.queryService.getBids(organizationId, actualWorkspaceId);
    const programs = await this.queryService.getPrograms(organizationId, actualWorkspaceId);
    const indicators = await this.queryService.getIndicators(organizationId, actualWorkspaceId);

    // Fetch documents
    let documents: any[] = [];
    try {
      documents = await this.dbAdapter.getDocuments(undefined, actualWorkspaceId);
    } catch (e) {
      console.warn("Could not query documents directory:", e);
    }

    // 2. Determine exact Data Status
    let dataStatus: "NO_DATA" | "PARTIAL_DATA" | "READY" = "NO_DATA";
    if (entities.length > 0 || contracts.length > 0 || bids.length > 0 || programs.length > 0 || indicators.length > 0 || documents.length > 0) {
      if (contracts.length > 0 && programs.length > 0 && indicators.length > 0) {
        dataStatus = "READY";
      } else {
        dataStatus = "PARTIAL_DATA";
      }
    }

    // 3. Process dynamic models
    const risks = await this.riskEngine.evaluateRisks(
      contracts,
      indicators,
      programs,
      documents,
      organizationId,
    );

    const health = this.healthEngine.calculateHealth(
      risks,
      indicators,
      contracts,
      programs,
      documents,
      dataStatus,
    );

    const narrative = this.narrativeEngine.generateNarrative(
      entities,
      contracts,
      programs,
      indicators,
      risks,
      dataStatus,
    );

    const brief = this.briefGenerator.generateBrief(
      entities,
      contracts,
      programs,
      indicators,
      risks,
      health,
      narrative,
      dataStatus,
    );

    const memoryStatus = await this.memoryEngine.synthesizeGovernmentMemory(
      organizationId,
      entities,
      contracts,
      programs,
      indicators,
      risks,
    );

    const contextStatus = await this.contextEngine.rebuildContext(
      organizationId,
      entities,
      contracts,
      programs,
    );

    const timeline = await this.timelineEngine.generateTimeline(organizationId);

    // Metadata tracking for DB compatibility
    const sourceCounts = {
      documents: documents.length,
      contracts: contracts.length,
      bids: bids.length,
      programs: programs.length,
      indicators: indicators.length
    };

    const snapData = {
      organizationId,
      entities,
      contracts,
      bids,
      indicators,
      risks: risks.items,
      recommendations: [
        {
          text: "Auditar indicadores e alinhamento de políticas estatais.",
          dataStatus,
          sourceCounts,
          generatedFromRealData: dataStatus !== "NO_DATA"
        }
      ],
    };

    const snapshot = await this.dbAdapter.createGovernmentSnapshot(snapData);

    let snapshotMessage = "";
    if (dataStatus === "NO_DATA") {
      snapshotMessage = "Ainda não há dados governamentais carregados.";
    } else if (dataStatus === "PARTIAL_DATA") {
      snapshotMessage = "Análise parcial baseada nos dados atualmente disponíveis.";
    } else {
      snapshotMessage = "Análise gerada com base nos dados governamentais disponíveis.";
    }

    return {
      snapshotId: snapshot.id,
      health,
      risks,
      entities,
      contracts,
      bids,
      programs,
      indicators,
      narrative,
      brief,
      memoryStatus,
      contextStatus,
      timeline,
      dataStatus,
      message: snapshotMessage,
      sourceCounts,
      generatedFromRealData: dataStatus !== "NO_DATA"
    };
  }
}
