import React from 'react';

/**
 * Helpers visuais oficiais do módulo Beta Electoral.
 *
 * Responsabilidade:
 * - centralizar badges de status;
 * - evitar duplicação de JSX no ElectoralWorkspace;
 * - preservar os rótulos e estilos atuais.
 */

export function getStatusBadge(status: string): React.ReactNode {
  switch (status) {
    case 'ACTIVE':
      return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">Ativa</span>;
    case 'PLANNING':
      return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">Planejamento</span>;
    case 'COMPLETED':
      return <span className="bg-indigo-300/10 text-indigo-400 border border-indigo-300/20 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">Concluída</span>;
    case 'SUSPENDED':
      return <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">Suspensa</span>;
    default:
      return <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">{status}</span>;
  }
}

export function getInviteStatusBadge(status: string): React.ReactNode {
  switch (status) {
    case 'PENDING':
      return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">Pendente</span>;
    case 'ACCEPTED':
      return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">Aceito</span>;
    case 'DECLINED':
      return <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">Recusado</span>;
    case 'REVOKED':
      return <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">Revogado</span>;
    default:
      return <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">{status}</span>;
  }
}
