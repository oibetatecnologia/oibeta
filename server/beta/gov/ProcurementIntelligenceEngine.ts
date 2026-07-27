import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { ProcurementDomainEngine } from "./ProcurementDomainEngine";
import { ProcurementMemoryEngine } from "./ProcurementMemoryEngine";
import { ProcurementContextEngine } from "./ProcurementContextEngine";
import { ProcurementDocumentClassifier } from "./ProcurementDocumentClassifier";
import { SupplierExtractionEngine } from "./SupplierExtractionEngine";
import { ProcurementItemEngine } from "./ProcurementItemEngine";
import { LotIntelligenceEngine } from "./LotIntelligenceEngine";
import { ProposalIntelligenceEngine } from "./ProposalIntelligenceEngine";
import { ProcurementRiskEngine } from "./ProcurementRiskEngine";
import { ProcurementHealthEngine } from "./ProcurementHealthEngine";
import { ProcurementTimelineEngine } from "./ProcurementTimelineEngine";
import { ProcurementNarrativeEngine } from "./ProcurementNarrativeEngine";
import { ProcurementBriefGenerator } from "./ProcurementBriefGenerator";
import { SupplierConsolidationEngine } from "./SupplierConsolidationEngine";
import { ProcurementCorrelationEngine } from "./ProcurementCorrelationEngine";
import { ProcurementContractLinker } from "./ProcurementContractLinker";
import { SupplierIntelligenceEngine } from "./SupplierIntelligenceEngine";
import { ProcurementMarketEngine } from "./ProcurementMarketEngine";

export class ProcurementIntelligenceEngine {
  private domainEngine: ProcurementDomainEngine;
  private memoryEngine: ProcurementMemoryEngine;
  private contextEngine: ProcurementContextEngine;
  private docClassifier: ProcurementDocumentClassifier;
  private supplierEngine: SupplierExtractionEngine;
  private itemEngine: ProcurementItemEngine;
  private lotEngine: LotIntelligenceEngine;
  private proposalEngine: ProposalIntelligenceEngine;
  private riskEngine: ProcurementRiskEngine;
  private healthEngine: ProcurementHealthEngine;
  private timelineEngine: ProcurementTimelineEngine;
  private narrativeEngine: ProcurementNarrativeEngine;
  private briefGenerator: ProcurementBriefGenerator;
  private supplierConsolidator: SupplierConsolidationEngine;
  private procurementCorrelator: ProcurementCorrelationEngine;
  private contractLinker: ProcurementContractLinker;
  private supplierIntelligenceEngine: SupplierIntelligenceEngine;
  private marketEngine: ProcurementMarketEngine;

  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {
    this.domainEngine = new ProcurementDomainEngine(dbAdapter, kgEngine);
    this.memoryEngine = new ProcurementMemoryEngine(dbAdapter, kgEngine, this.domainEngine);
    this.contextEngine = new ProcurementContextEngine(dbAdapter, kgEngine);
    this.docClassifier = new ProcurementDocumentClassifier();
    this.supplierEngine = new SupplierExtractionEngine(dbAdapter, kgEngine);
    this.itemEngine = new ProcurementItemEngine(dbAdapter, kgEngine);
    this.lotEngine = new LotIntelligenceEngine(dbAdapter, kgEngine);
    this.proposalEngine = new ProposalIntelligenceEngine(dbAdapter, kgEngine);
    this.riskEngine = new ProcurementRiskEngine(dbAdapter, kgEngine);
    this.healthEngine = new ProcurementHealthEngine(dbAdapter, kgEngine);
    this.timelineEngine = new ProcurementTimelineEngine(dbAdapter);
    this.narrativeEngine = new ProcurementNarrativeEngine();
    this.briefGenerator = new ProcurementBriefGenerator();
    this.supplierConsolidator = new SupplierConsolidationEngine(dbAdapter, kgEngine);
    this.procurementCorrelator = new ProcurementCorrelationEngine(dbAdapter, kgEngine);
    this.contractLinker = new ProcurementContractLinker(dbAdapter, kgEngine);
    this.supplierIntelligenceEngine = new SupplierIntelligenceEngine(dbAdapter);
    this.marketEngine = new ProcurementMarketEngine(dbAdapter);
  }

