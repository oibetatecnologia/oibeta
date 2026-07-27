import React from 'react';
import { Activity, Database, ShieldCheck, Wifi } from 'lucide-react';

interface BarraInferiorProps {
  organizacao?: string;
  modulo?: string;
  statusBanco?: string;
  statusConexao?: 'online' | 'offline' | 'sincronizando';
  mensagem?: string;
}

/**
 * BarraInferior
 * Barra de status permanente da Beta Platform.
 * Apenas apresenta informações de estado da aplicação.
 */
export default function BarraInferior({
  organizacao = 'Oi Beta Tecnologia',
  modulo = 'Área de Trabalho',
  statusBanco = 'SUPABASE',
  statusConexao = 'online',
  mensagem = 'Sistema operacional.',
}: BarraInferiorProps) {
  const cor =
    statusConexao === 'online'
      ? 'bg-emerald-500'
      : statusConexao === 'sincronizando'
      ? 'bg-amber-500'
      : 'bg-rose-500';

  return (
    <footer className="h-9 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] px-4 flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-mono">
      <div className="flex items-center gap-4 min-w-0">
        <span className="flex items-center gap-1 truncate">
          <ShieldCheck className="w-3 h-3" />
          {organizacao}
        </span>

        <span className="hidden md:flex items-center gap-1">
          <Activity className="w-3 h-3" />
          {modulo}
        </span>

        <span className="hidden lg:flex items-center gap-1">
          <Database className="w-3 h-3" />
          {statusBanco}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${cor}`} />
        <Wifi className="w-3 h-3" />
        <span>{mensagem}</span>
      </div>
    </footer>
  );
}
