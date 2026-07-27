import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type {
  CreateReleaseCandidateCertificationInput,
  ReleaseCandidateCertification,
  ReleaseCandidateCertificationSummary,
  ReleaseCandidateControl,
  UpdateReleaseCandidateControlInput,
} from "./ReleaseCandidateCertificationTypes";

const JSON_PATH = path.join(
  process.cwd(),
  ".data",
  "release-candidate-certifications.json",
);

const DEFAULT_CONTROLS: Array<
  Omit<
    ReleaseCandidateControl,
    "status" | "owner" | "evidence" | "reviewedAt"
  >
> = [
  {
    id: "lint",
    category: "quality",
    title: "Lint aprovado",
    description: "TypeScript sem erros no ambiente oficial.",
    required: true,
  },
  {
    id: "build",
    category: "quality",
    title: "Build aprovada",
    description: "Frontend e backend compilados no ambiente oficial.",
    required: true,
  },
  {
    id: "rbac",
    category: "security",
    title: "RBAC e sessões validados",
    description: "Perfis, rotas protegidas e revogação de sessões revisados.",
    required: true,
  },
  {
    id: "access-review",
    category: "security",
    title: "Revisão de acessos concluída",
    description: "Acessos privilegiados e usuários sem escopo foram certificados.",
    required: true,
  },
  {
    id: "lgpd",
    category: "privacy",
    title: "Controles LGPD revisados",
    description: "Retenção, exportação, exclusão e isolamento de dados foram avaliados.",
    required: true,
  },
  {
    id: "backup",
    category: "continuity",
    title: "Backup e restauração testados",
    description: "Existe evidência de backup e teste de restauração.",
    required: true,
  },
  {
    id: "rollback",
    category: "continuity",
    title: "Rollback operacional validado",
    description: "A versão anterior pode ser restaurada com rastreabilidade.",
    required: true,
  },
  {
    id: "monitoring",
    category: "operations",
    title: "Monitoramento e incidentes ativos",
    description: "Alertas, incidentes, notificações e escalonamento foram revisados.",
    required: true,
  },
  {
    id: "support",
    category: "operations",
    title: "Suporte e SLA preparados",
    description: "Responsáveis, SLA e fluxo de atendimento foram confirmados.",
    required: true,
  },
  {
    id: "contracts",
    category: "commercial",
    title: "Contratos e licenças consistentes",
    description: "Produtos contratados, licenças e receita recorrente foram conciliados.",
    required: true,
  },
  {
    id: "product-acceptance",
    category: "product",
    title: "Aceite funcional dos produtos",
    description: "Fluxos críticos dos produtos vendáveis foram homologados.",
    required: true,
  },
  {
    id: "performance",
    category: "operations",
    title: "Performance mínima validada",
    description: "Tempos de resposta e operações críticas foram avaliados.",
    required: true,
  },
];

