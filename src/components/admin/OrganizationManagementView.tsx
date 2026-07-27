import React from 'react';
import { Building2, GitBranch, Landmark, Layers, Network, ShieldCheck, Sparkles } from 'lucide-react';
import { usePlatformContext } from '../../contexts/platform/usePlatformContext';
import { OrganizationService } from '../../core/organization/OrganizationService';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import type { OrganizationTreeNode } from '../../core/organization/organizationTypes';
import {
  OrganizationChecklistItem,
  OrganizationMetricCard,
  OrganizationStatusBadge,
} from './OrganizationManagementComponents';

/**
 * OrganizationManagementView
 *
 * Sprint 21 — Capacidade 01: Organização Institucional.
 * Primeira visão operacional para organograma institucional.
 * Ainda sem CRUD/backend.
 */
export default function OrganizationManagementView() {
  const platform = usePlatformContext();

  const productionReadiness = useProductionReadiness();

  const snapshot = OrganizationService.buildOperationalSnapshot({
    tenantId: platform.currentTenant.id,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-[var(--border-color)] pb-4 gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--blue-accent)] font-black">
            Beta Gov / Organização Institucional
          </span>
          <h3 className="text-xl lg:text-2xl font-black text-[var(--text-main)] font-sans mt-1 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[var(--blue-accent)]" />
            Estrutura Organizacional
          </h3>
          <p className="text-xs lg:text-sm text-[var(--text-secondary)] mt-1 max-w-3xl">
            Base institucional compartilhada para secretarias, departamentos, setores, equipes e organograma do tenant público.
          </p>
        </div>

        <div className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs font-mono text-[var(--text-secondary)]">
          <span className="block text-[9px] uppercase tracking-widest font-black text-[var(--text-secondary)]">Tenant</span>
          <span className="text-[var(--text-main)] font-bold">{platform.currentTenant.organizationId}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <OrganizationMetricCard
          icon={<Building2 className="w-4 h-4" />}
          label="Unidades"
          value={snapshot.summary.totalUnits}
          helper={`${snapshot.summary.implementationUnits} em implantação`}
        />
        <OrganizationMetricCard
          icon={<GitBranch className="w-4 h-4" />}
          label="Raízes"
          value={snapshot.summary.rootUnits}
          helper="Estruturas principais"
        />
        <OrganizationMetricCard
          icon={<Network className="w-4 h-4" />}
          label="Profundidade"
          value={snapshot.summary.maxDepth + 1}
          helper="Níveis hierárquicos"
        />
        <OrganizationMetricCard
          icon={<ShieldCheck className="w-4 h-4" />}
          label="Produção"
          value={`${productionReadiness.score}%`}
          helper={`${productionReadiness.blockedAreas} bloqueios`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[var(--border-color)] pb-3 flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-[var(--text-main)]">Árvore institucional inicial</h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Esta estrutura será consumida por Gov, Licita, Transparência, Zero Papel e demais produtos.
              </p>
            </div>
            <span className="text-[9px] font-black uppercase font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full px-2 py-0.5">
              OrganizationService
            </span>
          </div>

          <div className="space-y-2">
            {snapshot.tree.map((node) => (
              <OrganizationTreeItem key={node.id} node={node} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Evolução da capacidade
            </h4>
            <div className="space-y-2">
              <OrganizationChecklistItem label="Organization Registry" done />
              <OrganizationChecklistItem label="Organization Service" done />
              <OrganizationChecklistItem label="Visão do organograma" done />
              <OrganizationChecklistItem label="CRUD de unidades" />
              <OrganizationChecklistItem label="Responsáveis por unidade" />
              <OrganizationChecklistItem label="Integração conceitual com usuários" done />
              <OrganizationChecklistItem label="Política de escopos por unidade" done />
              <OrganizationChecklistItem label="Persistência das unidades" />
              <OrganizationChecklistItem label="Autorização backend por unidade" />
            </div>
          </div>

          <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-5 space-y-2">
            <h4 className="text-sm font-black text-indigo-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Impacto na Beta IA
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              A estrutura organizacional já fornece o contexto para escopos e delegação. O próximo marco é persistir responsáveis e aplicar autorização backend por unidade. {productionReadiness.nextMilestone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OrganizationTreeItemProps {
  node: OrganizationTreeNode;
}

function OrganizationTreeItem({ node }: OrganizationTreeItemProps) {
  const paddingLeft = `${node.level * 18}px`;

  return (
    <div className="space-y-2">
      <div
        className="p-3 bg-[var(--bg-main)]/35 border border-[var(--border-color)] rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{ marginLeft: paddingLeft }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-[var(--text-main)]">{node.name}</span>
            <OrganizationStatusBadge
              status={node.status}
              label={OrganizationService.getStatusLabel(node.status)}
            />
          </div>
          <div className="mt-1 text-[10px] text-[var(--text-secondary)] font-mono flex flex-wrap gap-2">
            <span>{node.code}</span>
            <span>•</span>
            <span>{OrganizationService.getTypeLabel(node.type)}</span>
            <span>•</span>
            <span>{node.productIds.length} produtos</span>
          </div>
        </div>

        <div className="text-[10px] text-[var(--text-secondary)] font-mono">
          Nível {node.level + 1}
        </div>
      </div>

      {node.children.map((child) => (
        <OrganizationTreeItem key={child.id} node={child} />
      ))}
    </div>
  );
}
