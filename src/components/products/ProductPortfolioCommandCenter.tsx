import React from 'react';
import type { ProductCommercializationSummary } from '../../core/commercial/ProductCommercializationService';
import type { Task } from '../../types';
import type { ProductPortfolioAction } from '../../core/products/ProductPortfolioTypes';
import useProductPortfolioIntelligence from '../../hooks/useProductPortfolioIntelligence';
import ProductPortfolioKpis from './ProductPortfolioKpis';
import ProductPortfolioInsights from './ProductPortfolioInsights';
import ProductPortfolioMatrix from './ProductPortfolioMatrix';
import ProductPortfolioActionQueue from './ProductPortfolioActionQueue';

export default function ProductPortfolioCommandCenter({ commercialization, tasks, creatingId, onCreateTask }: { commercialization: ProductCommercializationSummary; tasks: Task[]; creatingId: string | null; onCreateTask: (action: ProductPortfolioAction) => void }) {
  const summary = useProductPortfolioIntelligence(commercialization, tasks);
  return <div className="space-y-4"><ProductPortfolioKpis summary={summary}/><ProductPortfolioInsights summary={summary}/><div className="grid grid-cols-1 2xl:grid-cols-[1.6fr_1fr] gap-4"><ProductPortfolioMatrix items={summary.items}/><ProductPortfolioActionQueue actions={summary.actions} creatingId={creatingId} onCreate={onCreateTask}/></div></div>;
}
