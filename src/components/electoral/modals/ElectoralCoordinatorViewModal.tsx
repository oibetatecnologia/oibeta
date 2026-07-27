import React from 'react';
import { X } from 'lucide-react';
import type { Coordinator } from '../types';


interface ElectoralCoordinatorViewModalProps {
  coordinator: Coordinator;
  onClose: () => void;
}

export default function ElectoralCoordinatorViewModal({
  coordinator,
  onClose,
}: ElectoralCoordinatorViewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] select-none animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl text-left select-text">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <span className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">
            Informações do Coordenador Político
          </span>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-2 gap-4 border-b border-[var(--border-color)]/30 pb-3">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">Nome do Oficial</span>
              <p className="text-sm font-bold text-[var(--text-main)]">{coordinator.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">Status Operacional</span>
              <p className="font-semibold text-emerald-400">
                {coordinator.status === 'ACTIVE' ? 'Ativo / Vinculado' : coordinator.status}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-[var(--border-color)]/30 pb-3">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">E-mail de Contato</span>
              <p className="font-semibold text-[var(--text-main)]">{coordinator.email || 'Não cadastrado'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">SMS / Telefone</span>
              <p className="font-mono text-[var(--text-main)]">{coordinator.phone || 'Não cadastrado'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-[var(--border-color)]/30 pb-3">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">Nível de Responsabilidade</span>
              <p className="font-bold text-rose-500">{coordinator.level}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">Geografia Designada</span>
              <p className="font-semibold text-[var(--text-main)]">{coordinator.assignedTerritory || 'Abrangência Municipal'}</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--blue-accent)] hover:opacity-95 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
