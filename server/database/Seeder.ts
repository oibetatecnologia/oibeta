import { DatabaseAdapter } from "./DatabaseAdapter";

/**
 * ensureSeededProjects
 *
 * RC-1 Comercial:
 * - não cria mais projetos operacionais de demonstração;
 * - preserva o banco limpo para que a Oi Beta crie tarefas/projetos reais;
 * - mantém a assinatura da função para compatibilidade com o backend existente.
 */
export async function ensureSeededProjects(
  dbAdapter: DatabaseAdapter,
  userId: string,
  organizationId: string,
  workspaceId: string,
  _updateProjectStateFn: (projectId: string) => Promise<any>,
): Promise<any[]> {
  try {
    const existingProjects = await dbAdapter.getProjects(userId, organizationId, workspaceId);

    if (existingProjects && existingProjects.length > 0) {
      return existingProjects;
    }

    console.log(
      `[SEEDER] RC-1 Comercial: nenhum projeto de demonstração será criado para organization=${organizationId}, workspace=${workspaceId}.`,
    );

    return [];
  } catch (error) {
    console.error("[SEEDER] Project seed check got an error:", error);
    return [];
  }
}
