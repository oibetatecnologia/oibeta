export class ProjectNarrativeEngine {
    public generateNarrative(timeline: any, risk: any, health: any, criticalPath: any, progressPercent: number): string {
        let narrative = `O projeto encontra-se com saúde operacional ${health.status} (${health.score}/100) e risco classificado como ${risk.level}.\n`;
        
        if (progressPercent > 0) {
            narrative += `O avanço consolidado é de ${progressPercent}% dos objetivos essenciais concluidos.\n`;
        }

        if (timeline.events.length > 0) {
            const recent = timeline.events.slice(0, 5); // Descending
            const recentCompletions = recent.filter((e: any) => e.type === 'TASK_COMPLETED' || e.type === 'DECISION_ACCEPTED');
            if (recentCompletions.length > 0) {
                narrative += `Recentemente, houveram avanços como '${recentCompletions[0].title}'.\n`;
            }
        }

        if (criticalPath.path.length > 0) {
            narrative += `Entretanto, o progresso está sendo impactado negativamente por restrições operacionais. Existem ${criticalPath.path.length} item(s) no caminho crítico impedindo fluidez e liberação, notavelmente '${criticalPath.path[0].title}'.\n`;
        }

        if (risk.factors.staleTasks > 0) {
            narrative += `Observa-se também que ${risk.factors.staleTasks} tarefas não recebem atualização sistêmica há mais de duas semanas.\n`;
        }

        return narrative;
    }
}
