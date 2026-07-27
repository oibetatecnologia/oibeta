import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentFundingOpportunity,
  GovernmentFundingProgram,
  GovernmentFundingNotice,
  GovernmentFundingRequirement,
  GovernmentFundingProposal,
  GovernmentFundingSubmission,
  GovernmentFundingSummary,
  GovernmentFundingHealth
} from "../core/types";

export class GovernmentAmendmentOpportunityEngine {
  private dbAdapter: DatabaseAdapter;
  private kgEngine: KnowledgeGraphEngine;
  private memoryOS: MemoryOS;

  constructor(
    dbAdapter: DatabaseAdapter,
    kgEngine: KnowledgeGraphEngine,
    memoryOS: MemoryOS
  ) {
    this.dbAdapter = dbAdapter;
    this.kgEngine = kgEngine;
    this.memoryOS = memoryOS;
  }

  private validateTenant(organizationId: string, workspaceId: string) {
    if (!organizationId) throw new Error("Multi-Tenant Error: organizationId is required.");
    if (!workspaceId) throw new Error("Validation Error: workspaceId is mandatory.");
  }

  // Opportunity Methods
  public async getFundingOpportunities(organizationId: string, workspaceId: string): Promise<GovernmentFundingOpportunity[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getFundingOpportunities(organizationId, workspaceId);
  }

  public async createFundingOpportunity(data: any): Promise<GovernmentFundingOpportunity> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const opportunity = await this.dbAdapter.createFundingOpportunity(data);
    
    // Knowledge Graph integration
    await this.kgEngine.createNode(
      data.organizationId,
      data.workspaceId,
      {
        id: opportunity.id as string,
        type: "GovernmentFundingOpportunity",
        name: data.name || "Opportunity",
        properties: { ...opportunity }
      }
    );
    
    await this.kgEngine.createRelationship(
      data.organizationId,
      data.workspaceId,
      opportunity.id as string,
      "HAS_FUNDING_OPPORTUNITY"
    );