  public async processDocument(
    document: any,
    content: string,
    projectId: string,
    organizationId: string,
  ): Promise<any> {
    const classificationResult = this.docClassifier.classifyDocument(
      document.filename,
      content,
    );
    const docClass = classificationResult.documentType;

    await this.dbAdapter.createDocumentAuditLog({
      organizationId,
      documentId: document.id,
      action: "PROCUREMENT_CLASSIFICATION",
      details: { classification: docClass, confidence: classificationResult.confidence },
    });

    // Create knowledge node for DOCUMENT
    const docNode = await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "DOCUMENT",
      document.filename || "Documento Licitatório",
      content ? content.substring(0, 100) + "..." : "Sem conteúdo legível.",
      document.id,
      { type: docClass }
    );

    // Parse modality or bid numbers from name or content
    let bidNum = null;
    const bidNumMatch = /(?:pregão|licitação|processo|nº)\s*([\d\/.-]+)/i.exec(document.filename + " " + content);
    if (bidNumMatch) bidNum = bidNumMatch[1];

    let modality = null;
    if (content.toLowerCase().includes("tomada de preços")) modality = "Tomada de Preços";
    else if (content.toLowerCase().includes("concorrência")) modality = "Concorrência Pública";
    else if (content.toLowerCase().includes("pregão")) modality = "Pregão";

    // Standard high-contrast entity structure
    const bidId = `bid_${Math.random().toString(36).substring(7)}`;
    const noticeId = `not_${Math.random().toString(36).substring(7)}`;

