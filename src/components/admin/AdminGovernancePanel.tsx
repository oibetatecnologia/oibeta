import React, { useState } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import useAdminAccessReviews from '../../hooks/useAdminAccessReviews';
import { usePlatformContext } from '../../contexts/platform/usePlatformContext';

export default function AdminGovernancePanel() {
  const platform = usePlatformContext();
  const governance = useAdminAccessReviews(50);
  const [responsible, setResponsible] = useState(
    platform.currentUser?.name || 'Admin Mestre',
  );

  const overview = governance.overview;

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
            Governança de identidade
          </span>
          <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-300" />
            Revisão de acessos, hierarquia e privilégios
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Certifica usuários, identifica riscos e suspende acessos sem sair do painel administrativo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void governance.refresh()}
            disabled={governance.isLoading}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-[10px] font-black text-[var(--text-main)] disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => void governance.create()}
            disabled={governance.isSaving || Boolean(governance.activeReview)}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[10px] font-black text-cyan-200 disabled:opacity-50"
          >
            Iniciar revisão
          </button>
        </div>
      </div>

      {governance.error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {governance.error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Metric label="Usuários" value={overview?.users || 0} />
        <Metric label="Ativos" value={overview?.activeUsers || 0} />
        <Metric label="Convites" value={overview?.invitedUsers || 0} />
        <Metric label="Pausados" value={overview?.pausedUsers || 0} />
        <Metric label="Privilegiados" value={overview?.privilegedUsers || 0} />
        <Metric label="Sem produtos" value={overview?.usersWithoutProducts || 0} />
        <Metric label="Sem superior" value={overview?.usersWithoutSuperior || 0} />
        <Metric label="Governança" value={`${overview?.governanceScore || 0}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-4 space-y-3">
          <label className="text-[10px] uppercase font-black text-[var(--text-secondary)]">
            Responsável pelas decisões
          </label>
          <input
            value={responsible}
            onChange={(event) => setResponsible(event.target.value)}
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-main)]"
          />
          <p className="text-[10px] text-[var(--text-secondary)]">
            Decisões ficam vinculadas ao responsável e ao horário da certificação.
          </p>
        </div>

        <div className="space-y-2">
          {governance.activeReview ? (
            governance.activeReview.items.map((item) => (
              <article
                key={item.userId}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4"
              >
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-[var(--text-main)]">
                        {item.name}
                      </strong>
                      <span className="text-[9px] uppercase font-black text-[var(--text-secondary)]">
                        {item.profile} · {item.status}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-1">
                      {item.email}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.riskFlags.length === 0 ? (
                        <span className="text-[9px] text-emerald-300">Sem riscos detectados</span>
                      ) : (
                        item.riskFlags.map((flag) => (
                          <span
                            key={flag}
                            className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] uppercase font-black text-amber-200"
                          >
                            {flag}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {item.decision === 'pending' ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={governance.isSaving || !responsible.trim()}
                        onClick={() =>
                          void governance.decide(
                            governance.activeReview!.id,
                            item.userId,
                            {
                              decision: 'certified',
                              decidedBy: responsible,
                            },
                          )
                        }
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-200 disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                        Certificar
                      </button>
                      <button
                        type="button"
                        disabled={governance.isSaving || !responsible.trim()}
                        onClick={() =>
                          void governance.decide(
                            governance.activeReview!.id,
                            item.userId,
                            {
                              decision: 'suspended',
                              decidedBy: responsible,
                              notes: 'Acesso suspenso durante revisão administrativa.',
                            },
                          )
                        }
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-200 disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5 inline mr-1" />
                        Suspender
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] uppercase font-black text-cyan-300">
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                      {item.decision}
                    </span>
                  )}
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 text-xs text-[var(--text-secondary)]">
              Não existe revisão aberta. Inicie uma revisão para certificar o diretório atual.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3">
      <span className="block text-[9px] uppercase font-black text-[var(--text-secondary)]">
        {label}
      </span>
      <strong className="block mt-1 text-sm font-black text-[var(--text-main)]">
        {value}
      </strong>
    </div>
  );
}
