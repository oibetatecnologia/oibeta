import crypto from "crypto";
import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { ProcurementWorkspaceEngine } from "./ProcurementWorkspaceEngine";
import { ProcurementBidManagementEngine } from "./ProcurementBidManagementEngine";

import { SupplierExtractionEngine } from "../gov/SupplierExtractionEngine";
import { ProcurementContractLinker } from "../gov/ProcurementContractLinker";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";

import {
  ProcurementSupplier,
  ProcurementSupplierDocument,
  ProcurementSupplierCertificate,
  ProcurementSupplierQualification,
  ProcurementSupplierRegistry,
  ProcurementSupplierSummary,
  ProcurementSupplierHealth
} from "../core/types";

export class ProcurementSupplierManagementEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private workspaceEngine?: ProcurementWorkspaceEngine,
    private bidManagementEngine?: ProcurementBidManagementEngine,
    private supplierExtractionEngine?: SupplierExtractionEngine,
    private contractLinker?: ProcurementContractLinker,
    private memoryOS?: MemoryOS,
    private orchestrator?: WorkspaceIntelligenceOrchestrator,
    private occEngine?: OperationalCommandCenterEngine
  ) {}

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId) {
      throw new Error("Multi-Tenant Error: organizationId is required.");
    }
    if (!wsId) {
      throw new Error("Multi-Tenant Error: workspaceId is required.");
    }
  }

  public async createSupplier(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    name: string;
    documentNumber?: string | null;
    status: string;
    metadata?: any;
  }): Promise<ProcurementSupplier> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const supplier = await this.dbAdapter.createSupplier({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      name: data.name,
      documentNumber: data.documentNumber || null,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementWorkspace → HAS_SUPPLIER → ProcurementSupplier
    const wsNodeId = `pws-${data.workspaceId}`;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementWorkspace",
      `Beta Licita Workspace (${data.workspaceId})`,
      "Workspace operacional do módulo Beta Licita de compras públicas.",
      wsNodeId,
      {}
    );

    const supNodeId = supplier.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementSupplier",
      supplier.name || `Fornecedor ${supplier.id}`,
      `Fornecedor registrado com documento ${supplier.documentNumber || "N/A"}.`,
      supNodeId,
      supplier
    );

    await this.kgEngine.createRelationship(data.organizationId, wsNodeId, supNodeId, "HAS_SUPPLIER");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementSupplierCreated",
        `Novo fornecedor homologado no workspace: ${supplier.name}`,
        { supplierId: supplier.id, status: supplier.status }
      ).catch(() => {});
    }

    return supplier;
  }

  public async createSupplierDocument(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    supplierId: string;
    documentType: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementSupplierDocument> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const doc = await this.dbAdapter.createSupplierDocument({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      supplierId: data.supplierId,
      documentType: data.documentType,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementSupplier → HAS_DOCUMENT → ProcurementSupplierDocument
    const docNodeId = doc.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementSupplierDocument",
      `Documento ${doc.documentType}`,
      `Tipo: ${doc.documentType}, Status: ${doc.status}`,
      docNodeId,
      doc
    );

    await this.kgEngine.createRelationship(data.organizationId, doc.supplierId, docNodeId, "HAS_DOCUMENT");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementSupplierDocumentCreated",
        `Documento de regularidade registrado para o fornecedor ID ${doc.supplierId}.`,
        { documentId: doc.id, supplierId: doc.supplierId, documentType: doc.documentType }
      ).catch(() => {});
    }

    return doc;
  }

  public async createSupplierCertificate(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    supplierId: string;
    certificateType: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementSupplierCertificate> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const cert = await this.dbAdapter.createSupplierCertificate({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      supplierId: data.supplierId,
      certificateType: data.certificateType,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementSupplier → HAS_CERTIFICATE → ProcurementSupplierCertificate
    const certNodeId = cert.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementSupplierCertificate",
      `Certidão ${cert.certificateType}`,
      `Tipo: ${cert.certificateType}, Status: ${cert.status}`,
      certNodeId,
      cert
    );

    await this.kgEngine.createRelationship(data.organizationId, cert.supplierId, certNodeId, "HAS_CERTIFICATE");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementSupplierCertificateCreated",
        `Certidão de regularidade fiscal/trabalhista inserida para o fornecedor ID ${cert.supplierId}.`,
        { certificateId: cert.id, supplierId: cert.supplierId, certificateType: cert.certificateType }
      ).catch(() => {});
    }

    return cert;
  }

  public async createSupplierQualification(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    supplierId: string;
    qualificationType: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementSupplierQualification> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const qualification = await this.dbAdapter.createSupplierQualification({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      supplierId: data.supplierId,
      qualificationType: data.qualificationType,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementSupplier → HAS_QUALIFICATION → ProcurementSupplierQualification
    const qualNodeId = qualification.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementSupplierQualification",
      `Habilitação ${qualification.qualificationType}`,
      `Tipo: ${qualification.qualificationType}, Status: ${qualification.status}`,
      qualNodeId,
      qualification
    );

    await this.kgEngine.createRelationship(data.organizationId, qualification.supplierId, qualNodeId, "HAS_QUALIFICATION");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementSupplierQualificationCreated",
        `Qualificação técnica ou econômica registrada para o fornecedor ID ${qualification.supplierId}.`,
        { qualificationId: qualification.id, supplierId: qualification.supplierId, qualificationType: qualification.qualificationType }
      ).catch(() => {});
    }

    return qualification;
  }

  public async createSupplierRegistry(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    supplierId: string;
    registryType: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementSupplierRegistry> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const registry = await this.dbAdapter.createSupplierRegistry({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      supplierId: data.supplierId,
      registryType: data.registryType,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementSupplier → HAS_REGISTRY → ProcurementSupplierRegistry
    const regNodeId = registry.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementSupplierRegistry",
      `Situação Cadastral ${registry.registryType}`,
      `Tipo: ${registry.registryType}, Status: ${registry.status}`,
      regNodeId,
      registry
    );

    await this.kgEngine.createRelationship(data.organizationId, registry.supplierId, regNodeId, "HAS_REGISTRY");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementSupplierRegistryCreated",
        `Situação cadastral em órgãos externos atualizada para o fornecedor ID ${registry.supplierId}.`,
        { registryId: registry.id, supplierId: registry.supplierId, registryType: registry.registryType }
      ).catch(() => {});
    }

    return registry;
  }

  public async getSuppliers(organizationId: string, workspaceId: string): Promise<ProcurementSupplier[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getSuppliers(organizationId, workspaceId);
  }

  public async getSupplierDocuments(organizationId: string, workspaceId: string): Promise<ProcurementSupplierDocument[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getSupplierDocuments(organizationId, workspaceId);
  }

  public async getSupplierCertificates(organizationId: string, workspaceId: string): Promise<ProcurementSupplierCertificate[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getSupplierCertificates(organizationId, workspaceId);
  }

  public async getSupplierQualifications(organizationId: string, workspaceId: string): Promise<ProcurementSupplierQualification[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getSupplierQualifications(organizationId, workspaceId);
  }

  public async getSupplierRegistries(organizationId: string, workspaceId: string): Promise<ProcurementSupplierRegistry[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getSupplierRegistries(organizationId, workspaceId);
  }

  public async getSupplierSummary(organizationId: string, workspaceId: string): Promise<ProcurementSupplierSummary> {
    this.validateTenant(organizationId, workspaceId);

    const [suppliers, documents, certificates, qualifications, registries] = await Promise.all([
      this.getSuppliers(organizationId, workspaceId),
      this.getSupplierDocuments(organizationId, workspaceId),
      this.getSupplierCertificates(organizationId, workspaceId),
      this.getSupplierQualifications(organizationId, workspaceId),
      this.getSupplierRegistries(organizationId, workspaceId)
    ]);

    const hasNoData =
      suppliers.length === 0 &&
      documents.length === 0 &&
      certificates.length === 0 &&
      qualifications.length === 0 &&
      registries.length === 0;

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (hasNoData) {
      status = "NO_DATA";
    } else if (
      suppliers.length === 0 ||
      documents.length === 0 ||
      certificates.length === 0 ||
      qualifications.length === 0 ||
      registries.length === 0
    ) {
      status = "PARTIAL_DATA";
    }

    return {
      status,
      suppliersCount: suppliers.length,
      documentsCount: documents.length,
      certificatesCount: certificates.length,
      qualificationsCount: qualifications.length,
      registriesCount: registries.length,
      recentSuppliers: suppliers.slice(0, 5)
    };
  }

  public async getSupplierHealth(organizationId: string, workspaceId: string): Promise<ProcurementSupplierHealth> {
    this.validateTenant(organizationId, workspaceId);

    const [suppliers, documents, certificates, qualifications, registries] = await Promise.all([
      this.getSuppliers(organizationId, workspaceId),
      this.getSupplierDocuments(organizationId, workspaceId),
      this.getSupplierCertificates(organizationId, workspaceId),
      this.getSupplierQualifications(organizationId, workspaceId),
      this.getSupplierRegistries(organizationId, workspaceId)
    ]);

    if (
      suppliers.length === 0 &&
      documents.length === 0 &&
      certificates.length === 0 &&
      qualifications.length === 0 &&
      registries.length === 0
    ) {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          activeSuppliersRate: 0,
          documentRegularityRate: 0,
          certificateExpirationRate: 0,
          complianceRate: 0
        }
      };
    }

    // Mathematically deterministic tracking
    const activeSuppliers = suppliers.filter(s => s.status === "ACTIVE").length;
    const activeSuppliersRate = suppliers.length > 0 ? Math.round((activeSuppliers / suppliers.length) * 100) : 0;

    const regularDocuments = documents.filter(d => d.status === "ACTIVE" || d.status === "PENDING").length;
    const documentRegularityRate = documents.length > 0 ? Math.round((regularDocuments / documents.length) * 100) : 0;

    const validCertificates = certificates.filter(c => c.status !== "EXPIRED" && c.status !== "SUSPENDED" && c.status !== "INACTIVE").length;
    const certificateExpirationRate = certificates.length > 0 ? Math.round((validCertificates / certificates.length) * 100) : 0;

    const compliantChecks =
      qualifications.filter(q => q.status === "ACTIVE" || q.status === "PENDING").length +
      registries.filter(r => r.status === "ACTIVE" || r.status === "PENDING").length;
    const totalChecks = qualifications.length + registries.length;
    const complianceRate = totalChecks > 0 ? Math.round((compliantChecks / totalChecks) * 100) : 0;

    const scoresCount = (suppliers.length > 0 ? 1 : 0) + (documents.length > 0 ? 1 : 0) + (certificates.length > 0 ? 1 : 0) + (totalChecks > 0 ? 1 : 0);
    const scoreSum =
      (suppliers.length > 0 ? activeSuppliersRate : 0) +
      (documents.length > 0 ? documentRegularityRate : 0) +
      (certificates.length > 0 ? certificateExpirationRate : 0) +
      (totalChecks > 0 ? complianceRate : 0);

    const healthScore = scoresCount > 0 ? Math.max(10, Math.min(100, Math.round(scoreSum / scoresCount))) : 0;

    const summary = await this.getSupplierSummary(organizationId, workspaceId);

    const healthResult: ProcurementSupplierHealth = {
      status: summary.status,
      healthScore,
      metrics: {
        activeSuppliersRate,
        documentRegularityRate,
        certificateExpirationRate,
        complianceRate
      }
    };

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "ProcurementSupplierHealthComputed",
        `Índice de conformidade e integridade documental de fornecedores avaliado: ${healthScore}/100.`,
        { workspaceId, healthScore }
      ).catch(() => {});
    }

    return healthResult;
  }
}
