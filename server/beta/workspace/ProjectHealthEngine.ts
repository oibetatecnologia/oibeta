export class ProjectHealthEngine {
    constructor() {}

    public calculateHealth(riskOutput: any, progressPercent: number): any {
        let healthScore = 100 - riskOutput.score;
        if (progressPercent > 80 && healthScore < 50) {
            healthScore += 20; 
        }

        if (healthScore > 100) healthScore = 100;
        if (healthScore < 0) healthScore = 0;

        let status = 'HEALTHY';
        if (healthScore < 70) status = 'AT_RISK';
        if (healthScore < 40) status = 'CRITICAL';

        return {
           score: healthScore,
           status,
           summary: `Saúde do projeto é considerada ${status} (${healthScore}/100).`
        };
    }
}
