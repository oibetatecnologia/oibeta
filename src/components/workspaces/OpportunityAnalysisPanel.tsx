import React, { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, ClipboardList, Send, Sparkles, Target } from 'lucide-react';
import { CommercialTaskRepository } from '../../core/commercial/CommercialTaskRepository';
import { OpportunityAnalyzer } from '../../core/commercial/OpportunityAnalyzer';
import { OpportunityTaskGenerator } from '../../core/commercial/OpportunityTaskGenerator';
import type { OpportunityCrmHandoffInput, OpportunityCrmHandoffResult } from '../../core/commercial/OpportunityRepository';
import { getQualificationLabel, type CommercialOpportunity, type CommercialOpportunityQualification } from '../../core/commercial/OpportunityTypes';

interface OpportunityAnalysisPanelProps {
  opportunity: CommercialOpportunity | null;
  onClose: () => void;
  onTasksCreated?: () => void;
  onQualificationChange?: (status: CommercialOpportunityQualification) => Promise<void> | void;
  onSendToCrm?: (input: OpportunityCrmHandoffInput) => Promise<OpportunityCrmHandoffResult>;
}

export default function OpportunityAnalysisPanel({
  opportunity,
  onClose,
  onTasksCreated,
  onQualificationChange,
  onSendToCrm,
}: OpportunityAnalysisPanelProps) {
  const [createdCount, setCreatedCount] = useState<number | null>(null);
  const [isSendingToCrm, setIsSendingToCrm] = useState(false);
  const [crmResult, setCrmResult] = useState<OpportunityCrmHandoffResult | null>(null);
  const [crmError, setCrmError] = useState('');
  const [crmForm, setCrmForm] = useState<OpportunityCrmHandoffInput>({
    priority: opportunity?.priority || 'high',
    nextAction: opportunity ? `Analisar abordagem comercial para ${opportunity.title}` : '',
    notes: '',
    createTask: true,
  });

  const analysis = useMemo(
    () => (opportunity ? OpportunityAnalyzer.analyze(opportunity) : null),
    [opportunity],
  );

  const generatedTasks = useMemo(
    () => (analysis ? OpportunityTaskGenerator.generateTasks(analysis) : []),
    [analysis],
  );

  useEffect(() => {
    setCreatedCount(null);
    setCrmResult(null);
    setCrmError('');
    setCrmForm({
      priority: opportunity?.priority || 'high',
      nextAction: opportunity ? `Analisar abordagem comercial para ${opportunity.title}` : '',
      notes: '',
      createTask: true,
    });
  }, [opportunity?.id, opportunity?.priority, opportunity?.title]);

  if (!opportunity || !analysis) {
    return null;
  }

  const handleCreateTasks = async () => {
    const created = await CommercialTaskRepository.createMany(generatedTasks);
    setCreatedCount(created.length);
    onTasksCreated?.();
  };

  const handleSendToCrm = async () => {
    if (!onSendToCrm || opportunity.crmOpportunityId) return;
    setIsSendingToCrm(true);
    setCrmError('');
    try {
      const result = await onSendToCrm(crmForm);
      setCrmResult(result);
      onTasksCreated?.();
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Não foi possível enviar a oportunidade para o CRM.');
    } finally {
      setIsSendingToCrm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-3xl h-full bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] p-5 flex items-start justify-between gap-4 z-10">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--blue-accent)] font-black">
              Análise Beta
            </span>
            <h2 className="text-xl font-black text-[var(--text-main)] mt-1">
              {opportunity.title}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Análise inicial local, sem chamada para IA externa.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)]"
          >
            Fechar
          </button>
        </div>

        <div className="p-5 space-y-5">
          <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-indigo-200">Resumo da decisão comercial</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  A oportunidade foi comparada com o catálogo disponível neste tenant. Revise a aderência, o prazo e os requisitos antes de qualificar e decidir manualmente pelo envio ao CRM.
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ScoreCard label="IAC" value={`${analysis.iac}%`} helper="Índice de Aderência Comercial" icon={<Target className="w-4 h-4" />} />
            <ScoreCard label="IPC" value={formatCurrency(analysis.ipc)} helper="Potencial comercial estimado" icon={<Sparkles className="w-4 h-4" />} />
            <ScoreCard label="Confiança" value={getConfidenceLabel(analysis.confidence)} helper="Baseada no matching inicial" icon={<CheckCircle2 className="w-4 h-4" />} />
          </section>

          <section className="rounded-2xl bg-[var(--bg-main)]/35 border border-[var(--border-color)] p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[var(--text-main)]">Qualificação comercial</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Estado atual: {getQualificationLabel(opportunity.qualificationStatus || 'unqualified')}</p>
              </div>
              <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-300 border-indigo-500/20">{analysis.analysisVersion}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button type="button" onClick={() => onQualificationChange?.('review_required')} className="p-2.5 rounded-xl border border-amber-500/20 text-amber-400 text-xs font-black">Revisar</button>
              <button type="button" onClick={() => onQualificationChange?.('qualified')} className="p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs font-black">Qualificar</button>
              <button type="button" onClick={() => onQualificationChange?.('disqualified')} className="p-2.5 rounded-xl border border-rose-500/20 text-rose-400 text-xs font-black">Desqualificar</button>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-blue-200">Envio manual para o CRM</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  O Radar nunca envia oportunidades automaticamente. Revise o interesse comercial e confirme somente as oportunidades que devem entrar no funil.
                </p>
              </div>
            </div>

            {opportunity.crmOpportunityId || crmResult ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                {crmResult?.alreadyLinked
                  ? `Esta oportunidade já estava vinculada ao CRM no prospect ${crmResult.client.name}.`
                  : `Oportunidade vinculada ao CRM${crmResult?.client?.name ? ` no prospect ${crmResult.client.name}` : ''}.`}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Responsável</span>
                    <input
                      value={crmForm.responsible || ''}
                      onChange={(event) => setCrmForm((current) => ({ ...current, responsible: event.target.value }))}
                      placeholder="Responsável comercial"
                      className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs text-[var(--text-main)]"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Prioridade no CRM</span>
                    <select
                      value={crmForm.priority || opportunity.priority}
                      onChange={(event) => setCrmForm((current) => ({ ...current, priority: event.target.value as CommercialOpportunity['priority'] }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs text-[var(--text-main)]"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-1.5 block">
                  <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Próxima ação</span>
                  <input
                    value={crmForm.nextAction || ''}
                    onChange={(event) => setCrmForm((current) => ({ ...current, nextAction: event.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs text-[var(--text-main)]"
                  />
                </label>

                <label className="space-y-1.5 block">
                  <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Observações</span>
                  <textarea
                    value={crmForm.notes || ''}
                    onChange={(event) => setCrmForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Motivo do interesse, estratégia ou condição relevante"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs text-[var(--text-main)] resize-none"
                  />
                </label>

                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={crmForm.createTask !== false}
                    onChange={(event) => setCrmForm((current) => ({ ...current, createTask: event.target.checked }))}
                  />
                  Criar tarefa de acompanhamento no backlog comercial
                </label>

                {opportunity.qualificationStatus !== 'qualified' && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    Qualifique a oportunidade antes de enviá-la ao CRM. A decisão continua manual.
                  </div>
                )}

                {crmError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">{crmError}</div>
                )}

                <button
                  type="button"
                  disabled={!onSendToCrm || isSendingToCrm || opportunity.qualificationStatus !== 'qualified'}
                  onClick={handleSendToCrm}
                  className="w-full p-3 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isSendingToCrm ? 'Enviando...' : 'Confirmar envio manual para o CRM'}
                </button>
              </>
            )}
          </section>

          <section className="rounded-2xl bg-[var(--bg-main)]/35 border border-[var(--border-color)] p-5">
            <h3 className="text-sm font-black text-[var(--text-main)]">Recomendação</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              {analysis.recommendedAction}
            </p>
          </section>

          <section className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-5 space-y-3">
            <h3 className="text-sm font-black text-[var(--text-main)]">Composição do score</h3>
            {analysis.scoreFactors.map((factor) => (
              <div key={factor.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                <div className="flex justify-between gap-3 text-xs"><strong>{factor.label}</strong><span>{factor.contribution} pontos</span></div>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">{factor.explanation}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-5 space-y-4">
            <h3 className="text-sm font-black text-[var(--text-main)]">Produtos encontrados</h3>

            {analysis.bestMatches.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">Nenhum produto com aderência detectada.</p>
            ) : (
              <div className="space-y-3">
                {analysis.bestMatches.map((match) => (
                  <div key={match.serviceId} className="p-4 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-[var(--text-main)]">{match.serviceName}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                          Produto: {match.productId}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {match.score}%
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] uppercase font-mono font-black text-[var(--text-secondary)]">Palavras encontradas</span>
                        <p className="text-[10px] text-[var(--text-main)] mt-1">
                          {match.matchedKeywords.length > 0 ? match.matchedKeywords.join(', ') : 'Nenhuma palavra-chave direta'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-mono font-black text-[var(--text-secondary)]">Requisitos a avaliar</span>
                        <p className="text-[10px] text-[var(--text-main)] mt-1">
                          {match.missingRequirements.length > 0 ? match.missingRequirements.join(', ') : 'Nenhum requisito crítico inferido'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-5 space-y-4">
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[var(--blue-accent)]" />
              Tarefas sugeridas
            </h3>

            {generatedTasks.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">Nenhuma tarefa sugerida nesta análise inicial.</p>
            ) : (
              <div className="space-y-2">
                {generatedTasks.map((task) => (
                  <div key={task.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black text-[var(--text-main)]">{task.title}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">{task.description}</p>
                      </div>
                      <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={generatedTasks.length === 0}
              onClick={handleCreateTasks}
              className="w-full p-3 rounded-xl bg-[var(--blue-accent)] text-white font-black text-xs uppercase tracking-widest font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Criar tarefas no desenvolvimento
            </button>

            {createdCount !== null && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                {createdCount === 0
                  ? 'As tarefas sugeridas já estavam registradas.'
                  : `${createdCount} tarefa(s) criada(s) no backlog comercial.`}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: React.ReactNode }) {
  return (
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-3">
      <div className="w-9 h-9 rounded-xl bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)] flex items-center justify-center">
        {icon}
      </div>
      <div>
        <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">{label}</span>
        <span className="text-lg font-black text-[var(--text-main)] block mt-1">{value}</span>
        <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">{helper}</span>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function getConfidenceLabel(confidence: 'low' | 'medium' | 'high'): string {
  const labels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
  };

  return labels[confidence];
}
