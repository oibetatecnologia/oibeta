import { useMemo } from 'react';
import type { Task } from '../types';
import type { ProductCommercializationSummary } from '../core/commercial/ProductCommercializationService';
import { ProductPortfolioIntelligenceService } from '../core/products/ProductPortfolioIntelligenceService';

export default function useProductPortfolioIntelligence(summary: ProductCommercializationSummary, tasks: Task[]) {
  const portfolio = useMemo(() => ProductPortfolioIntelligenceService.build(summary), [summary]);
  const existingTaskTitles = useMemo(() => new Set(tasks.map((task) => task.title.trim().toLowerCase())), [tasks]);
  const actions = useMemo(() => portfolio.actions.map((action) => ({ ...action, alreadyCreated: existingTaskTitles.has(action.taskTitle.trim().toLowerCase()) })), [existingTaskTitles, portfolio.actions]);
  return { ...portfolio, actions };
}