    // Create Bid Node (Licitação)
    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "BID",
      `Licitação${modality ? ` ${modality}` : ""}${bidNum ? ` nº ${bidNum}` : ""}`,
      `Licitação pública identificada a partir do documento ${document.filename}.`,
      bidId,
      {
        number: bidNum,
        modality,
        object: null,
        responsibleAgency: null,
        openingDate: null,
        estimatedValue: null,
        judgmentCriteria: null,
        processNumber: null,
      }
    );

    // Create Notice Node (Edital)
    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "NOTICE",
      `Edital${bidNum ? ` nº ${bidNum}` : ""}`,
      `Edital regulador publicado para o certame ${bidNum || ""}.`,
      noticeId,
      {
        bidId,
        publishDate: null,
      }
    );

    // Establish relationships
    await this.kgEngine.createRelationship(organizationId, noticeId, bidId, "PUBLISHED_BY");
    await this.kgEngine.createRelationship(organizationId, bidId, document.id, "GENERATED_FROM");

    // Dynamic pattern-based parsing
    if (content) {
      await this.supplierEngine.extractFromDocument(document, content, projectId, organizationId);
      await this.itemEngine.extractFromDocument(document, content, projectId, organizationId);
      await this.lotEngine.extractFromDocument(document, content, projectId, organizationId);
      await this.proposalEngine.extractFromDocument(document, content, projectId, organizationId);

      // Extract specific sub-entities if matched
      if (docClass === "HOMOLOGAÇÃO") {
        const homNodeId = `hom_${Math.random().toString(36).substring(7)}`;
        await this.kgEngine.ensureNode(
          organizationId,
          projectId,
          "HOMOLOGATION",
          `Termo de Homologação${bidNum ? ` nº ${bidNum}` : ""}`,
          `Homologação formal do certame público.`,
          homNodeId,
          {
            bidId,
            date: null,
            authority: null,
          }
        );
        await this.kgEngine.createRelationship(organizationId, homNodeId, bidId, "HOMOLOGATED_BY");
      }

      if (docClass === "ATA DE REGISTRO DE PREÇOS") {
        const arpNodeId = `arp_${Math.random().toString(36).substring(7)}`;
        await this.kgEngine.ensureNode(
          organizationId,
          projectId,
          "PRICE_REGISTRY",
          `Ata de Registro de Preços${bidNum ? ` nº ${bidNum}` : ""}`,
          `Registro formal de preços para contratação futura.`,
          arpNodeId,
          {
            bidId,
            number: bidNum,
            validity: null,
          }
        );
        await this.kgEngine.createRelationship(organizationId, arpNodeId, bidId, "RESULTED_IN");
      }
    }

    return { docClass };
  }

  public async synthesizeProcurementSnapshot(
    organizationId: string,
    workspaceId?: string,
  ): Promise<any> {
    // Run consolidation, process correlation, and contract linking BEFORE compiling lists 
    try {
      await this.supplierConsolidator.consolidateSuppliers(organizationId, workspaceId);
      await this.procurementCorrelator.correlateProcess(organizationId, undefined, workspaceId);
      await this.contractLinker.linkContracts(organizationId, undefined, workspaceId);
    } catch (e) {
      console.warn("Operational intelligence pipeline pre-processing warning:", e);
    }

    const bids = await this.domainEngine.getBids(organizationId);
    const notices = await this.domainEngine.getNotices(organizationId);
    const suppliers = await this.domainEngine.getSuppliers(organizationId);
    const lots = await this.domainEngine.getLots(organizationId);
    const items = await this.domainEngine.getItems(organizationId);
    const proposals = await this.domainEngine.getProposals(organizationId);
    const homologations = await this.domainEngine.getHomologations(organizationId);
    const priceRegistries = await this.domainEngine.getPriceRegistries(organizationId);

    let documents: any[] = [];
    try {
      documents = await this.dbAdapter.getDocuments(undefined, workspaceId || "default-workspace");
    } catch (e) {
      console.warn("Could not query documents for procurement synthesis:", e);
    }

    // Determine Exact Data Status based on actual files & parsed data
    let dataStatus: "NO_DATA" | "PARTIAL_DATA" | "READY" = "NO_DATA";
    if (bids.length > 0 || suppliers.length > 0 || documents.length > 0) {
      if (bids.length > 0 && suppliers.length > 0 && documents.length > 0 && proposals.length > 0) {
        dataStatus = "READY";
      } else {
        dataStatus = "PARTIAL_DATA";
      }
    }

    // Build sub-modules
    const risks = await this.riskEngine.evaluateRisks(
      organizationId,
      bids,
      notices,
      suppliers,
      lots,
      proposals,
      homologations,
      priceRegistries,
      documents
    );

    const health = await this.healthEngine.calculateHealth(
      organizationId,
      bids,
      notices,
      suppliers,
      lots,
      priceRegistries,
      documents,
      risks,
      dataStatus
    );

    const narrative = this.narrativeEngine.generateNarrative(
      bids,
      notices,
      suppliers,
      lots,
      proposals,
      homologations,
      risks,
      dataStatus
    );

    const brief = this.briefGenerator.generateBrief(
      bids,
      notices,
      suppliers,
      lots,
      proposals,
      homologations,
      risks,
      health,
      narrative,
      dataStatus
    );

    const memoryStatus = await this.memoryEngine.synthesizeProcurementMemory(
      organizationId,
      bids,
      notices,
      suppliers,
      lots,
      proposals
    );

    const contextStatus = await this.contextEngine.rebuildContext(
      organizationId,
      bids,
      suppliers,
      proposals,
      lots
    );

    const timeline = await this.timelineEngine.generateTimeline(organizationId);

    const supplierStats = await this.supplierIntelligenceEngine.calculateSupplierStats(organizationId);
    const marketAnalysis = await this.marketEngine.analyzeMarket(organizationId);

    // Entity lists formatted for snapshot representation
    const snapData = {
      organizationId,
      bids,
      suppliers,
      proposals,
      risks: risks.items,
      healthScore: health.score,
      recommendations: [
        {
          text: "Garantir a publicação tempestiva de termos de homologação e adjudicação de lotes.",
          dataStatus,
          generatedFromRealData: dataStatus !== "NO_DATA",
        },
        {
          text: "Verificar integridade documental e evitar concentração excessiva de lotes por fornecedores repetidos.",
          dataStatus,
          generatedFromRealData: dataStatus !== "NO_DATA",
        }
      ],
    };

    const snapshot = await this.dbAdapter.createProcurementSnapshot(snapData);

    let snapshotMessage = "";
    if (dataStatus === "NO_DATA") {
      snapshotMessage = "Ainda não há dados de compras públicas carregados.";
    } else if (dataStatus === "PARTIAL_DATA") {
      snapshotMessage = "Análise parcial baseada nos dados atualmente disponíveis.";
    } else {
      snapshotMessage = "Análise gerada com base nos dados de compras públicas disponíveis.";
    }

    return {
      snapshotId: snapshot.id,
      health,
      risks,
      bids,
      notices,
      suppliers,
      lots,
      items,
      proposals,
      homologations,
      priceRegistries,
      narrative,
      brief,
      memoryStatus,
      contextStatus,
      timeline,
      supplierStats,
      marketAnalysis,
      dataStatus,
      message: snapshotMessage,
      generatedFromRealData: dataStatus !== "NO_DATA",
    };
  }
}