    await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        type: "GovernmentFundingOpportunityCreated",
        content: "GovernmentFundingOpportunityCreated: " + opportunity.id,
        metadata: { opportunityId: opportunity.id }
    });

    return opportunity;
  }

  // Program Methods
  public async getFundingPrograms(organizationId: string, workspaceId: string): Promise<GovernmentFundingProgram[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getFundingPrograms(organizationId, workspaceId);
  }

  public async createFundingProgram(data: any): Promise<GovernmentFundingProgram> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const program = await this.dbAdapter.createFundingProgram(data);
    
    await this.kgEngine.createNode(
      data.organizationId,
      data.workspaceId,
      {
        id: program.id as string,
        type: "GovernmentFundingProgram",
        name: data.name || "Program",
        properties: { ...program }
      }
    );
    
    if (data.opportunityId) {
        await this.kgEngine.createRelationship(
            data.organizationId,
            data.opportunityId,
            program.id as string,
            "HAS_PROGRAM"
        );
    }

    await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        type: "GovernmentFundingProgramCreated",
        content: "GovernmentFundingProgramCreated: " + program.id,
        metadata: { programId: program.id }
    });

    return program;
  }

  // Notice Methods
  public async getFundingNotices(organizationId: string, workspaceId: string): Promise<GovernmentFundingNotice[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getFundingNotices(organizationId, workspaceId);
  }

  public async createFundingNotice(data: any): Promise<GovernmentFundingNotice> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const notice = await this.dbAdapter.createFundingNotice(data);
    
    await this.kgEngine.createNode(
      data.organizationId,
      data.workspaceId,
      {
        id: notice.id as string,
        type: "GovernmentFundingNotice",
        name: data.title || "Notice",
        properties: { ...notice }
      }
    );
    
    if (data.programId) {
        await this.kgEngine.createRelationship(
            data.organizationId,
            data.programId,
            notice.id as string,
            "HAS_NOTICE"
        );
    }

    await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        type: "GovernmentFundingNoticeCreated",
        content: "GovernmentFundingNoticeCreated: " + notice.id,
        metadata: { noticeId: notice.id }
    });

    return notice;
  }

  // Requirement Methods
  public async getFundingRequirements(organizationId: string, workspaceId: string): Promise<GovernmentFundingRequirement[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getFundingRequirements(organizationId, workspaceId);
  }

  public async createFundingRequirement(data: any): Promise<GovernmentFundingRequirement> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const requirement = await this.dbAdapter.createFundingRequirement(data);
    
    await this.kgEngine.createNode(
      data.organizationId,
      data.workspaceId,
      {
        id: requirement.id as string,
        type: "GovernmentFundingRequirement",
        name: data.requirement || "Requirement",
        properties: { ...requirement }
      }
    );
    
    if (data.noticeId) {
        await this.kgEngine.createRelationship(
            data.organizationId,
            data.noticeId,
            requirement.id as string,
            "HAS_REQUIREMENT"
        );
    }

    await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        type: "GovernmentFundingRequirementCreated",
        content: "GovernmentFundingRequirementCreated: " + requirement.id,
        metadata: { requirementId: requirement.id }
    });

    return requirement;
  }

  // Proposal Methods
  public async getFundingProposals(organizationId: string, workspaceId: string): Promise<GovernmentFundingProposal[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getFundingProposals(organizationId, workspaceId);
  }

  public async createFundingProposal(data: any): Promise<GovernmentFundingProposal> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const proposal = await this.dbAdapter.createFundingProposal(data);
    
    await this.kgEngine.createNode(
      data.organizationId,
      data.workspaceId,
      {
        id: proposal.id as string,
        type: "GovernmentFundingProposal",
        name: data.title || "Proposal",
        properties: { ...proposal }
      }
    );
    
    if (data.opportunityId) {
        await this.kgEngine.createRelationship(
            data.organizationId,
            data.opportunityId,
            proposal.id as string,
            "HAS_PROPOSAL"
        );
    }

    await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        type: "GovernmentFundingProposalCreated",
        content: "GovernmentFundingProposalCreated: " + proposal.id,
        metadata: { proposalId: proposal.id }
    });

    return proposal;
  }

  // Submission Methods
  public async getFundingSubmissions(organizationId: string, workspaceId: string): Promise<GovernmentFundingSubmission[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getFundingSubmissions(organizationId, workspaceId);
  }

  public async createFundingSubmission(data: any): Promise<GovernmentFundingSubmission> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const submission = await this.dbAdapter.createFundingSubmission(data);
    
    await this.kgEngine.createNode(
      data.organizationId,
      data.workspaceId,
      {
        id: submission.id as string,
        type: "GovernmentFundingSubmission",
        name: data.status || "Submission",
        properties: { ...submission }
      }
    );
    
    if (data.proposalId) {
        await this.kgEngine.createRelationship(
            data.organizationId,
            data.proposalId,
            submission.id as string,
            "HAS_SUBMISSION"
        );
    }

    await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        type: "GovernmentFundingSubmissionCreated",
        content: "GovernmentFundingSubmissionCreated: " + submission.id,
        metadata: { submissionId: submission.id }
    });

    return submission;
  }

  // Summary and Health
  public async getFundingSummary(organizationId: string, workspaceId: string): Promise<GovernmentFundingSummary> {
    this.validateTenant(organizationId, workspaceId);
    const opportunities = await this.getFundingOpportunities(organizationId, workspaceId);
    
    const hasData = opportunities.length > 0;
    
    return {
      status: hasData ? "READY" : "NO_DATA",
      summary: {
        opportunitiesCount: opportunities.length
      }
    };
  }

  public async getFundingHealth(organizationId: string, workspaceId: string): Promise<GovernmentFundingHealth> {
    this.validateTenant(organizationId, workspaceId);
    const opportunities = await this.getFundingOpportunities(organizationId, workspaceId);
    
    const status = opportunities.length > 0 ? "READY" : "NO_DATA";
    
    const health: GovernmentFundingHealth = {
      status,
      healthScore: opportunities.length > 0 ? 100 : 0,
      metrics: {
        totalOpportunities: opportunities.length
      }
    };

    await this.memoryOS.registerEvent({
        organizationId,
        workspaceId,
        type: "GovernmentFundingHealthComputed",
        content: "GovernmentFundingHealthComputed",
        metadata: { health }
    });

    return health;
  }
}
