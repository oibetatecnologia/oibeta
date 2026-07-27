import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ProcurementOpportunityType, ProcurementOpportunityTypeDefinition } from '../../core/commercial/CommercialRadarRegistry';
import type { CommercialOpportunityInput, CommercialOpportunitySphere } from '../../core/commercial/OpportunityTypes';

interface OpportunityFormPanelProps {
  isOpen: boolean;
  opportunityTypes: ProcurementOpportunityTypeDefinition[];
  onClose: () => void;
  onCreate: (input: CommercialOpportunityInput) => void;
}

const INITIAL_FORM = {
  title: '',
  buyerName: '',
  sphere: 'municipal' as CommercialOpportunitySphere,
  city: '',
  state: '',
  type: 'pregao' as ProcurementOpportunityType,
  estimatedValue: '',
  publicationDate: '',
  submissionDeadline: '',
  sourceUrl: '',
  sourceLabel: 'Cadastro manual',
  externalId: '',
  processNumber: '',
  object: '',
  notes: '',
};

export default function OpportunityFormPanel({
  isOpen,
  opportunityTypes,
  onClose,
  onCreate,
}: OpportunityFormPanelProps) {
  const [form, setForm] = useState(INITIAL_FORM);

  if (!isOpen) {
    return null;
  }

  const updateField = (field: keyof typeof INITIAL_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.title.trim() || !form.buyerName.trim() || !form.object.trim()) {
      return;
    }

    onCreate({
      title: form.title.trim(),
      buyerName: form.buyerName.trim(),
      sphere: form.sphere,
      city: form.city.trim() || undefined,
      state: form.state.trim().toUpperCase() || undefined,
      type: form.type,
      estimatedValue: parseCurrency(form.estimatedValue),
      publicationDate: form.publicationDate || undefined,
      submissionDeadline: form.submissionDeadline || undefined,
      sourceUrl: form.sourceUrl.trim() || undefined,
      sourceId: 'manual',
      sourceLabel: form.sourceLabel.trim() || 'Cadastro manual',
      sourceType: 'manual',
      externalId: form.externalId.trim() || undefined,
      processNumber: form.processNumber.trim() || undefined,
      object: form.object.trim(),
      notes: form.notes.trim() || undefined,
    });

    setForm(INITIAL_FORM);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl h-full bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] p-5 flex items-start justify-between gap-4 z-10">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--blue-accent)] font-black">
              Radar Comercial
            </span>
            <h2 className="text-xl font-black text-[var(--text-main)] mt-1">
              Nova oportunidade
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Cadastre um edital, pregão, dispensa ou oportunidade real para análise da Beta.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Título" required>
              <input value={form.title} onChange={(event) => updateField('title', event.target.value)} className="beta-input" placeholder="Ex: Pregão Portal da Transparência" />
            </Field>

            <Field label="Órgão comprador" required>
              <input value={form.buyerName} onChange={(event) => updateField('buyerName', event.target.value)} className="beta-input" placeholder="Ex: Prefeitura Municipal" />
            </Field>

            <Field label="Esfera">
              <select value={form.sphere} onChange={(event) => updateField('sphere', event.target.value)} className="beta-input">
                <option value="municipal">Municipal</option>
                <option value="state">Estadual</option>
                <option value="federal">Federal</option>
                <option value="other">Outro</option>
              </select>
            </Field>

            <Field label="Tipo">
              <select value={form.type} onChange={(event) => updateField('type', event.target.value)} className="beta-input">
                {opportunityTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Cidade">
              <input value={form.city} onChange={(event) => updateField('city', event.target.value)} className="beta-input" placeholder="Ex: Campinas" />
            </Field>

            <Field label="UF">
              <input value={form.state} onChange={(event) => updateField('state', event.target.value)} className="beta-input" maxLength={2} placeholder="SP" />
            </Field>

            <Field label="Valor estimado">
              <input value={form.estimatedValue} onChange={(event) => updateField('estimatedValue', event.target.value)} className="beta-input" placeholder="Ex: 120000" />
            </Field>

            <Field label="Data limite">
              <input type="date" value={form.submissionDeadline} onChange={(event) => updateField('submissionDeadline', event.target.value)} className="beta-input" />
            </Field>

            <Field label="Publicação">
              <input type="date" value={form.publicationDate} onChange={(event) => updateField('publicationDate', event.target.value)} className="beta-input" />
            </Field>

            <Field label="Número do processo">
              <input value={form.processNumber} onChange={(event) => updateField('processNumber', event.target.value)} className="beta-input" placeholder="Ex: 123/2026" />
            </Field>

            <Field label="Identificador externo">
              <input value={form.externalId} onChange={(event) => updateField('externalId', event.target.value)} className="beta-input" placeholder="Código na fonte" />
            </Field>

            <Field label="Link do edital">
              <input value={form.sourceUrl} onChange={(event) => updateField('sourceUrl', event.target.value)} className="beta-input" placeholder="https://..." />
            </Field>
          </div>

          <Field label="Objeto" required>
            <textarea value={form.object} onChange={(event) => updateField('object', event.target.value)} className="beta-input min-h-[120px]" placeholder="Cole aqui o objeto da contratação." />
          </Field>

          <Field label="Observações">
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} className="beta-input min-h-[90px]" placeholder="Informações relevantes para a análise comercial." />
          </Field>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)]">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[var(--blue-accent)] text-white font-black">
              Salvar oportunidade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

function parseCurrency(value: string): number | undefined {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
