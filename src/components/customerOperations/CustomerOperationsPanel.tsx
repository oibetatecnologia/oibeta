import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, HeartPulse, RefreshCw, Save, ShieldAlert, Users } from 'lucide-react';
import useClientsWorkspace from '../../hooks/useClientsWorkspace';
import useCustomerOperations from '../../hooks/useCustomerOperations';
import type {
  CustomerHealthStatus,
  CustomerLifecycleStage,
  CustomerOnboardingItem,
} from '../../core/customerOperations/CustomerOperationsTypes';

interface CustomerOperationsPanelProps {
  focus: 'clients' | 'implementation' | 'support';
}

const DEFAULT_CHECKLIST = [
  'Kickoff realizado',
  'Responsáveis definidos',
  'Produtos e acessos configurados',
  'Integrações validadas',
  'Treinamento concluído',
  'Homologação aprovada',
  'Entrada em produção confirmada',
];

export default function CustomerOperationsPanel({ focus }: CustomerOperationsPanelProps) {
  const clients = useClientsWorkspace();
  const operations = useCustomerOperations();
  const [clientId, setClientId] = useState('');
  const [owner, setOwner] = useState('');
  const [stage, setStage] = useState<CustomerLifecycleStage>('onboarding');
  const [healthStatus, setHealthStatus] = useState<CustomerHealthStatus>('attention');
  const [healthScore, setHealthScore] = useState(70);
  const [supportSlaHours, setSupportSlaHours] = useState(24);
  const [nextReviewAt, setNextReviewAt] = useState('');
  const [renewalAt, setRenewalAt] = useState('');
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<CustomerOnboardingItem[]>([]);

  const eligibleClients = useMemo(
    () => clients.clientsList.filter((client) => ['contracted', 'active', 'paused'].includes(client.status)),
    [clients.clientsList],
  );

  useEffect(() => {
    if (!clientId && eligibleClients[0]) setClientId(eligibleClients[0].id);
  }, [clientId, eligibleClients]);

  const selectedPlan = operations.plans.find((item) => item.clientId === clientId);
  useEffect(() => {
    if (selectedPlan) {
      setOwner(selectedPlan.owner);
      setStage(selectedPlan.lifecycleStage);
      setHealthStatus(selectedPlan.healthStatus);
      setHealthScore(selectedPlan.healthScore);
      setSupportSlaHours(selectedPlan.supportSlaHours);
      setNextReviewAt(selectedPlan.nextReviewAt?.slice(0, 10) || '');
      setRenewalAt(selectedPlan.renewalAt?.slice(0, 10) || '');
      setNotes(selectedPlan.notes || '');
      setChecklist(selectedPlan.onboardingChecklist);
    } else {
      setOwner('');
      setStage('onboarding');
      setHealthStatus('attention');
      setHealthScore(70);
      setSupportSlaHours(24);
      setNextReviewAt('');
      setRenewalAt('');
      setNotes('');
      setChecklist(DEFAULT_CHECKLIST.map((label, index) => ({ id: `new-${index}`, label, completed: false })));
    }
  }, [clientId, selectedPlan?.updatedAt]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientId || !owner.trim()) return;
    await operations.save({
      clientId,
      lifecycleStage: stage,
      owner: owner.trim(),
      healthStatus,
      healthScore,
      onboardingChecklist: checklist,
      objectives: selectedPlan?.objectives || [],
      risks: selectedPlan?.risks || [],
      supportSlaHours,
      nextReviewAt: nextReviewAt || undefined,
      renewalAt: renewalAt || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const title = focus === 'implementation'
    ? 'Onboarding e implantação do cliente'
    : focus === 'support'
      ? 'Saúde, SLA e risco do cliente'
      : 'Operação e sucesso do cliente';

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">Customer Operations</span>
          <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-emerald-300" />{title}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Conecta carteira, implantação, suporte, revisão executiva, renovação e risco de churn.</p>
        </div>
        <button type="button" onClick={() => void operations.refresh()} disabled={operations.isLoading} className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-[10px] font-black text-[var(--text-main)] disabled:opacity-50 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />Atualizar
        </button>
      </div>

      {operations.error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{operations.error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-3">
        <Metric label="Clientes" value={operations.summary.totalClients} />
        <Metric label="Gerenciados" value={operations.summary.managedClients} />
        <Metric label="Onboarding" value={operations.summary.onboardingClients} />
        <Metric label="Saudáveis" value={operations.summary.healthyClients} />
        <Metric label="Atenção" value={operations.summary.attentionClients} />
        <Metric label="Críticos" value={operations.summary.criticalClients} />
        <Metric label="Revisões vencidas" value={operations.summary.overdueReviews} />
        <Metric label="Riscos abertos" value={operations.summary.openRisks} />
        <Metric label="Implantação" value={`${operations.summary.onboardingProgress}%`} />
        <Metric label="Prontidão" value={`${operations.summary.readinessScore}%`} />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]">
            <option value="">Selecione um cliente operacional</option>
            {eligibleClients.map((client) => <option key={client.id} value={client.id}>{client.name || client.entity}</option>)}
          </select>
          <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Responsável pelo cliente" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" />
          <select value={stage} onChange={(event) => setStage(event.target.value as CustomerLifecycleStage)} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]">
            <option value="onboarding">Onboarding</option><option value="adoption">Adoção</option><option value="value">Valor</option><option value="renewal">Renovação</option><option value="risk">Risco</option><option value="expanded">Expansão</option>
          </select>
          <select value={healthStatus} onChange={(event) => setHealthStatus(event.target.value as CustomerHealthStatus)} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]">
            <option value="healthy">Saudável</option><option value="attention">Atenção</option><option value="critical">Crítico</option>
          </select>
          <label className="text-[10px] text-[var(--text-secondary)]">Health score<input type="number" min={0} max={100} value={healthScore} onChange={(event) => setHealthScore(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" /></label>
          <label className="text-[10px] text-[var(--text-secondary)]">SLA de suporte (horas)<input type="number" min={1} max={720} value={supportSlaHours} onChange={(event) => setSupportSlaHours(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" /></label>
          <label className="text-[10px] text-[var(--text-secondary)]">Próxima revisão<input type="date" value={nextReviewAt} onChange={(event) => setNextReviewAt(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" /></label>
          <label className="text-[10px] text-[var(--text-secondary)]">Renovação<input type="date" value={renewalAt} onChange={(event) => setRenewalAt(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" /></label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {checklist.map((item, index) => (
            <label key={item.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3 flex items-start gap-2 text-xs text-[var(--text-main)]">
              <input type="checkbox" checked={item.completed} onChange={(event) => setChecklist((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, completed: event.target.checked, completedAt: event.target.checked ? new Date().toISOString() : undefined } : value))} />
              <span>{item.label}</span>
            </label>
          ))}
        </div>

        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Riscos, próximos passos, contexto executivo e observações" rows={3} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" />

        <button type="submit" disabled={operations.isSaving || !clientId || !owner.trim()} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-200 disabled:opacity-50 flex items-center gap-2"><Save className="w-4 h-4" />Salvar plano operacional</button>
      </form>

      <div className="space-y-2">
        {operations.plans.slice(0, 6).map((plan) => (
          <article key={plan.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-start gap-2">
              {plan.healthStatus === 'healthy' ? <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5" /> : plan.healthStatus === 'critical' ? <ShieldAlert className="w-4 h-4 text-red-300 mt-0.5" /> : <Activity className="w-4 h-4 text-amber-300 mt-0.5" />}
              <div><strong className="text-xs text-[var(--text-main)]">{plan.clientName}</strong><p className="text-[10px] text-[var(--text-secondary)] mt-1">{plan.lifecycleStage} · health {plan.healthScore}% · SLA {plan.supportSlaHours}h · responsável {plan.owner}</p></div>
            </div>
            <span className="text-[9px] text-[var(--text-secondary)]">{new Date(plan.updatedAt).toLocaleString('pt-BR')}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3"><span className="block text-[9px] uppercase font-black text-[var(--text-secondary)]">{label}</span><strong className="block mt-1 text-sm font-black text-[var(--text-main)]">{value}</strong></div>;
}