export class ReleaseCandidateCertificationService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
  ) {}

  async list(
    organizationId: string,
    workspaceId: string,
    limit = 100,
  ): Promise<ReleaseCandidateCertification[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));

    if (this.mode === "json") {
      return this.readJson()
        .filter(
          (item) =>
            item.organizationId === organizationId &&
            item.workspaceId === workspaceId,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, safeLimit);
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("release_candidate_certifications")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  async create(
    organizationId: string,
    workspaceId: string,
    input: CreateReleaseCandidateCertificationInput,
  ): Promise<ReleaseCandidateCertification> {
    const version = input.version.trim();
    const createdBy = input.createdBy.trim();

    if (!version || !createdBy) {
      throw new Error("Versão e responsável são obrigatórios.");
    }

    const existing = (await this.list(
      organizationId,
      workspaceId,
      500,
    )).find(
      (item) =>
        item.version === version &&
        item.status !== "approved",
    );

    if (existing) return existing;

    const timestamp = new Date().toISOString();
    const certification = this.recalculate({
      id: crypto.randomUUID(),
      organizationId,
      workspaceId,
      version,
      status: "draft",
      controls: DEFAULT_CONTROLS.map((control) => ({
        ...control,
        status: "pending",
      })),
      score: 0,
      approvedControls: 0,
      pendingControls: DEFAULT_CONTROLS.length,
      blockedControls: 0,
      requiredControls: DEFAULT_CONTROLS.length,
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.persist(certification);
    return certification;
  }

  async updateControl(
    organizationId: string,
    workspaceId: string,
    certificationId: string,
    controlId: string,
    input: UpdateReleaseCandidateControlInput,
  ): Promise<ReleaseCandidateCertification> {
    const certification = await this.get(
      organizationId,
      workspaceId,
      certificationId,
    );

    if (certification.status === "approved") {
      throw new Error("Uma certificação aprovada não pode ser alterada.");
    }

    const index = certification.controls.findIndex(
      (control) => control.id === controlId,
    );
    if (index < 0) throw new Error("Controle não encontrado.");

    const owner = input.owner.trim();
    if (!owner) throw new Error("Responsável pelo controle é obrigatório.");

    certification.controls[index] = {
      ...certification.controls[index],
      status: input.status,
      owner,
      evidence: input.evidence?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      expiresAt: input.expiresAt || undefined,
      reviewedAt: new Date().toISOString(),
    };

    certification.updatedAt = new Date().toISOString();
    const updated = this.recalculate(certification);
    await this.persist(updated);
    return updated;
  }

  async approve(
    organizationId: string,
    workspaceId: string,
    certificationId: string,
    approvedBy: string,
  ): Promise<ReleaseCandidateCertification> {
    const certification = await this.get(
      organizationId,
      workspaceId,
      certificationId,
    );
    const approver = approvedBy.trim();
    if (!approver) throw new Error("Aprovador é obrigatório.");

    const expired = certification.controls.filter(
      (control) =>
        control.expiresAt &&
        new Date(control.expiresAt).getTime() < Date.now(),
    );
    const incomplete = certification.controls.filter(
      (control) =>
        control.required && control.status !== "approved",
    );

    if (expired.length > 0) {
      throw new Error(
        `${expired.length} controle(s) possui(em) evidência vencida.`,
      );
    }
    if (incomplete.length > 0) {
      throw new Error(
        `${incomplete.length} controle(s) obrigatório(s) ainda não foi(ram) aprovado(s).`,
      );
    }

    certification.status = "approved";
    certification.approvedBy = approver;
    certification.approvedAt = new Date().toISOString();
    certification.updatedAt = certification.approvedAt;
    const approved = this.recalculate(certification);
    await this.persist(approved);
    return approved;
  }

  buildSummary(
    items: ReleaseCandidateCertification[],
  ): ReleaseCandidateCertificationSummary {
    const approved = items.filter(
      (item) => item.status === "approved",
    ).length;
    const blocked = items.filter(
      (item) => item.status === "blocked",
    ).length;
    const attention = items.filter(
      (item) =>
        item.status === "attention" ||
        item.status === "draft",
    ).length;
    const latest = items[0];
    const latestApproved = items.find(
      (item) => item.status === "approved",
    );

    return {
      total: items.length,
      approved,
      attention,
      blocked,
      latest,
      latestApprovedAt: latestApproved?.approvedAt,
      controlCoverage: latest?.score || 0,
      readinessScore:
        items.length === 0
          ? 25
          : latest?.status === "approved"
            ? 100
            : Math.max(
                0,
                Math.min(
                  95,
                  (latest?.score || 0) -
                    (latest?.blockedControls || 0) * 10,
                ),
              ),
    };
  }

  private async get(
    organizationId: string,
    workspaceId: string,
    certificationId: string,
  ): Promise<ReleaseCandidateCertification> {
    const item = (await this.list(
      organizationId,
      workspaceId,
      500,
    )).find((candidate) => candidate.id === certificationId);

    if (!item) throw new Error("Certificação RC-1 não encontrada.");
    return item;
  }

  private recalculate(
    item: ReleaseCandidateCertification,
  ): ReleaseCandidateCertification {
    const approvedControls = item.controls.filter(
      (control) => control.status === "approved",
    ).length;
    const blockedControls = item.controls.filter(
      (control) => control.status === "blocked",
    ).length;
    const pendingControls =
      item.controls.length - approvedControls - blockedControls;
    const requiredControls = item.controls.filter(
      (control) => control.required,
    ).length;
    const approvedRequired = item.controls.filter(
      (control) =>
        control.required && control.status === "approved",
    ).length;
    const score =
      requiredControls === 0
        ? 100
        : Math.round((approvedRequired / requiredControls) * 100);

    return {
      ...item,
      score,
      approvedControls,
      pendingControls,
      blockedControls,
      requiredControls,
      status:
        item.status === "approved"
          ? "approved"
          : blockedControls > 0
            ? "blocked"
            : approvedControls > 0
              ? "attention"
              : "draft",
    };
  }

  private async persist(
    item: ReleaseCandidateCertification,
  ): Promise<void> {
    if (this.mode === "json") {
      const items = this.readJson();
      const index = items.findIndex(
        (candidate) => candidate.id === item.id,
      );
      if (index >= 0) items[index] = item;
      else items.unshift(item);
      this.writeJson(items.slice(0, 1_000));
      return;
    }

    const { error } = await this.supabaseAdapter
      .getClient()
      .from("release_candidate_certifications")
      .upsert(this.toRow(item), { onConflict: "id" });

    if (error) throw error;
  }

  private readJson(): ReleaseCandidateCertification[] {
    if (!fs.existsSync(JSON_PATH)) return [];
    try {
      const parsed = JSON.parse(
        fs.readFileSync(JSON_PATH, "utf-8"),
      );
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeJson(
    items: ReleaseCandidateCertification[],
  ): void {
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(
      JSON_PATH,
      JSON.stringify(items, null, 2),
      "utf-8",
    );
  }

  private toRow(item: ReleaseCandidateCertification) {
    return {
      id: item.id,
      organization_id: item.organizationId,
      workspace_id: item.workspaceId,
      version: item.version,
      status: item.status,
      controls_json: item.controls,
      score: item.score,
      approved_controls: item.approvedControls,
      pending_controls: item.pendingControls,
      blocked_controls: item.blockedControls,
      required_controls: item.requiredControls,
      approved_by: item.approvedBy || null,
      approved_at: item.approvedAt || null,
      created_by: item.createdBy,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  private fromRow(row: any): ReleaseCandidateCertification {
    return {
      id: row.id,
      organizationId: row.organization_id,
      workspaceId: row.workspace_id,
      version: row.version,
      status: row.status,
      controls: Array.isArray(row.controls_json)
        ? row.controls_json
        : [],
      score: Number(row.score || 0),
      approvedControls: Number(row.approved_controls || 0),
      pendingControls: Number(row.pending_controls || 0),
      blockedControls: Number(row.blocked_controls || 0),
      requiredControls: Number(row.required_controls || 0),
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
