import crypto from "crypto";
import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { ProcurementWorkspaceEngine } from "./ProcurementWorkspaceEngine";
import { ProcurementBidManagementEngine } from "./ProcurementBidManagementEngine";
import { ProcurementSupplierManagementEngine } from "./ProcurementSupplierManagementEngine";

import { ProcurementContractLinker } from "../gov/ProcurementContractLinker";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";

import {
  ProcurementContract,
  ProcurementContractExecution,
  ProcurementInspection,
  ProcurementDelivery,
  ProcurementMeasurement,
  ProcurementContractIssue,
  ProcurementContractSummary,
  ProcurementContractHealth
} from "../core/types";

export class ProcurementContractManagementEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private workspaceEngine?: ProcurementWorkspaceEngine,
    private bidManagementEngine?: ProcurementBidManagementEngine,
    private supplierManagementEngine?: ProcurementSupplierManagementEngine,
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

  public async createContract(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    supplierId: string;
    bidId: string;
    status: string;
    metadata?: any;
    title?: string | null;
    number?: string | null;
    value?: number | null;
    supplierName?: string | null;
  }): Promise<ProcurementContract> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const contract = await this.dbAdapter.createContract({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      supplierId: data.supplierId,
      bidId: data.bidId,
      status: data.status,
      metadata: data.metadata || {},
      title: data.title || null,
      number: data.number || null,
      value: data.value !== undefined ? data.value : null,
      supplierName: data.supplierName || null
    });

    // 2. Register in Knowledge Graph
    // ProcurementWorkspace → HAS_CONTRACT → ProcurementContract
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

    const contractNodeId = contract.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementContract",
      contract.number ? `Contrato nº ${contract.number}` : `Contrato ${contract.id}`,
      `ID do Fornecedor: ${contract.supplierId}, ID da Licitação: ${contract.bidId}`,
      contractNodeId,
      contract
    );

    await this.kgEngine.createRelationship(data.organizationId, wsNodeId, contractNodeId, "HAS_CONTRACT");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementContractCreated",
        `Novo contrato assinado e incorporado: ${contract.number || contract.id}`,
        { contractId: contract.id, status: contract.status }
      ).catch(() => {});
    }

    return contract;
  }

  public async createContractExecution(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    contractId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementContractExecution> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const execution = await this.dbAdapter.createContractExecution({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      contractId: data.contractId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementContract → HAS_EXECUTION → ProcurementContractExecution
    const execNodeId = execution.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementContractExecution",
      `Execução do Contrato ID ${execution.contractId}`,
      `Status da Execução: ${execution.status}`,
      execNodeId,
      execution
    );

    await this.kgEngine.createRelationship(data.organizationId, execution.contractId, execNodeId, "HAS_EXECUTION");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementContractExecutionCreated",
        `Histórico de execução contratual registrado para o contrato ID ${execution.contractId}.`,
        { executionId: execution.id, contractId: execution.contractId, status: execution.status }
      ).catch(() => {});
    }

    return execution;
  }

  public async createInspection(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    contractId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementInspection> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const inspection = await this.dbAdapter.createInspection({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      contractId: data.contractId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementContract → HAS_INSPECTION → ProcurementInspection
    const inspNodeId = inspection.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementInspection",
      `Fiscalização do Contrato ID ${inspection.contractId}`,
      `Status da Fiscalização: ${inspection.status}`,
      inspNodeId,
      inspection
    );

    await this.kgEngine.createRelationship(data.organizationId, inspection.contractId, inspNodeId, "HAS_INSPECTION");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementInspectionCreated",
        `Ação de fiscalização ou auditoria registrada para o contrato ID ${inspection.contractId}.`,
        { inspectionId: inspection.id, contractId: inspection.contractId, status: inspection.status }
      ).catch(() => {});
    }

    return inspection;
  }

  public async createDelivery(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    contractId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementDelivery> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const delivery = await this.dbAdapter.createDelivery({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      contractId: data.contractId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementContract → HAS_DELIVERY → ProcurementDelivery
    const delNodeId = delivery.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementDelivery",
      `Entrega do Contrato ID ${delivery.contractId}`,
      `Status da Entrega: ${delivery.status}`,
      delNodeId,
      delivery
    );

    await this.kgEngine.createRelationship(data.organizationId, delivery.contractId, delNodeId, "HAS_DELIVERY");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementDeliveryCreated",
        `Entrega de produto/serviço protocolada para o contrato ID ${delivery.contractId}.`,
        { deliveryId: delivery.id, contractId: delivery.contractId, status: delivery.status }
      ).catch(() => {});
    }

    return delivery;
  }

  public async createMeasurement(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    contractId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementMeasurement> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const measurement = await this.dbAdapter.createMeasurement({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      contractId: data.contractId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementContract → HAS_MEASUREMENT → ProcurementMeasurement
    const measNodeId = measurement.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementMeasurement",
      `Medição do Contrato ID ${measurement.contractId}`,
      `Status da Medição: ${measurement.status}`,
      measNodeId,
      measurement
    );

    await this.kgEngine.createRelationship(data.organizationId, measurement.contractId, measNodeId, "HAS_MEASUREMENT");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementMeasurementCreated",
        `Medição física/financeira computada para o contrato ID ${measurement.contractId}.`,
        { measurementId: measurement.id, contractId: measurement.contractId, status: measurement.status }
      ).catch(() => {});
    }

    return measurement;
  }

  public async createContractIssue(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    contractId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementContractIssue> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const issue = await this.dbAdapter.createContractIssue({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      contractId: data.contractId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementContract → HAS_ISSUE → ProcurementContractIssue
    const issueNodeId = issue.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementContractIssue",
      `Ocorrência do Contrato ID ${issue.contractId}`,
      `Status da Ocorrência: ${issue.status}`,
      issueNodeId,
      issue
    );

    await this.kgEngine.createRelationship(data.organizationId, issue.contractId, issueNodeId, "HAS_ISSUE");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementContractIssueCreated",
        `Intercorrência ou descumprimento autuado para o contrato ID ${issue.contractId}.`,
        { issueId: issue.id, contractId: issue.contractId, status: issue.status }
      ).catch(() => {});
    }

    return issue;
  }

  public async getContracts(organizationId: string, workspaceId: string): Promise<ProcurementContract[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getContracts(organizationId, workspaceId);
  }

  public async getContractExecutions(organizationId: string, workspaceId: string): Promise<ProcurementContractExecution[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getContractExecutions(organizationId, workspaceId);
  }

  public async getInspections(organizationId: string, workspaceId: string): Promise<ProcurementInspection[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getInspections(organizationId, workspaceId);
  }

  public async getDeliveries(organizationId: string, workspaceId: string): Promise<ProcurementDelivery[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getDeliveries(organizationId, workspaceId);
  }

  public async getMeasurements(organizationId: string, workspaceId: string): Promise<ProcurementMeasurement[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getMeasurements(organizationId, workspaceId);
  }

  public async getContractIssues(organizationId: string, workspaceId: string): Promise<ProcurementContractIssue[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getContractIssues(organizationId, workspaceId);
  }

  public async getContractSummary(organizationId: string, workspaceId: string): Promise<ProcurementContractSummary> {
    this.validateTenant(organizationId, workspaceId);

    const [contracts, executions, inspections, deliveries, measurements, issues] = await Promise.all([
      this.getContracts(organizationId, workspaceId),
      this.getContractExecutions(organizationId, workspaceId),
      this.getInspections(organizationId, workspaceId),
      this.getDeliveries(organizationId, workspaceId),
      this.getMeasurements(organizationId, workspaceId),
      this.getContractIssues(organizationId, workspaceId)
    ]);

    const hasNoData =
      contracts.length === 0 &&
      executions.length === 0 &&
      inspections.length === 0 &&
      deliveries.length === 0 &&
      measurements.length === 0 &&
      issues.length === 0;

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (hasNoData) {
      status = "NO_DATA";
    } else if (
      contracts.length === 0 ||
      executions.length === 0 ||
      inspections.length === 0 ||
      deliveries.length === 0 ||
      measurements.length === 0 ||
      issues.length === 0
    ) {
      status = "PARTIAL_DATA";
    }

    return {
      status,
      contractsCount: contracts.length,
      executionsCount: executions.length,
      inspectionsCount: inspections.length,
      deliveriesCount: deliveries.length,
      measurementsCount: measurements.length,
      issuesCount: issues.length,
      recentContracts: contracts.slice(0, 5)
    };
  }

  public async getContractHealth(organizationId: string, workspaceId: string): Promise<ProcurementContractHealth> {
    this.validateTenant(organizationId, workspaceId);

    const [contracts, executions, inspections, deliveries, measurements, issues] = await Promise.all([
      this.getContracts(organizationId, workspaceId),
      this.getContractExecutions(organizationId, workspaceId),
      this.getInspections(organizationId, workspaceId),
      this.getDeliveries(organizationId, workspaceId),
      this.getMeasurements(organizationId, workspaceId),
      this.getContractIssues(organizationId, workspaceId)
    ]);

    if (
      contracts.length === 0 &&
      executions.length === 0 &&
      inspections.length === 0 &&
      deliveries.length === 0 &&
      measurements.length === 0 &&
      issues.length === 0
    ) {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          activeContractsRate: 0,
          deliveryRate: 0,
          issueRate: 0,
          measurementRate: 0
        }
      };
    }

    // Mathematically deterministic health rates
    const activeContractsRate = contracts.length > 0 ? Math.round((contracts.filter(c => c.status === "ACTIVE" || c.status === "COMPLETED").length / contracts.length) * 100) : 0;
    const deliveryRate = deliveries.length > 0 ? Math.round((deliveries.filter(d => d.status === "COMPLETED" || d.status === "ACTIVE").length / deliveries.length) * 100) : 0;
    const issueRate = issues.length > 0 ? Math.round((issues.filter(i => i.status === "COMPLETED").length / issues.length) * 100) : 100;
    const measurementRate = measurements.length > 0 ? Math.round((measurements.filter(m => m.status === "COMPLETED" || m.status === "ACTIVE").length / measurements.length) * 100) : 0;

    const scoresCount = (contracts.length > 0 ? 1 : 0) + (deliveries.length > 0 ? 1 : 0) + (issues.length > 0 ? 1 : 0) + (measurements.length > 0 ? 1 : 0);
    const scoreSum =
      (contracts.length > 0 ? activeContractsRate : 0) +
      (deliveries.length > 0 ? deliveryRate : 0) +
      (issues.length > 0 ? issueRate : 0) +
      (measurements.length > 0 ? measurementRate : 0);

    const healthScore = scoresCount > 0 ? Math.max(10, Math.min(100, Math.round(scoreSum / scoresCount))) : 0;

    const summary = await this.getContractSummary(organizationId, workspaceId);

    const healthResult: ProcurementContractHealth = {
      status: summary.status,
      healthScore,
      metrics: {
        activeContractsRate,
        deliveryRate,
        issueRate,
        measurementRate
      }
    };

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "ProcurementContractHealthComputed",
        `Índice de saúde e regularidade da execução dos contratos avaliado: ${healthScore}/100.`,
        { workspaceId, healthScore }
      ).catch(() => {});
    }

    return healthResult;
  }
}
