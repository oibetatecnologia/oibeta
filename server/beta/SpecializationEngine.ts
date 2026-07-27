import { DatabaseAdapter } from "../database/DatabaseAdapter";

export interface SpecializationDef {
  key: string;
  name: string;
  description: string;
  systemPrompt: string;
}

const BUILT_IN_SPECIALIZATIONS: Record<string, SpecializationDef> = {
  BETA_CORE: {
    key: "BETA_CORE",
    name: "Beta Core",
    description: "Inteligência base da Beta, focada em governança corporativa, projetos, tarefas e decisões generais.",
    systemPrompt: "Você está operando como BETA_CORE, uma inteligência central e de alto nível de governança corporativa corporativa. Suas respostas devem ser precisas, pragmáticas e focadas na resolução ágil e na orquestração de conhecimento."
  },
  BETA_GOV: {
    key: "BETA_GOV",
    name: "Beta Gov",
    description: "Gestão pública, indicadores, contratos, PPA, LOA, transparência.",
    systemPrompt: "Você está operando como BETA_GOV, especializada em administração pública. Fale de forma institucional, com profundo conhecimento de PPA, LDO, LOA, indicadores de gestão pública, transparência, eficiência governamental, contratos e conformidade com a legislação. Organize as saídas com forte embasamento legal e técnico adequado à esfera pública."
  },
  BETA_ELEITORAL: {
    key: "BETA_ELEITORAL",
    name: "Beta Eleitoral",
    description: "Campanhas, território, votos, adversários, lideranças, projeções.",
    systemPrompt: "Você está operando como BETA_ELEITORAL, focada em inteligência e estratégia de campanhas políticas. Responda considerando dimensões de território, engajamento, mapeamento de lideranças, análise de opositores, projeções de votos e comunicação estratégica com eleitores."
  },
  BETA_LICITA: {
    key: "BETA_LICITA",
    name: "Beta Licita",
    description: "Editais, oportunidades, propostas, documentos e contratos.",
    systemPrompt: "Você está operando como BETA_LICITA, uma especialista em processos licitatórios. Suas diretrizes incluem a análise de editais governamentais, montagem legal de propostas, conformidade de certidões, impugnações e gestão de contratos, usando precisão jurídica."
  },
  BETA_BUSINESS: {
    key: "BETA_BUSINESS",
    name: "Beta Business",
    description: "CRM, estratégia, produtividade, operações e indicadores.",
    systemPrompt: "Você está operando como BETA_BUSINESS, expert em operações corporativas, mercado, estruturação de CRM, otimização de funis de venda, OKRs e indicadores de produtividade operacionais e estratégicos."
  },
  BETA_PERSONAL: {
    key: "BETA_PERSONAL",
    name: "Beta Personal",
    description: "Segunda mente, organização pessoal, produtividade e aprendizado.",
    systemPrompt: "Você está operando como BETA_PERSONAL, atuando como o Second Brain particular do usuário. Fale com um tom de empatia, encorajamento e organização. Auxilie na estruturação de notas pessoais, construção de hábitos, trilhas de aprendizado e micro-produtividade diária."
  }
};

export class SpecializationEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public getAvailableSpecializations(): SpecializationDef[] {
    return Object.values(BUILT_IN_SPECIALIZATIONS);
  }

  public getSpecializationDef(key: string): SpecializationDef {
    return BUILT_IN_SPECIALIZATIONS[key] || BUILT_IN_SPECIALIZATIONS["BETA_CORE"];
  }

  public async getActiveForProject(projectId: string, workspaceId?: string): Promise<SpecializationDef> {
    try {
      const ps = await this.dbAdapter.getProjectSpecialization(projectId, workspaceId || "default-workspace");
      if (ps && ps.specializationKey) {
        return this.getSpecializationDef(ps.specializationKey);
      }
    } catch (e) {
      console.warn("Error getting project specialization:", e);
    }
    return BUILT_IN_SPECIALIZATIONS["BETA_CORE"];
  }

  public async activateSpecialization(projectId: string, organizationId: string, specializationKey: string): Promise<SpecializationDef> {
    const spec = this.getSpecializationDef(specializationKey);
    await this.dbAdapter.setProjectSpecialization(projectId, spec.key, organizationId);
    return spec;
  }
  
  public getPromptForActiveSpecialization(activeSpec: SpecializationDef): string {
    return `[ESPECIALIZAÇÃO ATIVA: ${activeSpec.key}]
${activeSpec.systemPrompt}
Sempre adeque seu tom técnico, recomendações e estruturas de resposta ao contexto dessa especialização.`;
  }
}
